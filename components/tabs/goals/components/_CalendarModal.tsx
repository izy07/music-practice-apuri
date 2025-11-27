/**
 * カレンダーモーダルコンポーネント
 */
import React from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { styles } from '@/lib/tabs/goals/styles';

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

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
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

