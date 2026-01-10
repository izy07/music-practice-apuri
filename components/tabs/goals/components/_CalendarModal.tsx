/**
 * カレンダーモーダルコンポーネント
 */
import React, { useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, Platform } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { styles } from '@/lib/tabs/goals/styles';
import { disableBackgroundFocus, enableBackgroundFocus, blurActiveElement } from '@/lib/modalFocusManager';

interface CalendarModalProps {
  visible: boolean;
  currentMonth: Date;
  onClose: () => void;
  onChangeMonth: (direction: 'prev' | 'next') => void;
  onSelectDate: (date: Date) => void;
  getDaysInMonth: (date: Date) => Array<{ day: number; isCurrentMonth: boolean; date: Date }>;
}

export const CalendarModal: React.FC<CalendarModalProps> = ({
  visible,
  currentMonth,
  onClose,
  onChangeMonth,
  onSelectDate,
  getDaysInMonth,
}) => {
  const { currentTheme } = useInstrumentTheme();

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

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {
        // モーダルを閉じる前にフォーカスを外す（aria-hidden警告を防ぐため）
        if (Platform.OS === 'web') {
          blurActiveElement();
          enableBackgroundFocus();
        }
        onClose();
      }}
    >
      <View style={styles.calendarOverlay}>
        <View style={styles.calendarModal}>
          <View style={styles.calendarHeader}>
            <TouchableOpacity onPress={() => onChangeMonth('prev')}>
              <ChevronLeft size={24} color="#666666" />
            </TouchableOpacity>
            <Text style={styles.calendarTitle}>
              {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
            </Text>
            <TouchableOpacity onPress={() => onChangeMonth('next')}>
              <ChevronRight size={24} color="#666666" />
            </TouchableOpacity>
          </View>

          <View style={styles.calendarGrid}>
            {getDaysInMonth(currentMonth).map((dayData, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.calendarDay,
                  !dayData.isCurrentMonth && styles.calendarDayOtherMonth,
                ]}
                onPress={() => onSelectDate(dayData.date)}
              >
                <Text style={[
                  styles.calendarDayText,
                  { color: dayData.isCurrentMonth ? currentTheme.text : currentTheme.textSecondary },
                ]}>
                  {dayData.day}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.calendarCloseButton, { backgroundColor: currentTheme.primary }]}
            onPress={onClose}
          >
            <Text style={styles.calendarCloseButtonText}>閉じる</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

