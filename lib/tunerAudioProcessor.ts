/**
 * チューナーの音響処理モジュール
 * 周波数検出、音名変換、平滑化処理などを提供
 */

// プロ仕様の音名と周波数対応
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_NAMES_JA = ['ド', 'ド#', 'レ', 'レ#', 'ミ', 'ファ', 'ファ#', 'ソ', 'ソ#', 'ラ', 'ラ#', 'シ'];

// プロ仕様の周波数検出精度設定
export const TUNING_PRECISION = {
  EXCELLENT: 5,   // ±5セント以内: プロレベル
  GOOD: 10,       // ±10セント以内: 良い
  ACCEPTABLE: 15, // ±15セント以内: 許容範囲
  POOR: 25,       // ±25セント以内: 調整必要
} as const;

export interface NoteInfo {
  note: string;
  noteJa: string;
  octave: number;
  cents: number;
  isInTune: boolean;
  tuningQuality: 'excellent' | 'good' | 'acceptable' | 'poor';
  frequency: number;
}

/**
 * プロ仕様の周波数から音名を取得（高精度）
 */
export const getNoteFromFrequency = (
  frequency: number,
  a4Freq: number = 440
): NoteInfo => {
  if (frequency <= 0) {
    return {
      note: '--',
      noteJa: '--',
      octave: 0,
      cents: 0,
      isInTune: false,
      tuningQuality: 'poor',
      frequency: 0,
    };
  }

  // 周波数の妥当性チェック
  if (!isFinite(frequency) || frequency <= 0 || frequency > 10000) {
    return {
      note: '--',
      noteJa: '--',
      octave: 0,
      cents: 0,
      isInTune: false,
      tuningQuality: 'poor',
      frequency: 0,
    };
  }

  const a4NoteNumber = 69; // MIDI note number for A4
  const noteNumber = 12 * Math.log2(frequency / a4Freq) + a4NoteNumber;
  
  // noteNumberの妥当性チェック
  if (!isFinite(noteNumber) || noteNumber < 0 || noteNumber > 127) {
    return {
      note: '--',
      noteJa: '--',
      octave: 0,
      cents: 0,
      isInTune: false,
      tuningQuality: 'poor',
      frequency: frequency,
    };
  }
  
  const nearestMidi = Math.round(noteNumber); // 最も近い半音に丸め
  
  // nearestMidiの妥当性チェック
  if (nearestMidi < 0 || nearestMidi > 127) {
    return {
      note: '--',
      noteJa: '--',
      octave: 0,
      cents: 0,
      isInTune: false,
      tuningQuality: 'poor',
      frequency: frequency,
    };
  }
  
  const octave = Math.floor(nearestMidi / 12) - 1;
  const noteIndex = ((nearestMidi % 12) + 12) % 12; // 0-11 に正規化

  // noteIndexの範囲チェック
  if (noteIndex < 0 || noteIndex >= NOTE_NAMES.length) {
    console.error('Invalid noteIndex:', noteIndex, 'nearestMidi:', nearestMidi, 'frequency:', frequency);
    return {
      note: '--',
      noteJa: '--',
      octave: 0,
      cents: 0,
      isInTune: false,
      tuningQuality: 'poor',
      frequency: frequency,
    };
  }

  const note = NOTE_NAMES[noteIndex];
  const noteJa = NOTE_NAMES_JA[noteIndex];

  const cents = (noteNumber - nearestMidi) * 100;
  const absCents = Math.abs(cents);

  // プロ仕様のチューニング品質判定
  let tuningQuality: 'excellent' | 'good' | 'acceptable' | 'poor';
  let isInTune: boolean;

  if (absCents <= TUNING_PRECISION.EXCELLENT) {
    tuningQuality = 'excellent';
    isInTune = true;
  } else if (absCents <= TUNING_PRECISION.GOOD) {
    tuningQuality = 'good';
    isInTune = true;
  } else if (absCents <= TUNING_PRECISION.ACCEPTABLE) {
    tuningQuality = 'acceptable';
    isInTune = true;
  } else {
    tuningQuality = 'poor';
    isInTune = false;
  }

  return {
    note,
    noteJa,
    octave,
    cents,
    isInTune,
    tuningQuality,
    frequency,
  };
};

/**
 * 改良された自己相関法でピッチ検出（ハーモニクス除去機能付き）
 */
