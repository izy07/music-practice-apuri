// パフォーマンステスト用のコンポーネント
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { statisticsCache } from '@/hooks/useOptimizedStatistics';

interface PerformanceMetrics {
  dataFetchTime: number;
  processingTime: number;
  renderTime: number;
  memoryUsage: number;
  cacheHitRate: number;
  cacheSize: number;
}

export const PerformanceMonitor: React.FC<{
  onMetricsUpdate: (metrics: PerformanceMetrics) => void;
}> = ({ onMetricsUpdate }) => {
  const { currentTheme } = useInstrumentTheme();
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    dataFetchTime: 0,
    processingTime: 0,
    renderTime: 0,
    memoryUsage: 0,
    cacheHitRate: 0,
    cacheSize: 0,
  });

  const measurePerformance = () => {
    const startTime = performance.now();
    
    // データ取得時間の測定
    const dataFetchStart = performance.now();
    // 実際のデータ取得処理をシミュレート
    setTimeout(() => {
      const dataFetchEnd = performance.now();
      const dataFetchTime = dataFetchEnd - dataFetchStart;
      
      // 処理時間の測定
      const processingStart = performance.now();
      // 実際の処理をシミュレート
      const processingEnd = performance.now();
      const processingTime = processingEnd - processingStart;
      
      // レンダリング時間の測定
      const renderStart = performance.now();
      // 実際のレンダリングをシミュレート
      const renderEnd = performance.now();
      const renderTime = renderEnd - renderStart;
      
      // メモリ使用量の測定（簡略版）
      const memoryUsage = (performance as any).memory?.usedJSHeapSize || 0;
      
      // キャッシュ統計の取得
      const cacheStats = statisticsCache.getStats();
      
      const newMetrics: PerformanceMetrics = {
        dataFetchTime,
        processingTime,
        renderTime,
        memoryUsage: memoryUsage / 1024 / 1024, // MBに変換
        cacheHitRate: cacheStats.hitRate,
        cacheSize: cacheStats.size,
      };
      
      setMetrics(newMetrics);
      onMetricsUpdate(newMetrics);
    }, 100);
  };

  useEffect(() => {
    measurePerformance();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.surface }]}>
      <Text style={[styles.title, { color: currentTheme.text }]}>
        パフォーマンス監視
      </Text>
      
      <View style={styles.metricsContainer}>
        <View style={styles.metricRow}>
          <Text style={[styles.metricLabel, { color: currentTheme.textSecondary }]}>
            データ取得時間:
          </Text>
          <Text style={[styles.metricValue, { color: currentTheme.text }]}>
            {metrics.dataFetchTime.toFixed(2)}ms
          </Text>
        </View>
        
        <View style={styles.metricRow}>
          <Text style={[styles.metricLabel, { color: currentTheme.textSecondary }]}>
            処理時間:
          </Text>
          <Text style={[styles.metricValue, { color: currentTheme.text }]}>
            {metrics.processingTime.toFixed(2)}ms
          </Text>
        </View>
        
        <View style={styles.metricRow}>
          <Text style={[styles.metricLabel, { color: currentTheme.textSecondary }]}>
            レンダリング時間:
          </Text>
          <Text style={[styles.metricValue, { color: currentTheme.text }]}>
            {metrics.renderTime.toFixed(2)}ms
          </Text>
        </View>
        
        <View style={styles.metricRow}>
          <Text style={[styles.metricLabel, { color: currentTheme.textSecondary }]}>
            メモリ使用量:
          </Text>
          <Text style={[styles.metricValue, { color: currentTheme.text }]}>
            {metrics.memoryUsage.toFixed(2)}MB
          </Text>
        </View>
        
        <View style={styles.metricRow}>
          <Text style={[styles.metricLabel, { color: currentTheme.textSecondary }]}>
            キャッシュヒット率:
          </Text>
          <Text style={[styles.metricValue, { color: currentTheme.text }]}>
            {metrics.cacheHitRate.toFixed(1)}%
          </Text>
        </View>
        
        <View style={styles.metricRow}>
          <Text style={[styles.metricLabel, { color: currentTheme.textSecondary }]}>
            キャッシュサイズ:
          </Text>
          <Text style={[styles.metricValue, { color: currentTheme.text }]}>
            {metrics.cacheSize}件
          </Text>
        </View>
      </View>
      
      <TouchableOpacity
        style={[styles.refreshButton, { backgroundColor: currentTheme.primary }]}
        onPress={measurePerformance}
      >
        <Text style={[styles.refreshButtonText, { color: currentTheme.surface }]}>
          再測定
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 8,
    margin: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  metricsContainer: {
    marginBottom: 16,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  metricLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  refreshButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  refreshButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
