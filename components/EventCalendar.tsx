import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react-native';
import { useInstrumentTheme } from './InstrumentThemeContext';
import { formatLocalDate } from '@/lib/dateUtils';

const { width } = Dimensions.get('window');

interface Event {
  id: string;
  title: string;
  date: string;
  description?: string;
}

interface EventCalendarProps {
  onDateSelect?: (date: Date) => void;
  onEventSelect?: (event: Event) => void;
  events?: Event[];
}

export default function EventCalendar({ 
  onDateSelect, 
  onEventSelect, 
  events = [] 
}: EventCalendarProps) {
  const { currentTheme } = useInstrumentTheme();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // カレンダーの日付を生成
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // 月の最初の日
    const firstDay = new Date(year, month, 1);
    // 月の最後の日
    const lastDay = new Date(year, month + 1, 0);
    
    // 月の最初の日の曜日（0=日曜日）
    const firstDayOfWeek = firstDay.getDay();
    // 月の日数
    const daysInMonth = lastDay.getDate();
    
    // 前月の最後の日
    const prevMonthLastDay = new Date(year, month, 0);
    const daysInPrevMonth = prevMonthLastDay.getDate();
    
    const calendarDays = [];
    
    // 前月の日付を追加
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const date = new Date(year, month - 1, day);
      calendarDays.push({
        date,
        day,
        isCurrentMonth: false,
        isToday: false
      });
    }
    
    // 当月の日付を追加
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const today = new Date();
      calendarDays.push({
        date,
        day,
        isCurrentMonth: true,
        isToday: date.toDateString() === today.toDateString()
      });
    }
    
    // 翌月の日付を追加（6行×7列=42セルになるまで）
    const remainingCells = 42 - calendarDays.length;
    for (let day = 1; day <= remainingCells; day++) {
      const date = new Date(year, month + 1, day);
      calendarDays.push({
        date,
        day,
        isCurrentMonth: false,
        isToday: false
      });
    }
    
    return calendarDays;
  };

  // 月を変更
  const changeMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
    setSelectedDate(null);
  };

  // 日付を選択
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    onDateSelect?.(date);
  };

  // 指定された日付のイベントを取得
  const getEventsForDate = (date: Date) => {
    const dateString = formatLocalDate(date);
    return events.filter(event => event.date === dateString);
  };

  const calendarDays = generateCalendarDays();
  const monthNames = [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月'
  ];

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.background }]}>
      {/* 月ナビゲーション */}
      <View style={styles.monthHeader}>
        <TouchableOpacity
          style={[styles.navButton, { backgroundColor: currentTheme.secondary }]}
          onPress={() => changeMonth('prev')}
          activeOpacity={0.7}
        >
          <ChevronLeft size={20} color={currentTheme.text} />
        </TouchableOpacity>
        
        <Text style={[styles.monthText, { color: currentTheme.text }]}>
          {currentDate.getFullYear()}年{monthNames[currentDate.getMonth()]}
        </Text>
        
        <TouchableOpacity
          style={[styles.navButton, { backgroundColor: currentTheme.secondary }]}
          onPress={() => changeMonth('next')}
          activeOpacity={0.7}
        >
          <ChevronRight size={20} color={currentTheme.text} />
        </TouchableOpacity>
      </View>

      {/* 曜日ヘッダー */}
      <View style={styles.weekHeader}>
        {['日', '月', '火', '水', '木', '金', '土'].map((day, index) => (
          <View key={`weekday-${index}`} style={styles.weekHeaderCell}>
            <Text style={[styles.weekHeaderText, { color: currentTheme.text }]}>
              {day}
            </Text>
          </View>
        ))}
      </View>

      {/* カレンダーグリッド */}
      <View style={styles.calendarGrid}>
        {calendarDays.map((dayData, index) => {
          const dayEvents = getEventsForDate(dayData.date);
          const isSelected = selectedDate && 
            selectedDate.toDateString() === dayData.date.toDateString();
          
          return (
            <TouchableOpacity
              key={`day-${index}`}
              style={[
                styles.dayCell,
                {
                  backgroundColor: isSelected 
                    ? currentTheme.primary 
                    : dayData.isToday 
                      ? currentTheme.secondary 
                      : 'transparent',
                  borderColor: currentTheme.secondary,
                }
              ]}
              onPress={() => handleDateSelect(dayData.date)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.dayText,
                {
                  color: isSelected 
                    ? '#FFFFFF' 
                    : dayData.isCurrentMonth 
                      ? currentTheme.text 
                      : currentTheme.textSecondary,
                  fontWeight: dayData.isToday ? 'bold' : 'normal'
                }
              ]}>
                {dayData.day}
              </Text>
              
              {/* イベントインジケーター */}
              {dayEvents.length > 0 && (
                <View style={styles.eventIndicator}>
                  <Text style={[styles.eventIndicatorText, { color: currentTheme.primary }]}>
                    ●
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 選択された日付のイベント表示 */}
      {selectedDate && (
        <View style={[styles.selectedDateInfo, { backgroundColor: currentTheme.surface }]}>
          <Text style={[styles.selectedDateText, { color: currentTheme.text }]}>
            {selectedDate.getFullYear()}年{selectedDate.getMonth() + 1}月{selectedDate.getDate()}日
          </Text>
          <TouchableOpacity
            style={[styles.addEventButton, { backgroundColor: currentTheme.primary }]}
            onPress={() => onDateSelect?.(selectedDate)}
            activeOpacity={0.7}
          >
            <Plus size={16} color="#FFFFFF" />
            <Text style={styles.addEventButtonText}>イベント追加</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12, // パディングを小さく
    borderRadius: 12,
    margin: 12, // マージンを小さく
    
    
    elevation: 5,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16, // マージンを小さく
    paddingHorizontal: 8,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthText: {
    fontSize: 18,
    fontWeight: '600',
  },
  weekHeader: {
    flexDirection: 'row',
    marginBottom: 6, // マージンを小さく
  },
  weekHeaderCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6, // パディングを小さく
  },
  weekHeaderText: {
    fontSize: 13, // フォントサイズを小さく
    fontWeight: '500',
    paddingTop: 4,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 0,
  },
  dayCell: {
    width: (width - 64) / 7 - 4, // 画面幅に基づいて7列で表示、マージンを小さく
    height: ((width - 64) / 7 - 4) * 0.85, // 高さを85%に調整
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderRadius: 0,
    position: 'relative',
    margin: 2,
  },
  dayText: {
    fontSize: 14, // フォントサイズを小さく
    textAlign: 'center',
  },
  eventIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
  },
  eventIndicatorText: {
    fontSize: 12,
  },
  selectedDateInfo: {
    marginTop: 16,
    padding: 16,
    borderRadius: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedDateText: {
    fontSize: 16,
    fontWeight: '500',
  },
  addEventButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 0,
  },
  addEventButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
});
