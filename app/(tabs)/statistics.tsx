import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Alert } from 'react-native';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Svg, { Rect, G, Line, Text as SvgText } from 'react-native-svg';
import { supabase } from '@/lib/supabase';
import { useAuthAdvanced } from '@/hooks/useAuthAdvanced';
import { UI, DATA, STATISTICS } from '@/lib/constants';
import { getPracticeSessionsByDateRange } from '@/repositories/practiceSessionRepository';
import { formatMinutesToHours } from '@/lib/dateUtils';

const { width } = Dimensions.get('window');

type Span = 'daily' | 'stats';
type StatsMode = 'monthly' | 'yearly';

type DayData = { dateLabel: string; minutes: number };
type PracticeRecord = {
  id?: string;
  practice_date: string;
  duration_minutes: number;
  content?: string;
  input_method?: string;
  created_at: string;
};

function BarChart({ data, maxValue, barColor, weekdays, disableSlicing }: { data: DayData[]; maxValue: number; barColor: string; weekdays?: string[]; disableSlicing?: boolean }) {
  const chartWidth = width - 40;
  const chartHeight = UI.CHART_HEIGHT;
  const barGap = UI.CHART_BAR_GAP;

  // 先頭のゼロ日を自動でカット（最初に記録がある日から表示）
  // ただし週表示（7本）のときはカットせず固定
  // disableSlicingがtrueの場合は、月別統計などで全期間を表示するためカットしない
  const allowSlicing = !disableSlicing && data.length > STATISTICS.DAYS_IN_WEEK;
  const firstIndex = data.findIndex(d => d.minutes > 0);
  const sliced = allowSlicing && firstIndex > 0 ? data.slice(firstIndex) : data;

  const safeMax = Math.max(1, maxValue);
  const labelArea = UI.CHART_LABEL_AREA; // ラベル表示領域（下部）
  const barArea = chartHeight - labelArea; // 棒グラフの高さ領域
  const heightScale = UI.CHART_HEIGHT_SCALE; // 棒の長さを短く（75%）
  const avgValue = sliced.length ? Math.round(sliced.reduce((s, d) => s + d.minutes, 0) / Math.max(1, sliced.filter(d=>d.minutes>0).length)) : 0;
  const avgY = Math.max(UI.MIN_BAR_HEIGHT, Math.round((avgValue / safeMax) * (barArea - 10) * heightScale));
  const avgYPos = barArea - avgY; // 上からの位置
  const barWidth = Math.max(UI.MIN_BAR_WIDTH, Math.floor((chartWidth - barGap * (sliced.length - 1)) / Math.max(1, sliced.length)));

  // ラベルは最大10個まで間引き
  const maxLabels = UI.MAX_CHART_LABELS;
  const step = Math.max(1, Math.ceil(sliced.length / maxLabels));

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={chartWidth} height={chartHeight}>
        <G>
          {/* 平均ラインは非表示 */}
          {sliced.map((d, i) => {
            const h = Math.max(UI.MIN_BAR_HEIGHT, Math.round((d.minutes / safeMax) * (barArea - 10) * heightScale));
            const x = i * (barWidth + barGap);
            const y = barArea - h; // ラベル領域の上端を基準
            return (
              <Rect key={`bar-${i}`} x={x} y={y} width={barWidth} height={h} rx={4} fill={d.minutes > 0 ? barColor : '#E5E7EB'} />
            );
          })}
          {/* X軸ラベル（棒の中心に合わせる） */}
          {sliced.map((d, i) => {
            const x = i * (barWidth + barGap) + barWidth / 2;
            return (
              <G key={`label-${i}`}>
                <SvgText x={x} y={chartHeight - 14} fontSize={10} fill="#6B7280" textAnchor="middle">
                  {d.dateLabel}
                </SvgText>
                {weekdays && weekdays[i] && (
                  <SvgText x={x} y={chartHeight - 2} fontSize={10} fill="#6B7280" textAnchor="middle">
                    {weekdays[i]}
                  </SvgText>
                )}
              </G>
            );
          })}
        </G>
      </Svg>
    </View>
  );
}

