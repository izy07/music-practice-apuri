import React, { memo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { getEventColorCode, EventColor } from '@/lib/eventColors';

const { width } = Dimensions.get('window');

// 画面サイズに応じたフォントサイズの計算
const getEventFontSize = () => {
  // 画面幅に基づいてフォントサイズを調整
  // 小さい画面（iPhone SEなど）ではより小さく
  if (width < 375) {
    return 6; // 非常に小さい画面
  } else if (width < 414) {
    return 7; // 中程度の画面
  } else {
    return 8; // 大きい画面
  }
};

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
  dayEvents: Array<{id: string, title: string, description?: string, location?: string | null, color?: EventColor | string | null, date?: string}>;
  isToday: boolean;
  isSunday: boolean;
  isSaturday: boolean;
  currentTheme: InstrumentTheme;
  onDatePress: (date: Date) => void;
  onEventPress: (event: {id: string, title: string, description?: string, location?: string | null, color?: EventColor | string | null, date?: string}) => void;
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
    // 日付セルをタップすると練習記録画面を開く（イベントがあっても開く）
    const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    onDatePress(selectedDate);
  }, [currentDate, day, onDatePress]);

  return (
    <TouchableOpacity
      style={[
        styles.dayCell,
        isToday && styles.todayCell,
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
      delayPressIn={50} // 子要素のイベントが先に処理されるように少し遅延
      accessibilityRole="button"
      accessibilityLabel={`${currentDate.getFullYear()}年${currentDate.getMonth() + 1}月${day}日${isToday ? '、今日' : ''}${hasPracticeRecord ? '、練習記録あり' : ''}${hasRecording ? '、録音あり' : ''}${hasBasicPractice ? '、基礎練あり' : ''}${dayEvents && dayEvents.length > 0 ? `、イベント: ${dayEvents[0].title}` : ''}`}
      accessibilityHint="日付をタップして練習記録を追加します"
    >
      {/* 日付を上部に配置 */}
      <Text style={[
        styles.dayText,
        isSunday && styles.sundayText,
        isSaturday && styles.saturdayText,
      ]}>
        {day}
      </Text>
      
      {/* イベントを中央に配置 */}
      {dayEvents && dayEvents.length > 0 && (() => {
        const event = dayEvents[0];
        const eventColor = getEventColorCode(event.color);
        return (
        <View
            style={[
              styles.eventIndicator,
              {
                backgroundColor: '#FFFFFF',
                borderColor: eventColor,
              },
            ]}
        >
            <Text 
              style={[
                styles.eventIndicatorText,
                { 
                  color: eventColor,
                  fontSize: getEventFontSize(),
                },
              ]} 
              numberOfLines={1}
              adjustsFontSizeToFit={true}
              minimumFontScale={0.5}
            >
              {event.title}
          </Text>
        </View>
        );
      })()}
      
      <View style={styles.indicatorsContainer}>
        {hasPracticeRecord && hasRecording ? (
          <View style={[styles.bothIndicator, { backgroundColor: '#CC0000' }]} />
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
    // 親グリッドでjustifyContent:'space-between'を使って横余白を作るため、
    // 幅を7等分より少し小さくして余白分を確保する
    width: '13.6%',
    height: 55,
    justifyContent: 'flex-start',
    alignItems: 'center',
    borderRadius: 4,
    marginHorizontal: 0,
    marginVertical: 0.5,
    backgroundColor: '#E8E8E8',
    position: 'relative',
    paddingVertical: 0,
    paddingTop: 2,
  },
  todayCell: {
    backgroundColor: '#E3F2FD',
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
    textAlign: 'center',
    position: 'absolute',
    top: 2,
    left: 0,
    right: 0,
    lineHeight: 16,
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
    top: 16,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: 2,
    borderWidth: 1,
    height: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  eventIndicatorText: {
    fontSize: 8, // デフォルト値（インラインスタイルで上書きされる）
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 10,
    flexShrink: 0,
    paddingHorizontal: 0,
    includeFontPadding: false,
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
  eventCreateButton: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
});

export default CalendarDayCell;

