import {
  buildCalendarInsightCandidates,
  pickDailyCalendarInsight,
  resolveCalendarInsight,
  type PracticeDaySummary,
} from '@/lib/calendarInsight';

const userId = 'user-test-1';

function makeData(entries: [string, number][]): Record<string, PracticeDaySummary> {
  const out: Record<string, PracticeDaySummary> = {};
  entries.forEach(([date, minutes]) => {
    out[date] = { minutes, hasRecord: minutes > 0 };
  });
  return out;
}

describe('calendarInsight', () => {
  it('同じ日・同じユーザーなら同じインサイト', () => {
    const practiceData = makeData([
      ['2026-09-01', 30],
      ['2026-09-02', 40],
      ['2026-09-03', 50],
    ]);
    const ctx = {
      practiceData,
      monthlyTotalMinutes: 120,
      viewYear: 2026,
      viewMonth: 8,
      today: new Date('2026-09-03T12:00:00'),
      userId,
      previousMonthTotalMinutes: 60,
    };
    const a = resolveCalendarInsight(ctx);
    const b = resolveCalendarInsight(ctx);
    expect(a).toEqual(b);
    expect(a).not.toBeNull();
  });

  it('日付が変わると別候補になりうる', () => {
    const practiceData = makeData([
      ['2026-09-01', 60],
      ['2026-09-02', 60],
      ['2026-09-03', 60],
    ]);
    const base = {
      practiceData,
      monthlyTotalMinutes: 180,
      viewYear: 2026,
      viewMonth: 8,
      userId,
      previousMonthTotalMinutes: 90,
    };
    const d1 = resolveCalendarInsight({
      ...base,
      today: new Date('2026-09-03T12:00:00'),
    });
    const d2 = resolveCalendarInsight({
      ...base,
      today: new Date('2026-09-04T12:00:00'),
    });
    expect(d1).not.toBeNull();
    expect(d2).not.toBeNull();
  });

  it('データが少ないときは候補が空', () => {
    const candidates = buildCalendarInsightCandidates({
      practiceData: {},
      monthlyTotalMinutes: 0,
      viewYear: 2026,
      viewMonth: 8,
      today: new Date('2026-09-03T12:00:00'),
      userId,
    });
    expect(candidates).toHaveLength(0);
  });

  it('先月比候補が含まれる', () => {
    const candidates = buildCalendarInsightCandidates({
      practiceData: makeData([['2026-09-01', 60]]),
      monthlyTotalMinutes: 60,
      viewYear: 2026,
      viewMonth: 8,
      today: new Date('2026-09-05T12:00:00'),
      userId,
      previousMonthTotalMinutes: 30,
    });
    expect(candidates.some((c) => c.id === 'month_over_month')).toBe(true);
  });

  it('pickDailyCalendarInsight は候補範囲内', () => {
    const candidates = [
      { id: 'a', text: 'A' },
      { id: 'b', text: 'B' },
    ];
    const picked = pickDailyCalendarInsight(
      candidates,
      userId,
      '2026-09-03',
      '2026-09'
    );
    expect(candidates).toContainEqual(picked);
  });
});
