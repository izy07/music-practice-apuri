/**
 * 練習メニュー詳細モーダルコンポーネント
 */
import React from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Play } from 'lucide-react-native';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { PracticeItem } from '@/lib/tabs/basic-practice/types';
import { styles } from '@/lib/tabs/basic-practice/styles';
import logger from '@/lib/logger';

interface DetailModalProps {
  visible: boolean;
  practiceItem: PracticeItem | null;
  onClose: () => void;
  onStartPractice: () => void;
}

export const DetailModal: React.FC<DetailModalProps> = ({
  visible,
  practiceItem,
  onClose,
  onStartPractice,
}) => {
  const { currentTheme } = useInstrumentTheme();

  if (!practiceItem) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.detailModalOverlay}>
        <View style={styles.detailModalContent}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* ヘッダー */}
            <View style={[styles.detailHeader, { backgroundColor: currentTheme.primary }]}>
              <TouchableOpacity 
                onPress={onClose}
                style={styles.detailCloseButton}
              >
                <Text style={styles.detailCloseText}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.detailTitle}>{practiceItem.title}</Text>
              <View style={styles.detailHeaderSpacer} />
            </View>

            <View style={styles.detailBody}>
              {/* 概要 */}
              <View style={styles.detailSection}>
                <Text style={[styles.detailSectionTitle, { color: currentTheme.text }]}>概要</Text>
                <Text style={[styles.detailSectionText, { color: currentTheme.textSecondary }]}>
                  {practiceItem.description}
                </Text>
              </View>

              {/* YouTube動画 */}
              {practiceItem.videoUrl && (
                <View style={styles.detailSection}>
                  <Text style={[styles.detailSectionTitle, { color: currentTheme.text }]}>参考動画</Text>
                  <TouchableOpacity
                    style={[styles.youtubeButton, { backgroundColor: '#FF0000' }]}
                    onPress={() => {
                      if (practiceItem.videoUrl) {
                        Alert.alert('YouTube再生', 'ブラウザでYouTube動画を開きます', [
                          { text: 'キャンセル' },
                          { text: '開く', onPress: () => {
                            logger.debug('Opening:', practiceItem.videoUrl);
                          }}
                        ]);
                      }
                    }}
                  >
                    <Play size={20} color="#FFFFFF" />
                    <Text style={styles.youtubeButtonText}>YouTubeで見る</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* 練習の仕方 */}
              {practiceItem.howToPractice && practiceItem.howToPractice.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={[styles.detailSectionTitle, { color: currentTheme.text }]}>練習の仕方</Text>
                  {practiceItem.howToPractice.map((step, index) => (
                    <View key={index} style={styles.stepItem}>
                      <Text style={[styles.stepText, { color: currentTheme.textSecondary }]}>{step}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* 推奨テンポ・時間 */}
              <View style={styles.detailInfoRow}>
                {practiceItem.recommendedTempo && (
                  <View style={styles.detailInfoCard}>
                    <Text style={[styles.detailInfoLabel, { color: currentTheme.textSecondary }]}>推奨テンポ</Text>
                    <Text style={[styles.detailInfoValue, { color: currentTheme.primary }]}>
                      {practiceItem.recommendedTempo}
                    </Text>
                  </View>
                )}
                {practiceItem.duration && (
                  <View style={styles.detailInfoCard}>
                    <Text style={[styles.detailInfoLabel, { color: currentTheme.textSecondary }]}>練習時間</Text>
                    <Text style={[styles.detailInfoValue, { color: currentTheme.primary }]}>
                      {practiceItem.duration}
                    </Text>
                  </View>
                )}
              </View>

              {/* 練習ポイント */}
              {practiceItem.points && practiceItem.points.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={[styles.detailSectionTitle, { color: currentTheme.text }]}>練習ポイント</Text>
                  {practiceItem.points.map((point, index) => (
                    <View key={index} style={styles.detailPointItem}>
                      <View style={[styles.detailPointBullet, { backgroundColor: currentTheme.primary }]} />
                      <Text style={[styles.detailPointText, { color: currentTheme.textSecondary }]}>{point}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* 追加のヒント */}
              {practiceItem.tips && practiceItem.tips.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={[styles.detailSectionTitle, { color: currentTheme.text }]}>💡 追加のヒント</Text>
                  {practiceItem.tips.map((tip, index) => (
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
                  onPress={onStartPractice}
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
};

