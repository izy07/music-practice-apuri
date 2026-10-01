/**
 * カレンダー「今月合計」横の日替わりインサイト
 */
import { formatLocalDate, formatMinutesToHours } from '@/lib/dateUtils';
import { filterByInstrumentIdInMemory } from '@/repositories/common/instrumentFilter';

export type PracticeDaySummary = {
  minutes: number;
  hasRecord?: boolean;
  hasBasicPractice?: boolean;
};

export type CalendarInsight = {
  id: string;
  text: string;
};

export type CalendarInsightContext = {
  practiceData: Record<string, PracticeDaySummary>;
  monthlyTotalMinutes: number;
  /** 表示中の月（カレンダーの currentDate） */
  viewYear: number;
  viewMonth: number; // 0-indexed
  /** ローカル「今日」（日替わりシード用） */
  today: Date;
  userId: string;
  /** 先月の合計（分）。未取得は undefined */
  previousMonthTotalMinutes?: number;
};

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const;

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function formatInsightDateKey(date: Date): string {
  return formatLocalDate(date);
}

function isSameMonth(a: Date, year: number, month: number): boolean {
  return a.getFullYear() === year && a.getMonth() === month;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getPracticeDays(practiceData: Record<string, PracticeDaySummary>): string[] {
  return Object.entries(practiceData)
    .filter(([, v]) => (v.minutes ?? 0) > 0)
    .map(([date]) => date)
    .sort();
}

function computeStreakEndingAt(
  practiceDates: Set<string>,
  endDate: Date
): number {
  let streak = 0;
  const cursor = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  for (;;) {
    const key = formatLocalDate(cursor);
    if (!practiceDates.has(key)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function computeMonthOverMonthText(
  current: number,
  previous: number
): string | null {
  if (previous <= 0 && current <= 0) return null;
  if (previous <= 0 && current > 0) {
    return `先月は記録なし → 今月 ${formatMinutesToHours(current)}`;
  }
  const diff = current - previous;
  const pct = Math.round((diff / previous) * 100);
  if (diff === 0) return '先月と同じペース';
  if (diff > 0) {
    if (pct >= 5) return `先月比 +${pct}%（+${formatMinutesToHours(diff)}）`;
    return `先月より ${formatMinutesToHours(diff)} 多い`;
  }
  const absPct = Math.abs(pct);
  if (absPct >= 5) return `先月比 ${pct}%`;
  return `先月より ${formatMinutesToHours(Math.abs(diff))} 少ない`;
}

/**
 * 条件を満たすインサイト候補を生成（優先度順に並べる）
 */
export function buildCalendarInsightCandidates(
  ctx: CalendarInsightContext
): CalendarInsight[] {
  const candidates: CalendarInsight[] = [];
  const practiceDays = getPracticeDays(ctx.practiceData);
  const dayCount = practiceDays.length;

  if (ctx.previousMonthTotalMinutes !== undefined) {
    const mom = computeMonthOverMonthText(
      ctx.monthlyTotalMinutes,
      ctx.previousMonthTotalMinutes
    );
    if (mom && (ctx.monthlyTotalMinutes > 0 || ctx.previousMonthTotalMinutes > 0)) {
      candidates.push({ id: 'month_over_month', text: mom });
    }
  }

  if (dayCount >= 1) {
    candidates.push({
      id: 'practice_days',
      text: `今月 ${dayCount} 日練習`,
    });
  }

  if (dayCount >= 2) {
    const avg = Math.round(ctx.monthlyTotalMinutes / dayCount);
    if (avg >= 5) {
      candidates.push({
        id: 'avg_per_practice_day',
        text: `1日平均 ${formatMinutesToHours(avg)}`,
      });
    }
  }

  const weekdayCounts: Record<string, number> = {};
  practiceDays.forEach((dateStr) => {
    const d = new Date(`${dateStr}T12:00:00`);
    const name = WEEKDAYS[d.getDay()];
    weekdayCounts[name] = (weekdayCounts[name] || 0) + 1;
  });
  const weekdayEntries = Object.entries(weekdayCounts).sort((a, b) => b[1] - a[1]);
  if (weekdayEntries.length > 0 && dayCount >= 3) {
    const [topDay, topCount] = weekdayEntries[0];
    const second = weekdayEntries[1]?.[1] ?? 0;
    if (topCount >= 2 && topCount > second) {
      candidates.push({
        id: 'top_weekday',
        text: `${topDay}曜日が多い（${topCount}日）`,
      });
    }
  }

  let bestDate = '';
  let bestMinutes = 0;
  practiceDays.forEach((dateStr) => {
    const m = ctx.practiceData[dateStr]?.minutes ?? 0;
    if (m > bestMinutes) {
      bestMinutes = m;
      bestDate = dateStr;
    }
  });
  if (bestMinutes >= 45 && bestDate) {
    const [, mm, dd] = bestDate.split('-');
    candidates.push({
      id: 'longest_day',
      text: `最長は ${Number(mm)}/${Number(dd)}（${formatMinutesToHours(bestMinutes)}）`,
    });
  }

  const practiceSet = new Set(practiceDays);
  const viewingTodayMonth = isSameMonth(
    ctx.today,
    ctx.viewYear,
    ctx.viewMonth
  );
  const streakEnd = viewingTodayMonth
    ? ctx.today
    : new Date(ctx.viewYear, ctx.viewMonth, daysInMonth(ctx.viewYear, ctx.viewMonth));
  const streak = computeStreakEndingAt(practiceSet, streakEnd);
  if (streak >= 2) {
    candidates.push({
      id: 'streak',
      text: `${viewingTodayMonth ? '連続' : '月末時点で連続'} ${streak} 日`,
    });
  }

  if (
    viewingTodayMonth &&
    ctx.monthlyTotalMinutes > 0 &&
    ctx.today.getDate() >= 3
  ) {
    const elapsed = ctx.today.getDate();
    const totalDays = daysInMonth(ctx.viewYear, ctx.viewMonth);
    const projected = Math.round((ctx.monthlyTotalMinutes / elapsed) * totalDays);
    if (projected > ctx.monthlyTotalMinutes + 10) {
      candidates.push({
        id: 'month_pace',
        text: `このペースなら月末 約${formatMinutesToHours(projected)}`,
      });
    }
  }

  return candidates;
}

/**
 * ユーザー×日付で決定的に1件選ぶ（その日は同じ表示）
 */
export function pickDailyCalendarInsight(
  candidates: CalendarInsight[],
  userId: string,
  dateKey: string,
  viewMonthKey: string
): CalendarInsight | null {
  if (candidates.length === 0) return null;
  const index =
    hashString(`${userId}:${dateKey}:${viewMonthKey}`) % candidates.length;
  return candidates[index] ?? null;
}

export function resolveCalendarInsight(
  ctx: CalendarInsightContext
): CalendarInsight | null {
  const dateKey = formatInsightDateKey(ctx.today);
  const viewMonthKey = `${ctx.viewYear}-${String(ctx.viewMonth + 1).padStart(2, '0')}`;
  const candidates = buildCalendarInsightCandidates(ctx);
  return pickDailyCalendarInsight(candidates, ctx.userId, dateKey, viewMonthKey);
}

type SessionRow = {
  practice_date?: string;
  duration_minutes?: number;
  input_method?: string;
  instrument_id?: string | null;
};

/** 指定月の合計練習時間（分）— 先月比用 */
export async function fetchMonthlyPracticeTotalMinutes(
  userId: string,
  instrumentId: string | null,
  year: number,
  month: number // 0-indexed
): Promise<number | null> {
  try {
    const { supabase } = await import('@/lib/supabase');
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    const { data: rawSessions, error } = await supabase
      .from('practice_sessions')
      .select('practice_date, duration_minutes, input_method, instrument_id')
      .eq('user_id', userId)
      .gte('practice_date', formatLocalDate(start))
      .lte('practice_date', formatLocalDate(end));

    if (error) {
      if (
        error.code === 'PGRST205' ||
        error.code === 'PGRST116' ||
        error.message?.includes('Could not find the table')
      ) {
        return null;
      }
      return null;
    }

    const sessions = filterByInstrumentIdInMemory(
      (rawSessions || []) as SessionRow[],
      instrumentId,
      true
    );

    let total = 0;
    sessions.forEach((session) => {
      if (session.input_method === 'preset') return;
      const minutes = session.duration_minutes;
      if (typeof minutes === 'number' && !Number.isNaN(minutes) && minutes > 0) {
        total += minutes;
      }
    });
    return total;
  } catch {
    return null;
  }
}
