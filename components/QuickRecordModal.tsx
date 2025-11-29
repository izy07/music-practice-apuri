import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  Dimensions,
  ScrollView,
  Alert
} from 'react-native';
import { X, Mic, Square } from 'lucide-react-native';
import { Platform } from 'react-native';
import { SttService } from '@/lib/sttService';
import { useInstrumentTheme } from './InstrumentThemeContext';
import { supabase } from '@/lib/supabase';
import { formatLocalDate } from '@/lib/dateUtils';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import { createShadowStyle } from '@/lib/shadowStyles';

interface QuickRecordModalProps {
  visible: boolean;
  onClose: () => void;
  onRecord: (minutes: number) => void;
}

const { height } = Dimensions.get('window');

export default function QuickRecordModal({ visible, onClose, onRecord }: QuickRecordModalProps) {
  const { currentTheme } = useInstrumentTheme();
  const [isRecording, setIsRecording] = useState(false);
  const [processing, setProcessing] = useState(false);

  // 既存記録との統合処理
  const savePracticeRecordWithIntegration = async (minutes: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('ユーザーが認証されていません');
      }

      const today = formatLocalDate(new Date());
      
      // 現在の楽器IDを取得
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('selected_instrument_id')
        .eq('user_id', user.id)
        .maybeSingle();
      const currentInstrumentId = profile?.selected_instrument_id;
      
      // 今日の既存の練習記録を取得（楽器IDでフィルタリング）
      let query = supabase
        .from('practice_sessions')
        .select('id, duration_minutes, input_method, content, instrument_id')
        .eq('user_id', user.id)
        .eq('practice_date', today);
      
      if (currentInstrumentId) {
        query = query.eq('instrument_id', currentInstrumentId);
      } else {
        query = query.is('instrument_id', null);
      }
      
      const { data: existingRecords, error: fetchError } = await query.order('created_at', { ascending: true });

      // テーブルが存在しない場合のエラーハンドリング
      if (fetchError && fetchError.code === 'PGRST205') {
        ErrorHandler.handle(fetchError, 'practice_sessionsテーブル読み込み', true);
        Alert.alert('エラー', 'データベースの設定が完了していません。管理者にお問い合わせください。');
        return;
      }

      if (existingRecords && existingRecords.length > 0) {
        // 既存の記録がある場合は時間を加算して更新
        const existing = existingRecords[0];
        const totalMinutes = existing.duration_minutes + minutes;
        
        // 既存の記録を更新
        // contentから時間詳細を削除
        let existingContent = existing.content || '';
        existingContent = existingContent
          .replace(/\s*\(累計\d+分\)/g, '')
          .replace(/\s*累計\d+分/g, '')
          .replace(/\s*\+\s*[^,]+?\d+分/g, '')
          .replace(/\s*[^,]+?\d+分/g, '')
          .replace(/練習記録/g, '')
          .replace(/^[\s,]+|[\s,]+$/g, '')
          .replace(/,\s*,/g, ',')
          .trim();
        
        const updateContent = existingContent
          ? `${existingContent}, クイック記録`
          : 'クイック記録';
        
        const { error } = await supabase
          .from('practice_sessions')
          .update({
            duration_minutes: totalMinutes,
            content: updateContent,
            instrument_id: currentInstrumentId,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
        
        if (error) {
          throw error;
        }
        
        // 他の記録を削除（統合のため）
        if (existingRecords.length > 1) {
          const otherRecordIds = existingRecords.slice(1).map((record: { id?: string }) => record.id).filter((id): id is string => !!id);
          let deleteQuery = supabase
            .from('practice_sessions')
            .delete()
            .in('id', otherRecordIds);
          
          if (currentInstrumentId) {
            deleteQuery = deleteQuery.eq('instrument_id', currentInstrumentId);
          } else {
            deleteQuery = deleteQuery.is('instrument_id', null);
          }
          
          await deleteQuery;
        }
        
        logger.debug(`クイック記録を追加: ${existing.duration_minutes}分 → ${totalMinutes}分`);
      } else {
        // 新規記録として挿入
        const { error } = await supabase
          .from('practice_sessions')
          .insert({
            user_id: user.id,
            practice_date: today,
            duration_minutes: minutes,
            content: 'クイック記録',
            input_method: 'voice',
            instrument_id: currentInstrumentId,
            created_at: new Date().toISOString()
          });
        
        if (error) {
          throw error;
        }
        
        logger.debug(`新規クイック記録を保存: ${minutes}分`);
      }
      
      // カレンダー画面に更新を通知
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('practiceRecordUpdated', {
          detail: { action: 'saved', date: new Date() }
        }));
      }
    } catch (error) {
      ErrorHandler.handle(error, '練習記録の保存', true);
      throw error;
    }
  };

  const timeOptions = [
    { label: '5分', minutes: 5 },
    { label: '15分', minutes: 15 },
    { label: '30分', minutes: 30 },
    { label: '1時間', minutes: 60 },
    { label: '2時間', minutes: 120 },
    { label: '3時間', minutes: 180 },
    { label: '4時間', minutes: 240 },
    { label: '5時間', minutes: 300 },
    { label: '6時間', minutes: 360 },
  ];

  // 音声録音の開始（ネイティブ・Web両対応）
  const startRecording = async () => {
    try {
      const granted = await SttService.requestMicPermission();
      if (!granted) {
        Alert.alert('権限が必要', '音声録音の権限が必要です。ブラウザの設定でマイクの許可を確認してください。');
        return;
      }
      
      setIsRecording(true);
      setProcessing(true);
      
      // 音声録音を開始（最大10秒間）
      const { uri, dispose } = await SttService.recordAudio(10);
      
      try {
        setProcessing(true);
        const result = await SttService.transcribe(uri);
        const parsed = parseMinutesFromText(result.text);
        
        if (parsed) {
          // 既存記録との統合処理を実行
          await savePracticeRecordWithIntegration(parsed);
          
          Alert.alert('保存しました', `音声認識で${parsed}分の練習記録を保存しました！`, [
            { text: 'OK', onPress: onClose }
          ]);
        } else {
          Alert.alert('認識できませんでした', '「○分練習しました」や「○時間練習しました」のように話してください。');
        }
      } finally {
        await dispose();
        setIsRecording(false);
        setProcessing(false);
      }
      
    } catch (error) {
      setIsRecording(false);
      setProcessing(false);
      Alert.alert('エラー', '録音を開始できませんでした。時間選択をご利用ください。');
    }
  };

  // 音声録音の停止（実際には録音が開始されたら自動で停止するため、UIの更新のみ）
  const stopRecording = async () => {
    setIsRecording(false);
    setProcessing(false);
  };



  // 実テキストから分を抽出（簡易）
  const parseMinutesFromText = (text: string): number | null => {
    if (!text) return null;
    const t = text.replace(/\s+/g, '');
    // 1時間半/90分 等
    const hourHalf = t.match(/(\d+)時間半/);
    if (hourHalf) {
      const h = parseInt(hourHalf[1]);
      if (!isNaN(h)) return h * 60 + 30;
    }
    const hour = t.match(/(\d+)時間/);
    const minute = t.match(/(\d+)分/);
    let total = 0;
    if (hour && !isNaN(parseInt(hour[1]))) total += parseInt(hour[1]) * 60;
    if (minute && !isNaN(parseInt(minute[1]))) total += parseInt(minute[1]);
    if (total > 0) return total;
    // 数字のみも拾う
    const num = t.match(/(\d{1,3})/);
    if (num && !isNaN(parseInt(num[1]))) return parseInt(num[1]);
    return null;
  };

  // 手動で時間を選択
  const handleManualTimeSelect = async (minutes: number) => {
    try {
      // 既存記録との統合処理を実行
      await savePracticeRecordWithIntegration(minutes);
      
      // 保存完了後はすぐにモーダルを閉じる
      onClose();
      
      // フィードバックのため、短い通知を表示（オプション）
      Alert.alert('記録しました', '練習記録を記録しました。');
    } catch (error) {
      ErrorHandler.handle(error, '練習記録の保存', true);
      Alert.alert('エラー', '練習記録の保存に失敗しました');
    }
  };



  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>クイック記録</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#666666" />
            </TouchableOpacity>
          </View>

          <Text style={styles.dateText}>
            {new Date().toLocaleDateString('ja-JP', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </Text>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* 音声入力（全プラットフォーム対応） */}
            <View style={styles.voiceInputContainer}>
              <TouchableOpacity
                style={styles.voiceInputButton}
                onPress={startRecording}
                disabled={processing || isRecording}
              >
                {isRecording ? <Square size={20} color={currentTheme.primary} /> : <Mic size={20} color={currentTheme.primary} />}
                <Text style={styles.voiceInputText}>
                  {processing ? '処理中...' : isRecording ? '録音中...' : '音声入力（自動記録）'}
                </Text>
              </TouchableOpacity>
              <Text style={styles.voiceInputHint}>
                「5分練習しました」や「1時間練習しました」のように話してください（10秒以内）
              </Text>
            </View>


            <View style={styles.divider} />

            {/* 手動選択セクション */}
            <View style={styles.manualSection}>
              <Text style={styles.manualTitle}>手動で選択</Text>
              <View style={styles.timeGrid}>
                {timeOptions.map((option) => (
                  <TouchableOpacity
                    key={`time-option-${option.minutes}`}
                    style={[styles.timeButton, getTimeButtonStyle(), { backgroundColor: currentTheme.secondary }]}
                    onPress={() => handleManualTimeSelect(option.minutes)}
                  >
                    <Text style={[styles.timeButtonText, { color: '#FFFFFF' }]}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// 動的なスタイルを定義（Platformに依存するため）
const getTimeButtonStyle = () => ({
  padding: 12,
  borderRadius: 8,
  marginHorizontal: 4,
  marginBottom: 8,
  justifyContent: 'center' as const,
  alignItems: 'center' as const,
  borderWidth: 1,
  borderColor: '#E0E0E0',
  elevation: 2,
  ...createShadowStyle({
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  }),
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: height * 0.75,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  closeButton: {
    padding: 4,
  },
  dateText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginVertical: 8,
  },
  content: {
    padding: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 8,
  },
  manualSection: {
    marginBottom: 12,
  },
  manualTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 8,
    textAlign: 'center',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  timeButton: {
    width: '30%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 10,
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    elevation: 2,
  },
  timeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },

  voiceInputContainer: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    padding: 6,
    marginBottom: 12,
    borderWidth: 0,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  voiceInputButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#8B4513',
    gap: 6,
  },
  voiceInputText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#8B4513',
  },
  voiceInputHint: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    marginTop: 6,
  },
});