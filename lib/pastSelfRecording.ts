/**
 * 「過去の自分から通知」— 録音履歴から意味のあるペアを選ぶ
 */

export type RecordingSnapshot = {
  id: string;
  title: string | null;
  file_path: string;
  recorded_at: string;
  duration_seconds?: number | null;
  recording_type?: string | null;
};

export type ComparisonReason = 'same_title' | 'first_recording' | 'time_gap';

export type PastSelfComparison = {
  past: RecordingSnapshot;
  recent: RecordingSnapshot;
  gapDays: number;
  reason: ComparisonReason;
  /** 表示用: 「2か月前」「先月」など */
  gapLabel: string;
  /** 通知見出し */
  headline: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function formatRecordingLabel(
  recordedAt: string,
  prefix: string
): string {
  const d = new Date(recordedAt);
  if (Number.isNaN(d.getTime())) return prefix;
  const datePart = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  return prefix ? `${prefix}（${datePart}）` : datePart;
}

/** 間隔（日）をユーザー向けラベルに */
export function gapLabelFromDays(gapDays: number): string {
  if (gapDays <= 1) return '昨日';
  if (gapDays <= 20) return `${gapDays}日前`;
  if (gapDays <= 44) return '先月';
  if (gapDays <= 74) return '2か月前';
  if (gapDays <= 105) return '3か月前';
  if (gapDays <= 200) return '半年前';
  if (gapDays <= 380) return '1年前';
  const months = Math.round(gapDays / 30);
  return `${months}か月前`;
}

function normalizeTitle(title: string | null | undefined): string {
  return (title || '').trim().toLowerCase().replace(/\s+/g, '');
}

function buildHeadline(
  reason: ComparisonReason,
  gapLabel: string,
  pastTitle: string | null
): string {
  if (reason === 'same_title' && pastTitle?.trim()) {
    return `「${pastTitle.trim()}」、${gapLabel}の自分と比べてみませんか？`;
  }
  if (reason === 'first_recording') {
    return 'はじめて録った演奏、聴いてみませんか？';
  }
  return `${gapLabel}のあなたの演奏を聴いてみませんか？`;
}

type ScoredPair = {
  past: RecordingSnapshot;
  recent: RecordingSnapshot;
  gapDays: number;
  reason: ComparisonReason;
  score: number;
};

function scorePair(
  past: RecordingSnapshot,
  recent: RecordingSnapshot,
  opts: { isFirst: boolean; sameTitle: boolean }
): ScoredPair {
  const recentMs = new Date(recent.recorded_at).getTime();
  const pastMs = new Date(past.recorded_at).getTime();
  const gapDays = Math.max(1, Math.round((recentMs - pastMs) / DAY_MS));

  let score = gapDays;
  if (opts.sameTitle) score += 1000;
  if (opts.isFirst) score += 500;

  const milestones = [30, 60, 90, 180, 365];
  const milestoneBonus = Math.max(
    0,
    120 - Math.min(...milestones.map((m) => Math.abs(gapDays - m)))
  );
  score += milestoneBonus;

  const reason: ComparisonReason = opts.sameTitle
    ? 'same_title'
    : opts.isFirst
      ? 'first_recording'
      : 'time_gap';

  return { past, recent, gapDays, reason, score };
}

/**
 * 最新録音を基点に、同曲名 / 初録音 / 時間間隔 から最適ペアを1つ選ぶ
 */
const TOP_CANDIDATE_POOL = 5;

export function pickPastSelfComparison(
  recordings: RecordingSnapshot[],
  options?: {
    now?: Date;
    minGapDays?: number;
    /** 候補ローテーション用（起動回数など）。ラベルは常に実際の間隔 */
    selectionSeed?: number;
  }
): PastSelfComparison | null {
  const minGapDays = options?.minGapDays ?? 14;

  const valid = recordings.filter((r) => r.file_path?.trim());
  if (valid.length < 2) return null;

  const performanceFirst = valid.filter(
    (r) => !r.recording_type || r.recording_type === 'performance'
  );
  const pool = performanceFirst.length >= 2 ? performanceFirst : valid;

  const sorted = [...pool].sort(
    (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
  );
  const recent = sorted[0];
  const recentMs = new Date(recent.recorded_at).getTime();
  if (Number.isNaN(recentMs)) return null;

  const oldest = sorted[sorted.length - 1];
  const candidates: ScoredPair[] = [];

  for (const past of sorted.slice(1)) {
    const pastMs = new Date(past.recorded_at).getTime();
    if (Number.isNaN(pastMs)) continue;
    const gapDays = Math.round((recentMs - pastMs) / DAY_MS);
    if (gapDays < minGapDays) continue;

    const sameTitle =
      normalizeTitle(past.title) !== '' &&
      normalizeTitle(past.title) === normalizeTitle(recent.title);
    const isFirst = past.id === oldest.id;

    candidates.push(scorePair(past, recent, { isFirst, sameTitle }));
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.score - a.score);
  const poolSize = Math.min(TOP_CANDIDATE_POOL, candidates.length);
  const topCandidates = candidates.slice(0, poolSize);
  const seed = options?.selectionSeed ?? 0;
  const picked = topCandidates[Math.abs(seed) % topCandidates.length];
  const gapLabel = gapLabelFromDays(picked.gapDays);

  return {
    past: picked.past,
    recent: picked.recent,
    gapDays: picked.gapDays,
    reason: picked.reason,
    gapLabel,
    headline: buildHeadline(picked.reason, gapLabel, picked.past.title),
  };
}
