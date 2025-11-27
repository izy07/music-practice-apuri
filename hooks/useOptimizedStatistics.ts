// 統計データキャッシュ管理
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import { practiceService } from '@/services/practiceService';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

interface CacheConfig {
  duration: number; // キャッシュ期間（ミリ秒）
  maxSize: number; // 最大キャッシュサイズ
}

class StatisticsCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly config: CacheConfig;

  constructor(config: CacheConfig = { duration: 5 * 60 * 1000, maxSize: 50 }) {
    this.config = config;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  set<T>(key: string, data: T): void {
    // キャッシュサイズ制限
    if (this.cache.size >= this.config.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + this.config.duration,
    });
  }

  clear(): void {
    this.cache.clear();
  }

  // 期限切れのキャッシュをクリーンアップ
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
      }
    }
  }

  // キャッシュ統計情報
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: this.calculateHitRate(),
    };
  }

  private hitCount = 0;
  private missCount = 0;

  private calculateHitRate(): number {
    const total = this.hitCount + this.missCount;
    return total > 0 ? (this.hitCount / total) * 100 : 0;
  }

  recordHit(): void {
    this.hitCount++;
  }

  recordMiss(): void {
    this.missCount++;
  }
}

// グローバルキャッシュインスタンス
const statisticsCache = new StatisticsCache({
  duration: 5 * 60 * 1000, // 5分
  maxSize: 50, // 最大50エントリ
});

// 定期的なキャッシュクリーンアップ
setInterval(() => {
  statisticsCache.cleanup();
}, 60 * 1000); // 1分ごと

export { statisticsCache };

// 楽器別キャッシュキー生成
export const generateCacheKey = (
  userId: string,
  instrumentId: string | null,
  period: 'weekly' | 'monthly' | 'yearly',
  date?: string
): string => {
  const dateKey = date || new Date().toISOString().split('T')[0];
  return `${userId}-${instrumentId || 'all'}-${period}-${dateKey}`;
};

// 練習記録データの型定義
export interface PracticeRecord {
  id?: string;
  practice_date: string;
  duration_minutes: number;
  content?: string;
  input_method?: string;
  created_at: string;
}

// 統計データの型定義
export interface StatisticsData {
  weeklyData: DayData[];
  monthlyData: DayData[];
  yearlyData: DayData[];
  yearlyStatsData: DayData[];
  inputMethodStats: InputMethodStat[];
  recentRecords: PracticeRecord[];
  totalMinutes: number;
  averageDailyMinutes: number;
  streakDays: number;
}

export interface DayData {
  dateLabel: string;
  minutes: number;
}

export interface InputMethodStat {
  method: string;
  count: number;
  totalMinutes: number;
}

