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

  // 一般的なチューナーの計算方法（12平均律）
  // MIDI note number = 12 * log2(frequency / A4_frequency) + 69
  // 69 = MIDI note number for A4 (440Hz)
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
  
  // 最も近い半音を決定（一般的なチューナーの標準的な方法）
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
  
  // オクターブの計算（一般的なチューナーの標準的な方法）
  // MIDI note 69 = A4 = octave 4
  // octave = floor(MIDI_note / 12) - 1
  const octave = Math.floor(nearestMidi / 12) - 1;
  
  // 音名インデックスの計算（0-11に正規化）
  // MIDI note 69 (A4) = 69 % 12 = 9 = 'A'
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

  // セントの計算（一般的なチューナーの標準的な方法）
  // セント = (実数のMIDI note - 最も近い半音のMIDI note) * 100
  // 1セント = 半音の1/100
  // 正の値 = 高い、負の値 = 低い
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
 * 一般的なチューナーで使用される標準的な周波数検出アルゴリズム
 * 
 * アルゴリズムの流れ:
 * 1. ハン窓を適用してエッジ効果を軽減
 * 2. RMS計算で無音を検出
 * 3. 正規化自己相関計算で基本周波数を検出
 * 4. ハーモニクスを除去して基本周波数を決定
 * 5. パラボラ補間で精度を向上
 */
export const autoCorrelate = (
  buffer: Float32Array,
  sampleRate: number
): number => {
  let SIZE = buffer.length;

  // 前処理: ハン窓を適用してエッジ効果を軽減（一般的なチューナーの標準的な前処理）
  // ハン窓は、信号の両端を滑らかに減衰させ、FFT/自己相関のエイリアシングを軽減
  const windowedBuffer = new Float32Array(SIZE);
  for (let i = 0; i < SIZE; i++) {
    const window = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (SIZE - 1));
    windowedBuffer[i] = buffer[i] * window;
  }

  // RMS計算（動的閾値）- 一般的なチューナーの標準的な無音検出方法
  // RMS (Root Mean Square) は信号の強度を測定し、無音を検出
  let rms = 0;
  for (let i = 0; i < SIZE; i++) {
    rms += windowedBuffer[i] * windowedBuffer[i];
  }
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.005) return -1; // 無音検出（一般的なチューナーの閾値）

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

  // 正規化自己相関計算（一般的なチューナーの標準的な周波数検出方法）
  // 自己相関は、信号とその時間シフト版の類似度を測定
  // 正規化により、信号の強度に依存しない相関値を得る
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
      c[i] = sum / Math.sqrt(norm1 * norm2); // 正規化自己相関（-1から1の範囲）
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

  // 基本周波数を決定（ハーモニクスを除外）- 一般的なチューナーの標準的な処理
  // 楽器の音には基本周波数とその整数倍（ハーモニクス）が含まれる
  // チューナーは基本周波数を検出する必要があるため、ハーモニクスを除外
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
    // 基本周波数は、他の周波数の整数倍にならないはず
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

  // パラボラ補間による精度向上（一般的なチューナーの標準的な精度向上手法）
  // 離散的なサンプル点の間を補間することで、より正確な周波数を推定
  // これにより、サンプリングレートの制約を超えた精度が得られる
  if (T0 > 0 && T0 < SIZE - 1) {
    const x1 = c[T0 - 1];
    const x2 = c[T0];
    const x3 = c[T0 + 1];
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    if (Math.abs(a) > 1e-10) {
      const correction = -b / (2 * a);
      if (Math.abs(correction) <= 1) {
        T0 = T0 + correction; // 補間による補正を適用
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
 * 改良された平滑化処理（EMA + 適応的フィルタリング + より滑らかな補間）
 */
export const smoothValue = (
  currentValue: number,
  targetValue: number,
  alpha: number,
  maxChange: number
): number => {
  const diff = targetValue - currentValue;

  // 大きな変化の場合はより強い平滑化を適用
  const adaptiveAlpha = Math.abs(diff) > maxChange * 2 ? alpha * 0.4 : alpha;

  // より滑らかな補間のため、変化量を制限
  const limitedDiff = Math.max(-maxChange, Math.min(maxChange, diff));
  
  // 指数移動平均（EMA）による滑らかな補間
  const smoothedValue = currentValue + limitedDiff * adaptiveAlpha;

  // 異常値の検出と修正（より緩やかに）
  if (Math.abs(smoothedValue - targetValue) > maxChange * 3) {
    // 異常値の場合は、より滑らかに目標値に近づける
    return currentValue + Math.sign(diff) * maxChange * 0.8;
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

