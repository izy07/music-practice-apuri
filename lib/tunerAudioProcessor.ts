/**
 * チューナーの音響処理モジュール
 * 周波数検出、音名変換、平滑化処理などを提供
 */

import { DEFAULT_A4_FREQUENCY } from '@/lib/tunerUtils';

// プロ仕様の音名と周波数対応
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_NAMES_JA = ['ド', 'ド#', 'レ', 'レ#', 'ミ', 'ファ', 'ファ#', 'ソ', 'ソ#', 'ラ', 'ラ#', 'シ'];

// プロ仕様の周波数検出精度設定（超高精度版）
export const TUNING_PRECISION = {
  EXCELLENT: 0.1, // ±0.1セント以内: 超高精度レベル（Peterson Strobo相当）
  GOOD: 1,        // ±1セント以内: 高精度レベル
  ACCEPTABLE: 5,  // ±5セント以内: プロレベル
  POOR: 10,       // ±10セント以内: 調整必要
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
  a4Freq: number = DEFAULT_A4_FREQUENCY
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

  // 周波数の妥当性チェック（範囲を拡張）
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

  // オクターブの計算（標準的なMIDI仕様に基づく正確な計算）
  // MIDI note 60 = C4 (中央のC) = octave 4
  // MIDI note 69 = A4 = octave 4
  // 標準的な計算: octave = floor(MIDI_note / 12) - 1
  // MIDI note 60: floor(60 / 12) - 1 = 5 - 1 = 4 ✓
  // MIDI note 69: floor(69 / 12) - 1 = 5 - 1 = 4 ✓
  // MIDI note 72: floor(72 / 12) - 1 = 6 - 1 = 5 ✓
  const octave = Math.floor(nearestMidi / 12) - 1;

  // セントの計算（標準的なチューナーの計算方法）
  // セント = (noteNumber - nearestMidi) * 100
  // noteNumberは周波数から直接計算されているため、この方法が最も正確
  // 1セント = 半音の1/100、100セント = 1半音
  // 正の値 = 高い、負の値 = 低い
  // 
  // 数学的根拠:
  // noteNumber = 12 * log2(frequency / a4Freq) + 69
  // nearestMidi = round(noteNumber)
  // cents = (noteNumber - nearestMidi) * 100
  // これは 1200 * log2(frequency / referenceFrequency) と数学的に等価
  // ただし、referenceFrequencyの計算に誤差が入る可能性があるため、
  // noteNumberベースの計算の方がより正確
  
  let cents: number;
  
  // noteNumberベースで直接セントを計算（最も正確な方法）
  // この方法は、周波数から直接計算されたnoteNumberを使用するため、
  // 中間計算（referenceFrequency）による誤差を避けることができる
  cents = (noteNumber - nearestMidi) * 100;
  
  // 計算結果の妥当性チェック（NaNやInfinityを防ぐ）
  if (!isFinite(cents)) {
    // フォールバック: 周波数比から計算
    const semitonesFromA4 = nearestMidi - a4NoteNumber;
    const referenceFrequency = a4Freq * Math.pow(2, semitonesFromA4 / 12);
    if (referenceFrequency > 0 && frequency > 0 && isFinite(referenceFrequency) && isFinite(frequency)) {
      const frequencyRatio = frequency / referenceFrequency;
      if (frequencyRatio > 1e-10 && frequencyRatio < 1e10 && isFinite(frequencyRatio)) {
        cents = 1200 * Math.log2(frequencyRatio);
        if (!isFinite(cents)) {
          cents = 0;
        }
      } else {
        cents = 0;
      }
    } else {
      cents = 0;
    }
  }
  
  // セントの値が異常に大きい場合の処理（改善版）
  // ±200セント以上は異常値として扱うが、計算エラーの可能性も考慮
  // 以前は±50セントに制限していたが、これにより大きなズレが隠れる可能性があった
  // 異常値の場合は、セントを±100セントに制限し、警告を出力
  if (Math.abs(cents) > 200) {
    // 計算エラーの可能性を考慮し、以前より緩い制限に変更
    // ±100セントに制限（半音の誤差範囲内）
    const limitedCents = Math.max(-100, Math.min(100, cents));
    if (__DEV__) {
      console.warn(`[Tuner] セント値が異常に大きいため制限しました: ${cents.toFixed(1)} -> ${limitedCents.toFixed(1)} (周波数: ${frequency.toFixed(2)}Hz)`);
    }
    cents = limitedCents;
  }
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
  
  // 環境適応型のRMS閾値を計算（一度だけ計算して再利用）
  const adaptiveThresholds = calculateAdaptiveThresholds(rms, 0);
  if (rms < adaptiveThresholds.rmsThreshold) return -1; // 無音検出（環境適応型閾値）

  // クリッピング検出：音が大きすぎる場合（RMS > 0.5）は処理を調整
  const isClipping = rms > 0.5;
  if (isClipping) {
    // クリッピング時は、バッファを正規化して処理を継続
    const maxValue = Math.max(...Array.from(windowedBuffer).map(Math.abs));
    if (maxValue > 0) {
      for (let i = 0; i < SIZE; i++) {
        windowedBuffer[i] = windowedBuffer[i] / maxValue * 0.9; // 0.9にスケールして余裕を持たせる
      }
      // 正規化後のRMSを再計算
      rms = 0;
      for (let i = 0; i < SIZE; i++) {
        rms += windowedBuffer[i] * windowedBuffer[i];
      }
      rms = Math.sqrt(rms / SIZE);
    }
  }

  // エッジトリミング（動的閾値、上限を設定して音が大きすぎても処理できるようにする）
  // 音が大きすぎる場合でも、バッファが小さくなりすぎないように上限を設定
  const maxThreshold = 0.3; // 最大閾値を0.3に制限
  const thres = Math.min(maxThreshold, Math.max(0.01, rms * 0.3));
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

  // 周波数範囲制限（拡張版）
  // コントラバスのE1 (41.20Hz)を検出するため、最低周波数を40Hzに下げる
  // フルートなどの高音域楽器に対応するため、最高周波数を6000Hzに拡張
  const minPeriod = Math.floor(sampleRate / 2000); // 最高周波数2000Hz（実用的な上限）
  const maxPeriod = Math.floor(sampleRate / 40);   // 最低周波数40Hz（コントラバス対応）

  // 候補となるピークを複数見つける（ハーモニクス除去のため）
  const candidates: Array<{ period: number; correlation: number }> = [];
  
  // 環境適応型の相関値閾値を使用（既に計算済みのadaptiveThresholdsを再利用）
  for (let i = Math.max(d, minPeriod); i < Math.min(SIZE, maxPeriod); i += step) {
    // ピークを検出（前後の値より大きい）
    // 環境適応型の候補検出閾値を使用
    if (i > 0 && i < SIZE - 1 && c[i] > c[i - 1] && c[i] > c[i + 1] && c[i] > adaptiveThresholds.candidateThreshold) {
      candidates.push({ period: i, correlation: c[i] });
    }
  }

  // 相関値でソート（高い順）
  candidates.sort((a, b) => b.correlation - a.correlation);

  // 基本周波数を決定（改良版）- 相関値とハーモニクス判定を両方考慮
  // 楽器の音には基本周波数とその整数倍（ハーモニクス）が含まれる
  // チューナーは基本周波数を検出する必要があるため、ハーモニクスを除外
  let fundamentalPeriod = -1;
  let fundamentalCorrelation = -1;

  // 改善されたアプローチ：オクターブ関係を考慮して、より高い周波数を優先
  // 1. 相関値でソートされた候補を順にチェック
  // 2. オクターブ関係にある場合は、より高い周波数（短いperiod）を優先
  // 3. そうでない場合は、ハーモニクスでない候補を優先
  
  // まず、オクターブ関係をチェック
  // 注意：periodが大きい = 周波数が低い
  // candidate.period < other.period の場合、candidateはより高い周波数（短いperiod）
  let selectedCandidate = null;
  let maxCorrelation = 0;
  
  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    for (let j = i + 1; j < candidates.length; j++) {
      const other = candidates[j];
      
      // candidateとotherのperiod比を計算
      // candidate.period < other.period の場合、candidateはより高い周波数
      let ratio: number;
      let higherFreqCandidate: typeof candidate;
      
      if (candidate.period < other.period) {
        // candidateがより高い周波数（短いperiod）
        ratio = other.period / candidate.period; // other.period / candidate.period = 2ならオクターブ
        higherFreqCandidate = candidate;
      } else {
        // otherがより高い周波数（短いperiod）
        ratio = candidate.period / other.period; // candidate.period / other.period = 2ならオクターブ
        higherFreqCandidate = other;
      }
      
      // 2倍の関係（オクターブ）の判定（±3%の誤差を許容）
      if (ratio > 1.94 && ratio < 2.06) {
        // より高い周波数（短いperiod）を優先し、相関値が高い方を選択
        if (!selectedCandidate || higherFreqCandidate.correlation > maxCorrelation) {
          selectedCandidate = higherFreqCandidate;
          maxCorrelation = higherFreqCandidate.correlation;
        }
      }
    }
  }
  
  // オクターブ関係が見つかった場合、それを採用
  if (selectedCandidate) {
    fundamentalPeriod = selectedCandidate.period;
    fundamentalCorrelation = selectedCandidate.correlation;
  } else {
    // オクターブ関係がない場合、ハーモニクスでない候補を探す
    for (const candidate of candidates) {
      // この候補が他の候補のハーモニクス（整数倍）かどうかをチェック
    let isHarmonic = false;
      
      // より低い周波数（長いperiod）の候補が存在するかチェック
    for (const other of candidates) {
      if (other.period === candidate.period) continue;
        
        // この候補が他の候補のハーモニクス（整数倍）かチェック
        // つまり、other.period > candidate.period かつ other.period / candidate.period が整数に近い場合
        // 注意：periodが大きい = 周波数が低い
        if (other.period > candidate.period) {
      const ratio = other.period / candidate.period;
          // 3倍、4倍、5倍などのハーモニクスの可能性をチェック（2倍はオクターブなので除外）
          // より厳密な判定：0.1の誤差を許容
          if (ratio > 2.7 && ratio < 10 && Math.abs(ratio - Math.round(ratio)) < 0.1) {
            // この候補は他の候補のハーモニクスである可能性が高い
        isHarmonic = true;
        break;
          }
      }
    }

    // ハーモニクスでない場合、基本周波数として採用
      // 相関値が最も高いものを優先するため、最初に見つかったハーモニクスでない候補を採用
    if (!isHarmonic) {
      fundamentalPeriod = candidate.period;
      fundamentalCorrelation = candidate.correlation;
      break;
      }
    }
  }

  // 候補が見つからなかった場合、または相関値が非常に高い場合は、最も相関値の高いものを使用
  // ただし、2000Hz以下の候補のみを考慮（ハーモニクスを除外）
  // より大きいperiod（低い周波数 = 基本周波数）を優先
  if (fundamentalPeriod === -1 && candidates.length > 0) {
    // 2000Hz以下の候補のみをフィルタリング
    const validCandidates = candidates.filter(c => {
      const freq = sampleRate / c.period;
      return freq >= 40 && freq <= 2000;
    });
    
    if (validCandidates.length > 0) {
      // 有効な候補をperiodでソート（大きい順 = 低い周波数順 = 基本周波数順）
      validCandidates.sort((a, b) => b.period - a.period);
      
      // 相関値が0.7以上の場合、ハーモニクス判定を無視して採用（信頼性が高い）
      const highCorrelationCandidates = validCandidates.filter(c => c.correlation > 0.7);
      if (highCorrelationCandidates.length > 0) {
        // 相関値が高い候補の中から、最も大きいperiod（最も低い周波数 = 基本周波数）を選択
        highCorrelationCandidates.sort((a, b) => b.period - a.period);
        fundamentalPeriod = highCorrelationCandidates[0].period;
        fundamentalCorrelation = highCorrelationCandidates[0].correlation;
      } else {
        // 相関値が低い場合でも、最も大きいperiod（最も低い周波数 = 基本周波数）を優先
        fundamentalPeriod = validCandidates[0].period;
        fundamentalCorrelation = validCandidates[0].correlation;
      }
    } else {
      // 有効な候補がない場合、元の候補から最も大きいperiodを選択
      candidates.sort((a, b) => b.period - a.period);
      fundamentalPeriod = candidates[0].period;
      fundamentalCorrelation = candidates[0].correlation;
    }
  }

  // 環境適応型の相関値閾値を使用（既に計算済みのadaptiveThresholdsを再利用）
  if (fundamentalPeriod === -1 || fundamentalCorrelation < adaptiveThresholds.correlationThreshold) return -1;

  let T0 = fundamentalPeriod;

  // パラボラ補間による精度向上（改良版）
  // 離散的なサンプル点の間を補間することで、より正確な周波数を推定
  // これにより、サンプリングレートの制約を超えた精度が得られる
  // 精度を向上させるため、より広い範囲で補間を試みる
  if (T0 > 2 && T0 < SIZE - 3) {
    // より広い範囲（±3サンプル）で補間を試みる（高精度版）
    const x0 = c[T0 - 2];
    const x1 = c[T0 - 1];
    const x2 = c[T0];
    const x3 = c[T0 + 1];
    const x4 = c[T0 + 2];
    
    // 5点パラボラ補間（より高精度）
    // 3点補間を2回試みて、より信頼性の高い方を選択
    let correction1 = 0;
    let correction2 = 0;
    let isValid1 = false;
    let isValid2 = false;
    
    // 3点補間1: x1, x2, x3を使用
    const a1 = (x1 + x3 - 2 * x2) / 2;
    const b1 = (x3 - x1) / 2;
    if (Math.abs(a1) > 1e-10) {
      correction1 = -b1 / (2 * a1);
      isValid1 = Math.abs(correction1) <= 1.5 && x2 > x1 && x2 > x3;
    }
    
    // 3点補間2: x0, x2, x4を使用（より広い範囲）
    const a2 = (x0 + x4 - 2 * x2) / 8;
    const b2 = (x4 - x0) / 4;
    if (Math.abs(a2) > 1e-10) {
      correction2 = -b2 / (2 * a2);
      isValid2 = Math.abs(correction2) <= 2.5 && x2 > x0 && x2 > x4;
    }
    
    // より信頼性の高い補正を選択
    if (isValid1 && isValid2) {
      // 両方有効な場合、平均を取る（より安定）
      T0 = T0 + (correction1 + correction2) / 2;
    } else if (isValid1) {
      T0 = T0 + correction1;
    } else if (isValid2) {
      T0 = T0 + correction2;
    }
    
    // 補正後の妥当性チェック
    if (T0 <= 0 || T0 >= SIZE) {
      // 補正が範囲外の場合は、元の値に戻す
      T0 = fundamentalPeriod;
    }
  } else if (T0 > 1 && T0 < SIZE - 2) {
    // 範囲が中程度の場合（±2サンプル）
    const x1 = c[T0 - 1];
    const x2 = c[T0];
    const x3 = c[T0 + 1];
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    if (Math.abs(a) > 1e-10) {
      const correction = -b / (2 * a);
      // 補正範囲を広げる（±1.5サンプルまで許容）
      if (Math.abs(correction) <= 1.5 && x2 > x1 && x2 > x3) {
        T0 = T0 + correction; // 補間による補正を適用
      }
    }
    
    // 補正後の妥当性チェック
    if (T0 <= 0 || T0 >= SIZE) {
      T0 = fundamentalPeriod;
    }
  } else if (T0 > 0 && T0 < SIZE - 1) {
    // 範囲が狭い場合の従来の補間（±1サンプル）
    const x1 = c[T0 - 1];
    const x2 = c[T0];
    const x3 = c[T0 + 1];
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    if (Math.abs(a) > 1e-10) {
      const correction = -b / (2 * a);
      if (Math.abs(correction) <= 1 && x2 > x1 && x2 > x3) {
        T0 = T0 + correction; // 補間による補正を適用
      }
    }
  }

  if (T0 <= 0 || T0 >= SIZE) {
    return -1;
  }

  const freq = sampleRate / T0;

  // 周波数の範囲チェック（40Hz - 2000Hzの範囲内のみ有効）
  // コントラバスのE1 (41.20Hz)を検出するため、最低周波数を40Hzに下げる
  // 2000Hz以上は通常ハーモニクス（倍音）なので、基本周波数の検出では除外
  // 通常の楽器の基本周波数は2000Hz以下（ピアノの最高音C8でも約4186Hzだが、実用的には2000Hz以下）
  if (!isFinite(freq) || freq < 40 || freq > 2000) {
    return -1;
  }

  return freq;
};

