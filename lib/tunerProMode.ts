/**
 * プロ／オーケストラ向けチューナーモード
 * Phase 1: 長窓・弱平滑化・ストロボ UI
 * Phase 2: HPS（倍音積）+ 48kHz 解析
 * Phase 3: 位相差ベースのストロボエンジン
 */
import {
  combineAlgorithms,
  mpmPitchDetection,
  calculateAdaptiveThresholds,
  TUNER_ANALYSIS,
} from '@/lib/tunerAudioProcessor';

/** プロモード解析（Phase 2: 長窓・高音域拡張） */
export const TUNER_PRO_ANALYSIS = {
  /** ネイティブは 48kHz を試行、Web は 44.1kHz にフォールバック */
  SAMPLE_RATE_PREFERRED: 48000,
  SAMPLE_RATE_FALLBACK: 44100,
  /** ≈680ms @ 44.1kHz / ≈625ms @ 48kHz — Web AnalyserNode 上限 32768 */
  WINDOW_SAMPLES: 32768,
  HOP_SAMPLES: 8192,
  /** HPS 用に decimate した FFT サイズ */
  HPS_FFT_SIZE: 8192,
  HPS_MAX_HARMONICS: 5,
  MIN_HZ: 40,
  MAX_HZ: 4000,
} as const;

/** プロモード表示・平滑化（Phase 1） */
export const TUNER_PRO_DISPLAY = {
  CENTS_DEAD_ZONE: 0.05,
  /** 長時間中央値（≈2s @ 33ms） */
  LONG_AVERAGE_SIZE: 60,
  /** 短期履歴（プロでも最小限） */
  HISTORY_SIZE: 5,
  UI_INTERVAL_MS: 33,
  /** ±0.1 セント以内でストロボ停止 */
  STROBE_LOCK_CENTS: 0.1,
  /** セント → ストロボスクロール速度（px/s） */
  STROBE_CENTS_TO_SPEED: 18,
  A4_MIN: 432,
  A4_MAX: 450,
  A4_STEP: 0.1,
} as const;

export type ProFrequencyStabilizerState = {
  history: number[];
  longAverage: number[];
  smoothed: number;
  longTermMedian: number;
};

export const createProFrequencyStabilizerState = (): ProFrequencyStabilizerState => ({
  history: [],
  longAverage: [],
  smoothed: 0,
  longTermMedian: 0,
});

const median = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

const isOctaveRelationHz = (a: number, b: number): boolean => {
  if (a <= 0 || b <= 0) return false;
  const ratio = a > b ? a / b : b / a;
  return (ratio > 1.9 && ratio < 2.1) || (ratio > 3.8 && ratio < 4.2);
};

const isNearFreq = (a: number, b: number, rel = 0.025): boolean => {
  if (a <= 0 || b <= 0) return false;
  return Math.abs(a - b) / Math.max(a, b) < rel;
};

/** 簡易 radix-2 FFT（実数入力 → 振幅スペクトル前半） */
const magnitudeSpectrum = (input: Float32Array, fftSize: number): Float32Array => {
  const n = fftSize;
  const re = new Float32Array(n);
  const im = new Float32Array(n);
  const copyLen = Math.min(input.length, n);
  for (let i = 0; i < copyLen; i++) re[i] = input[i];

  // bit-reverse permutation
  let j = 0;
  for (let i = 1; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i];
      re[i] = re[j];
      re[j] = tr;
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wlenRe = Math.cos(ang);
    const wlenIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let wRe = 1;
      let wIm = 0;
      for (let k = 0; k < len / 2; k++) {
        const uRe = re[i + k];
        const uIm = im[i + k];
        const vRe = re[i + k + len / 2] * wRe - im[i + k + len / 2] * wIm;
        const vIm = re[i + k + len / 2] * wIm + im[i + k + len / 2] * wRe;
        re[i + k] = uRe + vRe;
        im[i + k] = uIm + vIm;
        re[i + k + len / 2] = uRe - vRe;
        im[i + k + len / 2] = uIm - vIm;
        const nextWRe = wRe * wlenRe - wIm * wlenIm;
        wIm = wRe * wlenIm + wIm * wlenRe;
        wRe = nextWRe;
      }
    }
  }

  const mag = new Float32Array(n / 2);
  for (let i = 0; i < n / 2; i++) {
    mag[i] = Math.sqrt(re[i] * re[i] + im[i] * im[i]);
  }
  return mag;
};

