import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  Animated,
  Platform,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Music, Zap, Play, Pause } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import InstrumentHeader from '@/components/InstrumentHeader';
import { DEFAULT_A4_FREQUENCY } from '@/lib/tunerUtils';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';

const { width } = Dimensions.get('window');

// プロ仕様の音名と周波数対応
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_NAMES_JA = ['ド', 'ド#', 'レ', 'レ#', 'ミ', 'ファ', 'ファ#', 'ソ', 'ソ#', 'ラ', 'ラ#', 'シ'];

// プロ仕様の周波数検出精度設定
const TUNING_PRECISION = {
  EXCELLENT: 5,   // ±5セント以内: プロレベル
  GOOD: 10,       // ±10セント以内: 良い
  ACCEPTABLE: 15, // ±15セント以内: 許容範囲
  POOR: 25,       // ±25セント以内: 調整必要
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
      { note: 'A4', frequency: 440.00, string: '基準音' },
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
      { note: 'B♭1', frequency: 58.27, string: '基準音' },
      { note: 'F2', frequency: 87.31, string: 'F音' },
      { note: 'B♭2', frequency: 116.54, string: 'B♭音' },
      { note: 'D3', frequency: 146.83, string: 'D音' }
    ]
  },
  trumpet: {
    name: 'トランペット',
    strings: ['B♭2'],
    frequencies: [116.54],
    tolerance: TUNING_PRECISION.EXCELLENT,
    description: 'バルブ操作で音程を調整する金管楽器。唇の振動とバルブで音程を制御します。',
    tuning: ['B♭2: 116.54Hz基準', 'バルブ調整', '唇の振動制御'],
    openStrings: [
      { note: 'B♭2', frequency: 116.54, string: '基準音' },
      { note: 'C3', frequency: 130.81, string: 'C音' },
      { note: 'E♭3', frequency: 155.56, string: 'E♭音' },
      { note: 'F3', frequency: 174.61, string: 'F音' }
    ]
  },
  horn: {
    name: 'フレンチホルン',
    strings: ['F2'],
    frequencies: [87.31],
    tolerance: TUNING_PRECISION.EXCELLENT,
    description: 'バルブ操作で音程を調整する金管楽器。手をベルに入れて音色を調整します。',
    tuning: ['F2: 87.31Hz基準', 'バルブ調整', '手の位置調整'],
    openStrings: [
      { note: 'F2', frequency: 87.31, string: '基準音' },
      { note: 'B♭2', frequency: 116.54, string: 'B♭音' },
      { note: 'C3', frequency: 130.81, string: 'C音' },
      { note: 'E♭3', frequency: 155.56, string: 'E♭音' }
    ]
  },
  tuba: {
    name: 'チューバ',
    strings: ['B♭0'],
    frequencies: [29.14],
    tolerance: TUNING_PRECISION.GOOD,
    description: '金管楽器の中で最も低い音域を持つ楽器。バルブ操作で音程を調整します。',
    tuning: ['B♭0: 29.14Hz基準', 'バルブ調整', '唇の振動制御'],
    openStrings: [
      { note: 'B♭0', frequency: 29.14, string: '基準音' },
      { note: 'E♭1', frequency: 38.89, string: 'E♭音' },
      { note: 'F1', frequency: 43.65, string: 'F音' },
      { note: 'B♭1', frequency: 58.27, string: 'B♭音' }
    ]
  }
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
  
  const noteName = match[1]; // E, C# など
  const octave = match[2]; // 4, 3 など
  
  // 音名を日本語に変換
  const noteIndex = NOTE_NAMES.indexOf(noteName);
  if (noteIndex === -1) {
    return noteString; // 見つからない場合はそのまま返す
  }
  
  const noteJa = NOTE_NAMES_JA[noteIndex];
  return `${noteJa}${octave}`;
};

// プロ仕様の周波数から音名を取得（高精度）
const getNoteFromFrequency = (frequency: number, a4Freq: number = 440): { 
  note: string; 
  noteJa: string;
  octave: number; 
  cents: number; 
  isInTune: boolean;
  tuningQuality: 'excellent' | 'good' | 'acceptable' | 'poor';
  frequency: number;
} => {
  if (frequency <= 0) return { 
    note: '--', 
    noteJa: '--',
    octave: 0, 
    cents: 0, 
    isInTune: false,
    tuningQuality: 'poor',
    frequency: 0
  };
  
  const a4NoteNumber = 69; // MIDI note number for A4
  const noteNumber = 12 * Math.log2(frequency / a4Freq) + a4NoteNumber;
  const octave = Math.floor(noteNumber / 12) - 1;
  const noteIndex = Math.round(noteNumber) % 12;
  const adjustedNoteIndex = noteIndex < 0 ? noteIndex + 12 : noteIndex;
  
  const note = NOTE_NAMES[adjustedNoteIndex];
  const noteJa = NOTE_NAMES_JA[adjustedNoteIndex];
  
  const cents = (noteNumber - Math.round(noteNumber)) * 100;
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
    frequency
  };
};