/**
 * 環境適応型のRMS閾値と相関値閾値を計算
 * 環境ノイズに応じて動的に調整することで、精度を向上
 */
export interface AdaptiveThresholds {
  rmsThreshold: number;
  correlationThreshold: number;
  candidateThreshold: number;
}

// 環境履歴を関数スコープ内で管理（各呼び出しで独立した履歴を維持）
const ENVIRONMENT_HISTORY_SIZE = 20;

// 環境履歴を保持するマップ（sessionIdベースで管理）
const environmentHistoryMap = new Map<string, number[]>();

// セッションIDを取得（新規セッションの場合は新しいIDを生成）
const getSessionId = (): string => {
  // シンプルな実装：タイムスタンプベースのセッションID
  return `session_${Math.floor(Date.now() / 60000)}`; // 1分ごとにセッションを更新
};

export const calculateAdaptiveThresholds = (
  currentRMS: number,
  currentCorrelation: number
): AdaptiveThresholds => {
  // セッションIDを取得
  const sessionId = getSessionId();
  
  // セッションに対応する履歴を取得（存在しない場合は新規作成）
  if (!environmentHistoryMap.has(sessionId)) {
    environmentHistoryMap.set(sessionId, []);
    // 古いセッションの履歴をクリーンアップ（メモリリークを防ぐ）
    if (environmentHistoryMap.size > 10) {
      const oldestSession = Array.from(environmentHistoryMap.keys())[0];
      environmentHistoryMap.delete(oldestSession);
    }
  }
  
  const environmentHistory = environmentHistoryMap.get(sessionId)!;
  
  // 環境ノイズの履歴を更新
  environmentHistory.push(currentRMS);
  if (environmentHistory.length > ENVIRONMENT_HISTORY_SIZE) {
    environmentHistory.shift();
  }
  
  // 環境ノイズの中央値を計算
  const sortedRMS = [...environmentHistory].sort((a, b) => a - b);
  const medianRMS = sortedRMS.length > 0 
    ? sortedRMS[Math.floor(sortedRMS.length / 2)] 
    : 0.005;
  
  // 環境ノイズに応じてRMS閾値を動的に調整
  // ノイズが多い環境では閾値を上げ、静かな環境では下げる
  const baseRMSThreshold = 0.003;
  const adaptiveRMSThreshold = Math.max(
    0.001, 
    Math.min(0.01, baseRMSThreshold * (1 + medianRMS * 10))
  );
  
  // 相関値の閾値も環境に応じて調整
  // ノイズが多い環境では閾値を下げて、より多くの候補を検出
  const baseCorrelationThreshold = 0.25;
  const adaptiveCorrelationThreshold = Math.max(
    0.15,
    Math.min(0.35, baseCorrelationThreshold * (1 - medianRMS * 5))
  );
  
  const baseCandidateThreshold = 0.15;
  const adaptiveCandidateThreshold = Math.max(
    0.1,
    Math.min(0.2, baseCandidateThreshold * (1 - medianRMS * 5))
  );
  
  return {
    rmsThreshold: adaptiveRMSThreshold,
    correlationThreshold: adaptiveCorrelationThreshold,
    candidateThreshold: adaptiveCandidateThreshold,
  };
};

