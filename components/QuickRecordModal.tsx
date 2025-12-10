import React, { useState, useEffect } from 'react';
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
import { useAuthAdvanced } from '@/hooks/useAuthAdvanced';
import { savePracticeSessionWithIntegration } from '@/repositories/practiceSessionRepository';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import { createShadowStyle } from '@/lib/shadowStyles';
import { formatLocalDate } from '@/lib/dateUtils';
import { supabase } from '@/lib/supabase';
import { getInstrumentId } from '@/lib/instrumentUtils';
import { disableBackgroundFocus, enableBackgroundFocus } from '@/lib/modalFocusManager';

interface QuickRecordModalProps {
  visible: boolean;
  onClose: () => void;
  onRecord: (minutes: number) => void;
}

const { height } = Dimensions.get('window');

export default function QuickRecordModal({ visible, onClose, onRecord }: QuickRecordModalProps) {
  const { currentTheme, selectedInstrument } = useInstrumentTheme();
  const { user } = useAuthAdvanced();
  const [isRecording, setIsRecording] = useState(false);
  const [processing, setProcessing] = useState(false);

  // 既存記録との統合処理（リポジトリを使用）
  const savePracticeRecordWithIntegration = async (minutes: number) => {
    try {
      if (!user) {
        throw new Error('ユーザーが認証されていません');
      }

      // 共通関数を使用して楽器IDを取得
      const currentInstrumentId = getInstrumentId(selectedInstrument);
      
      const result = await savePracticeSessionWithIntegration(
        user.id,
        minutes,
        {
          instrumentId: currentInstrumentId,
          content: 'クイック記録',
          inputMethod: 'voice',
          existingContentPrefix: 'クイック記録'
        }
      );

      if (!result.success) {
        const errorMessage = result.error?.message || '練習記録の保存に失敗しました';
        
        // テーブルが存在しないエラーの場合
        if (result.error?.code === 'PGRST205' || result.error?.code === 'PGRST116') {
          Alert.alert('エラー', 'データベースの設定が完了していません。管理者にお問い合わせください。');
          throw new Error('データベースの設定が完了していません');
        }
        
        // その他のエラー
        throw result.error || new Error(errorMessage);
      }

      logger.info(`クイック記録を保存: ${minutes}分`, {
        practiceDate: formatLocalDate(new Date()),
        instrumentId: currentInstrumentId
      });

      // イベントを発火（保存処理の戻り値で成功を確認済みのため、検証処理は不要）
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('practiceRecordUpdated', {
          detail: {
            action: 'saved',
            date: new Date(),
            source: 'quick_record',
            minutes: minutes
          }
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
    let disposeFn: (() => Promise<void>) | null = null;
    
    try {
      // マイク権限の確認
      const granted = await SttService.requestMicPermission();
      if (!granted) {
        Alert.alert(
          'マイクの権限が必要です',
          '音声録音を使用するには、マイクへのアクセス許可が必要です。\n\nブラウザの設定でマイクの許可を確認してください。',
          [{ text: 'OK' }]
        );
        return;
      }
      
      setIsRecording(true);
      setProcessing(true);
      
      // 音声録音を開始（最大10秒間）
      try {
        const recordResult = await SttService.recordAudio(10);
        disposeFn = recordResult.dispose;
        const uri = recordResult.uri;
        
        // 音声認識を実行
        setProcessing(true);
        let transcriptionResult: { text: string };
        try {
          transcriptionResult = await SttService.transcribe(uri);
        } catch (transcribeError) {
          logger.error('音声認識エラー:', transcribeError);
          const errorMessage = transcribeError instanceof Error ? transcribeError.message : String(transcribeError);
          
          // APIキー関連のエラー
          if (errorMessage.includes('API key') || errorMessage.includes('not configured')) {
            Alert.alert(
              '音声認識の設定エラー',
              '音声認識サービスが設定されていません。\n\n時間選択をご利用ください。',
              [{ text: 'OK' }]
            );
            return;
          }
          
          // ネットワークエラー
          if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('Failed to fetch')) {
            Alert.alert(
              'ネットワークエラー',
              '音声認識サービスに接続できませんでした。\n\nインターネット接続を確認して、もう一度お試しください。\n\n時間選択もご利用いただけます。',
              [{ text: 'OK' }]
            );
            return;
          }
          
          // その他のエラー
          Alert.alert(
            '音声認識に失敗しました',
            '音声を認識できませんでした。\n\nもう一度お試しいただくか、時間選択をご利用ください。',
            [{ text: 'OK' }]
          );
          return;
        }
        
        const parsed = parseMinutesFromText(transcriptionResult.text);
        
        if (parsed) {
          // 既存記録との統合処理を実行
          try {
            await savePracticeRecordWithIntegration(parsed);
            // 親コンポーネントに通知してデータ更新をトリガー
            onRecord(parsed);
            Alert.alert('保存しました', `音声認識で${parsed}分の練習記録を保存しました！`, [
              { text: 'OK', onPress: onClose }
            ]);
          } catch (saveError) {
            logger.error('練習記録保存エラー:', saveError);
            Alert.alert(
              '保存に失敗しました',
              '練習記録の保存に失敗しました。\n\nもう一度お試しください。',
              [{ text: 'OK' }]
            );
          }
        } else {
          Alert.alert(
            '認識できませんでした',
            '音声を認識できませんでした。\n\n「5分練習しました」や「1時間練習しました」のように話してください。\n\n時間選択もご利用いただけます。',
            [{ text: 'OK' }]
          );
        }
      } catch (recordError) {
        logger.error('録音エラー:', recordError);
        const errorMessage = recordError instanceof Error ? recordError.message : String(recordError);
        
        // マイクアクセス拒否
        if (errorMessage.includes('マイク') || errorMessage.includes('permission') || errorMessage.includes('denied')) {
          Alert.alert(
            'マイクへのアクセスが拒否されました',
            'マイクへのアクセスが拒否されました。\n\nブラウザの設定でマイクの許可を確認してください。',
            [{ text: 'OK' }]
          );
          return;
        }
        
        // 録音デバイスエラー
        if (errorMessage.includes('device') || errorMessage.includes('not available')) {
          Alert.alert(
            '録音デバイスが見つかりません',
            '録音デバイスが見つかりませんでした。\n\nマイクが接続されているか確認してください。\n\n時間選択もご利用いただけます。',
            [{ text: 'OK' }]
          );
          return;
        }
        
        // その他の録音エラー
        Alert.alert(
          '録音に失敗しました',
          '音声の録音に失敗しました。\n\nもう一度お試しいただくか、時間選択をご利用ください。',
          [{ text: 'OK' }]
        );
      } finally {
        if (disposeFn) {
          try {
            await disposeFn();
          } catch (disposeError) {
            logger.warn('録音リソースの解放エラー:', disposeError);
          }
        }
        setIsRecording(false);
        setProcessing(false);
      }
      
    } catch (error) {
      logger.error('音声録音処理の予期しないエラー:', error);
      setIsRecording(false);
      setProcessing(false);
      Alert.alert(
        'エラーが発生しました',
        '音声録音の処理中にエラーが発生しました。\n\n時間選択をご利用ください。',
        [{ text: 'OK' }]
      );
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
      
      // 親コンポーネントに通知してデータ更新をトリガー
      onRecord(minutes);
      
      // 保存完了後はすぐにモーダルを閉じる
      onClose();
      
      // フィードバックのため、短い通知を表示（オプション）
      Alert.alert('記録しました', '練習記録を記録しました。');
    } catch (error) {
      ErrorHandler.handle(error, '練習記録の保存', true);
      const errorMessage = error instanceof Error ? error.message : '練習記録の保存に失敗しました';
      
      // 既にAlertが表示されている場合は、重複して表示しない
      if (!errorMessage.includes('データベース')) {
        Alert.alert('エラー', errorMessage);
      }
    }
  };

  // モーダルの開閉に応じてフォーカス管理
  useEffect(() => {
    if (visible) {
      disableBackgroundFocus();
    } else {
      enableBackgroundFocus();
    }
    
    return () => {
      if (visible) {
        enableBackgroundFocus();
      }
    };
  }, [visible]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View 
          style={styles.modalContainer}
          {...(Platform.OS === 'web' ? { 
            role: 'dialog',
            'aria-modal': true,
            'aria-labelledby': 'quick-record-modal-title',
            'data-modal-content': true
          } : {})}
        >
          <View style={styles.header}>
            <Text 
              id="quick-record-modal-title"
              style={styles.title}
            >
              クイック記録
            </Text>
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