/**
 * HPS（Harmonic Product Spectrum）— Phase 2
 * 倍音構造から基音を強調し、プロ向け精度を補強する。
 */
export const hpsPitchDetection = (
  buffer: Float32Array,
  sampleRate: number
): number => {
  const { HPS_FFT_SIZE, HPS_MAX_HARMONICS, MIN_HZ, MAX_HZ } = TUNER_PRO_ANALYSIS;
  if (buffer.length < 1024) return -1;

  const start = Math.max(0, buffer.length - HPS_FFT_SIZE);
  const slice = buffer.subarray(start);
  const windowed = new Float32Array(HPS_FFT_SIZE);
  for (let i = 0; i < slice.length; i++) {
    const w = 0.5 * (1 - Math.cos((2 * Math.PI * i) / Math.max(slice.length - 1, 1)));
    windowed[i] = slice[i] * w;
  }

  const mag = magnitudeSpectrum(windowed, HPS_FFT_SIZE);
  const logMag = new Float32Array(mag.length);
  for (let i = 0; i < mag.length; i++) {
    logMag[i] = Math.log((mag[i] || 0) + 1e-9);
  }
  const hps = new Float32Array(logMag.length);
  for (let i = 0; i < logMag.length; i++) hps[i] = logMag[i];

  for (let h = 2; h <= HPS_MAX_HARMONICS; h++) {
    for (let i = 0; i < Math.floor(hps.length / h); i++) {
      hps[i] += logMag[Math.min(i * h, logMag.length - 1)];
    }
  }

  const minBin = Math.max(1, Math.floor((MIN_HZ * HPS_FFT_SIZE) / sampleRate));
  const maxBin = Math.min(hps.length - 1, Math.ceil((MAX_HZ * HPS_FFT_SIZE) / sampleRate));

  let peakBin = minBin;
  let peakVal = hps[minBin];
  for (let i = minBin + 1; i <= maxBin; i++) {
    if (hps[i] > peakVal) {
      peakVal = hps[i];
      peakBin = i;
    }
  }

  if (!isFinite(peakVal)) return -1;

  // パラボラ補間
  let refinedBin = peakBin;
  if (peakBin > minBin && peakBin < maxBin) {
    const y1 = hps[peakBin - 1];
    const y2 = hps[peakBin];
    const y3 = hps[peakBin + 1];
    const denom = 2 * (2 * y2 - y1 - y3);
    if (Math.abs(denom) > 1e-12) {
      refinedBin = peakBin + (y3 - y1) / denom;
    }
  }

  const freq = (refinedBin * sampleRate) / HPS_FFT_SIZE;
  if (!isFinite(freq) || freq < MIN_HZ || freq > MAX_HZ) return -1;
  return freq;
};

/** プロ向け統合検出: MPM + HPS（Phase 2） */
export const combineAlgorithmsPro = (
  buffer: Float32Array,
  sampleRate: number
): number => {
  const { MIN_HZ, MAX_HZ } = TUNER_PRO_ANALYSIS;

  let rms = 0;
  for (let i = 0; i < buffer.length; i++) rms += buffer[i] * buffer[i];
  rms = Math.sqrt(rms / buffer.length);
  const thresholds = calculateAdaptiveThresholds(rms, 0, true);
  if (rms < thresholds.rmsThreshold) return -1;

  const mpmFreq = mpmPitchDetection(buffer, sampleRate, thresholds);
  const hpsFreq = hpsPitchDetection(buffer, sampleRate);

  // MPM 成功時は基本信頼。HPS は 1% 以内で一致したときだけ微調整に使う。
  if (mpmFreq > MIN_HZ && mpmFreq <= MAX_HZ) {
    if (hpsFreq > MIN_HZ && hpsFreq <= MAX_HZ && isNearFreq(mpmFreq, hpsFreq, 0.01)) {
      return mpmFreq * 0.75 + hpsFreq * 0.25;
    }
    return mpmFreq;
  }

  if (hpsFreq > MIN_HZ && hpsFreq <= MAX_HZ) return hpsFreq;

  // フォールバック: 標準パイプライン（YIN/自己相関）
  const fallback = combineAlgorithms(buffer, sampleRate);
  if (fallback > MIN_HZ && fallback <= MAX_HZ) return fallback;
  return -1;
};