export default function StatisticsScreen() {
  const { currentTheme, selectedInstrument } = useInstrumentTheme();
  const router = useRouter();
  const { user } = useAuthAdvanced();
  const [span, setSpan] = useState<Span>('daily');
  const [statsMode, setStatsMode] = useState<StatsMode>('monthly');
  const [anchorDate, setAnchorDate] = useState(new Date()); // 週/月の基準日
  const [practiceRecords, setPracticeRecords] = useState<PracticeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // 練習記録データを取得
  const fetchPracticeRecords = React.useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // コンテキストから楽器IDを取得（DBアクセス不要）
      const currentInstrumentId = selectedInstrument || null;
      
      // 最適化されたクエリ: 必要なカラムのみ取得、最近2年分を取得（年別統計のため24ヶ月分）
      // 2年分のデータで年別グラフ（12ヶ月）を表示可能
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      const startDate = twoYearsAgo.toISOString().split('T')[0]; // YYYY-MM-DD形式
      
      const result = await getPracticeSessionsByDateRange(
        user.id,
        startDate, // 最近2年分
        undefined,
        currentInstrumentId,
        DATA.MAX_PRACTICE_RECORDS
      );

      if (result.error) {
        Alert.alert('エラー', '練習記録の取得に失敗しました');
        return;
      }

      setPracticeRecords(result.data || []);
    } catch (error) {
      Alert.alert('エラー', '練習記録の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [user, selectedInstrument]);

  useEffect(() => {
    fetchPracticeRecords();
  }, [user, selectedInstrument, fetchPracticeRecords]);


  // 日別（当週：月〜日）- メモ化で最適化
  const weeklyData = useMemo<DayData[]>(() => {
    const arr: DayData[] = [];
    const base = new Date(anchorDate);
    const dayOfWeek = base.getDay(); // 0=Sun, 1=Mon ...
    const offset = (dayOfWeek + 6) % 7; // Monday start
    const startOfWeek = new Date(base);
    startOfWeek.setDate(base.getDate() - offset);
    const weekdays = ['月','火','水','木','金','土','日'];
    
    // 練習記録を日付でマップ化（O(1)アクセス）
    const recordsByDate = new Map<string, number>();
    practiceRecords.forEach(record => {
      const dateStr = record.practice_date;
      recordsByDate.set(dateStr, (recordsByDate.get(dateStr) || 0) + record.duration_minutes);
    });
    
    for (let i = 0; i < STATISTICS.DAYS_IN_WEEK; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dayMinutes = recordsByDate.get(dateStr) || 0;
      // 上段ラベルは日付の数字、下段は曜日（描画側でweekdaysを渡す）
      arr.push({ dateLabel: String(d.getDate()), minutes: dayMinutes });
    }
    return arr;
  }, [practiceRecords, anchorDate]);

  // 月別（当月を6日ごとに5区分）
  const monthlyData = useMemo<DayData[]>(() => {
    const now = new Date(anchorDate);
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-11
    const endDay = new Date(year, month + 1, 0).getDate();
    const bins: Array<{ start: number; end: number; label: string }> = [
      { start: 1, end: 6, label: '1-6' },
      { start: 7, end: 12, label: '7-12' },
      { start: 13, end: 18, label: '13-18' },
      { start: 19, end: 24, label: '19-24' },
      { start: 25, end: endDay, label: `25-${endDay}` },
    ]; // STATISTICS.MONTHLY_BINS = 5 bins
    const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    
    // 練習記録を日付でマップ化（O(1)アクセス）
    const recordsByDate = new Map<string, number>();
    practiceRecords.forEach(record => {
      const dateStr = record.practice_date;
      recordsByDate.set(dateStr, (recordsByDate.get(dateStr) || 0) + record.duration_minutes);
    });
    
    return bins.map(bin => {
      let totalMinutes = 0;
      for (let day = bin.start; day <= bin.end; day++) {
        const dateStr = `${monthPrefix}-${String(day).padStart(2, '0')}`;
        totalMinutes += recordsByDate.get(dateStr) || 0;
      }
      return { dateLabel: bin.label, minutes: totalMinutes };
    });
  }, [practiceRecords, anchorDate]);

  // 年別（現在の月から過去12ヶ月分）- メモ化で最適化
  const yearlyData = useMemo<DayData[]>(() => {
    const arr: DayData[] = [];
    
    // 練習記録を月でマップ化（O(1)アクセス）
    const recordsByMonth = new Map<string, number>();
    practiceRecords.forEach(record => {
      const monthKey = record.practice_date.substring(0, 7); // YYYY-MM
      recordsByMonth.set(monthKey, (recordsByMonth.get(monthKey) || 0) + record.duration_minutes);
    });
    
    // 現在の月から過去12ヶ月分を表示
    const now = new Date(anchorDate);
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    // 表示する月の範囲を決定（現在の月を最初にして過去12ヶ月）
    let displayMonths: Array<{ year: number; month: number }> = [];
    const maxMonths = 12;
    
    // 過去の月から現在の月に向かって12ヶ月分を追加（古い順）
    for (let i = maxMonths - 1; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - 1 - i, 1);
      const displayYear = date.getFullYear();
      const displayMonth = date.getMonth() + 1;
      
      displayMonths.push({ year: displayYear, month: displayMonth }); // 古い順（過去の月が最初）
    }
    
    // データを配列に追加
    displayMonths.forEach(({ year, month }) => {
      const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
      const total = recordsByMonth.get(monthPrefix) || 0;
      
      // ラベルは月のみ表示
      arr.push({ dateLabel: `${month}月`, minutes: total });
    });
    
    return arr;
  }, [practiceRecords, anchorDate]);

  // 年別（年単位）- メモ化で最適化
  const yearlyStatsData = useMemo<DayData[]>(() => {
    const arr: DayData[] = [];
    
    // 練習記録を年でマップ化（O(1)アクセス）
    const recordsByYear = new Map<string, number>();
    practiceRecords.forEach(record => {
      const yearKey = record.practice_date.substring(0, 4); // YYYY
      recordsByYear.set(yearKey, (recordsByYear.get(yearKey) || 0) + record.duration_minutes);
    });
    
    // 現在の年を取得
    const currentYear = new Date().getFullYear();
    
    // 記録がある最初の年を取得（あれば）
    let startYear = currentYear;
    if (recordsByYear.size > 0) {
      const years = Array.from(recordsByYear.keys()).map(y => parseInt(y)).sort();
      startYear = years[0];
    }
    
    // 開始年から5年分表示
    for (let i = 0; i < 5; i++) {
      const year = startYear + i;
      const yearPrefix = `${year}`;
      const total = recordsByYear.get(yearPrefix) || 0;
      arr.push({ dateLabel: `${year}年`, minutes: total });
    }
    
    return arr;
  }, [practiceRecords]);

  // 練習方法別統計を計算 - メモ化で最適化
  const getInputMethodStats = useMemo(() => {
    const methodStats: { [key: string]: { count: number; totalMinutes: number } } = {};
    
    practiceRecords.forEach(record => {
      const method = record.input_method || 'その他';
      if (!methodStats[method]) {
        methodStats[method] = { count: 0, totalMinutes: 0 };
      }
      methodStats[method].count++;
      methodStats[method].totalMinutes += record.duration_minutes;
    });

    return Object.entries(methodStats)
      .map(([method, stats]) => ({ method, ...stats }))
      .sort((a, b) => b.totalMinutes - a.totalMinutes);
  }, [practiceRecords]);

  // 最近の練習記録を取得 - メモ化で最適化
  const getRecentRecords = useMemo(() => {
    return [...practiceRecords].sort((a, b) => 
      new Date(b.practice_date).getTime() - new Date(a.practice_date).getTime()
    ).slice(0, 5);
  }, [practiceRecords]);

  // 詳細分析用の追加統計を計算
  const getAdditionalStats = useMemo(() => {
    if (!practiceRecords || practiceRecords.length === 0) {
      return null;
    }

    // 1. 平均練習時間
    const totalMinutes = practiceRecords.reduce((sum, r) => sum + r.duration_minutes, 0);
    const avgMinutes = Math.round(totalMinutes / practiceRecords.length);

    // 2. 最長連続練習日
    const sortedRecords = [...practiceRecords].sort((a, b) => 
      new Date(a.practice_date).getTime() - new Date(b.practice_date).getTime()
    );
    let currentStreak = 0;
    let longestStreak = 0;
    let lastDate: Date | null = null;

    sortedRecords.forEach(record => {
      const recordDate = new Date(record.practice_date);
      if (lastDate === null) {
        currentStreak = 1;
        longestStreak = 1;
      } else {
        const daysDiff = Math.floor((recordDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff === 0) {
          // 同じ日に複数回
          currentStreak = currentStreak;
        } else if (daysDiff === 1) {
          // 連続
          currentStreak++;
        } else {
          // 途切れた
          longestStreak = Math.max(longestStreak, currentStreak);
          currentStreak = 1;
        }
      }
      lastDate = recordDate;
    });
    longestStreak = Math.max(longestStreak, currentStreak);

    // 3. 週間練習パターン（曜日別）
    const weeklyPattern: { [key: string]: number } = {};
    practiceRecords.forEach(record => {
      const date = new Date(record.practice_date);
      const dayOfWeek = date.getDay();
      const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
      const dayName = weekdays[dayOfWeek];
      weeklyPattern[dayName] = (weeklyPattern[dayName] || 0) + 1;
    });

    // 4. 月別練習傾向（最近6ヶ月）
    const monthlyTendency: { [key: string]: number } = {};
    practiceRecords.forEach(record => {
      const date = new Date(record.practice_date);
      const yearMonth = `${date.getFullYear()}年${date.getMonth() + 1}月`;
      monthlyTendency[yearMonth] = (monthlyTendency[yearMonth] || 0) + record.duration_minutes;
    });
    
    // 最近6ヶ月分のみ
    const sortedMonths = Object.entries(monthlyTendency)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6);

    // 5. 練習頻度（週に何回）
    const recordsPerWeek = Math.round((practiceRecords.length / 30) * 7);

    // 6. 練習強度別統計（短時間/中時間/長時間）
    const intensityStats = {
      short: 0, // 30分未満
      medium: 0, // 30分-60分
      long: 0, // 60分以上
    };
    practiceRecords.forEach(record => {
      if (record.duration_minutes < 30) intensityStats.short++;
      else if (record.duration_minutes < 60) intensityStats.medium++;
      else intensityStats.long++;
    });

    // 7. 総練習日数と練習回数
    const uniqueDates = new Set(practiceRecords.map(r => r.practice_date));
    const totalPracticeDays = uniqueDates.size;
    const totalPracticeCount = practiceRecords.length;

    return {
      avgMinutes,
      longestStreak,
      weeklyPattern,
      monthlyTendency: sortedMonths,
      recordsPerWeek,
      intensityStats,
      totalPracticeDays,
      totalPracticeCount,
    };
  }, [practiceRecords]);

  const { data, maxValue, summary } = useMemo(() => {
    if (span === 'daily') {
      const total = weeklyData.reduce((s, d) => s + d.minutes, 0);
      const max = Math.max(...weeklyData.map(d => d.minutes), 120);
      const activeDays = weeklyData.filter(d => d.minutes > 0).length;
      const longest = Math.max(...weeklyData.map(d => d.minutes), 0);
      const avg = activeDays ? Math.round(total / activeDays) : 0;
      return {
        data: weeklyData,
        maxValue: Math.max(120, max),
        summary: {
          avgMinutes: avg,
          longestMinutes: longest,
          totalMinutes: total,
          days: activeDays,
          totalLabel: '週合計',
        },
      };
    }

    // 統計モード（週別または月別）
    if (statsMode === 'monthly') {
      // 週別データ（月を6日ごとに5区分）
      const total = monthlyData.reduce((s, d) => s + d.minutes, 0);
      const max = Math.max(...monthlyData.map(d => d.minutes), 600);
      const binsWith = monthlyData.filter(d => d.minutes > 0).length;
      const longest = Math.max(...monthlyData.map(d => d.minutes), 0);
      const avg = binsWith ? Math.round(total / binsWith) : 0;
      return {
        data: monthlyData,
        maxValue: Math.max(600, max),
        summary: {
          avgMinutes: avg,
          longestMinutes: longest,
          totalMinutes: total,
          days: binsWith,
          totalLabel: '月合計',
        },
      };
    } else {
      // 月別データ（12ヶ月）
      const total = yearlyData.reduce((s, d) => s + d.minutes, 0);
      const max = Math.max(...yearlyData.map(d => d.minutes), 600);
      const activeMonths = yearlyData.filter(d => d.minutes > 0).length;
      const longest = Math.max(...yearlyData.map(d => d.minutes), 0);
      const avg = activeMonths ? Math.round(total / activeMonths) : 0;
      return {
        data: yearlyData,
        maxValue: Math.max(600, max),
        summary: {
          avgMinutes: avg,
          longestMinutes: longest,
          totalMinutes: total,
          days: activeMonths,
          totalLabel: '年合計',
        },
      };
    }
  }, [span, statsMode, weeklyData, monthlyData, yearlyData]);

  const Primary = currentTheme.primary || '#7C4DFF';
  const Background = currentTheme.background || '#FFFFFF';
  const Surface = currentTheme.surface || '#FFFFFF';
  const TextColor = currentTheme.text || '#1F2937';
  const SecondaryText = currentTheme.textSecondary || '#6B7280';

  // 期間表示（日別: 当週の開始〜終了、統計: 今月または今年）
  const periodTitle = useMemo(() => {
    const today = new Date(anchorDate);
    const pad2 = (n: number) => String(n).padStart(2, '0');
    if (span === 'daily') {
      const start = new Date(today);
      const offset = (today.getDay() + 6) % 7; // Monday start
      start.setDate(today.getDate() - offset);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return {
        main: `${start.getMonth() + 1}月 ${pad2(start.getDate())}–${end.getMonth() + 1}月 ${pad2(end.getDate())}`,
        sub: `${end.getFullYear()}`,
      };
    }
    
    // 統計モード
    if (statsMode === 'yearly') {
      return { main: `${today.getFullYear()}年`, sub: '年間統計' };
    }
    
    const month = today.getMonth() + 1;
    return { main: `${month}月`, sub: `${today.getFullYear()}` };
  }, [span, statsMode, anchorDate]);

  // 期間移動
  const shiftPeriod = (dir: -1 | 1) => {
    setAnchorDate((prev) => {
      const d = new Date(prev);
      if (span === 'daily') {
        d.setDate(d.getDate() + dir * 7);
      } else if (statsMode === 'yearly') {
        d.setFullYear(d.getFullYear() + dir);
      } else {
        // 月中央固定でのシフト（末日差異対策）
        d.setDate(15);
        d.setMonth(d.getMonth() + dir);
      }
      return d;
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: Background }]} >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color={TextColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: TextColor }]}>統計・分析</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={[styles.loadingContainer, { backgroundColor: currentTheme.background }]}>
          <Text style={[styles.loadingText, { color: TextColor }]}>データを読み込み中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Background }]} > 
        <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={TextColor} />
          </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: TextColor }]}>統計・分析</Text>
        <View style={{ width: 44 }} />
        </View>

      <View style={[styles.tabRow, { backgroundColor: Surface, borderColor: '#E5E7EB' }]}> 
        {([
          { key: 'daily', label: '日別' },
          { key: 'stats', label: '統計' },
        ] as { key: Span; label: string }[]).map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabItem, span === t.key && { borderBottomColor: Primary, borderBottomWidth: 3 }]}
            onPress={() => setSpan(t.key)}
          >
            <Text style={[styles.tabText, { color: span === t.key ? Primary : SecondaryText }]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView 
        contentContainerStyle={{ padding: 12 }} 
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        style={{ flex: 1 }}
      >
        {/* 統計モード内の切り替えボタン */}
        {span === 'stats' && (
          <View style={[styles.statsModeRow, { marginBottom: 12 }]}>
            <View style={styles.segmentedControl}>
              <TouchableOpacity
                style={[
                  styles.segmentedButton,
                  styles.segmentedButtonLeft,
                  statsMode === 'monthly' && { backgroundColor: Primary }
                ]}
                onPress={() => setStatsMode('monthly')}
              >
                <Text style={[
                  styles.segmentedButtonText,
                  { color: statsMode === 'monthly' ? '#FFFFFF' : SecondaryText }
                ]}>週別</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segmentedButton,
                  styles.segmentedButtonRight,
                  statsMode === 'yearly' && { backgroundColor: Primary }
                ]}
                onPress={() => setStatsMode('yearly')}
              >
                <Text style={[
                  styles.segmentedButtonText,
                  { color: statsMode === 'yearly' ? '#FFFFFF' : SecondaryText }
                ]}>月別</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 期間表示 + ナビゲーション */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 16 }}>
          <TouchableOpacity onPress={() => shiftPeriod(-1)} activeOpacity={0.7}>
            <ChevronLeft size={24} color={SecondaryText} />
          </TouchableOpacity>
          <View style={{ alignItems: 'center', paddingVertical: 4 }}>
            <Text style={{ color: TextColor, fontSize: 20, fontWeight: '800' }}>{periodTitle.main}</Text>
            <Text style={{ color: SecondaryText, fontSize: 16, fontWeight: '700', marginTop: 2 }}>{periodTitle.sub}</Text>
          </View>
          <TouchableOpacity onPress={() => shiftPeriod(1)} activeOpacity={0.7}>
            <ChevronRight size={24} color={SecondaryText} />
          </TouchableOpacity>
        </View>
        <View style={[styles.chartCard, { backgroundColor: Surface }]}>
          <Text style={[styles.chartTitle, { color: TextColor }]}>
            {span === 'daily' ? '週別統計' : (statsMode === 'yearly' ? '月別統計' : '週別統計')}
          </Text>
          <BarChart 
            data={data} 
            maxValue={maxValue} 
            barColor={Primary}
            weekdays={span === 'daily' ? ['月','火','水','木','金','土','日'] : undefined}
            disableSlicing={span === 'stats' && statsMode === 'yearly'}
          />
        </View>

        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, { backgroundColor: Surface }]}> 
            <Text style={styles.summaryValue}>{formatMinutesToHours(summary.avgMinutes)}</Text>
            <Text style={[styles.summaryLabel, { color: SecondaryText }]}>平均練習時間</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: Surface }]}> 
            <Text style={styles.summaryValue}>{formatMinutesToHours(summary.longestMinutes)}</Text>
            <Text style={[styles.summaryLabel, { color: SecondaryText }]}>最長練習時間</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: Surface }]}> 
            <Text style={styles.summaryValue}>{formatMinutesToHours(summary.totalMinutes)}</Text>
            <Text style={[styles.summaryLabel, { color: SecondaryText }]}>{summary.totalLabel}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: Surface }]}> 
            <Text style={styles.summaryValue}>{summary.days}{span === 'daily' ? '日' : (statsMode === 'yearly' ? 'ヶ月' : '区分')}</Text>
            <Text style={[styles.summaryLabel, { color: SecondaryText }]}>{span === 'daily' ? '練習日数' : (statsMode === 'yearly' ? '練習した月数' : '練習した区分数')}</Text>
          </View>
        </View>

        {/* 年別グラフ（月別モードの時のみ表示） */}
        {span === 'stats' && statsMode === 'yearly' && (
          <View style={[styles.chartCard, { backgroundColor: Surface }]}>
            <Text style={[styles.chartTitle, { color: TextColor }]}>年別統計</Text>
            <BarChart 
              data={yearlyStatsData} 
              maxValue={Math.max(600, Math.max(...yearlyStatsData.map(d => d.minutes), 600))} 
              barColor={Primary}
              disableSlicing={true}
            />
          </View>
        )}

        {/* 詳細分析セクション */}
        <View style={[styles.detailAnalysisCard, { backgroundColor: Surface }]}>
          <Text style={[styles.detailAnalysisTitle, { color: TextColor }]}>詳細分析</Text>
          
          {/* 練習方法別統計 */}
          <View style={styles.analysisSection}>
            <Text style={[styles.analysisSectionTitle, { color: TextColor }]}>練習方法別</Text>
            {getInputMethodStats.map((stat, index) => (
              <View style={styles.analysisRow} key={index}>
                <Text style={[styles.analysisLabel, { color: SecondaryText }]}>{stat.method}</Text>
                <Text style={[styles.analysisValue, { color: TextColor }]}>
                  {stat.count}回 ({formatMinutesToHours(stat.totalMinutes)})
                </Text>
              </View>
            ))}
          </View>

          {/* 基礎統計 */}
          {getAdditionalStats && (
            <View style={styles.analysisSection}>
              <Text style={[styles.analysisSectionTitle, { color: TextColor }]}>基礎統計</Text>
              <View style={styles.analysisRow}>
                <Text style={[styles.analysisLabel, { color: SecondaryText }]}>平均練習時間</Text>
                <Text style={[styles.analysisValue, { color: TextColor }]}>
                  {formatMinutesToHours(getAdditionalStats.avgMinutes)}
                </Text>
              </View>
              <View style={styles.analysisRow}>
                <Text style={[styles.analysisLabel, { color: SecondaryText }]}>最長連続練習日</Text>
                <Text style={[styles.analysisValue, { color: TextColor }]}>
                  {getAdditionalStats.longestStreak}日
                </Text>
              </View>
              <View style={styles.analysisRow}>
                <Text style={[styles.analysisLabel, { color: SecondaryText }]}>練習頻度</Text>
                <Text style={[styles.analysisValue, { color: TextColor }]}>
                  週{getAdditionalStats.recordsPerWeek}回
                </Text>
              </View>
            </View>
          )}

          {/* 週間練習パターン */}
          {getAdditionalStats && Object.keys(getAdditionalStats.weeklyPattern).length > 0 && (
            <View style={styles.analysisSection}>
              <Text style={[styles.analysisSectionTitle, { color: TextColor }]}>週間練習パターン</Text>
              {Object.entries(getAdditionalStats.weeklyPattern)
                .sort((a, b) => (b[1] as number) - (a[1] as number))
                .slice(0, 7)
                .map(([day, count], index) => (
                <View style={styles.analysisRow} key={index}>
                  <Text style={[styles.analysisLabel, { color: SecondaryText }]}>{day}曜日</Text>
                  <Text style={[styles.analysisValue, { color: TextColor }]}>
                    {count as number}回
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* 月別練習傾向 */}
          {getAdditionalStats && getAdditionalStats.monthlyTendency.length > 0 && (
            <View style={styles.analysisSection}>
              <Text style={[styles.analysisSectionTitle, { color: TextColor }]}>月別練習傾向（最近6ヶ月）</Text>
              {getAdditionalStats.monthlyTendency.map(([month, minutes], index) => (
                <View style={styles.analysisRow} key={index}>
                  <Text style={[styles.analysisLabel, { color: SecondaryText }]}>{month}</Text>
                  <Text style={[styles.analysisValue, { color: TextColor }]}>
                    {formatMinutesToHours(minutes)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* 練習統計サマリー */}
          {getAdditionalStats && (
            <View style={styles.analysisSection}>
              <Text style={[styles.analysisSectionTitle, { color: TextColor }]}>練習統計サマリー</Text>
              <View style={styles.analysisRow}>
                <Text style={[styles.analysisLabel, { color: SecondaryText }]}>総練習回数</Text>
                <Text style={[styles.analysisValue, { color: TextColor }]}>
                  {getAdditionalStats.totalPracticeCount}回
                </Text>
              </View>
              <View style={styles.analysisRow}>
                <Text style={[styles.analysisLabel, { color: SecondaryText }]}>練習日数</Text>
                <Text style={[styles.analysisValue, { color: TextColor }]}>
                  {getAdditionalStats.totalPracticeDays}日
                </Text>
              </View>
              <View style={styles.analysisRow}>
                <Text style={[styles.analysisLabel, { color: SecondaryText }]}>平均日数/週</Text>
                <Text style={[styles.analysisValue, { color: TextColor }]}>
                  {getAdditionalStats.recordsPerWeek}日
                </Text>
              </View>
            </View>
          )}

          {/* 練習強度別統計 */}
          {getAdditionalStats && (
            <View style={styles.analysisSection}>
              <Text style={[styles.analysisSectionTitle, { color: TextColor }]}>練習強度別統計</Text>
              <View style={styles.analysisRow}>
                <Text style={[styles.analysisLabel, { color: SecondaryText }]}>短時間（30分未満）</Text>
                <Text style={[styles.analysisValue, { color: TextColor }]}>
                  {getAdditionalStats.intensityStats.short}回
                </Text>
              </View>
              <View style={styles.analysisRow}>
                <Text style={[styles.analysisLabel, { color: SecondaryText }]}>中時間（30-60分）</Text>
                <Text style={[styles.analysisValue, { color: TextColor }]}>
                  {getAdditionalStats.intensityStats.medium}回
                </Text>
              </View>
              <View style={styles.analysisRow}>
                <Text style={[styles.analysisLabel, { color: SecondaryText }]}>長時間（60分以上）</Text>
                <Text style={[styles.analysisValue, { color: TextColor }]}>
                  {getAdditionalStats.intensityStats.long}回
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginTop: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '700',
  },
  statsModeRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 4,
    justifyContent: 'center',
    marginBottom: 4,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 2,
  },
  segmentedButton: {
    paddingHorizontal: 40,
    paddingVertical: 8,
    minWidth: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedButtonLeft: {
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
  },
  segmentedButtonRight: {
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
  },
  segmentedButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  chartCard: {
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginBottom: 12,
    marginTop: 8,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  xAxisLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: width - 40,
    marginTop: 8,
  },
  xLabel: {
    width: 16,
    fontSize: 10,
    textAlign: 'center',
    color: '#6B7280',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryCard: {
    width: '48%',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#374151',
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
  },
  detailAnalysisCard: {
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    elevation: 4,
  },
  detailAnalysisTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  analysisSection: {
    marginBottom: 20,
  },
  analysisSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  analysisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  analysisLabel: {
    fontSize: 14,
    flex: 1,
  },
  analysisValue: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  });

