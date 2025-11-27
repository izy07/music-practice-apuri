/**
 * 練習メニュー詳細モーダルコンポーネント
 * 練習メニューの詳細情報を表示
 */

import React from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, Alert } from 'react-native';
import { Play } from 'lucide-react-native';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { useAuthAdvanced } from '@/hooks/useAuthAdvanced';
import logger from '@/lib/logger';
import { getCurrentUser } from '@/repositories/userRepository';
import { getPracticeSessionsByDate, updatePracticeSession, createPracticeSession } from '@/repositories/practiceSessionRepository';
import type { PracticeItem } from '../types/practice.types';
import { styles } from '../styles/styles';

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
      
      // 今日の既存の練習記録を取得
      const authUser = await getCurrentUser();
      if (!authUser) {
        Alert.alert('エラー', 'ログインが必要です');
        return;
      }

      const existingRecords = await getPracticeSessionsByDate(
        authUser.id,
        today,
        selectedInstrument || null
      );

      if (existingRecords.data && existingRecords.data.length > 0) {
        // 既存の記録がある場合は、時間を追加せずcontentだけを更新
        const existing = existingRecords.data[0];
        let existingContent = existing.content || '';
        
        // 既存のcontentから時間詳細を削除（「累計XX分」「XX分」などを削除）
        existingContent = existingContent
          .replace(/\s*\(累計\d+分\)/g, '') // 「（累計XX分）」を削除
          .replace(/\s*累計\d+分/g, '') // 「累計XX分」を削除
          .replace(/\s*\+\s*[^,]+?\d+分/g, '') // 「+ XX分」を削除
          .replace(/\s*[^,]+?\d+分/g, '') // 「XX分」を含む文字列を削除
          .replace(/練習記録/g, '') // 「練習記録」を削除
          .replace(/^[\s,]+|[\s,]+$/g, '') // 前後のカンマとスペースを削除
          .replace(/,\s*,/g, ',') // 連続するカンマを1つに
          .trim();
        
        // 基礎練のメニュー名を追加
        const newContent = existingContent 
          ? `${existingContent}, ${selectedMenu.title}`
          : selectedMenu.title;
        
        if (!existing.id) {
          Alert.alert('エラー', '練習記録のIDが見つかりません');
          return;
        }
        
        const success = await updatePracticeSession(existing.id, {
          content: newContent,
        });
        
        if (!success) {
          Alert.alert('エラー', '練習記録の更新に失敗しました');
          return;
        }
      } else {
        // 新規記録を作成（基礎練は時間を追加しないため、duration_minutes: 0）
        const success = await createPracticeSession({
          user_id: authUser.id,
          practice_date: today,
          duration_minutes: 0, // 基礎練は時間を追加しない
          content: selectedMenu.title,
          input_method: 'preset',
          instrument_id: selectedInstrument || null,
        });
        
        if (!success) {
          Alert.alert('エラー', '練習記録の作成に失敗しました');
          return;
        }
      }

      // 統計画面の更新通知を発火
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('practiceRecordUpdated', {
          detail: { 
            action: 'practice_saved',
            content: selectedMenu.title
          }
        });
        window.dispatchEvent(event);
      }

      onClose();
      Alert.alert('保存完了', `${selectedMenu.title}の練習記録を保存しました！`);
      onSaveComplete?.();
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

  if (!selectedMenu) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
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
                  {selectedMenu.howToPractice.map((step, index) => (
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
                  {selectedMenu.points.map((point, index) => (
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
                  {selectedMenu.tips.map((tip, index) => (
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