export const autoCorrelate = (
  buffer: Float32Array,
  sampleRate: number
): number => {
  let SIZE = buffer.length;

  // 前処理: ハン窓を適用してエッジ効果を軽減
  const windowedBuffer = new Float32Array(SIZE);
  for (let i = 0; i < SIZE; i++) {
    const window = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (SIZE - 1));
    windowedBuffer[i] = buffer[i] * window;
  }

  // RMS計算（動的閾値）
  let rms = 0;
  for (let i = 0; i < SIZE; i++) {
    rms += windowedBuffer[i] * windowedBuffer[i];
  }
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.005) return -1; // より厳密な無音検出

  // エッジトリミング（動的閾値）
  const thres = Math.max(0.1, rms * 0.3);
  let r1 = 0;
  let r2 = SIZE - 1;
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(windowedBuffer[i]) < thres) {
      r1 = i;
      break;
    }
  }
  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(windowedBuffer[SIZE - i]) < thres) {
      r2 = SIZE - i;
      break;
    }
  }
  const trimmedBuffer = windowedBuffer.slice(r1, r2);
  SIZE = trimmedBuffer.length;

  if (SIZE < 100) return -1; // バッファが小さすぎる場合

  const c = new Array<number>(SIZE).fill(0);
  const step = 1; // より細かいステップで精度向上

  // 正規化自己相関計算
  for (let i = 0; i < SIZE; i += step) {
    let sum = 0;
    let norm1 = 0;
    let norm2 = 0;
    for (let j = 0; j < SIZE - i; j += step) {
      sum += trimmedBuffer[j] * trimmedBuffer[j + i];
      norm1 += trimmedBuffer[j] * trimmedBuffer[j];
      norm2 += trimmedBuffer[j + i] * trimmedBuffer[j + i];
    }
    if (norm1 > 0 && norm2 > 0) {
      c[i] = sum / Math.sqrt(norm1 * norm2); // 正規化
    }
  }

  // ゼロクロッシング点を探す
  let d = 0;
  while (d < SIZE - 1 && c[d] > c[d + 1]) d++;

  // 周波数範囲制限（より厳密）
  const minPeriod = Math.floor(sampleRate / 4000); // 最高周波数4000Hz
  const maxPeriod = Math.floor(sampleRate / 80);   // 最低周波数80Hz

  // 候補となるピークを複数見つける（ハーモニクス除去のため）
  const candidates: Array<{ period: number; correlation: number }> = [];
  
  for (let i = Math.max(d, minPeriod); i < Math.min(SIZE, maxPeriod); i += step) {
    // ピークを検出（前後の値より大きい）
    if (i > 0 && i < SIZE - 1 && c[i] > c[i - 1] && c[i] > c[i + 1] && c[i] > 0.3) {
      candidates.push({ period: i, correlation: c[i] });
    }
  }

  // 相関値でソート（高い順）
  candidates.sort((a, b) => b.correlation - a.correlation);

  // 基本周波数を決定（ハーモニクスを除外）
  let fundamentalPeriod = -1;
  let fundamentalCorrelation = -1;

  for (const candidate of candidates) {
    // 既に見つかった基本周波数の整数倍（ハーモニクス）かチェック
    if (fundamentalPeriod > 0) {
      const ratio = candidate.period / fundamentalPeriod;
      // 2倍、3倍、4倍などのハーモニクスの可能性をチェック
      if (Math.abs(ratio - Math.round(ratio)) < 0.1) {
        continue; // ハーモニクスの可能性が高いのでスキップ
      }
    }

    // 他の候補がこの候補の整数倍（ハーモニクス）かチェック
    let isHarmonic = false;
    for (const other of candidates) {
      if (other.period === candidate.period) continue;
      const ratio = other.period / candidate.period;
      // 2倍、3倍、4倍などのハーモニクスの可能性をチェック
      if (ratio > 1 && Math.abs(ratio - Math.round(ratio)) < 0.1) {
        isHarmonic = true;
        break;
      }
    }

    // ハーモニクスでない場合、基本周波数として採用
    if (!isHarmonic) {
      fundamentalPeriod = candidate.period;
      fundamentalCorrelation = candidate.correlation;
      break;
    }
  }

  // 候補が見つからなかった場合は、最も相関値の高いものを使用
  if (fundamentalPeriod === -1 && candidates.length > 0) {
    fundamentalPeriod = candidates[0].period;
    fundamentalCorrelation = candidates[0].correlation;
  }

  if (fundamentalPeriod === -1 || fundamentalCorrelation < 0.4) return -1;

  let T0 = fundamentalPeriod;

  // パラボラ補間による精度向上
  if (T0 > 0 && T0 < SIZE - 1) {
    const x1 = c[T0 - 1];
    const x2 = c[T0];
    const x3 = c[T0 + 1];
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    if (Math.abs(a) > 1e-10) {
      const correction = -b / (2 * a);
      if (Math.abs(correction) <= 1) {
        T0 = T0 + correction;
      }
    }
  }

  if (T0 <= 0 || T0 >= SIZE) {
    return -1;
  }

  const freq = sampleRate / T0;

  // 周波数の範囲チェック（80Hz - 4000Hzの範囲内のみ有効）
  if (!isFinite(freq) || freq < 80 || freq > 4000) {
    return -1;
  }

  return freq;
};

/**
 * 改良された平滑化処理（EMA + 適応的フィルタリング）
 */
export const smoothValue = (
  currentValue: number,
  targetValue: number,
  alpha: number,
  maxChange: number
): number => {
  const diff = targetValue - currentValue;

  // 大きな変化の場合はより強い平滑化を適用
  const adaptiveAlpha = Math.abs(diff) > maxChange * 2 ? alpha * 0.5 : alpha;

  const limitedDiff = Math.max(-maxChange, Math.min(maxChange, diff));
  const smoothedValue = currentValue + limitedDiff * adaptiveAlpha;

  // 異常値の検出と修正
  if (Math.abs(smoothedValue - targetValue) > maxChange * 3) {
    return currentValue + Math.sign(diff) * maxChange;
  }

  return smoothedValue;
};

/**
 * チューニング品質に基づいて色を取得
 */
export const getTuningColor = (
  absCents: number
): { color: string; colorState: 'gray' | 'green' | 'yellow' | 'red' } => {
  if (absCents <= TUNING_PRECISION.EXCELLENT) {
    return { color: '#00C853', colorState: 'green' }; // プロレベル緑
  } else if (absCents <= TUNING_PRECISION.GOOD) {
    return { color: '#4CAF50', colorState: 'green' }; // 良い緑
  } else if (absCents <= TUNING_PRECISION.ACCEPTABLE) {
    return { color: '#FF9800', colorState: 'yellow' }; // 警告オレンジ
  } else {
    return { color: '#F44336', colorState: 'red' }; // 調整必要赤
  }
};

