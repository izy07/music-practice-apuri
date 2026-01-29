import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
  Platform,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Music, Zap, Play, Pause } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { useLanguage } from '@/components/LanguageContext';
import InstrumentHeader from '@/components/InstrumentHeader';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import Metronome from '@/components/metronome/Metronome';
import { styles } from '@/lib/tabs/tuner/styles';
import audioResourceManager from '@/lib/audioResourceManager';
import { BottomBannerAd } from '@/components/ads/BottomBannerAd';
import { useFocusEffect, useRouter } from 'expo-router';
import { autoCorrelate, getNoteFromFrequency, smoothValue, getTuningColor, combineAlgorithms } from '@/lib/tunerAudioProcessor';
import { getUserSettings } from '@/repositories/userSettingsRepository';
import { getCurrentUser } from '@/lib/authService';
import { DEFAULT_A4_FREQUENCY, getFrequency, NOTE_NAMES, NOTE_NAMES_JA } from '@/lib/tunerUtils';
import { saveTunerSettings } from '@/lib/database';
import { setCurrentRoute } from '@/lib/navigationHistory';

// プロ仕様の音名と周波数対応（tunerUtilsからインポート）

// プロ仕様の周波数検出精度設定
const TUNING_PRECISION = {
  EXCELLENT: 0.1, // ±0.1セント以内: 超高精度レベル（Peterson Strobo相当）
  GOOD: 1,        // ±1セント以内: 高精度レベル
  ACCEPTABLE: 5,  // ±5セント以内: プロレベル
  POOR: 10,       // ±10セント以内: 調整必要
};