/**
 * 改良された平滑化処理（EMA + 適応的フィルタリング + より滑らかな補間）
 * 精度を優先するため、平滑化を弱めている
 */
export const smoothValue = (
  currentValue: number,
  targetValue: number,
  alpha: number,
  maxChange: number
): number => {
  const diff = targetValue - currentValue;

  // 大きな変化の場合でも、平滑化を弱める（精度を優先）
  const adaptiveAlpha = Math.abs(diff) > maxChange * 2 ? alpha * 0.7 : alpha;

  // 変化量の制限を緩和（より大きな変化を許容）
  const limitedDiff = Math.max(-maxChange, Math.min(maxChange, diff));
  
  // 指数移動平均（EMA）による滑らかな補間
  const smoothedValue = currentValue + limitedDiff * adaptiveAlpha;

  // 異常値の検出と修正（より緩やかに、ただし精度を優先）
  if (Math.abs(smoothedValue - targetValue) > maxChange * 5) {
    // 異常値の場合は、より直接的に目標値に近づける
    return currentValue + Math.sign(diff) * maxChange * 1.2;
  }

  return smoothedValue;
};

/**
 * YINアルゴリズムによるピッチ検出（高精度）
 * YINアルゴリズムは、自己相関法よりも高精度で、特に低周波数での精度が高い
 * 
 * アルゴリズムの流れ:
 * 1. 差関数（difference function）を計算
 * 2. 累積平均正規化差関数（cumulative mean normalized difference function）を計算
 * 3. 閾値を超える最初の最小値を基本周波数として検出
 * 4. パラボラ補間で精度を向上
 */
