import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Play, Pause, RotateCcw, Target, Clock, Music, Trophy, BarChart3 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import InstrumentHeader from '@/components/InstrumentHeader';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { useLanguage } from '@/components/LanguageContext';
import { safeGoBack } from '@/lib/navigationUtils';
import { saveNoteTrainingResult } from '@/lib/database';
import { supabase } from '@/lib/supabase';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';

const { width, height } = Dimensions.get('window');

// 音符トレーニングの型定義
interface Note {
  note: string;
  octave: number;
  frequency: number;
  position: number; // 五線譜上の位置（0-28の範囲）
  displayName: string; // 表示用の音名
}

interface GameSettings {
  mode: 'basic' | 'instrument' | 'endless';
  level: 1 | 2 | 3;
  questionCount: 10 | 20 | 30;
  timeLimit: 'none' | 5 | 3 | 1;
  displayMode: 'letter' | 'solfege' | 'both';
}

interface GameResult {
  correct: number;
  total: number;
  streak: number;
  time: number;
  score: number;
}

export default function NoteTrainingScreen() {
  const router = useRouter();
  const { currentTheme, selectedInstrument } = useInstrumentTheme();
  const { t } = useLanguage();
  
  // ゲーム状態
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'result'>('menu');
  const [gameSettings, setGameSettings] = useState<GameSettings>({
    mode: 'basic',
    level: 1,
    questionCount: 10,
    timeLimit: 'none',
    displayMode: 'both'
  });
  
  // ゲーム進行
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [questions, setQuestions] = useState<Note[]>([]);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [gameTime, setGameTime] = useState(0);
  
  // タイマー関連
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // 音声再生関連
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayingScale, setIsPlayingScale] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // 成績データ
  const [bestScore, setBestScore] = useState(0);
  const [playHistory, setPlayHistory] = useState<GameResult[]>([]);

  // 音名マッピング
  const noteNames = {
    'C': 'ド', 'C#': 'ド#', 'D': 'レ', 'D#': 'レ#', 
    'E': 'ミ', 'F': 'ファ', 'F#': 'ファ#', 'G': 'ソ', 
    'G#': 'ソ#', 'A': 'ラ', 'A#': 'ラ#', 'B': 'シ'
  };

  // 楽器別音域設定
  const instrumentRanges = {
    violin: { minOctave: 3, maxOctave: 7, commonNotes: ['G', 'D', 'A', 'E'] },
    piano: { minOctave: 0, maxOctave: 8, commonNotes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'] },
    guitar: { minOctave: 2, maxOctave: 6, commonNotes: ['E', 'A', 'D', 'G', 'B'] },
    flute: { minOctave: 4, maxOctave: 7, commonNotes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'] },
    trumpet: { minOctave: 3, maxOctave: 6, commonNotes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'] }
  };

  // コンポーネント初期化
  useEffect(() => {
    loadBestScore();
    loadPlayHistory();
  }, []);

  // 音符の五線譜上の位置を正確に計算
  const getNotePosition = (note: string, octave: number): number => {
    // 基準音：中央C（C4）を位置14とする
    const baseNote = 'C';
    const baseOctave = 4;
    const basePosition = 14; // 中央Cの位置
    
    // 音名から半音数を計算
    const noteValues: { [key: string]: number } = {
      'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
      'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11
    };
    
    const currentNoteValue = noteValues[note] || 0;
    const baseNoteValue = noteValues[baseNote];
    
    // 半音数の差を計算
    const semitoneDiff = (octave - baseOctave) * 12 + (currentNoteValue - baseNoteValue);
    
    // 五線譜上の位置に変換（1半音 = 1位置）
    const position = basePosition + semitoneDiff;
    
    // 範囲内に収める（0-28の範囲）
    return Math.max(0, Math.min(28, position));
  };

  // 音符の周波数計算
  const getNoteFrequency = (note: string, octave: number): number => {
    const noteValues: { [key: string]: number } = {
      'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
      'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11
    };
    
    const noteValue = noteValues[note] || 0;
    const semitones = noteValue + (octave - 4) * 12;
    return 440 * Math.pow(2, (semitones - 9) / 12); // A4 = 440Hz
  };

  // 基本問題生成
  const generateBasicNote = (): Note => {
    const basicNotes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const note = basicNotes[Math.floor(Math.random() * basicNotes.length)];
    const octave = gameSettings.level === 1 ? 4 : Math.floor(Math.random() * 3) + 3; // レベル1は中央オクターブのみ
    const frequency = getNoteFrequency(note, octave);
    const position = getNotePosition(note, octave);
    const displayName = noteNames[note as keyof typeof noteNames] || note;
    
    return { note, octave, frequency, position, displayName };
  };

  // 楽器別問題生成
  const generateInstrumentNote = (): Note => {
    const range = instrumentRanges[selectedInstrument as keyof typeof instrumentRanges] || instrumentRanges.violin;
    const note = range.commonNotes[Math.floor(Math.random() * range.commonNotes.length)];
    const octave = Math.floor(Math.random() * (range.maxOctave - range.minOctave + 1)) + range.minOctave;
    const frequency = getNoteFrequency(note, octave);
    const position = getNotePosition(note, octave);
    const displayName = noteNames[note as keyof typeof noteNames] || note;
    
    return { note, octave, frequency, position, displayName };
  };

  // 拡張問題生成（シャープ・フラット含む）
  const generateExtendedNote = (): Note => {
    const extendedNotes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const note = extendedNotes[Math.floor(Math.random() * extendedNotes.length)];
    const octave = Math.floor(Math.random() * 3) + 3; // 3-5オクターブ
    const frequency = getNoteFrequency(note, octave);
    const position = getNotePosition(note, octave);
    const displayName = noteNames[note as keyof typeof noteNames] || note;
    
    return { note, octave, frequency, position, displayName };
  };

  // 問題生成
  const generateQuestions = (): Note[] => {
    const questions: Note[] = [];
    
    for (let i = 0; i < gameSettings.questionCount; i++) {
      let note: Note;
      
      switch (gameSettings.mode) {
        case 'basic':
          note = generateBasicNote();
          break;
        case 'instrument':
          note = generateInstrumentNote();
          break;
        case 'endless':
          note = gameSettings.level >= 3 ? generateExtendedNote() : generateBasicNote();
          break;
        default:
          note = generateBasicNote();
      }
      
      questions.push(note);
    }
    
    return questions;
  };

  // 回答オプションの取得
  const getAnswerOptions = (): string[] => {
    if (gameSettings.level === 1) {
      return ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    } else if (gameSettings.level === 2) {
      return ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    } else {
      return ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    }
  };

  // ゲーム開始
  const startGame = () => {
    const questions = generateQuestions();
    setQuestions(questions);
    setCurrentQuestion(0);
    setCurrentNote(questions[0]);
    setSelectedAnswer('');
    setIsCorrect(null);
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setStartTime(Date.now());
    setGameTime(0);
    setGameState('playing');
    
    // タイマー設定
    if (gameSettings.timeLimit !== 'none') {
      setTimeLeft(gameSettings.timeLimit);
      startTimer();
    }
  };

  // タイマー開始
  const startTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // タイマー停止
  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // 回答処理
  const handleAnswer = (answer: string) => {
    if (!currentNote) return;
    
    setSelectedAnswer(answer);
    const correct = answer === currentNote.note;
    setIsCorrect(correct);
    
    if (correct) {
      const newScore = score + (streak + 1) * 10;
      const newStreak = streak + 1;
      setScore(newScore);
      setStreak(newStreak);
      setMaxStreak(Math.max(maxStreak, newStreak));
    } else {
      setStreak(0);
    }
    
    // 音を再生
    playNote(currentNote.frequency);
    
    // 次の問題へ
    setTimeout(() => {
      nextQuestion();
    }, 1500);
  };

  // 次の問題
  const nextQuestion = () => {
    if (currentQuestion + 1 < questions.length) {
      setCurrentQuestion(prev => prev + 1);
      setCurrentNote(questions[currentQuestion + 1]);
      setSelectedAnswer('');
      setIsCorrect(null);
    } else {
      endGame();
    }
  };

  // ゲーム終了
  const endGame = () => {
    stopTimer();
    const finalTime = Date.now() - startTime;
    setGameTime(finalTime);
    
    const result: GameResult = {
      correct: score / 10, // スコアから正解数を逆算
      total: questions.length,
      streak: maxStreak,
      time: finalTime,
      score: score
    };
    
    saveResult(result);
    setGameState('result');
  };

  // 音を再生
  const playNote = async (frequency: number) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const audioContext = audioContextRef.current;
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      ErrorHandler.handle(error, '音声再生', false);
    }
  };

  // 音階を再生
  const playScale = async () => {
    if (isPlayingScale) return;
    
    setIsPlayingScale(true);
    
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const audioContext = audioContextRef.current;
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      const scaleNotes = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C'];
      const noteDuration = 0.3;
      
      scaleNotes.forEach((note, index) => {
        const frequency = getNoteFrequency(note, 4);
        const startTime = audioContext.currentTime + index * noteDuration;
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, startTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.2, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + noteDuration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + noteDuration);
      });
      
      setTimeout(() => setIsPlayingScale(false), scaleNotes.length * noteDuration * 1000);
    } catch (error) {
      ErrorHandler.handle(error, '音階再生', false);
      setIsPlayingScale(false);
    }
  };

  // 結果保存
  const saveResult = async (result: GameResult) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await saveNoteTrainingResult(user.id, {
          mode: gameSettings.mode,
          level: gameSettings.level,
          score: result.score,
          correct_count: result.correct,
          total_count: result.total,
          max_streak: result.streak,
          play_time: result.time,
          created_at: new Date().toISOString()
        });
      }
    } catch (error) {
      ErrorHandler.handle(error, '結果保存', false);
    }
  };

  // 成績データ読み込み
  const loadBestScore = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('note_training_results')
          .select('score')
          .eq('user_id', user.id)
          .order('score', { ascending: false })
          .limit(1);
        
        if (data && data.length > 0) {
          setBestScore(data[0].score);
        }
      }
    } catch (error) {
      ErrorHandler.handle(error, '最高スコア読み込み', false);
    }
  };

  const loadPlayHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('note_training_results')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (data) {
          setPlayHistory(data.map((item: any) => ({
            correct: item.correct_count,
            total: item.total_count,
            streak: item.max_streak,
            time: item.play_time,
            score: item.score
          })));
        }
      }
    } catch (error) {
      ErrorHandler.handle(error, 'プレイ履歴読み込み', false);
    }
  };

  // メニュー画面
  const renderMenu = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.menuContainer}>
        <Text style={[styles.menuTitle, { color: currentTheme.text }]}>
          音符トレーニング
        </Text>
        <Text style={[styles.menuSubtitle, { color: currentTheme.textSecondary }]}>
          音符を見て音名を当てよう！
        </Text>

        {/* ゲームモード選択 */}
        <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
          <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>ゲームモード</Text>
          
          <View style={styles.modeContainer}>
            {[
              { id: 'basic', title: '基本モード', icon: Music, color: '#4CAF50' },
              { id: 'instrument', title: '楽器別モード', icon: Target, color: '#2196F3' },
              { id: 'endless', title: '♾️ エンドレス', icon: RotateCcw, color: '#FF9800' }
            ].map(mode => 
              React.createElement(TouchableOpacity, {
                key: mode.id,
                style: [
                  styles.modeButton,
                  gameSettings.mode === mode.id && { backgroundColor: mode.color }
                ],
                onPress: () => setGameSettings(prev => ({ ...prev, mode: mode.id as any }))
              },
                React.createElement(mode.icon, { size: 24, color: gameSettings.mode === mode.id ? '#FFFFFF' : mode.color }),
                React.createElement(Text, {
                  style: [
                    styles.modeButtonText,
                    { color: gameSettings.mode === mode.id ? '#FFFFFF' : currentTheme.text }
                  ]
                }, mode.title)
              )
            )}
          </View>
        </View>

        {/* レベル選択 */}
        <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
          <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>レベル</Text>
          
          <View style={styles.levelContainer}>
            {[1, 2, 3].map(level => 
              React.createElement(TouchableOpacity, {
                key: level,
                style: [
                  styles.levelButton,
                  gameSettings.level === level && { backgroundColor: currentTheme.primary }
                ],
                onPress: () => setGameSettings(prev => ({ ...prev, level: level as any }))
              },
                React.createElement(Text, {
                  style: [
                    styles.levelButtonText,
                    { color: gameSettings.level === level ? currentTheme.surface : currentTheme.text }
                  ]
                }, level)
              )
            )}
          </View>
        </View>

        {/* 問題数選択 */}
        <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
          <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>問題数</Text>
          
          <View style={styles.questionCountContainer}>
            {[10, 20, 30].map(count => 
              React.createElement(TouchableOpacity, {
                key: count,
                style: [
                  styles.questionCountButton,
                  gameSettings.questionCount === count && { backgroundColor: currentTheme.primary }
                ],
                onPress: () => setGameSettings(prev => ({ ...prev, questionCount: count as any }))
              },
                React.createElement(Text, {
                  style: [
                    styles.questionCountButtonText,
                    { color: gameSettings.questionCount === count ? currentTheme.surface : currentTheme.text }
                  ]
                }, `${count}問`)
              )
            )}
          </View>
        </View>

        {/* 制限時間選択 */}
        <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
          <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>制限時間</Text>
          
          <View style={styles.timeLimitContainer}>
            {[
              { value: 'none', label: 'なし' },
              { value: 5, label: '5秒' },
              { value: 3, label: '3秒' },
              { value: 1, label: '1秒' }
            ].map(time => 
              React.createElement(TouchableOpacity, {
                key: time.value,
                style: [
                  styles.timeLimitButton,
                  gameSettings.timeLimit === time.value && { backgroundColor: currentTheme.primary }
                ],
                onPress: () => setGameSettings(prev => ({ ...prev, timeLimit: time.value as any }))
              },
                React.createElement(Text, {
                  style: [
                    styles.timeLimitButtonText,
                    { color: gameSettings.timeLimit === time.value ? currentTheme.surface : currentTheme.text }
                  ]
                }, time.label)
              )
            )}
          </View>
        </View>

        {/* 成績表示 */}
        <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
          <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>成績</Text>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Trophy size={20} color={currentTheme.primary} />
              <Text style={[styles.statLabel, { color: currentTheme.textSecondary }]}>最高スコア</Text>
              <Text style={[styles.statValue, { color: currentTheme.text }]}>{bestScore}</Text>
            </View>
            
            <View style={styles.statItem}>
              <BarChart3 size={20} color={currentTheme.primary} />
              <Text style={[styles.statLabel, { color: currentTheme.textSecondary }]}>プレイ回数</Text>
              <Text style={[styles.statValue, { color: currentTheme.text }]}>{playHistory.length}</Text>
            </View>
          </View>
        </View>

        {/* 開始ボタン */}
        <TouchableOpacity
          style={[styles.startButton, { backgroundColor: currentTheme.primary }]}
          onPress={startGame}
        >
          <Play size={24} color={currentTheme.surface} />
          <Text style={[styles.startButtonText, { color: currentTheme.surface }]}>
            ゲーム開始
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // ゲーム画面
  const renderGame = () => (
    <ScrollView style={styles.gameContainer} showsVerticalScrollIndicator={false}>
      {/* ゲーム情報 */}
      <View style={styles.gameInfo}>
        <View style={styles.gameInfoItem}>
          <Text style={[styles.gameInfoLabel, { color: currentTheme.textSecondary }]}>問題</Text>
          <Text style={[styles.gameInfoValue, { color: currentTheme.text }]}>
            {currentQuestion + 1} / {questions.length}
          </Text>
        </View>
        
        <View style={styles.gameInfoItem}>
          <Text style={[styles.gameInfoLabel, { color: currentTheme.textSecondary }]}>スコア</Text>
          <Text style={[styles.gameInfoValue, { color: currentTheme.text }]}>{score}</Text>
        </View>
        
        <View style={styles.gameInfoItem}>
          <Text style={[styles.gameInfoLabel, { color: currentTheme.textSecondary }]}>連続</Text>
          <Text style={[styles.gameInfoValue, { color: currentTheme.text }]}>{streak}</Text>
        </View>
        
        {gameSettings.timeLimit !== 'none' && (
          <View style={styles.gameInfoItem}>
            <Text style={[styles.gameInfoLabel, { color: currentTheme.textSecondary }]}>残り時間</Text>
            <Text style={[styles.gameInfoValue, { color: timeLeft <= 3 ? '#FF4444' : currentTheme.text }]}>
              {timeLeft}秒
            </Text>
          </View>
        )}
      </View>

      {/* 五線譜と音符 */}
      <View style={[styles.staffContainer, { backgroundColor: currentTheme.surface }]}>
        <View style={styles.staff}>
          {/* 五線 */}
          {[0, 1, 2, 3, 4].map((line, index) => 
            React.createElement(View, { key: index, style: [styles.staffLine, { top: line * 12 }] })
          )}
          
          {/* 音符 */}
          {currentNote && (
            <View style={[styles.note, { top: currentNote.position * 2 }]}>
              <View style={[styles.noteHead, { backgroundColor: currentTheme.primary }]}>
                <Text style={styles.noteSymbol}>♪</Text>
              </View>
              <View style={styles.noteStem} />
            </View>
          )}
        </View>
        
        {/* ヒント */}
        <View style={styles.hintContainer}>
          <Text style={[styles.hintTitle, { color: currentTheme.textSecondary }]}>
            ヒント：音階
          </Text>
          <TouchableOpacity
            style={[styles.scaleButton, { backgroundColor: currentTheme.secondary }]}
            onPress={playScale}
            disabled={isPlayingScale}
          >
            <Play size={16} color={currentTheme.primary} />
            <Text style={[styles.scaleButtonText, { color: currentTheme.primary }]}>
              {isPlayingScale ? '再生中...' : '音階を聞く'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 表示モード選択 */}
      <View style={[styles.section, { backgroundColor: currentTheme.surface }]}> 
        <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>表示モード</Text>
        <Text style={[styles.sectionSubtitle, { color: currentTheme.textSecondary }]}>音符の表示方法を選択してください</Text>

        <View style={styles.displayModeContainer}>
          {[
            { id: 'letter', label: '英語 (C D E...)' },
            { id: 'solfege', label: 'ドレミ (固定ド)' },
            { id: 'both', label: '両方表示' }
          ].map(opt => 
            React.createElement(TouchableOpacity, {
              key: opt.id,
              style: [
                styles.displayModeButton,
                gameSettings.displayMode === (opt.id as any) && { backgroundColor: currentTheme.primary }
              ],
              onPress: () => setGameSettings(prev => ({ ...prev, displayMode: opt.id as any }))
            },
              React.createElement(Text, {
                style: [
                  styles.displayModeButtonText,
                  { color: gameSettings.displayMode === (opt.id as any) ? currentTheme.surface : currentTheme.text }
                ]
              }, opt.label)
            )
          )}
        </View>
      </View>

      {/* 回答選択 */}
      <View style={styles.answerContainer}>
        <Text style={[styles.answerTitle, { color: currentTheme.text }]}>
          この音符の音名は？
        </Text>
        
        <View style={styles.answerGrid}>
          {getAnswerOptions().map((note, index) => 
            React.createElement(TouchableOpacity, {
              key: index,
              style: [
                styles.answerButton,
                { backgroundColor: currentTheme.surface },
                selectedAnswer === note && { backgroundColor: currentTheme.primary },
                isCorrect === true && selectedAnswer === note && { backgroundColor: '#4CAF50' },
                isCorrect === false && selectedAnswer === note && { backgroundColor: '#FF4444' }
              ],
              onPress: () => handleAnswer(note),
              disabled: selectedAnswer !== ''
            },
              // 表示モード
              (gameSettings.displayMode === 'letter' || gameSettings.displayMode === 'both') && React.createElement(Text, {
                style: [
                  styles.answerButtonText,
                  { color: selectedAnswer === note ? currentTheme.surface : currentTheme.text }
                ]
              }, note),
              (gameSettings.displayMode === 'solfege' || gameSettings.displayMode === 'both') && React.createElement(Text, {
                style: [
                  styles.answerButtonTextJa,
                  { color: selectedAnswer === note ? currentTheme.surface : currentTheme.textSecondary }
                ]
              }, noteNames[note as keyof typeof noteNames])
            )
          )}
        </View>
      </View>

      {/* 正解表示 */}
      {isCorrect !== null && currentNote && (
        <View style={[styles.resultContainer, { backgroundColor: currentTheme.surface }]}>
          <Text style={[
            styles.resultText,
            { color: isCorrect ? '#4CAF50' : '#FF4444' }
          ]}>
            {isCorrect ? '正解！' : `不正解... 正解は ${currentNote.note} (${currentNote.displayName})`}
          </Text>
        </View>
      )}
    </ScrollView>
  );

  // 結果画面
  const renderResult = () => {
    const result: GameResult = {
      correct: Math.floor(score / 10),
      total: questions.length,
      streak: maxStreak,
      time: gameTime,
      score: score
    };

    return (
      <ScrollView style={styles.resultContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.resultContent}>
          <Text style={[styles.resultTitle, { color: currentTheme.text }]}>
            ゲーム終了！
          </Text>
          
          <View style={[styles.resultStats, { backgroundColor: currentTheme.surface }]}>
            <View style={styles.resultStatItem}>
              <Text style={[styles.resultStatLabel, { color: currentTheme.textSecondary }]}>
                正解率
              </Text>
              <Text style={[styles.resultStatValue, { color: currentTheme.text }]}>
                {Math.round((result.correct / result.total) * 100)}%
              </Text>
            </View>
            
            <View style={styles.resultStatItem}>
              <Text style={[styles.resultStatLabel, { color: currentTheme.textSecondary }]}>
                スコア
              </Text>
              <Text style={[styles.resultStatValue, { color: currentTheme.text }]}>
                {result.score}
              </Text>
            </View>
            
            <View style={styles.resultStatItem}>
              <Text style={[styles.resultStatLabel, { color: currentTheme.textSecondary }]}>
                最大連続
              </Text>
              <Text style={[styles.resultStatValue, { color: currentTheme.text }]}>
                {result.streak}
              </Text>
            </View>
            
            <View style={styles.resultStatItem}>
              <Text style={[styles.resultStatLabel, { color: currentTheme.textSecondary }]}>
                プレイ時間
              </Text>
              <Text style={[styles.resultStatValue, { color: currentTheme.text }]}>
                {Math.round(result.time / 1000)}秒
              </Text>
            </View>
          </View>
          
          <View style={styles.resultActions}>
            <TouchableOpacity
              style={[styles.resultButton, { backgroundColor: currentTheme.primary }]}
              onPress={startGame}
            >
              <RotateCcw size={20} color={currentTheme.surface} />
              <Text style={[styles.resultButtonText, { color: currentTheme.surface }]}>
                もう一度プレイ
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.resultButton, { backgroundColor: currentTheme.secondary }]}
              onPress={() => setGameState('menu')}
            >
              <ArrowLeft size={20} color={currentTheme.text} />
              <Text style={[styles.resultButtonText, { color: currentTheme.text }]}>
                メニューに戻る
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  };

  const goBack = () => {
    if (gameState === 'playing') {
      Alert.alert(
        'ゲーム終了',
        'ゲームを終了しますか？',
        [
          { text: 'キャンセル', style: 'cancel' },
          { 
            text: '終了', 
            style: 'destructive',
            onPress: () => {
              stopTimer();
              setGameState('menu');
            }
          }
        ]
      );
    } else {
      safeGoBack('/(tabs)/basic-practice');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} edges={[]}>
      <InstrumentHeader />
      
      <View style={[styles.header, { borderBottomColor: currentTheme.secondary }]}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <ArrowLeft size={24} color={currentTheme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: currentTheme.text }]}>
          音符トレーニング
        </Text>
        <View style={styles.placeholder} />
      </View>

      {gameState === 'menu' && renderMenu()}
      {gameState === 'playing' && renderGame()}
      {gameState === 'result' && renderResult()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  menuContainer: {
    alignItems: 'center',
  },
  menuTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  menuSubtitle: {
    fontSize: 16,
    marginBottom: 32,
    textAlign: 'center',
  },
  section: {
    width: '100%',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: -8,
    marginBottom: 12,
  },
  displayModeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  displayModeButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginHorizontal: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  displayModeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  modeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modeButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginHorizontal: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  levelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  levelButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  levelButtonText: {
    fontSize: 24,
    fontWeight: '700',
  },
  questionCountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  questionCountButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  questionCountButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  timeLimitContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  timeLimitButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  timeLimitButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 24,
    marginTop: 20,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  gameContainer: {
    flex: 1,
    padding: 20,
  },
  gameInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  gameInfoItem: {
    alignItems: 'center',
  },
  gameInfoLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  gameInfoValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  staffContainer: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  staff: {
    width: 200,
    height: 60,
    position: 'relative',
    marginBottom: 20,
  },
  staffLine: {
    position: 'absolute',
    width: '100%',
    height: 2,
    backgroundColor: '#000',
  },
  note: {
    position: 'absolute',
    left: 50,
    width: 20,
    height: 20,
  },
  noteHead: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteSymbol: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  noteStem: {
    position: 'absolute',
    left: 18,
    top: -10,
    width: 2,
    height: 30,
    backgroundColor: '#000',
  },
  hintContainer: {
    alignItems: 'center',
  },
  hintTitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  scaleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  scaleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  answerContainer: {
    marginBottom: 20,
  },
  answerTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  answerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  answerButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  answerButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  answerButtonTextJa: {
    fontSize: 12,
    marginTop: 2,
  },
  resultContainer: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  resultText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  resultContent: {
    alignItems: 'center',
    padding: 20,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
  },
  resultStats: {
    width: '100%',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  resultStatItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  resultStatLabel: {
    fontSize: 16,
  },
  resultStatValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  resultActions: {
    width: '100%',
    gap: 12,
  },
  resultButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  resultButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});