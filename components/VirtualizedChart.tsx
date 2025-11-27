// 仮想化されたグラフコンポーネント
import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import Svg, { Rect, G, Line, Text as SvgText } from 'react-native-svg';

const { width } = Dimensions.get('window');

interface VirtualizedBarChartProps {
  data: DayData[];
  maxValue: number;
  barColor: string;
  weekdays?: string[];
  onVisibleRangeChange?: (startIndex: number, endIndex: number) => void;
}

interface DayData {
  dateLabel: string;
  minutes: number;
}

export const VirtualizedBarChart: React.FC<VirtualizedBarChartProps> = ({
  data,
  maxValue,
  barColor,
  weekdays,
  onVisibleRangeChange
}) => {
  const chartWidth = width - 40;
  const chartHeight = 260;
  const barGap = 8;
  
  // 仮想化設定
  const ITEM_HEIGHT = 50;
  const VISIBLE_ITEMS = Math.ceil(chartHeight / ITEM_HEIGHT) + 2;
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: VISIBLE_ITEMS });
  
  // 表示するバーの数を制限（パフォーマンス向上）
  const MAX_VISIBLE_BARS = 30;
  const visibleData = useMemo(() => {
    if (data.length <= MAX_VISIBLE_BARS) return data;
    
    // データが多い場合は間引き
    const step = Math.ceil(data.length / MAX_VISIBLE_BARS);
    return data.filter((_, index) => index % step === 0);
  }, [data]);

  const safeMax = Math.max(1, maxValue);
  const barWidth = Math.max(6, Math.floor((chartWidth - barGap * (visibleData.length - 1)) / Math.max(1, visibleData.length)));

  // メモ化されたバー描画
  const renderBars = useMemo(() => {
    const startIndex = Math.max(0, visibleRange.start);
    const endIndex = Math.min(visibleData.length, visibleRange.end);
    
    return visibleData.slice(startIndex, endIndex).map((item, index) => {
      const actualIndex = startIndex + index;
      const height = Math.max(2, Math.round((item.minutes / safeMax) * (chartHeight - 26) * 0.75));
      const x = actualIndex * (barWidth + barGap);
      const y = chartHeight - 26 - height;

      return (
        <G key={actualIndex}>
          <Rect
            x={x}
            y={y}
            width={barWidth}
            height={height}
            fill={barColor}
            rx={2}
          />
          <SvgText
            x={x + barWidth / 2}
            y={chartHeight - 5}
            fontSize="10"
            fill="#666"
            textAnchor="middle"
          >
            {item.dateLabel}
          </SvgText>
        </G>
      );
    });
  }, [visibleData, safeMax, barColor, barWidth, chartHeight, visibleRange]);

  // スクロールハンドラー
  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset } = event.nativeEvent;
    const start = Math.floor(contentOffset.y / ITEM_HEIGHT);
    const end = Math.min(start + VISIBLE_ITEMS, visibleData.length);
    
    setVisibleRange({ start, end });
    onVisibleRangeChange?.(start, end);
  }, [visibleData.length, onVisibleRangeChange]);

  return (
    <View style={styles.chartContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ width: Math.max(chartWidth, visibleData.length * (barWidth + barGap)) }}
      >
        <Svg width={Math.max(chartWidth, visibleData.length * (barWidth + barGap))} height={chartHeight}>
          {renderBars}
        </Svg>
      </ScrollView>
    </View>
  );
};

// レイジーローディング用の統計コンポーネント
export const LazyStatisticsChart: React.FC<{
  data: DayData[];
  maxValue: number;
  barColor: string;
  onLoad?: () => void;
}> = ({ data, maxValue, barColor, onLoad }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [chartRef, setChartRef] = useState<View | null>(null);

  // Intersection Observer的な実装（簡略版）
  const handleLayout = useCallback(() => {
    if (chartRef) {
      chartRef.measure((x, y, width, height, pageX, pageY) => {
        // 画面内に表示されているかチェック
        const screenHeight = Dimensions.get('window').height;
        if (pageY < screenHeight && pageY + height > 0) {
          setIsVisible(true);
        }
      });
    }
  }, [chartRef]);

  // レイジーローディング
  useEffect(() => {
    if (isVisible && !hasLoaded) {
      setHasLoaded(true);
      onLoad?.();
    }
  }, [isVisible, hasLoaded, onLoad]);

  return (
    <View 
      ref={setChartRef}
      onLayout={handleLayout}
      style={styles.lazyContainer}
    >
      {isVisible ? (
        <VirtualizedBarChart
          data={data}
          maxValue={maxValue}
          barColor={barColor}
        />
      ) : (
        <View style={styles.placeholder}>
          <Text>読み込み中...</Text>
        </View>
      )}
    </View>
  );
};

// メモ化された統計サマリーコンポーネント
export const MemoizedStatisticsSummary: React.FC<{
  totalMinutes: number;
  averageDailyMinutes: number;
  streakDays: number;
  textColor: string;
  secondaryTextColor: string;
}> = React.memo(({ totalMinutes, averageDailyMinutes, streakDays, textColor, secondaryTextColor }) => {
  const formatTime = useCallback((minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}時間${mins}分` : `${mins}分`;
  }, []);

  return (
    <View style={styles.summaryContainer}>
      <View style={styles.summaryItem}>
        <Text style={[styles.summaryValue, { color: textColor }]}>
          {formatTime(totalMinutes)}
        </Text>
        <Text style={[styles.summaryLabel, { color: secondaryTextColor }]}>
          総練習時間
        </Text>
      </View>
      
      <View style={styles.summaryItem}>
        <Text style={[styles.summaryValue, { color: textColor }]}>
          {formatTime(Math.round(averageDailyMinutes))}
        </Text>
        <Text style={[styles.summaryLabel, { color: secondaryTextColor }]}>
          平均練習時間
        </Text>
      </View>
      
      <View style={styles.summaryItem}>
        <Text style={[styles.summaryValue, { color: textColor }]}>
          {streakDays}日
        </Text>
        <Text style={[styles.summaryLabel, { color: secondaryTextColor }]}>
          連続練習日
        </Text>
      </View>
    </View>
  );
});

// 仮想化されたリストコンポーネント
export const VirtualizedList: React.FC<{
  data: any[];
  renderItem: (item: any, index: number) => React.ReactNode;
  itemHeight: number;
  containerHeight: number;
}> = ({ data, renderItem, itemHeight, containerHeight }) => {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: Math.ceil(containerHeight / itemHeight) + 2 });
  
  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset } = event.nativeEvent;
    const start = Math.floor(contentOffset.y / itemHeight);
    const end = Math.min(start + Math.ceil(containerHeight / itemHeight) + 2, data.length);
    
    setVisibleRange({ start, end });
  }, [data.length, itemHeight, containerHeight]);

  const visibleItems = useMemo(() => {
    return data.slice(visibleRange.start, visibleRange.end);
  }, [data, visibleRange]);

  return (
    <ScrollView
      style={{ height: containerHeight }}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ height: data.length * itemHeight }}>
        <View style={{ transform: [{ translateY: visibleRange.start * itemHeight }] }}>
          {visibleItems.map((item, index) => (
            <View key={visibleRange.start + index} style={{ height: itemHeight }}>
              {renderItem(item, visibleRange.start + index)}
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  lazyContainer: {
    minHeight: 260,
  },
  placeholder: {
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
});