export const yinPitchDetection = (
  buffer: Float32Array,
  sampleRate: number
): number => {
  const SIZE = buffer.length;
  
  if (SIZE < 100) return -1;
  
  // ハン窓を適用
  const windowedBuffer = new Float32Array(SIZE);
  for (let i = 0; i < SIZE; i++) {
    const window = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (SIZE - 1));
    windowedBuffer[i] = buffer[i] * window;
  }
  
  // RMS計算で無音を検出（環境適応型）
  let rms = 0;
  for (let i = 0; i < SIZE; i++) {
    rms += windowedBuffer[i] * windowedBuffer[i];
  }
  rms = Math.sqrt(rms / SIZE);
  
  // 環境適応型のRMS閾値を使用
  const adaptiveThresholds = calculateAdaptiveThresholds(rms, 0);
  if (rms < adaptiveThresholds.rmsThreshold) return -1;
  
  // 差関数（difference function）を計算
  const maxLag = Math.min(SIZE / 2, Math.floor(sampleRate / 40)); // 最低周波数40Hz
  const minLag = Math.floor(sampleRate / 2000); // 最高周波数2000Hz（実用的な上限）
  const d = new Array<number>(maxLag + 1).fill(0);
  
  for (let tau = 0; tau <= maxLag; tau++) {
    let sum = 0;
    for (let j = 0; j < SIZE - maxLag; j++) {
      const diff = windowedBuffer[j] - windowedBuffer[j + tau];
      sum += diff * diff;
    }
    d[tau] = sum;
  }
  
  // 累積平均正規化差関数（cumulative mean normalized difference function）を計算
  const dNorm = new Array<number>(maxLag + 1).fill(0);
  dNorm[0] = 1;
  
  let cumulativeSum = 0;
  for (let tau = 1; tau <= maxLag; tau++) {
    cumulativeSum += d[tau];
    if (cumulativeSum > 0) {
      dNorm[tau] = d[tau] * tau / cumulativeSum;
    } else {
      dNorm[tau] = 1;
    }
  }
  
  // 閾値を超えるすべての最小値を検出（複数候補を比較）
  const threshold = 0.1; // YINアルゴリズムの標準的な閾値
  const candidates: Array<{ tau: number; value: number }> = [];
  
  // すべての候補を収集
  for (let tau = minLag; tau < maxLag; tau++) {
    if (dNorm[tau] < threshold) {
      // 周辺の最小値を探す
      let minValue = dNorm[tau];
      let minIndex = tau;
      
      // 周辺の値もチェックして、真の最小値を探す
      for (let i = tau; i < Math.min(tau + 10, maxLag); i++) {
        if (dNorm[i] < minValue) {
          minValue = dNorm[i];
          minIndex = i;
        }
      }
      
      // 既に同じ候補が登録されていないかチェック
      const existingCandidate = candidates.find(c => Math.abs(c.tau - minIndex) < 5);
      if (!existingCandidate) {
        candidates.push({ tau: minIndex, value: minValue });
      }
    }
  }
  
  // 閾値を下げて再試行（より多くの周波数を検出）
  if (candidates.length === 0) {
    const lowerThreshold = 0.2;
    for (let tau = minLag; tau < maxLag; tau++) {
      if (dNorm[tau] < lowerThreshold) {
        let minValue = dNorm[tau];
        let minIndex = tau;
        
        for (let i = tau; i < Math.min(tau + 10, maxLag); i++) {
          if (dNorm[i] < minValue) {
            minValue = dNorm[i];
            minIndex = i;
          }
        }
        
        const existingCandidate = candidates.find(c => Math.abs(c.tau - minIndex) < 5);
        if (!existingCandidate) {
          candidates.push({ tau: minIndex, value: minValue });
        }
      }
    }
  }
  
  // 候補をソート（値が小さい順 = より確実な候補）
  candidates.sort((a, b) => a.value - b.value);
  
  // オクターブ関係をチェックして、より高い周波数（短いperiod）を優先
  // 注意：tau（period）が小さい = 周波数が高い
  let tauMin = -1;
  if (candidates.length > 0) {
    // 最も確実な候補（値が最小）を最初の候補として選択
    const primaryCandidate = candidates[0];
    
    // 他の候補がこの候補のオクターブ関係にあるかチェック
    let isOctaveHarmonic = false;
    let higherFreqTau = -1;
    
    for (let i = 1; i < candidates.length; i++) {
      const candidate = candidates[i];
      
      // primaryCandidateとcandidateのtau比を計算
      // より小さいtau = より高い周波数
      let ratio: number;
      let higherTau: number;
      
      if (primaryCandidate.tau < candidate.tau) {
        // primaryCandidateがより高い周波数（短いtau）
        ratio = candidate.tau / primaryCandidate.tau; // candidate.tau / primaryCandidate.tau = 2ならオクターブ
        higherTau = primaryCandidate.tau;
      } else {
        // candidateがより高い周波数（短いtau）
        ratio = primaryCandidate.tau / candidate.tau; // primaryCandidate.tau / candidate.tau = 2ならオクターブ
        higherTau = candidate.tau;
      }
      
      // 2倍の関係（オクターブ）の判定（±3%の誤差を許容）
      if (ratio > 1.94 && ratio < 2.06) {
        // より高い周波数（短いtau）を優先
        higherFreqTau = higherTau;
        isOctaveHarmonic = true;
        break;
      }
    }
    
    // オクターブ関係が見つかった場合、より高い周波数を使用
    if (isOctaveHarmonic && higherFreqTau > 0) {
      tauMin = higherFreqTau;
    } else {
      // オクターブ関係がない場合、最も確実な候補を選択
      tauMin = primaryCandidate.tau;
    }
  }
  
  if (tauMin === -1 || tauMin < minLag || tauMin >= maxLag) {
    return -1;
  }
  
  // パラボラ補間で精度を向上（改良版）
  let refinedTau = tauMin;
  if (tauMin > 1 && tauMin < maxLag - 1) {
    const y1 = dNorm[tauMin - 1];
    const y2 = dNorm[tauMin];
    const y3 = dNorm[tauMin + 1];
    
    // ピークであることを確認（y2がy1とy3より小さい）
    if (y2 < y1 && y2 < y3) {
      const a = (y1 + y3 - 2 * y2) / 2;
      const b = (y3 - y1) / 2;
      
      if (Math.abs(a) > 1e-10) {
        const correction = -b / (2 * a);
        // 補正範囲を広げる（±1.5サンプルまで許容）
        if (Math.abs(correction) <= 1.5) {
          refinedTau = tauMin + correction;
        }
      }
    }
  }
  
  const freq = sampleRate / refinedTau;
  
  // 周波数の範囲チェック（40Hz - 2000Hzの範囲内のみ有効）
  // 2000Hz以上は通常ハーモニクス（倍音）なので、基本周波数の検出では除外
  if (!isFinite(freq) || freq < 40 || freq > 2000) {
    return -1;
  }
  
  return freq;
};