/**
 * プロ向け周波数安定化 — 弱平滑化 + 長時間中央値（Phase 1）
 */
export const stabilizeProFrequency = (
  state: ProFrequencyStabilizerState,
  detectedFrequency: number,
  historySize: number = TUNER_PRO_DISPLAY.HISTORY_SIZE,
  longAverageSize: number = TUNER_PRO_DISPLAY.LONG_AVERAGE_SIZE
): { accepted: false; state: ProFrequencyStabilizerState } | {
  accepted: true;
  frequency: number;
  longTermMedian: number;
  state: ProFrequencyStabilizerState;
} => {
  const { MIN_HZ, MAX_HZ } = TUNER_PRO_ANALYSIS;
  if (!(detectedFrequency > MIN_HZ && detectedFrequency < MAX_HZ)) {
    return { accepted: false, state };
  }

  let { history, longAverage, smoothed } = state;

  if (smoothed > 0) {
    const changeRatio = Math.abs(detectedFrequency - smoothed) / smoothed;
    if (!isOctaveRelationHz(detectedFrequency, smoothed) && changeRatio > 0.35) {
      return { accepted: false, state };
    }
  }

  if (smoothed > 0 && isOctaveRelationHz(detectedFrequency, smoothed)) {
    const fundamental = Math.min(detectedFrequency, smoothed);
    if (detectedFrequency < smoothed * 0.75) {
      history = [detectedFrequency];
      smoothed = detectedFrequency;
    } else if (
      Math.abs(detectedFrequency - fundamental) < Math.abs(smoothed - fundamental)
    ) {
      history = [fundamental];
      smoothed = fundamental;
    }
  }

  history = [...history, detectedFrequency];
  if (history.length > historySize) history = history.slice(history.length - historySize);

  longAverage = [...longAverage, detectedFrequency];
  if (longAverage.length > longAverageSize) {
    longAverage = longAverage.slice(longAverage.length - longAverageSize);
  }

  const shortMedian = history.length >= 3 ? median(history) : detectedFrequency;
  const longTermMedian = longAverage.length >= 5 ? median(longAverage) : shortMedian;

  let nextSmoothed: number;
  if (smoothed === 0) {
    nextSmoothed = shortMedian;
  } else {
    const diff = Math.abs(shortMedian - smoothed);
    const alpha = diff < 0.3 ? 0.85 : diff < 2 ? 0.7 : 0.55;
    nextSmoothed = smoothed * (1 - alpha) + shortMedian * alpha;
  }

  // 表示は長期中央値を優先（オーケストラの長音向け）
  const outputFrequency = longAverage.length >= 10
    ? longTermMedian * 0.7 + nextSmoothed * 0.3
    : nextSmoothed;

  return {
    accepted: true,
    frequency: outputFrequency,
    longTermMedian,
    state: {
      history,
      longAverage,
      smoothed: nextSmoothed,
      longTermMedian,
    },
  };
};

export const applyProCentsDeadZone = (
  cents: number,
  deadZone: number = TUNER_PRO_DISPLAY.CENTS_DEAD_ZONE
): number => (Math.abs(cents) <= deadZone ? 0 : cents);

