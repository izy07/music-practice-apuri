import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useInstrumentTheme } from './InstrumentThemeContext';
import { formatLocalDate } from '@/lib/dateUtils';
import { createShadowStyle } from '@/lib/shadowStyles';

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

  // 月の日数を取得
  const getDaysInMonth = useCallback((date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }, []);

  // 月の最初の日の曜日を取得
  const getFirstDayOfMonth = useCallback((date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  }, []);

  // カレンダーの日付を生成（組織の練習日程と同じロジック）
  const days = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDayOfWeek = getFirstDayOfMonth(currentDate);
    
    const daysArray = [];
    
    // 前月の日付を追加
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i;
      const date = new Date(year, month - 1, day);
      daysArray.push({
        date,
        isCurrentMonth: false
      });
    }
    
    // 当月の日付を追加
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      daysArray.push({
        date,
        isCurrentMonth: true
      });
    }
    
    // 翌月の日付を追加（6行×7列=42セルになるまで）
    const remainingCells = 42 - daysArray.length;
    for (let day = 1; day <= remainingCells; day++) {
      const date = new Date(year, month + 1, day);
      daysArray.push({
        date,
        isCurrentMonth: false
      });
    }
    
    return daysArray;
  }, [currentDate, getDaysInMonth, getFirstDayOfMonth]);

  // 月を変更
  const navigateMonth = useCallback((direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(currentDate.getMonth() - 1);
    } else {
      newDate.setMonth(currentDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  }, [currentDate]);

  // 日付を選択
  const handleDateSelect = useCallback((date: Date) => {
    if (onDateSelect) {
      onDateSelect(date);
    }
  }, [onDateSelect]);

  // 指定された日付のイベントを取得
  const getEventsForDate = useCallback((date: Date) => {
    const dateString = formatLocalDate(date);
    return events.filter(event => event.date === dateString);
  }, [events]);

  // 今日かどうかをチェック
  const isToday = useCallback((date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }, []);

  return (
    <View style={[styles.calendar, { backgroundColor: '#fff' }]}>
      {/* 月ナビゲーション */}
      <View style={styles.monthNavigation}>
        <TouchableOpacity onPress={() => navigateMonth('prev')}>
          <ChevronLeft size={24} color={currentTheme.text} />
        </TouchableOpacity>
        <Text style={[styles.monthTitle, { color: currentTheme.text }]}>
          {currentDate.getFullYear()}年{currentDate.getMonth() + 1}月
        </Text>
        <TouchableOpacity onPress={() => navigateMonth('next')}>
          <ChevronRight size={24} color={currentTheme.text} />
        </TouchableOpacity>
      </View>

      {/* 曜日ヘッダー */}
      <View style={styles.weekHeader}>
        {['日', '月', '火', '水', '木', '金', '土'].map((day) => (
          <Text key={day} style={[styles.weekDay, { color: currentTheme.textSecondary }]}>
            {day}
          </Text>
        ))}
      </View>

      {/* 日付グリッド */}
      <View style={styles.daysGrid}>
        {days.map((day, index) => {
          const dayEvents = getEventsForDate(day.date);
          const isCurrentDay = isToday(day.date);
          
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.dayCell,
                { 
                  backgroundColor: day.isCurrentMonth ? 'transparent' : currentTheme.surface,
                  borderColor: isCurrentDay ? currentTheme.primary : 'transparent',
                  borderWidth: isCurrentDay ? 2 : 0
                }
              ]}
              onPress={() => {
                if (day.isCurrentMonth) {
                  handleDateSelect(day.date);
                }
              }}
            >
              <Text style={[
                styles.dayText,
                { 
                  color: day.isCurrentMonth ? currentTheme.text : currentTheme.textSecondary,
                  fontWeight: isCurrentDay ? 'bold' : 'normal'
                }
              ]}>
                {day.date.getDate()}
              </Text>
              
              {/* イベントの色付きドット */}
              {dayEvents.length > 0 && (
                <View style={styles.scheduleDots}>
                  {dayEvents.slice(0, 3).map((event, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.scheduleDot,
                        { backgroundColor: currentTheme.primary }
                      ]}
                    />
                  ))}
                  {dayEvents.length > 3 && (
                    <Text style={[styles.moreDots, { color: currentTheme.textSecondary }]}>
                      +{dayEvents.length - 3}
                    </Text>
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  calendar: {
    marginHorizontal: 20,
    marginTop: 0,
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 0,
    elevation: 4,
    ...createShadowStyle({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 4,
    }),
  },
  monthNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  weekHeader: {
    flexDirection: 'row',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
    position: 'relative',
    minHeight: 40,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
  },
  scheduleDots: {
    position: 'absolute',
    bottom: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  scheduleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 2,
  },
  moreDots: {
    fontSize: 10,
    marginLeft: 2,
  },
});
