import React, { memo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

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
  dayEvents: Array<{id: string, title: string, description?: string}>;
  isToday: boolean;
  isSunday: boolean;
  isSaturday: boolean;
  currentTheme: InstrumentTheme;
  onDatePress: (date: Date) => void;
  onEventPress: (event: {id: string, title: string, description?: string}) => void;
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
    const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    onDatePress(selectedDate);
  }, [currentDate, day, onDatePress]);

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
      
      {dayEvents && dayEvents.length > 0 && (
        <TouchableOpacity
          style={styles.eventIndicator}
          onPress={handleEventPress}
          activeOpacity={0.7}
        >
          <Text style={styles.eventIndicatorText} numberOfLines={1}>
            {dayEvents[0].title}
          </Text>
        </TouchableOpacity>
      )}
      
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

