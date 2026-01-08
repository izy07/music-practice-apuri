import React, { memo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { getEventColorCode, EventColor } from '@/lib/eventColors';

// テーマの型定義
interface InstrumentTheme {
  background: string;
  surface: string;
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  textSecondary: string;
}

interface CalendarDayCellProps {
  day: number;
  currentDate: Date;
  hasPracticeRecord: boolean; // 練習時間が記録されたか（タイマー、クイック、手動入力など）
  hasBasicPractice: boolean; // 基礎練（input_method: 'preset'）があるか
  hasRecording: boolean;
  dayEvents: Array<{id: string, title: string, description?: string, color?: EventColor | string | null}>;
  isToday: boolean;
  isSunday: boolean;
  isSaturday: boolean;
  currentTheme: InstrumentTheme;
  onDatePress: (date: Date) => void;
  onEventPress: (event: {id: string, title: string, description?: string, color?: EventColor | string | null}) => void;
}

const CalendarDayCell = memo((props: CalendarDayCellProps): React.ReactElement => {
  const { 
    day, 
    currentDate, 
    hasPracticeRecord, 
    hasBasicPractice,
    hasRecording, 
    dayEvents = [], 
    isToday, 
    isSunday, 
    isSaturday,
    currentTheme,
    onDatePress,
    onEventPress
  } = props;
  
  const handlePress = useCallback(() => {
    // イベントがある場合は、日付セルをタップしても編集モーダルを開かない
    if (dayEvents && dayEvents.length > 0) {
      return;
    }
    const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    onDatePress(selectedDate);
  }, [currentDate, day, onDatePress, dayEvents]);

  const handleEventPress = useCallback(() => {
    if (dayEvents && dayEvents.length > 0) {
      onEventPress(dayEvents[0]);
    }
  }, [dayEvents, onEventPress]);

  return (
    <TouchableOpacity
      style={[
        styles.dayCell,
        isToday && styles.todayCell,
      ]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${currentDate.getFullYear()}年${currentDate.getMonth() + 1}月${day}日${isToday ? '、今日' : ''}${hasPracticeRecord ? '、練習記録あり' : ''}${hasRecording ? '、録音あり' : ''}${hasBasicPractice ? '、基礎練あり' : ''}${dayEvents.length > 0 ? `、イベント: ${dayEvents[0].title}` : ''}`}
      accessibilityHint={dayEvents.length > 0 ? "イベントをタップして詳細を表示します" : "日付をタップして練習記録を追加します"}
    >
      <Text style={[
        styles.dayText,
        isSunday && styles.sundayText,
        isSaturday && styles.saturdayText,
      ]}>
        {day}
      </Text>
      
      <View style={styles.indicatorsContainer}>
        {hasPracticeRecord && hasRecording ? (
          <View style={[styles.bothIndicator, { backgroundColor: currentTheme.accent }]} />
        ) : (
          <>
            {/* 練習時間が記録された場合、色マークを表示 */}
            {hasPracticeRecord && (
              <View style={[styles.practiceIndicator, { backgroundColor: currentTheme.primary }]} />
            )}
            {hasRecording && (
              <View style={styles.recordingIndicator} />
            )}
          </>
        )}
      </View>
      
      {dayEvents && dayEvents.length > 0 && (() => {
        const event = dayEvents[0];
        const eventColor = getEventColorCode(event.color);
        return (
          <TouchableOpacity
            style={[
              styles.eventIndicator,
              {
                backgroundColor: `${eventColor}20`,
                borderColor: eventColor,
              },
            ]}
            onPress={handleEventPress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`イベント: ${event.title}`}
            accessibilityHint="イベントの詳細を表示します"
          >
            <Text 
              style={[
                styles.eventIndicatorText,
                { color: eventColor },
              ]} 
              numberOfLines={1}
            >
              {event.title}
            </Text>
          </TouchableOpacity>
        );
      })()}
      
      {/* 基礎練メニューで「練習した！」ボタンが押された場合、✅マークを表示 */}
      {hasBasicPractice && (
        <View style={styles.checkmarkContainer}>
          <Text style={styles.checkmark}>✅</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  // カスタム比較関数で不要な再レンダリングを防ぐ
  const prevDayEvents = prevProps.dayEvents || [];
  const nextDayEvents = nextProps.dayEvents || [];
  return (
    prevProps.day === nextProps.day &&
    prevProps.hasPracticeRecord === nextProps.hasPracticeRecord &&
    prevProps.hasBasicPractice === nextProps.hasBasicPractice &&
    prevProps.hasRecording === nextProps.hasRecording &&
    prevDayEvents.length === nextDayEvents.length &&
    prevProps.isToday === nextProps.isToday &&
    prevProps.currentTheme.primary === nextProps.currentTheme.primary
  );
});

CalendarDayCell.displayName = 'CalendarDayCell';

const styles = StyleSheet.create({
  dayCell: {
    width: '13.5%',
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    margin: 1,
    backgroundColor: '#E8E8E8',
    position: 'relative',
    paddingVertical: 6,
  },
  todayCell: {
    backgroundColor: '#E3F2FD',
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  dayText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    textAlign: 'center',
  },
  sundayText: {
    color: '#FF6B6B',
  },
  saturdayText: {
    color: '#4ECDC4',
  },
  indicatorsContainer: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    flexDirection: 'row',
    gap: 4,
  },
  practiceIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2196F3',
  },
  recordingIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF4444',
  },
  bothIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#9C27B0',
  },
  eventIndicator: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    right: 2,
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 2,
    paddingVertical: 1,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#2196F3',
    maxHeight: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventIndicatorText: {
    fontSize: 7,
    color: '#1976D2',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 9,
  },
  checkmarkContainer: {
    position: 'absolute',
    bottom: 3,
    right: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    fontSize: 12,
    lineHeight: 12,
  },
});

export default CalendarDayCell;