// 最適化された統計データ取得フック
export const useOptimizedStatistics = (
  userId: string,
  instrumentId?: string
) => {
  const [data, setData] = useState<StatisticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  
  // コンテキストから楽器IDを取得（DBアクセス不要）
  const { selectedInstrument } = useInstrumentTheme();
  
  // レイジーローディング用の状態
  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  
  // 仮想化用の状態
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });
  const [isScrolling, setIsScrolling] = useState(false);
  
  // デバウンス用のタイマー
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // データ取得関数（キャッシュ付き）
  const fetchStatisticsData = useCallback(async (forceRefresh = false) => {
    if (!userId) return;
    
    // 楽器IDの優先順位: 引数 > コンテキスト
    const currentInstrumentId = instrumentId || selectedInstrument || null;
    const cacheKey = generateCacheKey(userId, currentInstrumentId, 'weekly');
    
    // キャッシュチェック
    if (!forceRefresh) {
      const cachedData = statisticsCache.get<StatisticsData>(cacheKey);
      if (cachedData) {
        statisticsCache.recordHit();
        setData(cachedData);
        setLastFetchTime(Date.now());
        return;
      }
      statisticsCache.recordMiss();
    }
    
    setLoading(true);
    setError(null);
    
    try {
      
      // 最適化されたクエリ: 必要なカラムのみ取得、期間制限
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const result = await practiceService.getSessionsByDateRange(
        userId,
        thirtyDaysAgo.toISOString().split('T')[0],
        undefined,
        currentInstrumentId,
        1000
      );
      
      if (!result.success || result.error) {
        throw result.error || new Error('統計データの取得に失敗しました');
      }
      
      const practiceRecords = result.data || [];
      
      // 統計データの計算
      const statisticsData = calculateStatisticsData(practiceRecords || []);
      
      // キャッシュに保存
      statisticsCache.set(cacheKey, statisticsData);
      
      setData(statisticsData);
      setLastFetchTime(Date.now());
      setHasLoaded(true);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '統計データの取得に失敗しました';
      setError(errorMessage);
      ErrorHandler.handle(err, '統計データ取得', false);
    } finally {
      setLoading(false);
    }
  }, [userId, instrumentId, selectedInstrument]);

  // 統計データの計算（メモ化済み）
  const calculateStatisticsData = useCallback((practiceRecords: PracticeRecord[]): StatisticsData => {
    const now = new Date();
    
    // 練習記録を日付でマップ化（O(1)アクセス）
    const recordsByDate = new Map<string, number>();
    const recordsByMonth = new Map<string, number>();
    const recordsByYear = new Map<string, number>();
    const inputMethodStats = new Map<string, { count: number; totalMinutes: number }>();
    
    practiceRecords.forEach(record => {
      const dateStr = record.practice_date;
      const monthKey = dateStr.substring(0, 7); // YYYY-MM
      const yearKey = dateStr.substring(0, 4); // YYYY
      
      recordsByDate.set(dateStr, (recordsByDate.get(dateStr) || 0) + record.duration_minutes);
      recordsByMonth.set(monthKey, (recordsByMonth.get(monthKey) || 0) + record.duration_minutes);
      recordsByYear.set(yearKey, (recordsByYear.get(yearKey) || 0) + record.duration_minutes);
      
      const method = record.input_method || 'その他';
      if (!inputMethodStats.has(method)) {
        inputMethodStats.set(method, { count: 0, totalMinutes: 0 });
      }
      const methodStat = inputMethodStats.get(method)!;
      methodStat.count++;
      methodStat.totalMinutes += record.duration_minutes;
    });
    
    // 週別データ
    const weeklyData = calculateWeeklyData(recordsByDate, now);
    
    // 月別データ
    const monthlyData = calculateMonthlyData(recordsByDate, now);
    
    // 年別データ
    const yearlyData = calculateYearlyData(recordsByMonth, now);
    
    // 年別統計データ
    const yearlyStatsData = calculateYearlyStatsData(recordsByYear, now);
    
    // 練習方法別統計
    const inputMethodStatsArray = Array.from(inputMethodStats.entries())
      .map(([method, stats]) => ({ method, ...stats }))
      .sort((a, b) => b.totalMinutes - a.totalMinutes);
    
    // 最近の練習記録
    const recentRecords = [...practiceRecords]
      .sort((a, b) => new Date(b.practice_date).getTime() - new Date(a.practice_date).getTime())
      .slice(0, 5);
    
    // 統計計算
    const totalMinutes = practiceRecords.reduce((sum, record) => sum + record.duration_minutes, 0);
    const averageDailyMinutes = practiceRecords.length > 0 ? totalMinutes / practiceRecords.length : 0;
    const streakDays = calculateStreakDays(recordsByDate, now);
    
    return {
      weeklyData,
      monthlyData,
      yearlyData,
      yearlyStatsData,
      inputMethodStats: inputMethodStatsArray,
      recentRecords,
      totalMinutes,
      averageDailyMinutes,
      streakDays,
    };
  }, []);

  // 週別データ計算
  const calculateWeeklyData = (recordsByDate: Map<string, number>, anchorDate: Date): DayData[] => {
    const arr: DayData[] = [];
    const dayOfWeek = anchorDate.getDay();
    const offset = (dayOfWeek + 6) % 7; // Monday start
    const startOfWeek = new Date(anchorDate);
    startOfWeek.setDate(anchorDate.getDate() - offset);
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dayMinutes = recordsByDate.get(dateStr) || 0;
      arr.push({ dateLabel: String(d.getDate()), minutes: dayMinutes });
    }
    return arr;
  };

  // 月別データ計算
  const calculateMonthlyData = (recordsByDate: Map<string, number>, anchorDate: Date): DayData[] => {
    const year = anchorDate.getFullYear();
    const month = anchorDate.getMonth();
    const endDay = new Date(year, month + 1, 0).getDate();
    const bins = [
      { start: 1, end: 6, label: '1-6' },
      { start: 7, end: 12, label: '7-12' },
      { start: 13, end: 18, label: '13-18' },
      { start: 19, end: 24, label: '19-24' },
      { start: 25, end: endDay, label: `25-${endDay}` },
    ];
    const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    
    return bins.map(bin => {
      let totalMinutes = 0;
      for (let day = bin.start; day <= bin.end; day++) {
        const dateStr = `${monthPrefix}-${String(day).padStart(2, '0')}`;
        totalMinutes += recordsByDate.get(dateStr) || 0;
      }
      return { dateLabel: bin.label, minutes: totalMinutes };
    });
  };

  // 年別データ計算
  const calculateYearlyData = (recordsByMonth: Map<string, number>, anchorDate: Date): DayData[] => {
    const year = anchorDate.getFullYear();
    const arr: DayData[] = [];
    
    for (let month = 0; month < 12; month++) {
      const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
      const total = recordsByMonth.get(monthPrefix) || 0;
      arr.push({ dateLabel: `${month + 1}月`, minutes: total });
    }
    return arr;
  };

  // 年別統計データ計算
  const calculateYearlyStatsData = (recordsByYear: Map<string, number>, anchorDate: Date): DayData[] => {
    const currentYear = anchorDate.getFullYear();
    const arr: DayData[] = [];
    
    for (let year = currentYear - 3; year <= currentYear + 2; year++) {
      const yearPrefix = `${year}`;
      const total = recordsByYear.get(yearPrefix) || 0;
      arr.push({ dateLabel: `${year}年`, minutes: total });
    }
    return arr;
  };

  // ストリーク計算
  const calculateStreakDays = (recordsByDate: Map<string, number>, anchorDate: Date): number => {
    let streak = 0;
    
    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(anchorDate);
      checkDate.setDate(anchorDate.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];
      
      if (recordsByDate.get(dateStr) && recordsByDate.get(dateStr)! > 0) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };

  // レイジーローディング: 画面が表示された時のみデータ取得
  useEffect(() => {
    if (isVisible && !hasLoaded) {
      fetchStatisticsData();
    }
  }, [isVisible, hasLoaded, fetchStatisticsData]);

  // デバウンス付きリフレッシュ
  const refreshData = useCallback((forceRefresh = false) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    debounceTimer.current = setTimeout(() => {
      fetchStatisticsData(forceRefresh);
    }, 300); // 300msデバウンス
  }, [fetchStatisticsData]);

  // 仮想化用のスクロールハンドラー
  const handleScroll = useCallback((event: any) => {
    if (isScrolling) return;
    
    setIsScrolling(true);
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    
    // スクロール位置に基づいて表示範囲を更新
    const itemHeight = 50; // 仮のアイテム高さ
    const start = Math.floor(contentOffset.y / itemHeight);
    const end = Math.min(start + Math.ceil(layoutMeasurement.height / itemHeight) + 5, 1000);
    
    setVisibleRange({ start, end });
    
    setTimeout(() => setIsScrolling(false), 100);
  }, [isScrolling]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    lastFetchTime,
    isVisible,
    setIsVisible,
    hasLoaded,
    visibleRange,
    refreshData,
    handleScroll,
    cacheStats: statisticsCache.getStats(),
  };
};