export default function TunerScreen() {
  const { currentTheme, selectedInstrument: contextSelectedInstrument } = useInstrumentTheme();
  const [mode, setMode] = useState<'tuner' | 'metronome'>('tuner');
  
  // プロ仕様チューナー関連の状態
  const [isListening, setIsListening] = useState(false);
  const [currentFrequency, setCurrentFrequency] = useState<number>(0);
  const [currentNote, setCurrentNote] = useState<string>('--');
  const [currentNoteJa, setCurrentNoteJa] = useState<string>('--');
  const [currentOctave, setCurrentOctave] = useState<number>(0);
  const [currentCents, setCurrentCents] = useState<number>(0);
  const [isInTune, setIsInTune] = useState<boolean>(false);
  const [tuningQuality, setTuningQuality] = useState<'excellent' | 'good' | 'acceptable' | 'poor'>('poor');
  const [a4Frequency, setA4Frequency] = useState<number>(DEFAULT_A4_FREQUENCY);
  const [indicatorColor, setIndicatorColor] = useState<string>('#9E9E9E');
  const [lastColorState, setLastColorState] = useState<'gray' | 'green' | 'yellow' | 'red'>('gray');
  
  // プロ仕様設定
  // データベースの楽器IDとチューナー楽器キーのマッピング
  const instrumentIdToTunerKey: Record<string, keyof typeof INSTRUMENT_TUNINGS> = {
    '550e8400-e29b-41d4-a716-446655440001': 'piano',     // ピアノ
    '550e8400-e29b-41d4-a716-446655440002': 'guitar',    // ギター
    '550e8400-e29b-41d4-a716-446655440005': 'trumpet',   // トランペット
    '550e8400-e29b-41d4-a716-446655440010': 'trombone',  // トロンボーン
    '550e8400-e29b-41d4-a716-446655440003': 'violin',    // バイオリン
    '550e8400-e29b-41d4-a716-446655440018': 'viola',     // ヴィオラ
    '550e8400-e29b-41d4-a716-446655440011': 'cello',     // チェロ
    '550e8400-e29b-41d4-a716-446655440015': 'bass',      // コントラバス（ベース）
    '550e8400-e29b-41d4-a716-446655440008': 'horn',      // ホルン
    // チューバは楽器選択画面にないため、ホルンをフォールバックとして使用
    '550e8400-e29b-41d4-a716-446655440013': 'guitar',    // オーボエ（フォールバック）
    '550e8400-e29b-41d4-a716-446655440004': 'guitar',    // フルート（フォールバック）
    '550e8400-e29b-41d4-a716-446655440007': 'guitar',    // サックス（フォールバック）
    '550e8400-e29b-41d4-a716-446655440009': 'guitar',    // クラリネット（フォールバック）
    '550e8400-e29b-41d4-a716-446655440006': 'guitar',    // 打楽器（フォールバック）
    '550e8400-e29b-41d4-a716-446655440012': 'guitar',    // ファゴット（フォールバック）
    '550e8400-e29b-41d4-a716-446655440014': 'guitar',    // ハープ（フォールバック）
    '550e8400-e29b-41d4-a716-446655440020': 'piano',     // シンセサイザー（ピアノとして）
    '550e8400-e29b-41d4-a716-446655440021': 'guitar',    // 太鼓（フォールバック）
    '550e8400-e29b-41d4-a716-446655440019': 'guitar',    // 琴（フォールバック）
    '550e8400-e29b-41d4-a716-446655440016': 'guitar'     // その他（フォールバック）
  };
  
  const selectedInstrument = instrumentIdToTunerKey[contextSelectedInstrument || ''] || 'guitar';
  
  // 音名表示モード（CDEかドレミか）
  const [noteDisplayMode, setNoteDisplayMode] = useState<'en' | 'ja'>('en');
  const NOTE_DISPLAY_MODE_KEY = '@tuner_note_display_mode';
  
  // 開放弦の音の連続再生用の状態
  const [playingOpenString, setPlayingOpenString] = useState<string | null>(null);
  const openStringOscillatorRef = useRef<OscillatorNode | null>(null);
  const openStringGainNodeRef = useRef<GainNode | null>(null);

  // メトロノーム関連の状態
  const [isMetronomePlaying, setIsMetronomePlaying] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [metronomeVolume, setMetronomeVolume] = useState(0.7);
  const [selectedTimeSignature, setSelectedTimeSignature] = useState({
    id: '4/4',
    name: '4/4拍子',
    beats: 4,
    noteValue: 4,
    display: '4/4'
  });
  const [metronomeSoundType, setMetronomeSoundType] = useState<'click' | 'beep' | 'bell' | 'chime'>('click');

  // アニメーション用の値
  const noteAnimation = useRef(new Animated.Value(1)).current;
  const tuningBarAnimation = useRef(new Animated.Value(0)).current;

  // Web Audio API 用参照
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const lastAnalysisTimeRef = useRef<number>(0);
  const timeDomainBufferRef = useRef<Float32Array | null>(null) as React.MutableRefObject<Float32Array | null>;

  // メトロノーム用のref
  const metronomeIntervalRef = useRef<number | null>(null);

  // 平滑化処理用
  const smoothedFrequencyRef = useRef<number>(0);
  const smoothedCentsRef = useRef<number>(0);
  const smoothing = 0.4; // より反応性の高い平滑化係数
  const responseSpeed = 0.7; // より速い応答速度
  const maxCentsChangePerFrame = 6; // より安定した最大セント変化量

  // 拍子の選択肢
  const timeSignatures = [
    { id: '2/4', name: '2/4拍子', beats: 2, noteValue: 4, display: '2/4' },
    { id: '3/4', name: '3/4拍子', beats: 3, noteValue: 4, display: '3/4' },
    { id: '4/4', name: '4/4拍子', beats: 4, noteValue: 4, display: '4/4' },
    { id: '2/2', name: '2/2拍子', beats: 2, noteValue: 2, display: '2/2' },
    { id: '5/4', name: '5/4拍子', beats: 5, noteValue: 4, display: '5/4' },
    { id: '6/8', name: '6/8拍子', beats: 6, noteValue: 8, display: '6/8' },
    { id: '9/8', name: '9/8拍子', beats: 3, noteValue: 8, display: '9/8' },
    { id: '12/8', name: '12/8拍子', beats: 4, noteValue: 8, display: '12/8' },
  ];

  // 音名表示モードをAsyncStorageから読み込む
  useEffect(() => {
    const loadNoteDisplayMode = async () => {
      try {
        const savedMode = await AsyncStorage.getItem(NOTE_DISPLAY_MODE_KEY);
        if (savedMode === 'en' || savedMode === 'ja') {
          setNoteDisplayMode(savedMode);
        }
      } catch (error) {
        ErrorHandler.handle(error, '音名表示モードの読み込み', false);
      }
    };
    loadNoteDisplayMode();
  }, []);

  // 音名表示モードを保存する
  const saveNoteDisplayMode = async (mode: 'en' | 'ja') => {
    try {
      await AsyncStorage.setItem(NOTE_DISPLAY_MODE_KEY, mode);
      setNoteDisplayMode(mode);
    } catch (error) {
      ErrorHandler.handle(error, '音名表示モードの保存', false);
    }
  };

  // コンポーネントの初期化
  useEffect(() => {
    return () => {
      // クリーンアップ
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      if (metronomeIntervalRef.current) {
        clearInterval(metronomeIntervalRef.current);
      }
    };
  }, []);

  // チューナー開始（Web）
  const startListening = async () => {
    try {
      if (Platform.OS !== 'web') {
        Alert.alert('未対応', 'チューナーはWebでのみ動作します。');
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        Alert.alert('未対応', 'このブラウザはマイク取得に未対応です。');
        return;
      }

      // HTTPS環境でない場合は警告
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        Alert.alert('警告', 'チューナーはHTTPS環境でのみ動作します。');
        return;
      }

      // 既存のリソースをクリーンアップ
      await stopListening();

      // 初期化処理
      smoothedFrequencyRef.current = 0;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // AudioContextの再利用または新規作成
      let audioCtx = audioContextRef.current;
      if (!audioCtx || audioCtx.state === 'closed') {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 4096; // より高い周波数分解能
      analyser.smoothingTimeConstant = 0.8; // スムージング係数
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;
      mediaStreamRef.current = stream;
      timeDomainBufferRef.current = new Float32Array(analyser.fftSize) as any;

      setIsListening(true);

      // iOS/Safari用: AudioContextを再開
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      const update = () => {
        if (!analyserRef.current || !timeDomainBufferRef.current || !audioContextRef.current) return;

        // 解析頻度を約30fpsに調整
        const now = performance.now();
        if (now - lastAnalysisTimeRef.current < 33) {
          rafIdRef.current = requestAnimationFrame(update);
          return;
        }
        lastAnalysisTimeRef.current = now;

        analyserRef.current.getFloatTimeDomainData(timeDomainBufferRef.current as any);
        // 型エラー回避のため、新しいFloat32Arrayを作成
        const bufferCopy = new Float32Array(timeDomainBufferRef.current!.length);
        bufferCopy.set(timeDomainBufferRef.current!);
        const rawFreq = autoCorrelate(bufferCopy, audioContextRef.current.sampleRate);

        if (rawFreq > 0) {
          // プロ仕様の平滑化処理
          const smoothedFreq = smoothValue(smoothedFrequencyRef.current, rawFreq, smoothing, rawFreq * 0.03);
          smoothedFrequencyRef.current = smoothedFreq;
          setCurrentFrequency(smoothedFreq);
          
          const noteInfo = getNoteFromFrequency(smoothedFreq, a4Frequency);
          setCurrentNote(noteInfo.note);
          setCurrentNoteJa(noteInfo.noteJa);
          setCurrentOctave(noteInfo.octave);
          
          // セント値のスムージング
          const smoothedCents = smoothValue(smoothedCentsRef.current, noteInfo.cents, smoothing, maxCentsChangePerFrame);
          smoothedCentsRef.current = smoothedCents;
          setCurrentCents(smoothedCents);
          setIsInTune(noteInfo.isInTune);
          setTuningQuality(noteInfo.tuningQuality);

          // プロ仕様の色分け（4段階）
          const absCents = Math.abs(smoothedCents);
          let color = '#9E9E9E';
          let colorState: 'gray' | 'green' | 'yellow' | 'red' = 'gray';
          
          if (absCents <= TUNING_PRECISION.EXCELLENT) {
            color = '#00C853'; // プロレベル緑
            colorState = 'green';
          } else if (absCents <= TUNING_PRECISION.GOOD) {
            color = '#4CAF50'; // 良い緑
            colorState = 'green';
          } else if (absCents <= TUNING_PRECISION.ACCEPTABLE) {
            color = '#FF9800'; // 警告オレンジ
            colorState = 'yellow';
          } else {
            color = '#F44336'; // 調整必要赤
            colorState = 'red';
          }
          
          setIndicatorColor(color);
          setLastColorState(colorState);
          
          // チューニングバーアニメーション（-50から+50セントの範囲を0-100%に変換）
          const tuningPosition = Math.max(-50, Math.min(50, smoothedCents));
          
          Animated.timing(tuningBarAnimation, {
            toValue: tuningPosition,
            duration: 80,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }).start();

          // ノートアニメーションを無効化（枠を固定するため）
          // Animated.sequence([
          //   Animated.timing(noteAnimation, { toValue: 1.05, duration: 40, easing: Easing.cubic, useNativeDriver: false }),
          //   Animated.timing(noteAnimation, { toValue: 1, duration: 40, easing: Easing.cubic, useNativeDriver: false }),
          // ]).start();
        } else {
          // 無音時の処理
          setCurrentNote('--');
          setCurrentNoteJa('--');
          setCurrentFrequency(0);
          setCurrentCents(0);
          setIsInTune(false);
          setTuningQuality('poor');
          setIndicatorColor('#9E9E9E');
          setLastColorState('gray');
          smoothedFrequencyRef.current = 0;
          smoothedCentsRef.current = 0;
          
          // インジケーターを中央に戻す
          Animated.timing(tuningBarAnimation, {
            toValue: 0,
            duration: 200,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }).start();
        }
        rafIdRef.current = requestAnimationFrame(update);
      };

      rafIdRef.current = requestAnimationFrame(update);
    } catch (error) {
      ErrorHandler.handle(error, 'チューナー開始', true);
      Alert.alert('エラー', `マイクへのアクセスを許可してください。${error instanceof Error ? error.message : ''}`);
    }
  };

  // 停止
  const stopListening = async () => {
    try {
      // requestAnimationFrameの確実なキャンセル
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      
      // 既存のアニメーションを停止
      if (tuningBarAnimation) {
        tuningBarAnimation.stopAnimation();
      }
      if (noteAnimation) {
        noteAnimation.stopAnimation();
      }
      
      // AnalyserNodeの切断
      if (analyserRef.current) {
        analyserRef.current.disconnect();
        analyserRef.current = null;
      }
      
      // MediaStreamの停止
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => {
          track.stop();
          track.enabled = false;
        });
        mediaStreamRef.current = null;
      }
      
      // AudioContextの適切なクリーンアップ（閉じずに状態をリセット）
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        // 全ての接続を切断
        audioContextRef.current.suspend();
        // コンテキストは再利用のため閉じない
      }
      
      // バッファのクリア
      timeDomainBufferRef.current = new Float32Array(0);
      
    } catch (error) {
      ErrorHandler.handle(error, 'Stop listening cleanup', false);
    }

    setIsListening(false);
    setCurrentFrequency(0);
    setCurrentNote('--');
    setCurrentNoteJa('--');
    setCurrentOctave(0);
    setCurrentCents(0);
    setIsInTune(false);
    setTuningQuality('poor');
    setIndicatorColor('#9E9E9E');
    setLastColorState('gray');
    
    // インジケーターを中央に戻す
    Animated.timing(tuningBarAnimation, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

  };

  // 改良された自己相関法でピッチ検出
  const autoCorrelate = (buffer: Float32Array | ArrayLike<number> | any, sampleRate: number): number => {
    const floatBuffer = buffer instanceof Float32Array ? buffer : new Float32Array(buffer);
    let SIZE = floatBuffer.length;
    
    // 前処理: ハン窓を適用してエッジ効果を軽減
    const windowedBuffer = new Float32Array(SIZE);
    for (let i = 0; i < SIZE; i++) {
      const window = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (SIZE - 1));
      windowedBuffer[i] = floatBuffer[i] * window;
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
    let r1 = 0, r2 = SIZE - 1;
    for (let i = 0; i < SIZE / 2; i++) if (Math.abs(windowedBuffer[i]) < thres) { r1 = i; break; }
    for (let i = 1; i < SIZE / 2; i++) if (Math.abs(windowedBuffer[SIZE - i]) < thres) { r2 = SIZE - i; break; }
    const trimmedBuffer = windowedBuffer.slice(r1, r2);
    SIZE = trimmedBuffer.length;

    if (SIZE < 100) return -1; // バッファが小さすぎる場合

    const c = new Array<number>(SIZE).fill(0);
    const step = 1; // より細かいステップで精度向上
    
    // 正規化自己相関計算
    for (let i = 0; i < SIZE; i += step) {
      let sum = 0;
      let norm1 = 0, norm2 = 0;
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
    
    let maxval = -1, maxpos = -1;
    
    // 周波数範囲制限（より厳密）
    const minPeriod = Math.floor(sampleRate / 4000); // 最高周波数4000Hz
    const maxPeriod = Math.floor(sampleRate / 80);   // 最低周波数80Hz
    
    for (let i = Math.max(d, minPeriod); i < Math.min(SIZE, maxPeriod); i += step) { 
      if (c[i] > maxval) { 
        maxval = c[i]; 
        maxpos = i; 
      } 
    }
    
    if (maxpos === -1 || maxval < 0.4) return -1; // より厳密な閾値チェック
    
    let T0 = maxpos;
    
    // パラボラ補間による精度向上
    if (T0 > 0 && T0 < SIZE - 1) {
      const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
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

  // 改良された平滑化処理（EMA + 適応的フィルタリング）
  const smoothValue = (currentValue: number, targetValue: number, alpha: number, maxChange: number): number => {
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

  // メトロノームの開始
  const startMetronome = (resetBeatCount = true) => {
    // 既存のインターバルをクリア
    if (metronomeIntervalRef.current) {
      clearInterval(metronomeIntervalRef.current);
      metronomeIntervalRef.current = null;
    }
    
    setIsMetronomePlaying(true);
    setCurrentBeat(0);
    
    const interval = (60 / bpm) * 1000;
    let beatCount = resetBeatCount ? 0 : 0; // 常に0から開始
    
    // 最初のビートを即座に設定して音を再生
    setCurrentBeat(0);
    playMetronomeClick(true); // 強拍音
    
    metronomeIntervalRef.current = setInterval(() => {
      beatCount++;
      const currentBeatIndex = beatCount % selectedTimeSignature.beats;
      setCurrentBeat(currentBeatIndex);
      playMetronomeClick(currentBeatIndex === 0); // 強拍は1拍目のみ
    }, interval);
  };

  // メトロノームの停止
  const stopMetronome = () => {
    setIsMetronomePlaying(false);
    setCurrentBeat(0);
    if (metronomeIntervalRef.current) {
      clearInterval(metronomeIntervalRef.current);
      metronomeIntervalRef.current = null;
    }
  };

  // 開放弦の音を連続再生する関数
  const playOpenString = async (frequency: number, note: string) => {
    try {
      // Webプラットフォームでない場合は警告
      if (Platform.OS !== 'web') {
        Alert.alert('未対応', '開放弦の音はWebでのみ再生できます。');
        return;
      }

      // AudioContextが存在しない場合は作成
      let audioCtx = audioContextRef.current;
      if (!audioCtx || audioCtx.state === 'closed') {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioCtx;
      }

      // AudioContextが停止している場合は再開
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      
      // 既に再生中の場合は停止してから新しい音を再生
      stopOpenString();
      
      // 少し待ってから新しい音を再生（クリーンアップのため）
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      // 参照を保存
      openStringOscillatorRef.current = oscillator;
      openStringGainNodeRef.current = gainNode;
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
      oscillator.type = 'sine';
      
      // フェードインしてから連続再生
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.1);
      
      oscillator.start(audioCtx.currentTime);
      setPlayingOpenString(note);
      
      logger.debug(`Playing open string continuously: ${note} at ${frequency}Hz`);
    } catch (error) {
      ErrorHandler.handle(error, '開放弦の音再生', true);
      Alert.alert('エラー', '音の再生に失敗しました。');
    }
  };

  // 開放弦の音を停止する関数
  const stopOpenString = () => {
    try {
      if (openStringOscillatorRef.current && openStringGainNodeRef.current && audioContextRef.current) {
        const audioCtx = audioContextRef.current;
        
        // フェードアウトしてから停止
        try {
          openStringGainNodeRef.current.gain.cancelScheduledValues(audioCtx.currentTime);
          openStringGainNodeRef.current.gain.setValueAtTime(openStringGainNodeRef.current.gain.value, audioCtx.currentTime);
          openStringGainNodeRef.current.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        } catch (e) {
          logger.warn('Gain node fadeout error:', e);
        }
        
        setTimeout(() => {
          try {
            if (openStringOscillatorRef.current) {
              openStringOscillatorRef.current.stop();
              openStringOscillatorRef.current.disconnect();
              openStringOscillatorRef.current = null;
            }
            if (openStringGainNodeRef.current) {
              openStringGainNodeRef.current.disconnect();
              openStringGainNodeRef.current = null;
            }
          } catch (e) {
            logger.warn('Oscillator cleanup error:', e);
          }
        }, 150);
      }
      
      setPlayingOpenString(null);
      logger.debug('Stopped open string');
    } catch (error) {
      ErrorHandler.handle(error, '開放弦の音停止', false);
      setPlayingOpenString(null);
    }
  };

  // コンポーネントがアンマウントされる際に音を停止
  useEffect(() => {
    return () => {
      stopOpenString();
    };
  }, []);


  // メトロノームのクリック音を再生
  const playMetronomeClick = (isStrongBeat: boolean) => {
    if (!audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    const currentTime = ctx.currentTime;
    
    switch (metronomeSoundType) {
      case 'click':
        // デフォルトのクリック音
        {
          const oscillator = ctx.createOscillator();
          const gainNode = ctx.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(ctx.destination);
          
          if (isStrongBeat) {
            oscillator.frequency.setValueAtTime(800, currentTime);
            oscillator.type = 'sine';
          } else {
            oscillator.frequency.setValueAtTime(600, currentTime);
            oscillator.type = 'triangle';
          }
          
          gainNode.gain.setValueAtTime(metronomeVolume * 0.3, currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.1);
          
          oscillator.start(currentTime);
          oscillator.stop(currentTime + 0.1);
        }
        break;
        
      case 'beep':
        // ビープ音
        {
          const oscillator = ctx.createOscillator();
          const gainNode = ctx.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(ctx.destination);
          
          oscillator.type = 'sine';
          if (isStrongBeat) {
            oscillator.frequency.setValueAtTime(1000, currentTime);
          } else {
            oscillator.frequency.setValueAtTime(800, currentTime);
          }
          
          gainNode.gain.setValueAtTime(metronomeVolume * 0.4, currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.15);
          
          oscillator.start(currentTime);
          oscillator.stop(currentTime + 0.15);
        }
        break;
        
      case 'bell':
        // ベル音（複数のオシレーターで倍音を生成）
        {
          const baseFreq = isStrongBeat ? 880 : 660;
          const oscillators: OscillatorNode[] = [];
          const gainNodes: GainNode[] = [];
          
          // 基本音と倍音を生成
          for (let i = 0; i < 3; i++) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(baseFreq * (i + 1), currentTime);
            
            const volume = metronomeVolume * (isStrongBeat ? 0.3 : 0.2) / (i + 1);
            gain.gain.setValueAtTime(volume, currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.3);
            
            osc.start(currentTime);
            osc.stop(currentTime + 0.3);
            
            oscillators.push(osc);
            gainNodes.push(gain);
          }
        }
        break;
        
      case 'chime':
        // チム音（上昇する周波数）
        {
          const oscillator = ctx.createOscillator();
          const gainNode = ctx.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(ctx.destination);
          
          oscillator.type = 'sine';
          const startFreq = isStrongBeat ? 600 : 500;
          const endFreq = isStrongBeat ? 1000 : 800;
          
          oscillator.frequency.setValueAtTime(startFreq, currentTime);
          oscillator.frequency.linearRampToValueAtTime(endFreq, currentTime + 0.1);
          
          gainNode.gain.setValueAtTime(metronomeVolume * 0.35, currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.2);
          
          oscillator.start(currentTime);
          oscillator.stop(currentTime + 0.2);
        }
        break;
    }
  };

  // プロ仕様のチューニング品質判定関数
  const getQualityColor = (quality: 'excellent' | 'good' | 'acceptable' | 'poor'): string => {
    switch (quality) {
      case 'excellent': return '#00C853'; // プロレベル緑
      case 'good': return '#4CAF50'; // 良い緑
      case 'acceptable': return '#FF9800'; // 警告オレンジ
      case 'poor': return '#F44336'; // 調整必要赤
      default: return '#9E9E9E';
    }
  };

  const getQualityText = (quality: 'excellent' | 'good' | 'acceptable' | 'poor'): string => {
    switch (quality) {
      case 'excellent': return 'プロレベル';
      case 'good': return '良い';
      case 'acceptable': return '許容範囲';
      case 'poor': return '調整必要';
      default: return '--';
    }
  };

  // BPMの変更
  const changeBpm = (delta: number) => {
    const wasPlaying = isMetronomePlaying; // 現在の再生状態を保存
    const newBpm = Math.max(30, Math.min(300, bpm + delta));
    
    // メトロノームが再生中だった場合は完全に停止してから再開
    if (wasPlaying) {
      stopMetronome();
      setBpm(newBpm);
      setTimeout(() => {
        startMetronome(true); // ビートカウントを完全にリセット
      }, 50);
    } else {
      setBpm(newBpm);
    }
  };


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
              チューナー
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
              メトロノーム
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
                          backgroundColor: noteDisplayMode === 'en' ? currentTheme.primary : currentTheme.secondary,
                          borderColor: currentTheme.primary,
                        }
                      ]}
                      onPress={() => saveNoteDisplayMode('en')}
                    >
                      <Text style={[
                        styles.noteDisplayModeButtonText,
                        { color: noteDisplayMode === 'en' ? currentTheme.surface : currentTheme.text }
                      ]}>
                        CDE
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.noteDisplayModeButton,
                        {
                          backgroundColor: noteDisplayMode === 'ja' ? currentTheme.primary : currentTheme.secondary,
                          borderColor: currentTheme.primary,
                        }
                      ]}
                      onPress={() => saveNoteDisplayMode('ja')}
                    >
                      <Text style={[
                        styles.noteDisplayModeButtonText,
                        { color: noteDisplayMode === 'ja' ? currentTheme.surface : currentTheme.text }
                      ]}>
                        ドレミ
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 開放弦の音を聞く */}
                <View style={styles.openStringContent}>
                  <Text style={[styles.openStringTitle, { color: currentTheme.text }]}>
                    開放弦の音を聞く
                  </Text>
                  
                  {/* 停止ボタン（固定表示） */}
                  {playingOpenString && (
                    <TouchableOpacity
                      style={[
                        styles.stopButton,
                        { backgroundColor: '#FF4444', borderColor: '#FF4444' }
                      ]}
                      onPress={stopOpenString}
                    >
                      <Text style={[styles.stopButtonText, { color: '#FFFFFF' }]}>
                        停止 ({playingOpenString ? convertNoteName(playingOpenString, noteDisplayMode) : ''})
                      </Text>
                    </TouchableOpacity>
                  )}
                  
                  <View style={styles.openStringButtons}>
                    {INSTRUMENT_TUNINGS[selectedInstrument].openStrings.slice(0, 4).map((openString, index) => {
                      const isPlaying = playingOpenString === openString.note;
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
                              playOpenString(openString.frequency, openString.note);
                            }
                          }}
                        >
                          <Text style={[styles.openStringButtonText, { color: currentTheme.surface }]}>
                            {convertNoteName(openString.note, noteDisplayMode)}
                          </Text>
                          <Text style={[styles.openStringFrequency, { color: currentTheme.surface }]}>
                            {openString.frequency.toFixed(1)}Hz
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
                </View>
              </View>
            </>
          ) : (
            <>
              {/* 拍子表示 */}
              <View style={styles.timeSignatureContainer}>
                <Text style={[styles.timeSignatureLabel, { color: currentTheme.textSecondary }]}>
                  拍子
                </Text>
                <Text style={[styles.timeSignatureDisplay, { color: currentTheme.text }]}>
                  {selectedTimeSignature.display}
                </Text>
              </View>

              {/* BPM表示 */}
              <View style={styles.bpmContainer}>
                <Text style={[styles.bpmLabel, { color: currentTheme.textSecondary }]}>
                  BPM
                </Text>
                <Text style={[styles.bpmValue, { color: currentTheme.primary }]}>
                  {bpm}
                </Text>
              </View>

              {/* ビート表示 */}
              <View style={styles.beatIndicators}>
                {Array.from({ length: selectedTimeSignature.beats }).map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.beatIndicator,
                      {
                        backgroundColor: currentBeat === index 
                          ? currentTheme.primary 
                          : currentTheme.secondary,
                        opacity: currentBeat === index ? 1 : 0.3,
                      }
                    ]}
                  />
                ))}
              </View>

              {/* メトロノーム開始ボタン */}
              <TouchableOpacity
                style={[styles.metronomeStartButton, { backgroundColor: isMetronomePlaying ? currentTheme.secondary : currentTheme.primary }]}
                onPress={isMetronomePlaying ? stopMetronome : () => startMetronome(true)}
                activeOpacity={0.8}
              >
                {isMetronomePlaying ? (
                  <Pause size={24} color="#FFFFFF" />
                ) : (
                  <Play size={24} color="#FFFFFF" />
                )}
                <Text style={styles.metronomeStartButtonText}>{isMetronomePlaying ? '停止' : '開始'}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* 設定エリア */}
        {mode === 'metronome' && (
          <View style={[styles.settingsContainer, { backgroundColor: currentTheme.surface }]}>
            {/* BPM調整 */}
            <View style={styles.bpmAdjustContainer}>
              <Text style={[styles.settingLabel, { color: currentTheme.textSecondary }]}>
                BPM調整
              </Text>
              <View style={styles.bpmAdjustControls}>
                <TouchableOpacity
                  style={[styles.bpmAdjustButton, { backgroundColor: currentTheme.secondary }]}
                  onPress={() => changeBpm(-10)}
                >
                  <Text style={[styles.bpmAdjustButtonText, { color: currentTheme.primary }]}>
                    -10
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.bpmAdjustButton, { backgroundColor: currentTheme.secondary }]}
                  onPress={() => changeBpm(-1)}
                >
                  <Text style={[styles.bpmAdjustButtonText, { color: currentTheme.primary }]}>
                    -1
                  </Text>
                </TouchableOpacity>
                
                <Text style={[styles.bpmDisplay, { color: currentTheme.text }]}>
                  {bpm}
                </Text>
                
                <TouchableOpacity
                  style={[styles.bpmAdjustButton, { backgroundColor: currentTheme.secondary }]}
                  onPress={() => changeBpm(1)}
                >
                  <Text style={[styles.bpmAdjustButtonText, { color: currentTheme.primary }]}>
                    +1
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.bpmAdjustButton, { backgroundColor: currentTheme.secondary }]}
                  onPress={() => changeBpm(10)}
                >
                  <Text style={[styles.bpmAdjustButtonText, { color: currentTheme.primary }]}>
                    +10
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 拍子設定 */}
            <View style={styles.timeSignatureSettingContainer}>
              <Text style={[styles.settingLabel, { color: currentTheme.textSecondary }]}>
                拍子設定
              </Text>
              <View style={styles.timeSignatureSettingGrid}>
                {timeSignatures.map((timeSignature) => (
                  <TouchableOpacity
                    key={timeSignature.id}
                    style={[
                      styles.timeSignatureSettingButton,
                      {
                        backgroundColor: selectedTimeSignature.id === timeSignature.id
                          ? currentTheme.primary
                          : currentTheme.secondary,
                      }
                    ]}
                    onPress={() => {
                      const wasPlaying = isMetronomePlaying; // 現在の再生状態を保存
                      
                      // 拍子を先に変更
                      setSelectedTimeSignature(timeSignature);
                      
                      // メトロノームが再生中だった場合は再起動
                      if (wasPlaying) {
                        // インターバルをクリアして即座に再開
                        if (metronomeIntervalRef.current) {
                          clearInterval(metronomeIntervalRef.current);
                          metronomeIntervalRef.current = null;
                        }
                        
                        // 新しい拍子で即座に再開
                        setCurrentBeat(0);
                        playMetronomeClick(true); // 最初のビートを再生
                        
                        const interval = (60 / bpm) * 1000;
                        let beatCount = 0;
                        
                        metronomeIntervalRef.current = setInterval(() => {
                          beatCount++;
                          const currentBeatIndex = beatCount % timeSignature.beats;
                          setCurrentBeat(currentBeatIndex);
                          playMetronomeClick(currentBeatIndex === 0);
                        }, interval);
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.timeSignatureSettingButtonText,
                        {
                          color: selectedTimeSignature.id === timeSignature.id
                            ? currentTheme.surface
                            : currentTheme.text,
                        }
                      ]}
                    >
                      {timeSignature.display}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 音選択 */}
            <View style={styles.metronomeSoundSettingContainer}>
              <Text style={[styles.settingLabel, { color: currentTheme.textSecondary }]}>
                音選択
              </Text>
              <View style={styles.metronomeSoundSettingGrid}>
                {[
                  { id: 'click', name: 'クリック' },
                  { id: 'beep', name: 'ビープ' },
                  { id: 'bell', name: 'ベル' },
                  { id: 'chime', name: 'チム' },
                ].map((sound) => (
                  <TouchableOpacity
                    key={sound.id}
                    style={[
                      styles.metronomeSoundSettingButton,
                      {
                        backgroundColor: metronomeSoundType === sound.id
                          ? currentTheme.primary
                          : currentTheme.secondary,
                      }
                    ]}
                    onPress={() => setMetronomeSoundType(sound.id as 'click' | 'beep' | 'bell' | 'chime')}
                  >
                    <Text
                      style={[
                        styles.metronomeSoundSettingButtonText,
                        {
                          color: metronomeSoundType === sound.id
                            ? currentTheme.surface
                            : currentTheme.text,
                        }
                      ]}
                    >
                      {sound.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}
      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    flex: 1,
    paddingHorizontal: 1,
  },
  modeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 0,
    marginTop: 12,
    marginBottom: 2,
    marginHorizontal: 16,
    elevation: 4,
    overflow: 'hidden',
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    minHeight: 44,
    borderRadius: 12,
    gap: 6,
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 0,
  },
  mainDisplay: {
    width: '100%',
    borderRadius: 20,
    padding: 16,
    marginBottom: 4,
    alignItems: 'center',
    elevation: 8,
  },
  startButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 8,
    elevation: 4,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  tunerCard: {
    width: '100%',
    maxWidth: 480,
    height: 320,
    borderRadius: 16,
    borderWidth: 2,
    paddingVertical: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  noteDisplayContainer: {
    position: 'relative',
    width: 120,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  notePlaceholder: {
    position: 'absolute',
    fontSize: 72,
    fontWeight: '700',
  },
  noteName: {
    fontSize: 72,
    fontWeight: 'bold',
    position: 'absolute',
    color: '#2C3E50',
    textAlign: 'center',
    width: 120,
    height: 100,
    lineHeight: 100,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  frequencyValue: {
    fontSize: 18,
    marginBottom: 20,
    fontFamily: 'monospace',
    color: '#34495E',
    fontWeight: '600',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  // 新しいチューニングバースタイル
  tuningBarContainer: {
    width: '100%',
    height: 60, // 固定高さを設定
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
    justifyContent: 'center',
  },
  tuningBarTrack: {
    width: '95%',
    height: 20,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    position: 'relative',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
  },
  centerLine: {
    position: 'absolute',
    left: '50%',
    top: 0,
    width: 3,
    height: 20,
    backgroundColor: '#2C2C2C',
    marginLeft: -1.5,
    borderRadius: 1.5,
  },
  referenceLine: {
    position: 'absolute',
    top: 0,
    width: 2,
    height: 20,
    backgroundColor: '#666666',
    marginLeft: -1,
  },
  minorLine: {
    position: 'absolute',
    top: 5,
    width: 1,
    height: 10,
    backgroundColor: '#999999',
    marginLeft: -0.5,
  },
  tuningIndicator: {
    position: 'absolute',
    top: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: -4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    transform: [{ translateX: -4 }],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  tuningBarBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
  },
  centsLabels: {
    position: 'absolute',
    top: 25,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  centsDisplay: {
    fontSize: 16,
    color: '#333333',
    fontFamily: 'monospace',
    textAlign: 'center',
    fontWeight: '600',
    marginTop: 8,
  },
  // プロ仕様の品質表示スタイル
  qualityIndicator: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F8F9FA',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  qualityText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  // 設定パネル
  settingsPanel: {
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginHorizontal: 0,
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  settingRow: {
    marginBottom: 12,
  },
  currentInstrumentDisplay: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginTop: 6,
    alignItems: 'center',
  },
  currentInstrumentText: {
    fontSize: 16,
    fontWeight: '600',
  },
  displayModeSelector: {
    flexDirection: 'row',
    marginTop: 8,
  },
  displayModeButton: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 2,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  displayModeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  frequencyAdjuster: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  frequencyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  frequencyButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  directionDisplay: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
    color: '#444444',
  },
  // メトロノーム用スタイル
  timeSignatureContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  timeSignatureLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  timeSignatureDisplay: {
    fontSize: 48,
    fontWeight: '700',
  },
  bpmContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  bpmLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  bpmValue: {
    fontSize: 72,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  beatIndicators: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  beatIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginHorizontal: 8,
  },
  settingsContainer: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    elevation: 4,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  bpmAdjustContainer: {
    marginBottom: 20,
  },
  bpmAdjustControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  bpmAdjustButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    elevation: 2,
  },
  bpmAdjustButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  bpmDisplay: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'monospace',
    marginHorizontal: 20,
  },
  timeSignatureSettingContainer: {
    marginBottom: 20,
  },
  timeSignatureSettingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  timeSignatureSettingButton: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  timeSignatureSettingButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  metronomeSoundSettingContainer: {
    marginBottom: 20,
  },
  metronomeSoundSettingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  metronomeSoundSettingButton: {
    minWidth: 80,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metronomeSoundSettingButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  metronomeStartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 24,
    elevation: 4,
    marginTop: 20,
  },
  metronomeStartButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  // カスタムカラーチューナーのスタイル
  customTunerContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 2,
    backgroundColor: '#F5F5F5', // ライトグレー色
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  customDisplayArea: {
    backgroundColor: '#FFFFFF', // 白色
    padding: 12,
    alignItems: 'center',
  },
  customNoteDisplay: {
    alignItems: 'center',
    marginBottom: 12,
  },
  customNoteName: {
    fontSize: 72,
    fontWeight: '700',
    marginBottom: 4,
  },
  customFrequency: {
    fontSize: 24,
    fontWeight: '600',
  },
  customArcMeter: {
    width: 220,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customArcBackground: {
    width: 220,
    height: 120,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customArcMark: {
    position: 'absolute',
    width: 2,
    borderRadius: 1,
  },
  customCentLabel: {
    position: 'absolute',
  },
  customCentLabelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2F2F2F',
  },
  customZeroMark: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2F2F2F',
  },
  customZeroMarkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2F2F2F',
  },
  customTargetPointer: {
    position: 'absolute',
  },
  customTriangleLeft: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 0,
    borderBottomWidth: 6,
    borderLeftColor: '#2F2F2F',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  customTriangleRight: {
    width: 0,
    height: 0,
    borderLeftWidth: 0,
    borderRightWidth: 8,
    borderBottomWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: '#2F2F2F',
    borderBottomColor: 'transparent',
  },
  customNeedle: {
    position: 'absolute',
    width: 2,
    height: 50,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  customNeedleLine: {
    width: 2,
    height: 50,
    borderRadius: 1,
  },
  customControlPanel: {
    backgroundColor: '#F5F5F5', // ライトグレー色
    padding: 20,
    alignItems: 'center',
  },
  customStatusIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customFlatSymbol: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginRight: 20,
  },
  customSharpSymbol: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginLeft: 20,
  },
  customLedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customLed: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  // 楽器別説明のスタイル
  instrumentInfo: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 10,
  },
  instrumentInfoTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  instrumentInfoText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  tuningNotes: {
    marginTop: 8,
  },
  tuningNotesTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  tuningNote: {
    fontSize: 13,
    marginBottom: 4,
    paddingLeft: 8,
  },
  // 音名表示モードセクションのスタイル（統合版）
  noteDisplayModeSection: {
    width: '100%',
    marginTop: 16,
    padding: 20,
    borderRadius: 16,
    marginHorizontal: 0,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  noteDisplayModeHeader: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  noteDisplayModeTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  noteDisplayModeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  noteDisplayModeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
  },
  noteDisplayModeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // 開放弦コンテンツのスタイル
  openStringContent: {
    marginTop: 0,
  },
  openStringTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  openStringDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  openStringButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
  },
  openStringButton: {
    width: '48%',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    minHeight: 80,
  },
  openStringButtonText: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
    textAlign: 'center',
  },
  openStringFrequency: {
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.8,
    textAlign: 'center',
  },
  openStringLabel: {
    fontSize: 12,
    fontWeight: '400',
    opacity: 0.7,
    marginTop: 2,
    textAlign: 'center',
  },
  stopButton: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    elevation: 2,
  },
  stopButtonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  playingIndicator: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
    opacity: 0.9,
  },
  // シンプルなチューナーのスタイル
  simpleTunerContainer: {
    width: '100%',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    overflow: 'hidden', // 枠内の要素がはみ出さないように
  },
  simpleNoteContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    minHeight: 110, // 固定高さを設定してレイアウトシフトを防ぐ（小さく調整）
    height: 110, // 固定高さ（小さく調整）
  },
  simpleNoteWrapper: {
    flexDirection: 'row',
    alignItems: 'center', // baselineからcenterに変更して中央揃えを確実にする
    justifyContent: 'center',
    alignSelf: 'center', // 中央揃えを確実にする
    marginLeft: 24, // もっと右にシフト
  },
  simpleNoteName: {
    fontSize: 72, // 96から72に縮小
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 1.5, // 2から1.5に縮小
    includeFontPadding: false, // フォントパディングを無効化してレイアウトシフトを防ぐ
  },
  simpleOctave: {
    fontSize: 36, // 48から36に縮小
    fontWeight: '600',
    marginLeft: 6, // 8から6に縮小
    textAlign: 'center', // leftからcenterに変更
    includeFontPadding: false, // フォントパディングを無効化
  },
  simpleFrequency: {
    fontSize: 20,
    fontWeight: '500',
    marginBottom: 32,
    fontFamily: 'monospace',
  },
  simpleTuningBarContainer: {
    width: '100%',
    marginBottom: 32,
    alignItems: 'center',
  },
  simpleTuningBarTrack: {
    width: '100%',
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    position: 'relative',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#BDBDBD',
  },
  simpleCenterLine: {
    position: 'absolute',
    left: '50%',
    top: 0,
    width: 2,
    height: 8,
    marginLeft: -1,
    borderRadius: 1,
  },
  simpleMark: {
    position: 'absolute',
    width: 1,
    top: 0,
    marginLeft: -0.5,
    borderRadius: 0.5,
  },
  simpleIndicator: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    top: -2,
    marginLeft: -6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  simpleCentsContainer: {
    height: 28, // セント表示の固定高さを確保
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  simpleCents: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  simpleStartButton: {
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  simpleStartButtonText: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
});