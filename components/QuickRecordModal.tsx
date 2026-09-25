import React, { useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  Dimensions,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useInstrumentTheme } from './InstrumentThemeContext';
import { useAuthAdvanced } from '@/hooks/useAuthAdvanced';
import { useSubscription } from '@/hooks/useSubscription';
import { savePracticeSessionWithIntegration } from '@/repositories/practiceSessionRepository';
import { canSaveDataForInstrument } from '@/lib/subscriptionLimits';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import { createShadowStyle } from '@/lib/shadowStyles';
import { formatLocalDate } from '@/lib/dateUtils';
import { getInstrumentId } from '@/lib/instrumentUtils';
import { useRouter } from 'expo-router';
import { disableBackgroundFocus, enableBackgroundFocus, blurActiveElement } from '@/lib/modalFocusManager';
import { readableTextColor } from '@/lib/colors';
import { trackFeatureAction } from '@/lib/featureUsageService';
import { FEATURE_IDS } from '@/lib/featureUsageEvents';

interface QuickRecordModalProps {
  visible: boolean;
  onClose: () => void;
  onRecord: (minutes: number) => void;
  // カレンダー等で選択中の日付に紐付けたい場合に指定（未指定なら今日）
  targetDate?: Date | null;
}

const { height } = Dimensions.get('window');

const QuickRecordModal = React.memo(function QuickRecordModal({ visible, onClose, onRecord, targetDate }: QuickRecordModalProps) {
  const { currentTheme, selectedInstrument } = useInstrumentTheme();
  const { user } = useAuthAdvanced();
  const { entitlement } = useSubscription();
  const router = useRouter();

  const savePracticeRecordWithIntegration = async (minutes: number) => {
    try {
      if (!user) {
        throw new Error('ユーザーが認証されていません');
      }

      const resolvedDate = targetDate || new Date();
      const practiceDate = formatLocalDate(resolvedDate);

      const currentInstrumentId = getInstrumentId(selectedInstrument);
      
      const canSaveCheck = await canSaveDataForInstrument(user.id, currentInstrumentId, entitlement);
      if (!canSaveCheck.canSave) {
        Alert.alert(
          'アップグレードが必要です',
          canSaveCheck.reason || '新しい楽器で練習記録を追加するには、プレミアムへアップグレードしてください。',
          [
            { text: 'キャンセル', style: 'cancel' },
            { text: 'プレミアムを見る', onPress: () => router.push('/(tabs)/pricing-plans') }
          ]
        );
        return;
      }
      
      // input_method: 'voice' は既存のクイック記録と互換のため維持（音声入力機能自体は削除済み）
      const result = await savePracticeSessionWithIntegration(
        user.id,
        minutes,
        {
          instrumentId: currentInstrumentId,
          content: 'クイック記録',
          inputMethod: 'voice',
          existingContentPrefix: 'クイック記録',
          practiceDate,
        }
      );

      if (!result.success) {
        const errorMessage = result.error?.message || '練習記録の保存に失敗しました';
        
        if (result.error?.code === 'PGRST205' || result.error?.code === 'PGRST116') {
          Alert.alert('エラー', 'データベースの設定が完了していません。管理者にお問い合わせください。');
          throw new Error('データベースの設定が完了していません');
        }
        
        throw result.error || new Error(errorMessage);
      }

      logger.info(`クイック記録を保存: ${minutes}分`, {
        practiceDate,
        instrumentId: currentInstrumentId
      });

      void trackFeatureAction(
        user.id,
        FEATURE_IDS.calendar,
        'quick_record',
        { platform: Platform.OS, minutes },
        currentInstrumentId
      );

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('practiceRecordUpdated', {
          detail: {
            action: 'practice_saved',
            date: resolvedDate,
            source: 'quick_record',
            minutes: minutes,
            verified: true
          }
        }));
        logger.debug('クイック記録保存の即時反映イベントを発火:', { minutes, date: resolvedDate });
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

  const handleTimeSelect = async (minutes: number) => {
    try {
      await savePracticeRecordWithIntegration(minutes);
      onRecord(minutes);
      onClose();
    } catch (error) {
      ErrorHandler.handle(error, '練習記録の保存', true);
      const errorMessage = error instanceof Error ? error.message : '練習記録の保存に失敗しました';
      
      if (!errorMessage.includes('データベース')) {
        Alert.alert('エラー', errorMessage);
      }
    }
  };

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
      onRequestClose={() => {
        if (Platform.OS === 'web') {
          blurActiveElement();
          enableBackgroundFocus();
        }
        onClose();
      }}
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
            <View style={styles.manualSection}>
              <Text style={styles.manualTitle}>練習時間を選択</Text>
              <View style={styles.timeGrid}>
                {timeOptions.map((option) => (
                  <TouchableOpacity
                    key={`time-option-${option.minutes}`}
                    style={[styles.timeButton, getTimeButtonStyle(), { backgroundColor: currentTheme.secondary }]}
                    onPress={() => handleTimeSelect(option.minutes)}
                  >
                    <Text style={[styles.timeButtonText, { color: readableTextColor(currentTheme.secondary) }]}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
});

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
});

export default QuickRecordModal;
