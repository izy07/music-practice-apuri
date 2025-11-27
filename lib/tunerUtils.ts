// 音名と周波数の対応表
export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const NOTE_NAMES_JA = ['ド', 'ド#', 'レ', 'レ#', 'ミ', 'ファ', 'ファ#', 'ソ', 'ソ#', 'ラ', 'ラ#', 'シ'];

// 基準音A4の周波数（デフォルト440Hz）
export const DEFAULT_A4_FREQUENCY = 440;

// 音名から周波数を計算する関数
export function getFrequency(note: string, octave: number, a4Frequency: number = DEFAULT_A4_FREQUENCY): number {
  const noteIndex = NOTE_NAMES.indexOf(note);
  if (noteIndex === -1) return 0;
  
  // A4からの半音の距離を計算
  const semitonesFromA4 = (noteIndex - 9) + (octave - 4) * 12;
  
  // 周波数を計算（12平均律）
  return a4Frequency * Math.pow(2, semitonesFromA4 / 12);
}

// 周波数から最も近い音名とオクターブを取得する関数
export function getNoteFromFrequency(
  frequency: number,
  a4Frequency: number = DEFAULT_A4_FREQUENCY
): {
  note: string;
  noteJa: string;
  octave: number;
  cents: number;
  isInTune: boolean;
} {
  if (frequency <= 0) {
    return { note: '', noteJa: '', octave: 0, cents: 0, isInTune: false };
  }

  // MIDIベースで最も近い音高を算出
  const a4Midi = 69; // A4 の MIDI 番号
  const noteNumber = 12 * Math.log2(frequency / a4Frequency) + a4Midi; // 実数のMIDI番号
  const nearestMidi = Math.round(noteNumber); // 最も近い半音に丸め

  // 音名インデックスとオクターブ
  const noteIndex = ((nearestMidi % 12) + 12) % 12; // 0-11 に正規化
  const octave = Math.floor(nearestMidi / 12) - 1;

  const note = NOTE_NAMES[noteIndex];
  const noteJa = NOTE_NAMES_JA[noteIndex];

  // セント（丸めた最近傍ノートからの差）
  const cents = (noteNumber - nearestMidi) * 100;
  const isInTune = Math.abs(cents) <= 10;

  return { note, noteJa, octave, cents, isInTune };
}