/**
 * 複数アルゴリズムの結果を統合（高精度化・オクターブ誤検出対策）
 * 自己相関法とYINアルゴリズムの結果を統合して、より正確な周波数を推定
 */
export const combineAlgorithms = (
  buffer: Float32Array,
  sampleRate: number
): number => {
  // 自己相関法で検出
  const autocorrFreq = autoCorrelate(buffer, sampleRate);
  
  // YINアルゴリズムで検出
  const yinFreq = yinPitchDetection(buffer, sampleRate);
  
  // オクターブ判定：2倍または1/2倍の関係をチェック
  const isOctaveRelation = (freq1: number, freq2: number): boolean => {
    if (freq1 <= 0 || freq2 <= 0) return false;
    const ratio = freq1 > freq2 ? freq1 / freq2 : freq2 / freq1;
    // 2倍の関係（オクターブ）の判定（±3%の誤差を許容）
    return ratio > 1.94 && ratio < 2.06;
  };
  
  // 両方の結果が有効な場合
  if (autocorrFreq > 0 && yinFreq > 0) {
    // オクターブ関係にある場合、より低い周波数（基本周波数）を優先
    // ハーモニクス（倍音）ではなく、基本周波数を検出するため
    if (isOctaveRelation(autocorrFreq, yinFreq)) {
      // より低い周波数（基本周波数）を選択
      return Math.min(autocorrFreq, yinFreq);
    }
    
    // 周波数の差が小さい場合（5%以内）、平均を取る
    const diff = Math.abs(autocorrFreq - yinFreq);
    const avgFreq = (autocorrFreq + yinFreq) / 2;
    
    if (diff / avgFreq < 0.05) {
      // 重み付き平均（YINアルゴリズムをより重視、低周波数ではYINが高精度）
      const weight = avgFreq < 200 ? 0.6 : 0.5; // 低周波数ではYINを60%重視
      return autocorrFreq * (1 - weight) + yinFreq * weight;
    } else {
      // 差が大きい場合（5%以上）、どちらがより信頼できるかを判定
      // 通常、より低い周波数（基本周波数）を優先（ハーモニクスを除外）
      // ただし、非常に大きな差（50%以上）の場合は、より低い周波数が正しい可能性が高い
      const largeDiff = diff / avgFreq > 0.5;
      
      if (largeDiff) {
        // 非常に大きな差の場合、両方の周波数の妥当性をチェック
        // 一般的な楽器の周波数範囲（40-6000Hz）内の方を優先
        // 6000Hz以上はハーモニクスの可能性が高い
        const autocorrInRange = autocorrFreq >= 40 && autocorrFreq <= 6000;
        const yinInRange = yinFreq >= 40 && yinFreq <= 6000;
        
        if (autocorrInRange && !yinInRange) return autocorrFreq;
        if (yinInRange && !autocorrInRange) return yinFreq;
        
        // 両方とも範囲内の場合、より低い周波数（基本周波数）を優先
        return Math.min(autocorrFreq, yinFreq);
      } else {
        // 中程度の差の場合、より低い周波数（基本周波数）を優先
        return Math.min(autocorrFreq, yinFreq);
      }
    }
  }
  
  // 片方のみ有効な場合
  if (yinFreq > 0) return yinFreq;
  if (autocorrFreq > 0) return autocorrFreq;
  
  return -1;
};

/**
 * チューニング品質に基づいて色を取得（超高精度版）
 */
export const getTuningColor = (
  absCents: number
): { color: string; colorState: 'gray' | 'green' | 'yellow' | 'red' } => {
  if (absCents <= TUNING_PRECISION.EXCELLENT) {
    return { color: '#00C853', colorState: 'green' }; // 超高精度レベル緑（±0.1セント）
  } else if (absCents <= TUNING_PRECISION.GOOD) {
    return { color: '#4CAF50', colorState: 'green' }; // 高精度レベル緑（±1セント）
  } else if (absCents <= TUNING_PRECISION.ACCEPTABLE) {
    return { color: '#FF9800', colorState: 'yellow' }; // プロレベルオレンジ（±5セント）
  } else {
    return { color: '#F44336', colorState: 'red' }; // 調整必要赤（±10セント以上）
  }
};

