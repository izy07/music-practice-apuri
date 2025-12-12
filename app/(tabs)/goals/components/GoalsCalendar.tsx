import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { styles } from '@/lib/tabs/goals/styles';

interface GoalsCalendarProps {
  visible: boolean;
  currentMonth: Date;
  onClose: () => void;
  onSelectDate: (date: Date) => void;
  onChangeMonth: (direction: 'prev' | 'next') => void;
  currentTheme: {
    primary: string;
    text: string;
    textSecondary: string;
    background: string;
  };
}

const GoalsCalendar: React.FC<GoalsCalendarProps> = ({
  visible,
  currentMonth,
  onClose,
  onSelectDate,
  onChangeMonth,
  currentTheme,
}) => {
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const days: Array<{ day: number; isCurrentMonth: boolean; date: Date }> = [];
    
    // 前月の日付
    for (let i = 0; i < startingDay; i++) {
      const prevMonth = new Date(year, month - 1, 0);
      const day = prevMonth.getDate() - startingDay + i + 1;
      days.push({ day, isCurrentMonth: false, date: new Date(year, month - 1, day) });
    }
    
    // 今月の日付
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, isCurrentMonth: true, date: new Date(year, month, i) });
    }
    
    // 翌月の日付（7の倍数になるまで）
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({ day: i, isCurrentMonth: false, date: new Date(year, month + 1, i) });
    }
    
    return days;
  };

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

          {/* 閉じるボタン */}
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

export default GoalsCalendar;
