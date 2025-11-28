import React, { useState, useEffect, useRef } from 'react';
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
import InstrumentHeader from '@/components/InstrumentHeader';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import Metronome from '@/components/metronome/Metronome';
import { styles } from '@/lib/tabs/tuner/styles';

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



export default function TunerScreen() {
  const { currentTheme, selectedInstrument: contextSelectedInstrument } = useInstrumentTheme();
  const [mode, setMode] = useState<'tuner' | 'metronome'>('tuner');
  
  // チューナーUI表示用の状態（機能は削除済み、UIのみ表示）
  const [isListening] = useState(false);
  const [currentFrequency] = useState<number>(0);
  const [currentNote] = useState<string>('--');
  const [currentNoteJa] = useState<string>('--');
  const [currentOctave] = useState<number>(0);
  const [currentCents] = useState<number>(0);
  const [indicatorColor] = useState<string>('#9E9E9E');
  
  // 音名表示モード（CDEかドレミか）- 開放弦の音を聞く機能で使用
  const [noteDisplayMode, setNoteDisplayMode] = useState<'en' | 'ja'>('en');
  const NOTE_DISPLAY_MODE_KEY = '@tuner_note_display_mode';
  
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
  
  // 開放弦の音の連続再生用の状態
  const [playingOpenString, setPlayingOpenString] = useState<string | null>(null);
  const openStringOscillatorRef = useRef<OscillatorNode | null>(null);
  const openStringGainNodeRef = useRef<GainNode | null>(null);

  // アニメーション用の値（UI表示用）
  const tuningBarAnimation = useRef(new Animated.Value(0)).current;

  // Web Audio API 用参照（開放弦の音とメトロノーム用）
  const audioContextRef = useRef<AudioContext | null>(null);

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


  // チューナー機能は削除済み（UIのみ表示）
  const startListening = () => {
    Alert.alert('機能停止', 'チューナー機能は現在利用できません。');
  };

  const stopListening = () => {
    // 何もしない（UI表示のみ）
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
            <Metronome audioContextRef={audioContextRef} />
          )}
        </View>
      </ScrollView>

    </SafeAreaView>
  );
}
