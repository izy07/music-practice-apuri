/**
 * 練習メニュー詳細モーダルコンポーネント
 * 練習メニューの詳細情報を表示
 */

import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, Alert, Platform } from 'react-native';
import { Play } from 'lucide-react-native';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { useAuthAdvanced } from '@/hooks/useAuthAdvanced';
import { useSubscription } from '@/hooks/useSubscription';
import { canSaveDataForInstrument } from '@/lib/subscriptionLimits';
import logger from '@/lib/logger';
import { getCurrentUser } from '@/repositories/userRepository';
import { updatePracticeSession, createPracticeSession } from '@/repositories/practiceSessionRepository';
import { cleanContentFromTimeDetails } from '@/lib/utils/contentCleaner';
import type { PracticeItem } from '../types/practice.types';
import { styles } from '../styles';
import { getInstrumentId } from '@/lib/instrumentUtils';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { disableBackgroundFocus, enableBackgroundFocus, blurActiveElement } from '@/lib/modalFocusManager';

export interface PracticeDetailModalProps {
  visible: boolean;
  selectedMenu: PracticeItem | null;
  selectedInstrument: string | null;
  onClose: () => void;
  onSaveComplete?: () => void;
}

export function PracticeDetailModal({
  visible,
  selectedMenu,
  selectedInstrument,
  onClose,
  onSaveComplete,
}: PracticeDetailModalProps) {
  const { currentTheme } = useInstrumentTheme();
  const { user } = useAuthAdvanced();
  const { entitlement } = useSubscription();
  const router = useRouter();

  const handleSavePractice = async () => {
    if (!user) {
      Alert.alert('エラー', 'ログインが必要です');
      return;
    }

    if (!selectedMenu) {
      return;
    }

    try {
      // 基礎練の完了を記録（時間は追加しない、✅マークだけ）
      const today = new Date().toISOString().split('T')[0];
      
      // 基礎練のみを検索（input_method = 'preset' + 楽器ID + LIMIT 1）
      const authUser = await getCurrentUser();
      if (!authUser) {
        Alert.alert('エラー', 'ログインが必要です');
        return;
      }

      const instrumentId = getInstrumentId(selectedInstrument);
      
      // Freeプランの場合、新しい楽器でデータを保存できるかチェック
      const canSaveCheck = await canSaveDataForInstrument(authUser.id, instrumentId, entitlement);
      if (!canSaveCheck.canSave) {
        Alert.alert(
          'アップグレードが必要です',
          canSaveCheck.reason || '新しい楽器で基礎練を記録するには、プレミアムへアップグレードしてください。',
          [
            { text: 'キャンセル', style: 'cancel' },
            { text: 'プレミアムを見る', onPress: () => router.push('/(tabs)/pricing-plans') }
          ]
        );
        return;
      }
      
      // 基礎練のみを検索
      let query = supabase
        .from('practice_sessions')
        .select('id, content, input_method')
        .eq('user_id', authUser.id)
        .eq('practice_date', today)
        .eq('input_method', 'preset') // 基礎練のみ
        .limit(1); // LIMIT 1

      if (instrumentId) {
        query = query.eq('instrument_id', instrumentId);
      } else {
        query = query.is('instrument_id', null);
      }

      const { data: existingBasicPracticeRecords, error: fetchError } = await query;

      if (fetchError) {
        logger.error('基礎練記録の取得エラー:', fetchError);
        Alert.alert('エラー', '基礎練記録の取得に失敗しました');
        return;
      }

      // 基礎練レコードが既に存在する場合
      if (existingBasicPracticeRecords && existingBasicPracticeRecords.length > 0) {
        const existing = existingBasicPracticeRecords[0];
        
        // 既存のcontentから時間詳細を削除
        const existingContent = cleanContentFromTimeDetails(existing.content);
        
        // 重複チェック: contentに完全一致するメニュー名が含まれているかチェック
        const menuTitle = selectedMenu.title;
        const contentParts = existingContent.split(',').map(part => part.trim());
        const isDuplicate = contentParts.some(part => part === menuTitle);
        
        if (isDuplicate) {
          // 既に存在する場合は何もしない（無視）
          logger.debug('基礎練メニューが既に記録されています:', menuTitle);
          onClose();
          Alert.alert('情報', `${menuTitle}は既に記録されています`);
          onSaveComplete?.();
          return;
        }
        
        // 含まれていない場合: contentに追加
        const newContent = existingContent 
          ? `${existingContent}, ${menuTitle}`
          : menuTitle;
        
        if (!existing.id) {
          Alert.alert('エラー', '練習記録のIDが見つかりません');
          return;
        }
        
        // 既存の記録を更新（基礎練の場合はinput_methodも'preset'に設定）
        const { data: updatedSession, error: updateError } = await updatePracticeSession(existing.id, {
          content: newContent,
          input_method: 'preset', // 基礎練の場合は必ず'preset'に設定
        });
        
        if (updateError || !updatedSession) {
          Alert.alert('エラー', '練習記録の更新に失敗しました');
          return;
        }
      } else {
        // 新規記録を作成（基礎練は時間を追加しないため、duration_minutes: 0）
        const { data: createdSession, error: createError } = await createPracticeSession({
          user_id: authUser.id,
          practice_date: today,
          duration_minutes: 0, // 基礎練は時間を追加しない
          content: selectedMenu.title,
          input_method: 'preset',
          instrument_id: instrumentId,
        });
        
        if (createError || !createdSession) {
          Alert.alert('エラー', '練習記録の作成に失敗しました');
          return;
        }
      }

      // 即時反映: カレンダー画面への通知イベントを発火（楽観的更新）
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('practiceRecordUpdated', {
          detail: { 
            action: 'practice_saved',
            content: selectedMenu.title,
            verified: false, // DB反映前なのでfalse
            date: new Date().toISOString().split('T')[0] // 今日の日付
          }
        });
        window.dispatchEvent(event);
        logger.debug('基礎練記録の即時反映イベントを発火:', selectedMenu.title);
      }

      // モーダルを即座に閉じる（楽観的更新）
      onClose();
      
      // 成功メッセージ（非ブロッキング）
      Alert.alert('保存完了', `${selectedMenu.title}の練習記録を保存しました！`, [{ text: 'OK' }]);
      
      // コールバックを呼び出し
      onSaveComplete?.();
      
      // バックグラウンドでDB保存を確認（エラー時のみロールバック）
      // 既に保存済みなので、ここではエラーログのみ
      logger.debug('基礎練記録の保存が完了しました:', selectedMenu.title);
    } catch (error) {
      logger.error('練習記録保存エラー:', error);
      Alert.alert('エラー', '練習記録の保存に失敗しました');
    }
  };

  const handleYouTubeOpen = () => {
    if (!selectedMenu?.videoUrl) return;
    
    Alert.alert('YouTube再生', 'ブラウザでYouTube動画を開きます', [
      { text: 'キャンセル' },
      { 
        text: '開く', 
        onPress: () => {
          // 実際のアプリではLinking.openURL(selectedMenu.videoUrl)を使用
          logger.debug('Opening:', selectedMenu.videoUrl);
        }
      }
    ]);
  };

  // Webプラットフォームでのフォーカス管理（aria-hidden警告を防ぐため）
  useEffect(() => {
    if (Platform.OS === 'web') {
      if (visible) {
        disableBackgroundFocus();
      } else {
        enableBackgroundFocus();
      }
    }
    
    return () => {
      if (Platform.OS === 'web' && !visible) {
        enableBackgroundFocus();
      }
    };
  }, [visible]);

  if (!selectedMenu) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => {
        // モーダルを閉じる前にフォーカスを外す（aria-hidden警告を防ぐため）
        if (Platform.OS === 'web') {
          blurActiveElement();
          enableBackgroundFocus();
        }
        onClose();
      }}
    >
      <View style={styles.detailModalOverlay}>
        <View style={[styles.detailModalContent, { backgroundColor: currentTheme.background }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* ヘッダー */}
            <View style={[styles.detailHeader, { backgroundColor: currentTheme.primary }]}>
              <TouchableOpacity 
                onPress={onClose}
                style={styles.detailCloseButton}
              >
                <Text style={styles.detailCloseText}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.detailTitle}>{selectedMenu.title}</Text>
              <View style={styles.detailHeaderSpacer} />
            </View>

            <View style={styles.detailBody}>
              {/* 概要 */}
              <View style={styles.detailSection}>
                <Text style={[styles.detailSectionTitle, { color: currentTheme.text }]}>概要</Text>
                <Text style={[styles.detailSectionText, { color: currentTheme.textSecondary }]}>
                  {selectedMenu.description}
                </Text>
              </View>

              {/* YouTube動画 */}
              {selectedMenu.videoUrl && (
                <View style={styles.detailSection}>
                  <Text style={[styles.detailSectionTitle, { color: currentTheme.text }]}>参考動画</Text>
                  <TouchableOpacity
                    style={[styles.youtubeButton, { backgroundColor: '#FF0000' }]}
                    onPress={handleYouTubeOpen}
                  >
                    <Play size={20} color="#FFFFFF" />
                    <Text style={styles.youtubeButtonText}>YouTubeで見る</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* 練習の仕方 */}
              {selectedMenu.howToPractice && selectedMenu.howToPractice.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={[styles.detailSectionTitle, { color: currentTheme.text }]}>練習の仕方</Text>
                  {selectedMenu.howToPractice.map((step: string, index: number) => (
                    <View key={index} style={styles.stepItem}>
                      <Text style={[styles.stepText, { color: currentTheme.textSecondary }]}>{step}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* 推奨テンポ・時間 */}
              <View style={styles.detailInfoRow}>
                {selectedMenu.recommendedTempo && (
                  <View style={[styles.detailInfoCard, { backgroundColor: currentTheme.surface }]}>
                    <Text style={[styles.detailInfoLabel, { color: currentTheme.textSecondary }]}>推奨テンポ</Text>
                    <Text style={[styles.detailInfoValue, { color: currentTheme.primary }]}>
                      {selectedMenu.recommendedTempo}
                    </Text>
                  </View>
                )}
                {selectedMenu.duration && (
                  <View style={[styles.detailInfoCard, { backgroundColor: currentTheme.surface }]}>
                    <Text style={[styles.detailInfoLabel, { color: currentTheme.textSecondary }]}>練習時間</Text>
                    <Text style={[styles.detailInfoValue, { color: currentTheme.primary }]}>
                      {selectedMenu.duration}
                    </Text>
                  </View>
                )}
              </View>

              {/* 練習ポイント */}
              {selectedMenu.points && selectedMenu.points.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={[styles.detailSectionTitle, { color: currentTheme.text }]}>練習ポイント</Text>
                  {selectedMenu.points.map((point: string, index: number) => (
                    <View key={index} style={styles.detailPointItem}>
                      <View style={[styles.detailPointBullet, { backgroundColor: currentTheme.primary }]} />
                      <Text style={[styles.detailPointText, { color: currentTheme.textSecondary }]}>{point}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* 追加のヒント */}
              {selectedMenu.tips && selectedMenu.tips.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={[styles.detailSectionTitle, { color: currentTheme.text }]}>💡 追加のヒント</Text>
                  {selectedMenu.tips.map((tip: string, index: number) => (
                    <View key={index} style={styles.tipItem}>
                      <Text style={[styles.tipText, { color: currentTheme.textSecondary }]}>• {tip}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* アクションボタン */}
              <View style={styles.detailActions}>
                <TouchableOpacity
                  style={[styles.detailStartButton, { backgroundColor: currentTheme.primary }]}
                  onPress={handleSavePractice}
                >
                  <Play size={20} color="#FFFFFF" />
                  <Text style={styles.detailStartButtonText}>練習した！</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