// 楽器別チューニング設定
const INSTRUMENT_TUNINGS = {
  guitar: {
    name: 'ギター',
    strings: ['E4', 'B3', 'G3', 'D3', 'A2', 'E2'],
    frequencies: [329.63, 246.94, 196.00, 146.83, 110.00, 82.41],
    tolerance: TUNING_PRECISION.GOOD,
    description: '標準的な6弦ギターのチューニング。各弦の音程を正確に合わせることが重要です。',
    tuning: ['6弦: E (ミ)', '5弦: A (ラ)', '4弦: D (レ)', '3弦: G (ソ)', '2弦: B (シ)', '1弦: E (ミ)'],
    openStrings: [
      { note: 'E4', frequency: 329.63, string: '1弦' },
      { note: 'B3', frequency: 246.94, string: '2弦' },
      { note: 'G3', frequency: 196.00, string: '3弦' },
      { note: 'D3', frequency: 146.83, string: '4弦' },
      { note: 'A2', frequency: 110.00, string: '5弦' },
      { note: 'E2', frequency: 82.41, string: '6弦' }
    ]
  },
  bass: {
    name: 'ベース',
    strings: ['G2', 'D2', 'A1', 'E1'],
    frequencies: [98.00, 73.42, 55.00, 41.20],
    tolerance: TUNING_PRECISION.GOOD,
    description: '4弦ベースの標準チューニング。低音域の音程を正確に合わせます。',
    tuning: ['4弦: E (ミ)', '3弦: A (ラ)', '2弦: D (レ)', '1弦: G (ソ)'],
    openStrings: [
      { note: 'G2', frequency: 98.00, string: '1弦' },
      { note: 'D2', frequency: 73.42, string: '2弦' },
      { note: 'A1', frequency: 55.00, string: '3弦' },
      { note: 'E1', frequency: 41.20, string: '4弦' }
    ]
  },
  violin: {
    name: 'バイオリン',
    strings: ['E5', 'A4', 'D4', 'G3'],
    frequencies: [659.25, 440.00, 293.66, 196.00],
    tolerance: TUNING_PRECISION.EXCELLENT,
    description: '弦楽器の標準チューニング。精密な音程調整が求められます。',
    tuning: ['E弦: E (ミ)', 'A弦: A (ラ)', 'D弦: D (レ)', 'G弦: G (ソ)'],
    openStrings: [
      { note: 'E5', frequency: 659.25, string: 'E弦' },
      { note: 'A4', frequency: 440.00, string: 'A弦' },
      { note: 'D4', frequency: 293.66, string: 'D弦' },
      { note: 'G3', frequency: 196.00, string: 'G弦' }
    ]
  },
  viola: {
    name: 'ビオラ',
    strings: ['A4', 'D4', 'G3', 'C3'],
    frequencies: [440.00, 293.66, 196.00, 130.81],
    tolerance: TUNING_PRECISION.EXCELLENT,
    description: 'ビオラの標準チューニング。バイオリンより低い音域です。',
    tuning: ['A弦: A (ラ)', 'D弦: D (レ)', 'G弦: G (ソ)', 'C弦: C (ド)'],
    openStrings: [
      { note: 'A4', frequency: 440.00, string: 'A弦' },
      { note: 'D4', frequency: 293.66, string: 'D弦' },
      { note: 'G3', frequency: 196.00, string: 'G弦' },
      { note: 'C3', frequency: 130.81, string: 'C弦' }
    ]
  },
  cello: {
    name: 'チェロ',
    strings: ['A3', 'D3', 'G2', 'C2'],
    frequencies: [220.00, 146.83, 98.00, 65.41],
    tolerance: TUNING_PRECISION.EXCELLENT,
    description: 'チェロの標準チューニング。低音域の弦楽器です。',
    tuning: ['A弦: A (ラ)', 'D弦: D (レ)', 'G弦: G (ソ)', 'C弦: C (ド)'],
    openStrings: [
      { note: 'A3', frequency: 220.00, string: 'A弦' },
      { note: 'D3', frequency: 146.83, string: 'D弦' },
      { note: 'G2', frequency: 98.00, string: 'G弦' },
      { note: 'C2', frequency: 65.41, string: 'C弦' }
    ]
  },
  piano: {
    name: 'ピアノ',
    strings: ['A4'],
    frequencies: [440.00],
    tolerance: TUNING_PRECISION.EXCELLENT,
    description: '88鍵のピアノ。全音域の音程を正確に合わせます。',
    tuning: ['A4: 440Hz基準', 'オクターブ調整', '全音域チェック'],
    openStrings: [
      { note: 'A4', frequency: 440.00, string: '基準音A' },
      { note: 'C4', frequency: 261.63, string: '中央C' },
      { note: 'E4', frequency: 329.63, string: 'E音' },
      { note: 'G4', frequency: 392.00, string: 'G音' }
    ]
  },
  trombone: {
    name: 'トロンボーン',
    strings: ['B♭1'],
    frequencies: [58.27],
    tolerance: TUNING_PRECISION.EXCELLENT,
    description: 'スライドポジションで音程を調整する金管楽器。唇の振動とスライドで音程を制御します。',
    tuning: ['B♭1: 58.27Hz基準', 'スライドポジション調整', '唇の振動制御'],
    openStrings: [
      { note: 'B♭1', frequency: 58.27, string: '基準音B♭' },
      { note: 'E2', frequency: 82.41, string: 'E音' },
      { note: 'B♭2', frequency: 116.54, string: 'B♭音' },
      { note: 'E3', frequency: 164.81, string: 'E音' }
    ],
    transposingInfo: {
      key: 'B♭',
      description: '一般的に使用されているのは、「B♭トロンボーン」という調の楽器です。\n\nトロンボーンのスライドポジションで、トロンボーンの楽譜を見て、「ドレミファソラシド」を吹くと、鳴っている音は「シ♭ドレミ♭ファソラシ♭」になります。'
    }
  },
  trumpet: {
    name: 'トランペット',
    strings: ['B♭2'],
    frequencies: [116.54],
    tolerance: TUNING_PRECISION.EXCELLENT,
    description: 'バルブ操作で音程を調整する金管楽器。唇の振動とバルブで音程を制御します。',
    tuning: ['B♭2: 116.54Hz基準', 'バルブ調整', '唇の振動制御'],
    openStrings: [
      { note: 'B♭2', frequency: 116.54, string: '基準音B♭' },
      { note: 'C3', frequency: 130.81, string: 'C音' },
      { note: 'E♭3', frequency: 155.56, string: 'E♭音' },
      { note: 'F3', frequency: 174.61, string: 'F音' }
    ],
    transposingInfo: {
      key: 'B♭',
      description: '一般的に使用されているのは、「B♭トランペット」という調の楽器です。\n\nトランペットの指使いで、トランペットの楽譜を見て、「ドレミファソラシド」を吹くと、鳴っている音は「シ♭ドレミ♭ファソラシ♭」になります。'
    }
  },
  horn: {
    name: 'フレンチホルン',
    strings: ['F2'],
    frequencies: [87.31],
    tolerance: TUNING_PRECISION.EXCELLENT,
    description: 'バルブ操作で音程を調整する金管楽器。手をベルに入れて音色を調整します。',
    tuning: ['F2: 87.31Hz基準', 'バルブ調整', '手の位置調整'],
    openStrings: [
      { note: 'F2', frequency: 87.31, string: '基準音F' },
      { note: 'C3', frequency: 130.81, string: 'C音' },
      { note: 'F3', frequency: 174.61, string: 'F音' },
      { note: 'C4', frequency: 261.63, string: 'C音' }
    ],
    transposingInfo: {
      key: 'F',
      description: '一般的に使用されているのは、「Fホルン」という調の楽器です。\n\nホルンの指使いで、ホルンの楽譜を見て、「ドレミファソラシド」を吹くと、鳴っている音は「ファソラシ♭ドレミファ」になります。'
    }
  },
  tuba: {
    name: 'チューバ',
    strings: ['B♭0'],
    frequencies: [29.14],
    tolerance: TUNING_PRECISION.GOOD,
    description: '金管楽器の中で最も低い音域を持つ楽器。バルブ操作で音程を調整します。',
    tuning: ['B♭0: 29.14Hz基準', 'バルブ調整', '唇の振動制御'],
    openStrings: [
      { note: 'B♭0', frequency: 29.14, string: '基準音B♭' },
      { note: 'E♭1', frequency: 38.89, string: 'E♭音' },
      { note: 'F1', frequency: 43.65, string: 'F音' },
      { note: 'B♭1', frequency: 58.27, string: 'B♭音' }
    ],
    transposingInfo: {
      key: 'B♭',
      description: '一般的に使用されているのは、「B♭チューバ」という調の楽器です。\n\nチューバの指使いで、チューバの楽譜を見て、「ドレミファソラシド」を吹くと、鳴っている音は「シ♭ドレミ♭ファソラシ♭」になります。'
    }
  },
  flute: {
    name: 'フルート',
    strings: ['A4'],
    frequencies: [440.00],
    tolerance: TUNING_PRECISION.EXCELLENT,
    description: '木管楽器。息の使い方と指の位置で音程を調整します。',
    tuning: ['A4: 440Hz基準', '頭部管調整', '息のコントロール'],
    openStrings: [
      { note: 'A4', frequency: 440.00, string: '基準音A' },
      { note: 'C5', frequency: 523.25, string: 'C音' },
      { note: 'D5', frequency: 587.33, string: 'D音' },
      { note: 'E5', frequency: 659.25, string: 'E音' }
    ]
  },
  clarinet: {
    name: 'クラリネット',
    strings: ['B♭3'],
    frequencies: [233.08],
    tolerance: TUNING_PRECISION.EXCELLENT,
    description: 'B♭管のクラリネット。リードの調整と指の位置で音程を調整します。',
    tuning: ['B♭3: 233.08Hz基準', 'リード調整', '指の位置'],
    openStrings: [
      { note: 'B♭3', frequency: 233.08, string: '基準音B♭' },
      { note: 'C4', frequency: 261.63, string: 'C音' },
      { note: 'E4', frequency: 329.63, string: 'E音' },
      { note: 'G4', frequency: 392.00, string: 'G音' }
    ],
    transposingInfo: {
      key: 'B♭',
      description: '一般的に使用されているのは、「B♭クラリネット」という調の楽器です。\n\nクラリネットの指使いで、クラリネットの楽譜を見て、「ドレミファソラシド」を吹くと、鳴っている音は「シ♭ドレミ♭ファソラシ♭」になります。'
    }
  },
  saxophone: {
    name: 'サックス',
    strings: ['B♭3'],
    frequencies: [233.08],
    tolerance: TUNING_PRECISION.EXCELLENT,
    description: 'B♭管のサックス。マウスピースの位置と指の位置で音程を調整します。',
    tuning: ['B♭3: 233.08Hz基準', 'マウスピース調整', '指の位置'],
    openStrings: [
      { note: 'B♭3', frequency: 233.08, string: '基準音B♭' },
      { note: 'C4', frequency: 261.63, string: 'C音' },
      { note: 'D4', frequency: 293.66, string: 'D音' },
      { note: 'E4', frequency: 329.63, string: 'E音' }
    ],
    transposingInfo: {
      key: 'B♭',
      description: '一般的に使用されているのは、「B♭サックス」という調の楽器です。\n\nサックスの指使いで、サックスの楽譜を見て、「ドレミファソラシド」を吹くと、鳴っている音は「シ♭ドレミ♭ファソラシ♭」になります。'
    }
  },
  oboe: {
    name: 'オーボエ',
    strings: ['A4'],
    frequencies: [440.00],
    tolerance: TUNING_PRECISION.EXCELLENT,
    description: '木管楽器。リードの調整と指の位置で音程を調整します。',
    tuning: ['A4: 440Hz基準', 'リード調整', '指の位置'],
    openStrings: [
      { note: 'A4', frequency: 440.00, string: '基準音A' },
      { note: 'C4', frequency: 261.63, string: 'C音' },
      { note: 'D4', frequency: 293.66, string: 'D音' },
      { note: 'E4', frequency: 329.63, string: 'E音' }
    ]
  },
  bassoon: {
    name: 'ファゴット',
    strings: ['B1'],
    frequencies: [61.74],
    tolerance: TUNING_PRECISION.EXCELLENT,
    description: '低音域の木管楽器。リードの調整と指の位置で音程を調整します。',
    tuning: ['B1: 61.74Hz基準', 'リード調整', '指の位置'],
    openStrings: [
      { note: 'B1', frequency: 61.74, string: '基準音B' },
      { note: 'C2', frequency: 65.41, string: 'C音' },
      { note: 'E2', frequency: 82.41, string: 'E音' },
      { note: 'G2', frequency: 98.00, string: 'G音' }
    ]
  },
  harp: {
    name: 'ハープ',
    strings: ['C2'],
    frequencies: [65.41],
    tolerance: TUNING_PRECISION.EXCELLENT,
    description: '弦楽器。各弦の音程を正確に合わせることが重要です。',
    tuning: ['C2: 65.41Hz基準', 'ペダル調整', '全音域チェック'],
    openStrings: [
      { note: 'C2', frequency: 65.41, string: 'C弦' },
      { note: 'D2', frequency: 73.42, string: 'D弦' },
      { note: 'E2', frequency: 82.41, string: 'E弦' },
      { note: 'G2', frequency: 98.00, string: 'G弦' }
    ]
  },
  double_bass: {
    name: 'コントラバス',
    strings: ['E1', 'A1', 'D2', 'G2'],
    frequencies: [41.20, 55.00, 73.42, 98.00],
    tolerance: TUNING_PRECISION.EXCELLENT,
    description: '最低音域の弦楽器。各弦の音程を正確に合わせることが重要です。',
    tuning: ['E弦: E (ミ)', 'A弦: A (ラ)', 'D弦: D (レ)', 'G弦: G (ソ)'],
    openStrings: [
      { note: 'E1', frequency: 41.20, string: 'E弦' },
      { note: 'A1', frequency: 55.00, string: 'A弦' },
      { note: 'D2', frequency: 73.42, string: 'D弦' },
      { note: 'G2', frequency: 98.00, string: 'G弦' }
    ]
  },
  contrabass: {
    name: 'コントラバス',
    strings: ['E1', 'A1', 'D2', 'G2'],
    frequencies: [41.20, 55.00, 73.42, 98.00],
    tolerance: TUNING_PRECISION.EXCELLENT,
    description: '最低音域の弦楽器。各弦の音程を正確に合わせることが重要です。',
    tuning: ['E弦: E (ミ)', 'A弦: A (ラ)', 'D弦: D (レ)', 'G弦: G (ソ)'],
    openStrings: [
      { note: 'E1', frequency: 41.20, string: 'E弦' },
      { note: 'A1', frequency: 55.00, string: 'A弦' },
      { note: 'D2', frequency: 73.42, string: 'D弦' },
      { note: 'G2', frequency: 98.00, string: 'G弦' }
    ]
  },
  drums: {
    name: 'ドラム',
    strings: ['A4'],
    frequencies: [440.00],
    tolerance: TUNING_PRECISION.GOOD,
    description: '打楽器。各ドラムの音程を調整します。',
    tuning: ['A4: 440Hz基準', 'スネア調整', 'バスドラム調整'],
    openStrings: [
      { note: 'A4', frequency: 440.00, string: '基準音A' },
      { note: 'C4', frequency: 261.63, string: 'C音' },
      { note: 'E4', frequency: 329.63, string: 'E音' },
      { note: 'G4', frequency: 392.00, string: 'G音' }
    ]
  }
};

// 弦楽器かどうかを判定する関数
const isStringInstrument = (instrument: string): boolean => {
  const stringInstruments = ['guitar', 'bass', 'violin', 'viola', 'cello', 'double_bass', 'contrabass', 'harp', 'koto'];
  return stringInstruments.includes(instrument);
};