/** Phase 3: 位相推定（Goertzel 風 — 検出周波数での瞬時位相） */
export const estimatePhaseAtFrequency = (
  buffer: Float32Array,
  sampleRate: number,
  frequency: number
): number => {
  if (frequency <= 0 || buffer.length < 64) return 0;
  const omega = (2 * Math.PI * frequency) / sampleRate;
  let sinSum = 0;
  let cosSum = 0;
  const start = Math.max(0, buffer.length - 4096);
  for (let i = start; i < buffer.length; i++) {
    sinSum += buffer[i] * Math.sin(omega * i);
    cosSum += buffer[i] * Math.cos(omega * i);
  }
  return Math.atan2(sinSum, cosSum);
};

export type PhaseStrobeState = {
  referencePhase: number;
  lastTimestampMs: number;
  targetFrequency: number;
  scrollOffset: number;
};

export const createPhaseStrobeState = (targetFrequency: number): PhaseStrobeState => ({
  referencePhase: 0,
  lastTimestampMs: 0,
  targetFrequency,
  scrollOffset: 0,
});

const wrapPhase = (phase: number): number => {
  const twoPi = 2 * Math.PI;
  let p = phase % twoPi;
  if (p > Math.PI) p -= twoPi;
  if (p < -Math.PI) p += twoPi;
  return p;
};

/**
 * Phase 3: 位相差ストロボエンジン
 * 基準周波数との位相差から Peterson 風スクロール速度を算出。
 */
export const updatePhaseStrobe = (
  state: PhaseStrobeState,
  measuredFrequency: number,
  measuredPhase: number,
  targetFrequency: number,
  nowMs: number,
  centsError: number
): {
  scrollSpeed: number;
  inTune: boolean;
  phaseError: number;
  state: PhaseStrobeState;
} => {
  const { STROBE_LOCK_CENTS, STROBE_CENTS_TO_SPEED } = TUNER_PRO_DISPLAY;
  const inTune = Math.abs(centsError) <= STROBE_LOCK_CENTS;

  if (state.lastTimestampMs <= 0) {
    return {
      scrollSpeed: 0,
      inTune,
      phaseError: 0,
      state: { ...state, targetFrequency, lastTimestampMs: nowMs },
    };
  }

  const dtSec = Math.min(0.1, (nowMs - state.lastTimestampMs) / 1000);
  const nextRefPhase = state.referencePhase + 2 * Math.PI * targetFrequency * dtSec;
  const phaseError = wrapPhase(measuredPhase - nextRefPhase);

  // 位相差 + セント誤差のハイブリッド（視覚的に Peterson に近い挙動）
  const freqDelta = measuredFrequency - targetFrequency;
  const phaseRate = (phaseError / (2 * Math.PI)) * targetFrequency;
  const hybridRate = freqDelta * 0.75 + phaseRate * 0.25;

  const scrollSpeed = inTune
    ? 0
    : hybridRate * STROBE_CENTS_TO_SPEED + centsError * STROBE_CENTS_TO_SPEED * 0.15;

  const scrollOffset = inTune
    ? state.scrollOffset
    : state.scrollOffset + scrollSpeed * dtSec;

  return {
    scrollSpeed,
    inTune,
    phaseError,
    state: {
      referencePhase: nextRefPhase,
      lastTimestampMs: nowMs,
      targetFrequency,
      scrollOffset,
    },
  };
};

/** 標準 vs プロの解析設定を解決 */
export const resolveTunerAnalysisConfig = (proMode: boolean) =>
  proMode
    ? {
        sampleRatePreferred: TUNER_PRO_ANALYSIS.SAMPLE_RATE_PREFERRED,
        sampleRateFallback: TUNER_PRO_ANALYSIS.SAMPLE_RATE_FALLBACK,
        windowSamples: TUNER_PRO_ANALYSIS.WINDOW_SAMPLES,
        hopSamples: TUNER_PRO_ANALYSIS.HOP_SAMPLES,
        detect: combineAlgorithmsPro,
      }
    : {
        sampleRatePreferred: TUNER_ANALYSIS.SAMPLE_RATE,
        sampleRateFallback: TUNER_ANALYSIS.SAMPLE_RATE,
        windowSamples: TUNER_ANALYSIS.WINDOW_SAMPLES,
        hopSamples: TUNER_ANALYSIS.HOP_SAMPLES,
        detect: combineAlgorithms,
      };
