/**
 * チューナー調査用。本番の logger は error しか出さないため、console.warn に直接出す。
 * 1秒ごとの要約と、遅い解析・画面停止だけを残す。
 */

export type TunerDiagSnapshot = {
  callbacks: number;
  droppedBusy: number;
  waitingWindow: number;
  scheduled: number;
  completed: number;
  lastAnalysisMs: number;
  maxAnalysisMs: number;
  lastFrequency: number;
  lastRms: number;
  lastPeak: number;
  lastChunk: number;
  uiTicks: number;
  maxUiGapMs: number;
  lastError: string;
  busy: boolean;
};

export const emptyTunerDiag = (): TunerDiagSnapshot => ({
  callbacks: 0,
  droppedBusy: 0,
  waitingWindow: 0,
  scheduled: 0,
  completed: 0,
  lastAnalysisMs: 0,
  maxAnalysisMs: 0,
  lastFrequency: 0,
  lastRms: 0,
  lastPeak: 0,
  lastChunk: 0,
  uiTicks: 0,
  maxUiGapMs: 0,
  lastError: '',
  busy: false,
});

export const tunerDiagLog = (event: string, detail?: Record<string, unknown>): void => {
  // 本番ビルドでも Metro / logcat に残す（logger は error しか出さない）
  if (detail) {
    // eslint-disable-next-line no-console
    console.warn(`[tuner] ${event}`, detail);
    return;
  }
  // eslint-disable-next-line no-console
  console.warn(`[tuner] ${event}`);
};

export const formatTunerDiag = (snapshot: TunerDiagSnapshot): string => {
  const err = snapshot.lastError ? ` err=${snapshot.lastError}` : '';
  return [
    `cb=${snapshot.callbacks}`,
    `drop=${snapshot.droppedBusy}`,
    `wait=${snapshot.waitingWindow}`,
    `解析=${snapshot.completed}/${snapshot.scheduled}`,
    `${snapshot.lastAnalysisMs}ms`,
    `max=${snapshot.maxAnalysisMs}ms`,
    `ui=${snapshot.uiTicks}`,
    `uiGap=${snapshot.maxUiGapMs}ms`,
    `f=${snapshot.lastFrequency > 0 ? snapshot.lastFrequency.toFixed(1) : '--'}`,
    `rms=${snapshot.lastRms.toFixed(4)}`,
    `peak=${snapshot.lastPeak.toFixed(3)}`,
    `chunk=${snapshot.lastChunk}`,
    snapshot.busy ? 'busy' : 'idle',
  ].join(' ') + err;
};