// 音名表示形式を変換する関数（E4形式を日本語に変換）
const convertNoteName = (noteString: string, mode: 'en' | 'ja'): string => {
  if (mode === 'en') {
    return noteString; // そのまま返す
  }
  
  // E4, C#3 などの形式を解析
  const match = noteString.match(/^([A-G][#♭]?)(\d+)$/);
  if (!match) {
    return noteString; // パターンに一致しない場合はそのまま返す
  }
  
  let noteName = match[1]; // E, C# など
  const octave = match[2]; // 4, 3 など
  
  
  // フラット記号（♭）をシャープ記号（#）に変換
  // NOTE_NAMES配列はシャープ記号を使用しているため
  const flatToSharp: { [key: string]: string } = {
    'B♭': 'A#', 'E♭': 'D#', 'A♭': 'G#', 'D♭': 'C#', 'G♭': 'F#', 'C♭': 'B', 'F♭': 'E',
    'Bb': 'A#', 'Eb': 'D#', 'Ab': 'G#', 'Db': 'C#', 'Gb': 'F#', 'Cb': 'B', 'Fb': 'E'
  };
  if (flatToSharp[noteName]) {
    noteName = flatToSharp[noteName];
  }
  const noteIndex = NOTE_NAMES.indexOf(noteName);
  if (noteIndex === -1) {
    return noteString; // 見つからない場合はそのまま返す
  }
  
  const noteJa = NOTE_NAMES_JA[noteIndex];
  return `${noteJa}${octave}`;
};



export default function TunerScreen() {
  const router = useRouter();
  const { currentTheme, selectedInstrument: contextSelectedInstrument } = useInstrumentTheme();
  const { t } = useLanguage();
  const [mode, setMode] = useState<'tuner' | 'metronome'>('tuner');
  
  // 現在のルートを記録（マウント時）
  useEffect(() => {
    setCurrentRoute('/(tabs)/tuner');
    return () => {
      // アンマウント時はクリアしない（他の画面に遷移する際に使用するため）
    };
  }, []);
  
  
  // チューナー機能の状態
  const [isListening, setIsListening] = useState(false);
  const [currentFrequency, setCurrentFrequency] = useState<number>(0);
  const [currentNote, setCurrentNote] = useState<string>('--');
  const [currentNoteJa, setCurrentNoteJa] = useState<string>('--');
  const [currentOctave, setCurrentOctave] = useState<number>(0);
  const [currentCents, setCurrentCents] = useState<number>(0);
  const [indicatorColor, setIndicatorColor] = useState<string>('#9E9E9E');
  
  // 音程検出用の参照
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const audioProcessingIntervalRef = useRef<number | null>(null);
  const smoothedFrequencyRef = useRef<number>(0);
  const frequencyHistoryRef = useRef<number[]>([]); // 周波数履歴をrefで保持
  
  // 音名表示モード（CDEかドレミか）- 開放弦の音を聞く機能で使用
  const [noteDisplayMode, setNoteDisplayMode] = useState<'en' | 'ja'>('en');
  const NOTE_DISPLAY_MODE_KEY = '@tuner_note_display_mode';
  
  // A4周波数の設定（デフォルト440Hz）
  const [a4Frequency, setA4Frequency] = useState<number>(DEFAULT_A4_FREQUENCY);
  const a4FrequencyRef = useRef<number>(DEFAULT_A4_FREQUENCY);
  useEffect(() => {
    a4FrequencyRef.current = a4Frequency;
  }, [a4Frequency]);

  // 端末の再生環境差（スピーカー/OS処理など）で基準音が僅かにズレて聞こえる場合の微調整（セント）
  const REFERENCE_TONE_CENTS_OFFSET_KEY = '@tuner_reference_tone_cents_offset';
  const [referenceToneCentsOffset, setReferenceToneCentsOffset] = useState<number>(0);
  
  // プロ仕様設定
  // データベースの楽器IDとチューナー楽器キーのマッピング（useMemoでメモ化）
  const instrumentIdToTunerKey: Record<string, keyof typeof INSTRUMENT_TUNINGS> = useMemo(() => ({
    '550e8400-e29b-41d4-a716-446655440001': 'piano',     // ピアノ
    '550e8400-e29b-41d4-a716-446655440002': 'guitar',    // ギター
    '550e8400-e29b-41d4-a716-446655440005': 'trumpet',   // トランペット
    '550e8400-e29b-41d4-a716-446655440010': 'trombone',  // トロンボーン
    '550e8400-e29b-41d4-a716-446655440003': 'violin',    // バイオリン
    '550e8400-e29b-41d4-a716-446655440018': 'viola',     // ヴィオラ
    '550e8400-e29b-41d4-a716-446655440011': 'cello',     // チェロ
    '550e8400-e29b-41d4-a716-446655440015': 'contrabass', // コントラバス
    '550e8400-e29b-41d4-a716-446655440008': 'horn',      // ホルン
    '550e8400-e29b-41d4-a716-446655440022': 'tuba',      // チューバ
    '550e8400-e29b-41d4-a716-446655440013': 'guitar',    // オーボエ（フォールバック）
    '550e8400-e29b-41d4-a716-446655440004': 'guitar',    // フルート（フォールバック）
    '550e8400-e29b-41d4-a716-446655440007': 'guitar',    // サックス（フォールバック）
    '550e8400-e29b-41d4-a716-446655440009': 'guitar',    // クラリネット（フォールバック）
    '550e8400-e29b-41d4-a716-446655440006': 'guitar',    // ドラム（フォールバック）
    '550e8400-e29b-41d4-a716-446655440012': 'guitar',    // ファゴット（フォールバック）
    '550e8400-e29b-41d4-a716-446655440014': 'guitar',    // ハープ（フォールバック）
    '550e8400-e29b-41d4-a716-446655440020': 'piano',     // シンセサイザー（ピアノとして）
    '550e8400-e29b-41d4-a716-446655440021': 'guitar',    // 太鼓（フォールバック）
    '550e8400-e29b-41d4-a716-446655440019': 'guitar',    // 琴（フォールバック）
    '550e8400-e29b-41d4-a716-446655440016': 'guitar'     // その他（フォールバック：ギターとして）
  }), []);
  
  const selectedInstrument = useMemo(() => 
    instrumentIdToTunerKey[contextSelectedInstrument || ''] || 'guitar',
    [instrumentIdToTunerKey, contextSelectedInstrument]
  );
  
  // 開放弦の音の連続再生用の状態
  const [playingOpenString, setPlayingOpenString] = useState<string | null>(null);
  const playingOpenStringRef = useRef<string | null>(null); // onendedイベントで使用するためのref
  const openStringOscillatorRef = useRef<OscillatorNode | null>(null);
  const openStringGainNodeRef = useRef<GainNode | null>(null);
  
  // 音階の音の連続再生用の状態
  const [playingScaleNote, setPlayingScaleNote] = useState<string | null>(null);
  const playingScaleNoteRef = useRef<string | null>(null);
  const scaleNoteOscillatorRef = useRef<OscillatorNode | null>(null);
  const scaleNoteGainNodeRef = useRef<GainNode | null>(null);
  
  // playingOpenStringRefをplayingOpenStringと同期
  useEffect(() => {
    playingOpenStringRef.current = playingOpenString;
  }, [playingOpenString]);
  
  // playingScaleNoteRefをplayingScaleNoteと同期
  useEffect(() => {
    playingScaleNoteRef.current = playingScaleNote;
  }, [playingScaleNote]);
  
  // 音階データを生成（C3からC6まで、オクターブごとにグループ化）
  // ユーザーが設定したA4周波数を使用
  const scaleNotesByOctave = useMemo(() => {
    const octaves: { [octave: number]: Array<{ note: string; noteJa: string; octave: number; frequency: number; displayName: string }> } = {};
    // C3からC6まで（3オクターブ + 1音）
    for (let octave = 3; octave <= 6; octave++) {
      octaves[octave] = [];
      for (let i = 0; i < NOTE_NAMES.length; i++) {
        const note = NOTE_NAMES[i];
        const noteJa = NOTE_NAMES_JA[i];
        // ユーザーが設定したA4周波数を使用
        const frequency = getFrequency(note, octave, a4Frequency);
        const displayName = `${noteJa}${octave}`;
        octaves[octave].push({ note, noteJa, octave, frequency, displayName });
        
        // C6まで到達したら終了
        if (octave === 6 && note === 'C') {
          break;
        }
      }
    }
    return octaves;
  }, [a4Frequency]);

  // アニメーション用の値（UI表示用）
  const tuningBarAnimation = useRef(new Animated.Value(0)).current;

  // Web Audio API 用参照（開放弦の音とメトロノーム用）
  // リソース管理サービスを使用するため、refはメトロノームとの共有用に保持
  const audioContextRef = useRef<AudioContext | null>(null);
  const OWNER_NAME = 'TunerScreen';

  // 音名表示モードとA4周波数を読み込む
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // 音名表示モードを読み込み
        const savedMode = await AsyncStorage.getItem(NOTE_DISPLAY_MODE_KEY);
        if (savedMode === 'en' || savedMode === 'ja') {
          setNoteDisplayMode(savedMode);
        }

        // 基準音の微調整（セント）を読み込み
        const savedOffset = await AsyncStorage.getItem(REFERENCE_TONE_CENTS_OFFSET_KEY);
        if (savedOffset !== null) {
          const parsed = Number(savedOffset);
          if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
            setReferenceToneCentsOffset(Math.max(-50, Math.min(50, parsed)));
          }
        }
        
        // A4周波数を設定から読み込み
        const { user, error: userError } = await getCurrentUser();
        if (!userError && user) {
          const settingsResult = await getUserSettings(user.id);
          if (!settingsResult.error && settingsResult.data?.tuner_settings) {
            const settings = settingsResult.data.tuner_settings;
            const a4Freq = settings.a4Frequency || settings.reference_pitch || DEFAULT_A4_FREQUENCY;
            setA4Frequency(a4Freq);
            logger.debug('A4周波数を設定から読み込みました', { a4Freq });
          }
        }
      } catch (error) {
        ErrorHandler.handle(error, '設定の読み込み', false);
      }
    };
    loadSettings();
  }, []);

  // 音名表示モードを保存する（useCallbackでメモ化）
  const saveNoteDisplayMode = useCallback(async (mode: 'en' | 'ja') => {
    try {
      await AsyncStorage.setItem(NOTE_DISPLAY_MODE_KEY, mode);
      setNoteDisplayMode(mode);
    } catch (error) {
      ErrorHandler.handle(error, '音名表示モードの保存', false);
    }
  }, []);

  const saveReferenceToneCentsOffset = useCallback(async (value: number) => {
    const clamped = Math.max(-50, Math.min(50, value));
    try {
      await AsyncStorage.setItem(REFERENCE_TONE_CENTS_OFFSET_KEY, String(clamped));
      setReferenceToneCentsOffset(clamped);
    } catch (error) {
      ErrorHandler.handle(error, '基準音微調整の保存', false);
    }
  }, []);

  // A4周波数を保存する（useCallbackでメモ化）
  const saveA4Frequency = useCallback(async (frequency: number) => {
    try {
      const { user, error: userError } = await getCurrentUser();
      if (!userError && user) {
        await saveTunerSettings(user.id, {
          reference_pitch: frequency,
          temperament: 'equal',
          volume: 0.5,
        });
        logger.debug('A4周波数を保存しました', { frequency });
      }
    } catch (error) {
      ErrorHandler.handle(error, 'A4周波数の保存', false);
    }
  }, []);

  // チューナー機能：音程検出を開始
  const startListening = async () => {
    try {
      if (Platform.OS !== 'web') {
        Alert.alert(t('notSupported'), 'チューナー機能はWeb環境でのみ利用できます');
        return;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        Alert.alert('エラー', 'このブラウザではチューナー機能を利用できません');
        return;
      }

      // リソース管理サービスからマイクアクセスを取得（排他制御）
      let stream: MediaStream;
      try {
        stream = await audioResourceManager.acquireMicrophone(OWNER_NAME, {
          audio: {
            echoCancellation: false, // チューナーではエコーキャンセルを無効化（精度向上のため）
            noiseSuppression: false,  // ノイズサプレッションも無効化
            autoGainControl: false,   // 自動ゲインコントロールも無効化
            sampleRate: 44100,
          }
        });
        microphoneStreamRef.current = stream;
      } catch (error: any) {
        const errorMessage = error?.message || 'マイクアクセスの取得に失敗しました';
        if (errorMessage.includes('既に')) {
          Alert.alert('マイク使用中', errorMessage + '\n\n他の機能（録音、クイック記録など）がマイクを使用している可能性があります。');
        } else {
          Alert.alert('エラー', errorMessage);
        }
        return;
      }

      // AudioContextを取得
      const audioCtx = await audioResourceManager.acquireAudioContext(OWNER_NAME);
      if (!audioCtx) {
        Alert.alert('エラー', 'オーディオリソースを取得できませんでした');
        audioResourceManager.releaseMicrophone(OWNER_NAME);
        return;
      }
      audioContextRef.current = audioCtx;

      // マイク入力をAudioContextに接続
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 8192; // コントラバスの低周波数検出精度向上のため、FFTサイズを8192に拡大
      analyser.smoothingTimeConstant = 0.5; // より滑らかな平滑化
      source.connect(analyser);
      analyserNodeRef.current = analyser;

      // 音程検出を開始
      setIsListening(true);
      smoothedFrequencyRef.current = 0;

      // 定期的に音程を検出（60fps相当）
      // 周波数検出の信頼性を向上させるため、複数フレームの平均を使用
      const HISTORY_SIZE = 10; // 10フレームの履歴を使用（安定性を優先）
      frequencyHistoryRef.current = []; // 履歴をリセット

      
  
  
const processAudio = () => {
        // オクターブ関係をチェックする関数（±5%の誤差を許容）
        const isOctaveRelation = (freq1: number, freq2: number): boolean => {
          if (freq1 <= 0 || freq2 <= 0) return false;
          const ratio = freq1 > freq2 ? freq1 / freq2 : freq2 / freq1;
          // 2倍（オクターブ）、4倍（2オクターブ）、1/2倍、1/4倍の関係をチェック
          return (ratio > 1.9 && ratio < 2.1) || (ratio > 3.8 && ratio < 4.2) || 
                 (ratio > 0.475 && ratio < 0.525) || (ratio > 0.2375 && ratio < 0.2625);
        };
        
        if (!analyserNodeRef.current || !audioContextRef.current) return;

        const bufferLength = analyserNodeRef.current.frequencyBinCount;
        const dataArray = new Float32Array(bufferLength);
        analyserNodeRef.current.getFloatTimeDomainData(dataArray);

        // 周波数を検出（複数アルゴリズムを統合して高精度化）
        const detectedFrequency = combineAlgorithms(dataArray, audioContextRef.current.sampleRate);

        if (detectedFrequency > 0 && detectedFrequency < 2000) {
          // 異常値の検出：前回の平滑化値と比較して、異常に大きな変化（100%以上）の場合は無視
          // ただし、オクターブ関係（2倍、4倍、1/2倍、1/4倍）の場合は正常な検出として扱う
          if (smoothedFrequencyRef.current > 0) {
            const changeRatio = Math.abs(detectedFrequency - smoothedFrequencyRef.current) / smoothedFrequencyRef.current;
            
            // オクターブ関係の場合は正常な検出として扱う
            if (isOctaveRelation(detectedFrequency, smoothedFrequencyRef.current)) {
              // オクターブ関係の場合は正常な検出として扱う（スキップしない）
            } else if (changeRatio > 1.0) {
              // 異常値の可能性が高いため、履歴に追加せずにスキップ（100%以上の変化）
              // デバッグログは削除（高頻度で出力されるため）
              return;
            }
          }
          // 履歴に追加
          frequencyHistoryRef.current.push(detectedFrequency);
          if (frequencyHistoryRef.current.length > HISTORY_SIZE) {
            frequencyHistoryRef.current.shift(); // 古い値を削除
          }

          // 履歴が十分にたまったら中央値を使用（外れ値の影響を減らす）
          // より安定した検出のため、履歴を十分に蓄積
          let medianFreq = detectedFrequency;
          if (frequencyHistoryRef.current.length >= 7) {
            // 7フレーム以上の場合、外れ値を除去してから中央値を計算
            const sortedFreqs = [...frequencyHistoryRef.current].sort((a, b) => a - b);
            // 外れ値を除去（上下25%を除外）
            const q1Index = Math.floor(sortedFreqs.length * 0.25);
            const q3Index = Math.floor(sortedFreqs.length * 0.75);
            const trimmedFreqs = sortedFreqs.slice(q1Index, q3Index + 1);
            // トリム後の中央値を使用
            medianFreq = trimmedFreqs[Math.floor(trimmedFreqs.length / 2)];
            
            // さらに、トリム後の平均も計算して、中央値と平均の加重平均を使用
            const trimmedMean = trimmedFreqs.reduce((a, b) => a + b, 0) / trimmedFreqs.length;
            // 中央値70%、平均30%の加重平均（安定性と精度のバランス）
            medianFreq = medianFreq * 0.7 + trimmedMean * 0.3;
          } else if (frequencyHistoryRef.current.length >= 3) {
          // 異常値の再チェック：中央値も前回の平滑化値と比較
          // 中央値計算後も、前回の値と比較して異常に大きな変化（100%以上）がある場合は無視
          // ただし、オクターブ関係の場合は正常な検出として扱う
          if (smoothedFrequencyRef.current > 0) {
            const medianChangeRatio = Math.abs(medianFreq - smoothedFrequencyRef.current) / smoothedFrequencyRef.current;
            
            // オクターブ関係の場合は正常な検出として扱う
            if (!isOctaveRelation(medianFreq, smoothedFrequencyRef.current) && medianChangeRatio > 1.0) {
              // 中央値も異常値の可能性が高いため、前回の値を維持（100%以上の変化）
              // デバッグログは削除（高頻度で出力されるため）
              return;
            }
          }
            // 3フレーム以上の場合、中央値を使用
            const sortedFreqs = [...frequencyHistoryRef.current].sort((a, b) => a - b);
            medianFreq = sortedFreqs[Math.floor(sortedFreqs.length / 2)];
          } else if (frequencyHistoryRef.current.length >= 2) {
            // 2フレームの場合は平均を使用
            medianFreq = frequencyHistoryRef.current.reduce((a, b) => a + b, 0) / frequencyHistoryRef.current.length;
          }

          // 安定した検出のため、変化量に応じた段階的な平滑化を適用
          // 平滑化の強度は変化量に反比例（小さな変化ほど強く平滑化、大きな変化ほど弱く平滑化）
          // これにより、実際の音の変化は反映しつつ、誤検出による急激な変化は抑制される
          const freqDiff = Math.abs(medianFreq - smoothedFrequencyRef.current);
          let smoothedFreq: number;
          
          if (smoothedFrequencyRef.current === 0) {
            // 初回検出時は即座に反映（平滑化なし）
            smoothedFreq = medianFreq;
          } else if (freqDiff < 2) {
            // 非常に小さな変化（2Hz未満）: 50%平滑化（安定性を最優先）
            // チューニング時の微調整を滑らかに表示
            smoothedFreq = smoothedFrequencyRef.current * 0.5 + medianFreq * 0.5;
          } else if (freqDiff < 5) {
            // 小さな変化（2-5Hz）: 40%平滑化（中程度の安定性）
            // 楽器の音程の自然な揺れを滑らかに
            smoothedFreq = smoothedFrequencyRef.current * 0.4 + medianFreq * 0.6;
          } else if (freqDiff < 10) {
            // 中程度の変化（5-10Hz）: smoothValue関数で軽い平滑化
            // 音程の変更を比較的速やかに反映
            smoothedFreq = smoothValue(
              smoothedFrequencyRef.current,
              medianFreq,
              0.4, // alpha: 変化の反映速度（0.4 = 40%反映）
              20   // maxChange: 1回の更新で許容する最大変化量（Hz）
            );
          } else if (freqDiff < 20) {
            // 大きな変化（10-20Hz）: 標準的な平滑化
            // 楽器の変更や大きな音程の変更に対応
            smoothedFreq = smoothValue(
              smoothedFrequencyRef.current,
              medianFreq,
              0.4, // alpha
              20   // maxChange
            );
          } else {
            // 非常に大きな変化（20Hz以上）: 強い平滑化（外れ値の可能性が高い）
            // 誤検出やノイズによる急激な変化を抑制
            smoothedFreq = smoothValue(
              smoothedFrequencyRef.current,
              medianFreq,
              0.2, // alpha: より強い平滑化（20%反映）
              10   // maxChange: より厳しい制限（10Hz/回）
            );
          }
          
          smoothedFrequencyRef.current = smoothedFreq;          
          // 最終的な異常値チェック：平滑化後の値も妥当性を確認
          if (smoothedFrequencyRef.current > 0) {
            const finalChangeRatio = Math.abs(smoothedFreq - smoothedFrequencyRef.current) / smoothedFrequencyRef.current;
            if (finalChangeRatio > 0.3) {
              // 平滑化後も異常に大きな変化がある場合は、前回の値を維持
              if (__DEV__) console.warn(`[Tuner] 平滑化後の値が異常値のためスキップ: ${smoothedFreq.toFixed(2)}Hz (前回: ${smoothedFrequencyRef.current.toFixed(2)}Hz, 変化率: ${(finalChangeRatio * 100).toFixed(1)}%)`);
              return;
            }
          }          


          // 音名を取得（設定されたA4周波数を使用）
          const noteInfo = getNoteFromFrequency(smoothedFreq, a4FrequencyRef.current);
          
          // デバッグ情報（開発時のみ、本番環境でもコンソールに出力）
          if (__DEV__) {
            logger.debug('チューナー検出', {
              detectedFreq: detectedFrequency.toFixed(2),
              medianFreq: medianFreq.toFixed(2),
              smoothedFreq: smoothedFreq.toFixed(2),
              note: noteInfo.note,
              noteJa: noteInfo.noteJa,
              octave: noteInfo.octave,
              cents: noteInfo.cents.toFixed(1),
              a4Freq: a4Frequency,
              tuningQuality: noteInfo.tuningQuality,
              isInTune: noteInfo.isInTune
            });
          }
          // 本番環境でも重要な情報をコンソールに出力（デバッグ用）
          console.log(`[Tuner] 検出周波数: ${detectedFrequency.toFixed(2)}Hz, 平滑化後: ${smoothedFreq.toFixed(2)}Hz, 音名: ${noteInfo.note}${noteInfo.octave}, セント: ${noteInfo.cents.toFixed(1)}, A4: ${a4FrequencyRef.current}Hz`);
          
          // UIを更新（滑らかな更新のため、状態更新を最適化）
          setCurrentFrequency(smoothedFreq);
          setCurrentNote(noteInfo.note);
          setCurrentNoteJa(noteInfo.noteJa);
          setCurrentOctave(noteInfo.octave);
          setCurrentCents(noteInfo.cents);

          // チューニングバーの位置を更新（より滑らかなアニメーション）
          Animated.timing(tuningBarAnimation, {
            toValue: noteInfo.cents,
            duration: 200, // より長いdurationで滑らかに
            easing: Easing.out(Easing.cubic), // より滑らかなイージング
            useNativeDriver: false,
          }).start();

          // インジケーターの色を更新
          const { color } = getTuningColor(Math.abs(noteInfo.cents));
          setIndicatorColor(color);
        } else {
          // 音が検出されない場合、履歴をクリア
          frequencyHistoryRef.current = [];
          
          if (smoothedFrequencyRef.current > 0) {
            // より滑らかなフェードアウト
            smoothedFrequencyRef.current = smoothValue(smoothedFrequencyRef.current, 0, 0.08, 8);
            if (smoothedFrequencyRef.current < 1) {
              smoothedFrequencyRef.current = 0;
              setCurrentFrequency(0);
              setCurrentNote('--');
              setCurrentNoteJa('--');
              setCurrentOctave(0);
              setCurrentCents(0);
              setIndicatorColor('#9E9E9E');
              
              // チューニングバーも滑らかにリセット
              Animated.timing(tuningBarAnimation, {
                toValue: 0,
                duration: 300,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: false,
              }).start();
            } else {
              // フェードアウト中もUIを更新（滑らかに）
              const noteInfo = getNoteFromFrequency(smoothedFrequencyRef.current, a4FrequencyRef.current);
              setCurrentFrequency(smoothedFrequencyRef.current);
              setCurrentNote(noteInfo.note);
              setCurrentNoteJa(noteInfo.noteJa);
              setCurrentOctave(noteInfo.octave);
              setCurrentCents(noteInfo.cents);
              
              Animated.timing(tuningBarAnimation, {
                toValue: noteInfo.cents,
                duration: 200,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: false,
              }).start();
            }
          }
        }
      };

      // 16.67ms間隔（約60fps）で処理
      audioProcessingIntervalRef.current = window.setInterval(processAudio, 16.67);

      logger.debug('チューナー機能を開始しました');
    } catch (error) {
      ErrorHandler.handle(error, 'チューナー開始', true);
      Alert.alert('エラー', 'チューナー機能を開始できませんでした');
      setIsListening(false);
    }
  };

  // チューナー機能：音程検出を停止
  const stopListening = () => {
    // インターバルをクリア
    if (audioProcessingIntervalRef.current) {
      clearInterval(audioProcessingIntervalRef.current);
      audioProcessingIntervalRef.current = null;
    }

    // マイクストリームを解放
    if (microphoneStreamRef.current) {
      microphoneStreamRef.current.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      microphoneStreamRef.current = null;
    }

    // リソース管理サービスからマイクを解放
    audioResourceManager.releaseMicrophone(OWNER_NAME);

    // 状態をリセット
    setIsListening(false);
    setCurrentFrequency(0);
    setCurrentNote('--');
    setCurrentNoteJa('--');
    setCurrentOctave(0);
    setCurrentCents(0);
    setIndicatorColor('#9E9E9E');
    smoothedFrequencyRef.current = 0;
    analyserNodeRef.current = null;

    logger.debug('チューナー機能を停止しました');
  };


  // 開放弦の音を連続再生する関数
  const playOpenString = async (frequency: number, note: string) => {
    try {
      // Webプラットフォームでない場合は警告
      if (Platform.OS !== 'web') {
        Alert.alert(t('notSupported'), t('openStringWebOnly'));
        return;
      }

      // 既に再生中の場合は停止してから新しい音を再生
      stopOpenString();
      stopScaleNote(); // 音階の音も停止
      
      // クリーンアップが完了するまで少し待つ
      await new Promise(resolve => setTimeout(resolve, 50));

      // AudioContextを取得（既に存在する場合は再利用）
      let audioCtx = audioContextRef.current;
      if (!audioCtx || audioCtx.state === 'closed') {
        // リソース管理サービスからAudioContextを取得
        audioCtx = await audioResourceManager.acquireAudioContext(OWNER_NAME);
        if (!audioCtx) {
          Alert.alert('エラー', 'オーディオリソースを取得できませんでした。他の機能が使用中かもしれません。');
          return;
        }
        // refを更新（メトロノームとの共有のため）
        audioContextRef.current = audioCtx;
      }
      
      // AudioContextがsuspended状態の場合は再開
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      // オシレーターをリソース管理サービスに登録
      audioResourceManager.registerOscillator(OWNER_NAME, oscillator);
      
      // 参照を保存
      openStringOscillatorRef.current = oscillator;
      openStringGainNodeRef.current = gainNode;
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      // 微調整（セント）を周波数に反映
      const adjustedFrequency = frequency * Math.pow(2, referenceToneCentsOffset / 1200);
      oscillator.frequency.setValueAtTime(adjustedFrequency, audioCtx.currentTime);
      oscillator.type = 'sine';
      
      // フェードインしてから連続再生
      // 低周波数（100Hz以下）では体感音量が小さく感じられるため、gainを上げる
      // 周波数に応じたgain補正: 100Hz以下は1.0、それ以上は0.3
      const baseGain = frequency <= 100 ? 1.0 : 0.3;
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(baseGain, audioCtx.currentTime + 0.1);
      
      // 連続再生: stop()を呼ばない限り継続再生される
      // onendedイベントを監視して、予期しない停止を検出
      oscillator.onended = () => {
        logger.warn('Oscillator ended unexpectedly, restarting...', { frequency, note });
        // 予期しない停止の場合、再開を試みる（refを使用して最新の状態を参照）
        const currentNote = playingOpenStringRef.current;
        if (currentNote === note) {
          setTimeout(() => {
            // 状態を再確認してから再開
            if (playingOpenStringRef.current === note) {
              playOpenString(frequency, note);
            }
          }, 100);
        }
      };
      
      oscillator.start(audioCtx.currentTime);
      setPlayingOpenString(note);
      
      logger.debug(`Playing open string continuously: ${note} at ${adjustedFrequency}Hz`, {
        base: frequency,
        centsOffset: referenceToneCentsOffset,
      });
    } catch (error) {
      ErrorHandler.handle(error, '開放弦の音再生', true);
      // エラーメッセージを詳細化
      const errorMessage = error instanceof Error ? error.message : '音の再生に失敗しました。';
      if (errorMessage.includes('AudioContextは既に')) {
        // AudioContextの競合エラーの場合は、既存のAudioContextを使用
        logger.warn('AudioContext競合を検出、既存のAudioContextを使用します');
        // 再試行（既存のAudioContextを使用）
        const audioCtx = audioContextRef.current;
        if (audioCtx && audioCtx.state !== 'closed') {
          try {
            // 既存のAudioContextで再試行
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            audioResourceManager.registerOscillator(OWNER_NAME, oscillator);
            openStringOscillatorRef.current = oscillator;
            openStringGainNodeRef.current = gainNode;
            
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            // 微調整（セント）を周波数に反映（リトライ経路にも必ず適用）
            const adjustedFrequency = frequency * Math.pow(2, referenceToneCentsOffset / 1200);
            oscillator.frequency.setValueAtTime(adjustedFrequency, audioCtx.currentTime);
            oscillator.type = 'sine';
            // 低周波数（100Hz以下）では体感音量が小さく感じられるため、gainを上げる
            // 周波数に応じたgain補正: 100Hz以下は1.0、それ以上は0.3
            const baseGain = frequency <= 100 ? 1.0 : 0.3;
            gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
            gainNode.gain.linearRampToValueAtTime(baseGain, audioCtx.currentTime + 0.1);
            oscillator.start(audioCtx.currentTime);
            setPlayingOpenString(note);
            logger.debug(`Playing open string retry: ${note} at ${adjustedFrequency}Hz`, {
              base: frequency,
              centsOffset: referenceToneCentsOffset,
            });
            return;
          } catch (retryError) {
            logger.error('再試行も失敗:', retryError);
          }
        }
      }
      Alert.alert('エラー', errorMessage);
    }
  };

  // 開放弦の音を停止する関数
  const stopOpenString = () => {
    try {
      // 状態を即座にリセット（UIの更新を優先）
      setPlayingOpenString(null);
      
      if (openStringOscillatorRef.current && openStringGainNodeRef.current && audioContextRef.current) {
        const audioCtx = audioContextRef.current;
        const oscillator = openStringOscillatorRef.current;
        const gainNode = openStringGainNodeRef.current;
        
        // audioResourceManagerからオシレーターを登録解除
        try {
          audioResourceManager.unregisterOscillator(OWNER_NAME, oscillator);
        } catch (e) {
          logger.debug('Unregister oscillator error:', e);
        }
        
        // 即座に音量を0にして停止
        try {
          gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
          gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        } catch (e) {
          logger.warn('Gain node stop error:', e);
        }
        
        // オシレーターを即座に停止
        try {
          oscillator.stop();
          oscillator.disconnect();
        } catch (e) {
          // 既に停止している場合は無視
          logger.debug('Oscillator already stopped:', e);
        }
        
        // GainNodeも切断
        try {
          gainNode.disconnect();
        } catch (e) {
          logger.debug('GainNode disconnect error:', e);
        }
        
        // 参照をクリア
        openStringOscillatorRef.current = null;
        openStringGainNodeRef.current = null;
        
        logger.debug('Stopped open string immediately');
      }
    } catch (error) {
      ErrorHandler.handle(error, '開放弦の音停止', false);
      // エラーが発生しても参照をクリア
      openStringOscillatorRef.current = null;
      openStringGainNodeRef.current = null;
      setPlayingOpenString(null);
    }
  };
  
  // 音階の音を連続再生する関数
  const playScaleNote = async (frequency: number, noteKey: string) => {
    try {
      // Webプラットフォームでない場合は警告
      if (Platform.OS !== 'web') {
        Alert.alert(t('notSupported'), t('openStringWebOnly'));
        return;
      }

      // 既に再生中の場合は停止してから新しい音を再生
      stopScaleNote();
      stopOpenString(); // 開放弦の音も停止
      
      // クリーンアップが完了するまで少し待つ
      await new Promise(resolve => setTimeout(resolve, 50));

      // AudioContextを取得（既に存在する場合は再利用）
      let audioCtx = audioContextRef.current;
      if (!audioCtx || audioCtx.state === 'closed') {
        audioCtx = await audioResourceManager.acquireAudioContext(OWNER_NAME);
        if (!audioCtx) {
          Alert.alert('エラー', 'オーディオリソースを取得できませんでした。他の機能が使用中かもしれません。');
          return;
        }
        audioContextRef.current = audioCtx;
      }
      
      // AudioContextがsuspended状態の場合は再開
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      // オシレーターをリソース管理サービスに登録
      audioResourceManager.registerOscillator(OWNER_NAME, oscillator);
      
      // 参照を保存
      scaleNoteOscillatorRef.current = oscillator;
      scaleNoteGainNodeRef.current = gainNode;
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      const adjustedFrequency = frequency * Math.pow(2, referenceToneCentsOffset / 1200);
      oscillator.frequency.setValueAtTime(adjustedFrequency, audioCtx.currentTime);
      oscillator.type = 'sine';
      
      // フェードインしてから連続再生
      // 音量を上げる（低周波数は1.0、それ以上は0.6に変更）
      const baseGain = frequency <= 100 ? 1.0 : 0.6;
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(baseGain, audioCtx.currentTime + 0.1);
      
      // 連続再生: stop()を呼ばない限り継続再生される
      oscillator.onended = () => {
        logger.warn('Scale note oscillator ended unexpectedly, restarting...', { frequency, noteKey });
        const currentNote = playingScaleNoteRef.current;
        if (currentNote === noteKey) {
          setTimeout(() => {
            if (playingScaleNoteRef.current === noteKey) {
              playScaleNote(frequency, noteKey);
            }
          }, 100);
        }
      };
      
      oscillator.start(audioCtx.currentTime);
      setPlayingScaleNote(noteKey);
      
      logger.debug(`Playing scale note continuously: ${noteKey} at ${adjustedFrequency}Hz`, {
        base: frequency,
        centsOffset: referenceToneCentsOffset,
      });
    } catch (error) {
      ErrorHandler.handle(error, '音階の音再生', true);
      Alert.alert('エラー', '音の再生に失敗しました。');
    }
  };
  
  // 音階の音を停止する関数
  const stopScaleNote = () => {
    try {
      setPlayingScaleNote(null);
      
      if (scaleNoteOscillatorRef.current && scaleNoteGainNodeRef.current && audioContextRef.current) {
        const audioCtx = audioContextRef.current;
        const oscillator = scaleNoteOscillatorRef.current;
        const gainNode = scaleNoteGainNodeRef.current;
        
        try {
          audioResourceManager.unregisterOscillator(OWNER_NAME, oscillator);
        } catch (e) {
          logger.debug('Unregister scale note oscillator error:', e);
        }
        
        try {
          gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
          gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        } catch (e) {
          logger.warn('Scale note gain node stop error:', e);
        }
        
        try {
          oscillator.stop();
          oscillator.disconnect();
        } catch (e) {
          logger.debug('Scale note oscillator already stopped:', e);
        }
        
        try {
          gainNode.disconnect();
        } catch (e) {
          logger.debug('Scale note gainNode disconnect error:', e);
        }
        
        scaleNoteOscillatorRef.current = null;
        scaleNoteGainNodeRef.current = null;
        
        logger.debug('Stopped scale note immediately');
      }
    } catch (error) {
      ErrorHandler.handle(error, '音階の音停止', false);
      scaleNoteOscillatorRef.current = null;
      scaleNoteGainNodeRef.current = null;
      setPlayingScaleNote(null);
    }
  };

  // 画面にフォーカスが当たった時にリソースを取得
  useFocusEffect(
    React.useCallback(() => {
      // 画面が表示された時にAudioContextを取得
      audioResourceManager.acquireAudioContext(OWNER_NAME).then(ctx => {
        if (ctx) {
          audioContextRef.current = ctx;
        }
      });

      return () => {
        // 画面から離れる時にリソースを解放
        stopListening(); // チューナーを停止
        stopOpenString(); // 開放弦の音を停止
        stopScaleNote(); // 音階の音も停止
        audioResourceManager.releaseAllResources(OWNER_NAME);
      };
    }, [])
  );

  // コンポーネントがアンマウントされる際に音を停止
  useEffect(() => {
    return () => {
      stopListening(); // チューナーを停止
      stopOpenString(); // 開放弦の音を停止
      audioResourceManager.releaseAllResources(OWNER_NAME);
    };
  }, []);




  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]}>
      <InstrumentHeader />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* モード切り替え */}
        <View style={[styles.modeToggleContainer, { backgroundColor: '#FFFFFF' }]}>
          <TouchableOpacity
            style={[
              styles.modeButton,
              mode === 'tuner' && { backgroundColor: currentTheme.primary }
            ]}
            onPress={() => setMode('tuner')}
          >
            <Zap size={18} color={mode === 'tuner' ? currentTheme.surface : currentTheme.primary} />
            <Text style={[
              styles.modeButtonText,
              { color: mode === 'tuner' ? currentTheme.surface : currentTheme.primary }
            ]}>
              {t('tunerTitle')}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.modeButton,
              mode === 'metronome' && { backgroundColor: currentTheme.primary }
            ]}
            onPress={() => setMode('metronome')}
          >
            <Music size={18} color={mode === 'metronome' ? currentTheme.surface : currentTheme.primary} />
            <Text style={[
              styles.modeButtonText,
              { color: mode === 'metronome' ? currentTheme.surface : currentTheme.primary }
            ]}>
              {t('metronome')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* メイン表示エリア */}
        <View style={[styles.mainDisplay, { backgroundColor: currentTheme.background }]}> 
          {mode === 'tuner' ? (
            <>
              {/* シンプルなチューナー */}
              <View style={[styles.simpleTunerContainer, { backgroundColor: currentTheme.surface }]}>
                {/* 音名表示 */}
                <View style={styles.simpleNoteContainer}>
                  <View style={styles.simpleNoteWrapper}>
                    <Text
                      style={[
                        styles.simpleNoteName,
                        { 
                          color: currentTheme.text,
                        },
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit={true}
                      minimumFontScale={0.5}
                    >
                      {currentFrequency > 0 ? (noteDisplayMode === 'en' ? currentNote : currentNoteJa) : '--'}
                    </Text>
                    <Text 
                      style={[
                        styles.simpleOctave, 
                        { 
                          color: currentTheme.textSecondary,
                          opacity: currentOctave > 0 && currentFrequency > 0 ? 0.7 : 0
                        }
                      ]}
                    >
                      {currentOctave > 0 ? currentOctave : '0'}
                    </Text>
                  </View>
                </View>

                {/* 周波数表示 */}
                <Text style={[styles.simpleFrequency, { color: currentTheme.textSecondary }]}>
                  {currentFrequency > 0 ? currentFrequency.toFixed(1) : '--'} Hz
                </Text>

                {/* シンプルなチューニングバー */}
                <View style={styles.simpleTuningBarContainer}>
                  <View style={styles.simpleTuningBarTrack}>
                    {/* 中央線 */}
                    <View style={[styles.simpleCenterLine, { backgroundColor: currentTheme.text }]} />
                    
                    {/* 目盛り */}
                    {Array.from({ length: 11 }, (_, i) => {
                      const cent = (i - 5) * 10; // -50, -40, ..., 0, ..., 40, 50
                      const position = ((cent + 50) / 100) * 100; // 0-100%
                      const isMainMark = cent === 0 || cent === -50 || cent === 50;
                      
                      return (
                        <View
                          key={i}
                          style={[
                            styles.simpleMark,
                            {
                              left: `${position}%`,
                              height: isMainMark ? 20 : 12,
                              backgroundColor: currentTheme.textSecondary,
                            }
                          ]}
                        />
                      );
                    })}
                    
                    {/* チューニングインジケーター */}
                    {currentFrequency > 0 && (
                      <Animated.View
                        style={[
                          styles.simpleIndicator,
                          {
                            backgroundColor: indicatorColor,
                            left: tuningBarAnimation.interpolate({
                              inputRange: [-50, 0, 50],
                              outputRange: ['0%', '50%', '100%'],
                              extrapolate: 'clamp',
                            }),
                          },
                        ]}
                      />
                    )}
                  </View>
                  
                  {/* セント表示（常にスペースを確保） */}
                  <View style={styles.simpleCentsContainer}>
                    {currentFrequency > 0 ? (
                      <Text style={[
                        styles.simpleCents,
                        { 
                          color: Math.abs(currentCents) <= 5 ? '#4CAF50' : 
                                 Math.abs(currentCents) <= 10 ? '#FF9800' : '#F44336'
                        }
                      ]}>
                        {currentCents > 0 ? '+' : ''}{currentCents.toFixed(1)} セント
                      </Text>
                    ) : (
                      <Text style={[styles.simpleCents, { color: 'transparent' }]}>
                        {' '}
                      </Text>
                    )}
                  </View>
                </View>

                {/* マイク開始/停止ボタン（固定） */}
                <TouchableOpacity
                  style={[
                    styles.simpleStartButton,
                    { 
                      backgroundColor: isListening ? currentTheme.secondary : currentTheme.primary 
                    },
                  ]}
                  onPress={isListening ? stopListening : startListening}
                >
                  <Text style={[styles.simpleStartButtonText, { color: currentTheme.surface }]}>
                    {isListening ? '停止' : '開始'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* 音名表示モードと開放弦の音を聞く（統合） */}
              <View style={[styles.noteDisplayModeSection, { backgroundColor: currentTheme.surface }]}>
                {/* 音名表示モード選択 */}
                <View style={styles.noteDisplayModeHeader}>
                  <Text style={[styles.noteDisplayModeTitle, { color: currentTheme.text }]}>
                    音名表示モード
                  </Text>
                  <View style={styles.noteDisplayModeButtons}>
                    <TouchableOpacity
                      style={[
                        styles.noteDisplayModeButton,
                        {
                          backgroundColor: noteDisplayMode === 'en' ? currentTheme.primary : currentTheme.background,
                          borderColor: currentTheme.primary,
                        }
                      ]}
                      onPress={() => saveNoteDisplayMode('en')}
                    >
                      <Text style={[
                        styles.noteDisplayModeButtonText,
                        { color: noteDisplayMode === 'en' ? currentTheme.surface : currentTheme.primary }
                      ]}>
                        CDE
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.noteDisplayModeButton,
                        {
                          backgroundColor: noteDisplayMode === 'ja' ? currentTheme.primary : currentTheme.background,
                          borderColor: currentTheme.primary,
                        }
                      ]}
                      onPress={() => saveNoteDisplayMode('ja')}
                    >
                      <Text style={[
                        styles.noteDisplayModeButtonText,
                        { color: noteDisplayMode === 'ja' ? currentTheme.surface : currentTheme.primary }
                      ]}>
                        ドレミ
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 開放弦の音を聞く / 基本の音を聞く */}
                <View style={styles.openStringContent}>
                  <Text style={[styles.openStringTitle, { color: currentTheme.text }]}>
                    {isStringInstrument(selectedInstrument) ? '開放弦の音を聞く' : '基本の音を聞く'}
                  </Text>
                  
                  <View style={styles.openStringButtons}>
                    {INSTRUMENT_TUNINGS[selectedInstrument].openStrings.slice(0, 4).map((openString, index) => {
                      const isPlaying = playingOpenString === openString.note;
                      // ユーザーが設定したA4周波数を使用して周波数を再計算
                      // openString.noteは "A4", "E5", "B♭1" などの形式
                      // ♭記号を#記号に変換（B♭→A#, E♭→D#, A♭→G#, D♭→C#, G♭→F#）
                      let noteStr = openString.note;
                      const flatToSharp: { [key: string]: string } = {
                        'B♭': 'A#', 'E♭': 'D#', 'A♭': 'G#', 'D♭': 'C#', 'G♭': 'F#', 'C♭': 'B', 'F♭': 'E'
                      };
                      for (const [flat, sharp] of Object.entries(flatToSharp)) {
                        if (noteStr.startsWith(flat)) {
                          noteStr = noteStr.replace(flat, sharp);
                          break;
                        }
                      }
                      const noteMatch = noteStr.match(/^([A-G]#?)(\d+)$/);
                      let actualFrequency = openString.frequency;
                      if (noteMatch) {
                        const note = noteMatch[1];
                        const octave = parseInt(noteMatch[2], 10);
                        // ユーザーが設定したA4周波数を使用して周波数を再計算
                        actualFrequency = getFrequency(note, octave, a4Frequency);
                      }
                      return (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.openStringButton,
                            { 
                              backgroundColor: isPlaying ? '#4CAF50' : currentTheme.primary,
                              borderColor: isPlaying ? '#4CAF50' : currentTheme.primary,
                            }
                          ]}
                          onPress={() => {
                            if (isPlaying) {
                              stopOpenString();
                            } else {
                              // 再計算した周波数を使用
                              playOpenString(actualFrequency, openString.note);
                            }
                          }}
                        >
                          <Text style={[styles.openStringButtonText, { color: currentTheme.surface }]}>
                            {convertNoteName(openString.note, noteDisplayMode)}
                          </Text>
                          <Text style={[styles.openStringFrequency, { color: currentTheme.surface }]}>
                            {actualFrequency.toFixed(1)}Hz
                          </Text>
                          <Text style={[styles.openStringLabel, { color: currentTheme.surface }]}>
                            {openString.string}
                          </Text>
                          {isPlaying && (
                            <Text style={[styles.playingIndicator, { color: currentTheme.surface }]}>
                              🔊 再生中
                            </Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  
                  {/* 停止ボタン（下部固定、常に表示） */}
                  <TouchableOpacity
                    style={[
                      styles.stopButton,
                      { 
                        backgroundColor: playingOpenString ? '#FF4444' : currentTheme.secondary,
                        borderColor: playingOpenString ? '#FF4444' : currentTheme.secondary,
                        opacity: playingOpenString ? 1 : 0.5
                      }
                    ]}
                    onPress={stopOpenString}
                    disabled={!playingOpenString}
                  >
                    <Text style={[styles.stopButtonText, { color: playingOpenString ? '#FFFFFF' : currentTheme.textSecondary }]}>
                      停止 {playingOpenString ? `(${convertNoteName(playingOpenString, noteDisplayMode)})` : ''}
                    </Text>
                  </TouchableOpacity>
                </View>
                
                {/* 音階を聞く */}
                <View style={[styles.openStringContent, { marginTop: 16 }]}>
                  <Text style={[styles.openStringTitle, { color: currentTheme.text }]}>
                    音階を聞く
                  </Text>
                  
                  <View style={styles.scaleNotesContainer}>
                    {[3, 4, 5].map((octave) => {
                      const notes = scaleNotesByOctave[octave] || [];
                      return (
                        <ScrollView
                          key={octave}
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          style={styles.scaleNotesRowScroll}
                          contentContainerStyle={styles.scaleNotesRow}
                        >
                          {notes.map((scaleNote, index) => {
                            const noteKey = `${scaleNote.note}${scaleNote.octave}`;
                            const isPlaying = playingScaleNote === noteKey;
                            return (
                              <TouchableOpacity
                                key={index}
                                style={[
                                  styles.scaleNoteButton,
                                  { 
                                    backgroundColor: isPlaying ? '#4CAF50' : currentTheme.primary,
                                    borderColor: isPlaying ? '#4CAF50' : currentTheme.primary,
                                  }
                                ]}
                                onPress={() => {
                                  if (isPlaying) {
                                    stopScaleNote();
                                  } else {
                                    playScaleNote(scaleNote.frequency, noteKey);
                                  }
                                }}
                              >
                                <Text style={[styles.scaleNoteButtonText, { color: currentTheme.surface }]}>
                                  {noteDisplayMode === 'ja' ? scaleNote.displayName : `${scaleNote.note}${scaleNote.octave}`}
                                </Text>
                                {isPlaying && (
                                  <Text style={[styles.scaleNotePlayingIndicator, { color: currentTheme.surface }]}>
                                    🔊
                                  </Text>
                                )}
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      );
                    })}
                    {/* C6の行（Cのみ） */}
                    {scaleNotesByOctave[6] && scaleNotesByOctave[6].length > 0 && (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.scaleNotesRowScroll}
                        contentContainerStyle={styles.scaleNotesRow}
                      >
                        {scaleNotesByOctave[6].map((scaleNote, index) => {
                          const noteKey = `${scaleNote.note}${scaleNote.octave}`;
                          const isPlaying = playingScaleNote === noteKey;
                          return (
                            <TouchableOpacity
                              key={index}
                              style={[
                                styles.scaleNoteButton,
                                { 
                                  backgroundColor: isPlaying ? '#4CAF50' : currentTheme.primary,
                                  borderColor: isPlaying ? '#4CAF50' : currentTheme.primary,
                                }
                              ]}
                              onPress={() => {
                                if (isPlaying) {
                                  stopScaleNote();
                                } else {
                                  playScaleNote(scaleNote.frequency, noteKey);
                                }
                              }}
                            >
                              <Text style={[styles.scaleNoteButtonText, { color: currentTheme.surface }]}>
                                {noteDisplayMode === 'ja' ? scaleNote.displayName : `${scaleNote.note}${scaleNote.octave}`}
                              </Text>
                              {isPlaying && (
                                <Text style={[styles.scaleNotePlayingIndicator, { color: currentTheme.surface }]}>
                                  🔊
                                </Text>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    )}
                  </View>
                  
                  {/* 停止ボタン（下部固定、常に表示） */}
                  <TouchableOpacity
                    style={[
                      styles.stopButton,
                      { 
                        backgroundColor: playingScaleNote ? '#FF4444' : currentTheme.secondary,
                        borderColor: playingScaleNote ? '#FF4444' : currentTheme.secondary,
                        opacity: playingScaleNote ? 1 : 0.5
                      }
                    ]}
                    onPress={stopScaleNote}
                    disabled={!playingScaleNote}
                  >
                    <Text style={[styles.stopButtonText, { color: playingScaleNote ? '#FFFFFF' : currentTheme.textSecondary }]}>
                      停止 {playingScaleNote ? (() => {
                        // scaleNotesByOctaveから該当する音を検索
                        for (let octave = 3; octave <= 6; octave++) {
                          const notes = scaleNotesByOctave[octave] || [];
                          const found = notes.find(n => `${n.note}${n.octave}` === playingScaleNote);
                          if (found) return `(${found.displayName})`;
                        }
                        return '';
                      })() : ''}
                    </Text>
                  </TouchableOpacity>
                </View>
                
                {/* 移調楽器について */}
                {'transposingInfo' in INSTRUMENT_TUNINGS[selectedInstrument] && (INSTRUMENT_TUNINGS[selectedInstrument] as any).transposingInfo && (
                  <View style={[styles.transposingInfoContent, { backgroundColor: currentTheme.surface, borderWidth: 1, borderColor: currentTheme.secondary }]}>
                    <Text style={[styles.transposingInfoTitle, { color: currentTheme.text }]}>
                      移調楽器について
                    </Text>
                    <Text style={[styles.transposingInfoDescription, { color: currentTheme.text }]}>
                      {(INSTRUMENT_TUNINGS[selectedInstrument] as any).transposingInfo.description}
                    </Text>
                  </View>
                )}
              </View>
            </>
          ) : (
            <Metronome audioContextRef={audioContextRef} ownerName={OWNER_NAME} />
          )}
        </View>

        {/* A4基準周波数設定（チューナーモードのみ表示） */}
        {mode === 'tuner' && (
          <View style={[styles.settingsPanel, { backgroundColor: currentTheme.surface, borderColor: currentTheme.secondary, borderWidth: 1 }]}>
            <Text style={[styles.settingsTitle, { color: currentTheme.text }]}>
              チューニングの基準周波数
            </Text>
            <Text style={[styles.settingDescription, { color: currentTheme.textSecondary }]}>
              チューニングの基準となるA4の周波数を設定します（標準は440Hz）
            </Text>
            <View style={styles.frequencyAdjuster}>
              <TouchableOpacity
                style={[styles.frequencyButton, { backgroundColor: currentTheme.secondary }]}
                onPress={() => {
                  const newFreq = Math.max(440, a4Frequency - 1);
                  setA4Frequency(newFreq);
                  saveA4Frequency(newFreq);
                }}
              >
                <Text style={[styles.frequencyButtonText, { color: currentTheme.text }]}>-</Text>
              </TouchableOpacity>
              <View style={[styles.frequencyDisplay, { backgroundColor: currentTheme.background, borderColor: currentTheme.secondary }]}>
                <Text style={[styles.frequencyValue, { color: currentTheme.primary, marginBottom: 0 }]}>{a4Frequency} Hz</Text>
              </View>
              <TouchableOpacity
                style={[styles.frequencyButton, { backgroundColor: currentTheme.secondary }]}
                onPress={() => {
                  const newFreq = Math.min(450, a4Frequency + 1);
                  setA4Frequency(newFreq);
                  saveA4Frequency(newFreq);
                }}
              >
                <Text style={[styles.frequencyButtonText, { color: currentTheme.text }]}>+</Text>
              </TouchableOpacity>
            </View>

            {/* 基準音の微調整（再生環境差の補正） */}
            <View style={{ marginTop: 14 }}>
              <Text style={[styles.settingsTitle, { color: currentTheme.text, fontSize: 14 }]}>
                基準音の微調整（セント）
              </Text>
              <Text style={[styles.settingDescription, { color: currentTheme.textSecondary }]}>
                端末のスピーカー等で「少しズレる」と感じる場合に、基準音/音階の再生だけを微調整できます（-50〜+50）
              </Text>
              <View style={styles.frequencyAdjuster}>
                <TouchableOpacity
                  style={[styles.frequencyButton, { backgroundColor: currentTheme.secondary }]}
                  onPress={() => saveReferenceToneCentsOffset(referenceToneCentsOffset - 1)}
                >
                  <Text style={[styles.frequencyButtonText, { color: currentTheme.text }]}>-</Text>
                </TouchableOpacity>
                <View style={[styles.frequencyDisplay, { backgroundColor: currentTheme.background, borderColor: currentTheme.secondary }]}>
                  <Text style={[styles.frequencyValue, { color: currentTheme.primary, marginBottom: 0 }]}>
                    {referenceToneCentsOffset > 0 ? '+' : ''}{referenceToneCentsOffset} cent
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.frequencyButton, { backgroundColor: currentTheme.secondary }]}
                  onPress={() => saveReferenceToneCentsOffset(referenceToneCentsOffset + 1)}
                >
                  <Text style={[styles.frequencyButtonText, { color: currentTheme.text }]}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* タブバー上に広告バナー（フリープランのみ） */}
      <BottomBannerAd />

    </SafeAreaView>
  );
}