// 楽器別の主要音階を定義
export const INSTRUMENT_SCALES: { [key: string]: { note: string; octave: number; name: string }[] } = {
  piano: [
    { note: 'C', octave: 4, name: '中央ド' },
    { note: 'G', octave: 4, name: '中央ソ' },
    { note: 'A', octave: 4, name: '基準音ラ' },
    { note: 'C', octave: 5, name: '高音ド' },
  ],
  guitar: [
    { note: 'E', octave: 2, name: '6弦（低音ミ）' },
    { note: 'A', octave: 2, name: '5弦（低音ラ）' },
    { note: 'D', octave: 3, name: '4弦（レ）' },
    { note: 'G', octave: 3, name: '3弦（ソ）' },
    { note: 'B', octave: 3, name: '2弦（シ）' },
    { note: 'E', octave: 4, name: '1弦（高音ミ）' },
  ],
  violin: [
    { note: 'G', octave: 3, name: '4弦（ソ）' },
    { note: 'D', octave: 4, name: '3弦（レ）' },
    { note: 'A', octave: 4, name: '2弦（ラ）' },
    { note: 'E', octave: 5, name: '1弦（高音ミ）' },
  ],
  flute: [
    { note: 'C', octave: 4, name: '中央ド' },
    { note: 'D', octave: 4, name: 'レ' },
    { note: 'E', octave: 4, name: 'ミ' },
    { note: 'F', octave: 4, name: 'ファ' },
    { note: 'G', octave: 4, name: 'ソ' },
    { note: 'A', octave: 4, name: 'ラ' },
    { note: 'B', octave: 4, name: 'シ' },
    { note: 'C', octave: 5, name: '高音ド' },
  ],
  trumpet: [
    { note: 'C', octave: 4, name: '中央ド' },
    { note: 'E', octave: 4, name: 'ミ' },
    { note: 'G', octave: 4, name: 'ソ' },
    { note: 'C', octave: 5, name: '高音ド' },
  ],
  drums: [
    { note: 'A', octave: 4, name: '基準音ラ' },
    { note: 'C', octave: 4, name: '中央ド' },
    { note: 'E', octave: 4, name: 'ミ' },
  ],
  saxophone: [
    { note: 'C', octave: 4, name: '中央ド' },
    { note: 'D', octave: 4, name: 'レ' },
    { note: 'E', octave: 4, name: 'ミ' },
    { note: 'F', octave: 4, name: 'ファ' },
    { note: 'G', octave: 4, name: 'ソ' },
    { note: 'A', octave: 4, name: 'ラ' },
    { note: 'B', octave: 4, name: 'シ' },
  ],
  horn: [
    { note: 'F', octave: 3, name: '低音ファ' },
    { note: 'C', octave: 4, name: '中央ド' },
    { note: 'F', octave: 4, name: 'ファ' },
    { note: 'C', octave: 5, name: '高音ド' },
  ],
  clarinet: [
    { note: 'C', octave: 3, name: '低音ド' },
    { note: 'E', octave: 3, name: '低音ミ' },
    { note: 'G', octave: 3, name: '低音ソ' },
    { note: 'C', octave: 4, name: '中央ド' },
  ],
  tuba: [
    { note: 'C', octave: 2, name: '低音ド' },
    { note: 'E', octave: 2, name: '低音ミ' },
    { note: 'G', octave: 2, name: '低音ソ' },
    { note: 'C', octave: 3, name: 'ド' },
  ],
  cello: [
    { note: 'C', octave: 2, name: '低音ド' },
    { note: 'G', octave: 2, name: '低音ソ' },
    { note: 'D', octave: 3, name: 'レ' },
    { note: 'A', octave: 3, name: 'ラ' },
  ],
  bassoon: [
    { note: 'B', octave: 1, name: '最低音シ' },
    { note: 'C', octave: 2, name: '低音ド' },
    { note: 'E', octave: 2, name: '低音ミ' },
    { note: 'G', octave: 2, name: '低音ソ' },
  ],
  trombone: [
    { note: 'E', octave: 2, name: '低音ミ' },
    { note: 'B', octave: 2, name: '低音シ' },
    { note: 'E', octave: 3, name: 'ミ' },
    { note: 'B', octave: 3, name: 'シ' },
  ],
  oboe: [
    { note: 'C', octave: 4, name: '中央ド' },
    { note: 'D', octave: 4, name: 'レ' },
    { note: 'E', octave: 4, name: 'ミ' },
    { note: 'F', octave: 4, name: 'ファ' },
  ],
  // TODO: 実装完了後にコメントアウトを解除
  // harp: [
  //   { note: 'C', octave: 3, name: '低音ド' },
  //   { note: 'D', octave: 3, name: '低音レ' },
  //   { note: 'E', octave: 3, name: '低音ミ' },
  //   { note: 'F', octave: 3, name: '低音ファ' },
  //   { note: 'G', octave: 3, name: '低音ソ' },
  //   { note: 'A', octave: 3, name: '低音ラ' },
  //   { note: 'B', octave: 3, name: '低音シ' },
  //   { note: 'C', octave: 4, name: '中央ド' },
  // ],
  contrabass: [
    { note: 'E', octave: 1, name: '最低音ミ' },
    { note: 'A', octave: 1, name: '最低音ラ' },
    { note: 'D', octave: 2, name: '低音レ' },
    { note: 'G', octave: 2, name: '低音ソ' },
  ],
  other: [
    { note: 'A', octave: 4, name: '基準音ラ' },
    { note: 'C', octave: 4, name: '中央ド' },
    { note: 'E', octave: 4, name: 'ミ' },
  ],
};

// 楽器別の始まりの音を取得
export function getInstrumentStartNote(instrumentId: string): { note: string; noteJa: string; octave: number; name: string } | null {
  const scales = INSTRUMENT_SCALES[instrumentId];
  if (!scales || scales.length === 0) return null;
  
  const firstScale = scales[0];
  return {
    note: firstScale.note,
    noteJa: firstScale.name,
    octave: firstScale.octave,
    name: firstScale.name
  };
}

// 楽器別の音階を取得
export function getInstrumentScales(instrumentId: string): { note: string; octave: number; name: string }[] {
  return INSTRUMENT_SCALES[instrumentId] || INSTRUMENT_SCALES.other;
}

// 周波数から音程の状態を判定
export function getTuningStatus(cents: number): {
  status: 'in-tune' | 'sharp' | 'flat';
  statusText: string;
  statusTextJa: string;
  color: string;
} {
  if (Math.abs(cents) <= 10) {
    return {
      status: 'in-tune',
      statusText: 'In Tune',
      statusTextJa: '正確',
      color: '#4CAF50'
    };
  } else if (cents > 10) {
    return {
      status: 'sharp',
      statusText: 'Sharp',
      statusTextJa: '高い',
      color: '#FF5722'
    };
  } else {
    return {
      status: 'flat',
      statusText: 'Flat',
      statusTextJa: '低い',
      color: '#2196F3'
    };
  }
}

// 音程の視覚的表示用のバー位置を計算
export function getTuningBarPosition(cents: number): number {
  // -50セントから+50セントの範囲を-100から+100の位置にマッピング
  const clampedCents = Math.max(-50, Math.min(50, cents));
  return (clampedCents / 50) * 100;
}

// 周波数から音の強度レベルを計算（簡易版）
export function getAudioLevel(frequency: number, amplitude: number): number {
  if (frequency <= 0 || amplitude <= 0) return 0;
  
  // 簡易的な音の強度計算（実際のアプリではFFT等を使用）
  const normalizedAmplitude = Math.min(1, amplitude);
  return normalizedAmplitude * 100;
}
