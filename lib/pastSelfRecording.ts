/**
 * 「過去の自分から通知」— 約3か月前と最新の演奏録音を比較用に選ぶ
 */

export type RecordingSnapshot = {
  id: string;
  title: string | null;
  file_path: string;
  recorded_at: string;
  duration_seconds?: number | null;
  recording_type?: string | null;
};

export type PastSelfComparison = {
  past: RecordingSnapshot;
  recent: RecordingSnapshot;
  /** 2録音の間隔（日） */
  gapDays: number;
  /** past が目標日（例: 90日前）からどれだけ離れているか（日） */
  pastOffsetFromTargetDays: number;
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

/**
 * @param targetDaysAgo 目標とする「過去」（既定 90日 ≒ 3か月）
 * @param minGapDays 比較として意味がある最小間隔（既定 30日）
 */
export function pickPastSelfComparison(
  recordings: RecordingSnapshot[],
  options?: {
    now?: Date;
    targetDaysAgo?: number;
    minGapDays?: number;
    windowDays?: number;
  }
): PastSelfComparison | null {
  const now = options?.now ?? new Date();
  const targetDaysAgo = options?.targetDaysAgo ?? 90;
  const minGapDays = options?.minGapDays ?? 30;
  const windowDays = options?.windowDays ?? 45;

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

  const targetMs = now.getTime() - targetDaysAgo * DAY_MS;
  const windowMs = windowDays * DAY_MS;

  let bestPast: RecordingSnapshot | null = null;
  let bestDiff = Infinity;

  for (const candidate of sorted.slice(1)) {
    const t = new Date(candidate.recorded_at).getTime();
    if (Number.isNaN(t)) continue;
    const diffFromTarget = Math.abs(t - targetMs);
    if (diffFromTarget > windowMs) continue;
    if (diffFromTarget < bestDiff) {
      bestDiff = diffFromTarget;
      bestPast = candidate;
    }
  }

  if (!bestPast) {
    // 窓内に無ければ、最新より十分古い録音のうち target に最も近いもの
    for (const candidate of sorted.slice(1)) {
      const t = new Date(candidate.recorded_at).getTime();
      if (Number.isNaN(t)) continue;
      const gapDays = (recentMs - t) / DAY_MS;
      if (gapDays < minGapDays) continue;
      const diffFromTarget = Math.abs(t - targetMs);
      if (diffFromTarget < bestDiff) {
        bestDiff = diffFromTarget;
        bestPast = candidate;
      }
    }
  }

  if (!bestPast) return null;

  const pastMs = new Date(bestPast.recorded_at).getTime();
  const gapDays = Math.round((recentMs - pastMs) / DAY_MS);
  if (gapDays < minGapDays) return null;

  return {
    past: bestPast,
    recent,
    gapDays,
    pastOffsetFromTargetDays: Math.round(Math.abs(pastMs - targetMs) / DAY_MS),
  };
}
