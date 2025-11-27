import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { Play, Pause, Volume2, RotateCcw } from 'lucide-react-native';
import { useInstrumentTheme } from './InstrumentThemeContext';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';

// Web環境ではexpo-audioをインポートしない
let AudioPlayer: any = null;
let useAudioPlayer: any = null;

if (Platform.OS !== 'web') {
  try {
    const audioModule = require('expo-audio');
    AudioPlayer = audioModule.AudioPlayer;
    useAudioPlayer = audioModule.useAudioPlayer;
  } catch (error) {
    logger.warn('expo-audio not available:', error);
  }
}

interface TuningSoundPlayerProps {
  instrumentId: string;
}

interface TuningNote {
  name: string;
  frequency: number;
  description: string;
}

export default function TuningSoundPlayer({ instrumentId }: TuningSoundPlayerProps) {
  const { currentTheme } = useInstrumentTheme();
  const player = useAudioPlayer ? useAudioPlayer() : null;
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentNote, setCurrentNote] = useState<TuningNote | null>(null);
  const [volume, setVolume] = useState(0.5);
  const [duration, setDuration] = useState(2);
  const [continuousPlay, setContinuousPlay] = useState(false);

  // 音声停止用のref
  const currentOscillatorRef = useRef<OscillatorNode | null>(null);
  const currentGainNodeRef = useRef<GainNode | null>(null);
  const stopTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 楽器別のチューニング音データ
  const tuningNotes: { [key: string]: TuningNote[] } = {
    violin: [
      { name: 'G線', frequency: 196, description: 'G3 - 低音弦' },
      { name: 'D線', frequency: 293.66, description: 'D4 - 中低音弦' },
      { name: 'A線', frequency: 440, description: 'A4 - 中音弦（基準音）' },
      { name: 'E線', frequency: 659.25, description: 'E5 - 高音弦' }
    ],
    guitar: [
      { name: '6弦', frequency: 82.41, description: 'E2 - 最低音弦' },
      { name: '5弦', frequency: 110, description: 'A2 - 低音弦' },
      { name: '4弦', frequency: 146.83, description: 'D3 - 中低音弦' },
      { name: '3弦', frequency: 196, description: 'G3 - 中音弦' },
      { name: '2弦', frequency: 246.94, description: 'B3 - 中高音弦' },
      { name: '1弦', frequency: 329.63, description: 'E4 - 最高音弦' }
    ],
    flute: [
      { name: '基準音A', frequency: 440, description: 'A4 - チューニング基準音' },
      { name: '中音域C', frequency: 523.25, description: 'C5 - 基本音' },
      { name: '中音域D', frequency: 587.33, description: 'D5 - 基本音' },
      { name: '中音域E', frequency: 659.25, description: 'E5 - 基本音' },
      { name: '中音域F', frequency: 698.46, description: 'F5 - 基本音' },
      { name: '中音域G', frequency: 783.99, description: 'G5 - 基本音' }
    ],
    trumpet: [
      { name: '基準音A', frequency: 440, description: 'A4 - チューニング基準音' },
      { name: '中音域C', frequency: 261.63, description: 'C4 - 基本音' },
      { name: '中音域D', frequency: 293.66, description: 'D4 - 基本音' },
      { name: '中音域E', frequency: 329.63, description: 'E4 - 基本音' }
    ],
    piano: [
      { name: '基準音A', frequency: 440, description: 'A4 - チューニング基準音' },
      { name: '中央C', frequency: 261.63, description: 'C4 - 中央のド' },
      { name: '高音域A', frequency: 880, description: 'A5 - 高音域' }
    ]
  };

  const notes = tuningNotes[instrumentId] || tuningNotes.violin;

  useEffect(() => {
    return () => {
      logger.debug('コンポーネントアンマウント: クリーンアップ開始');
      
      // 既存のタイマーをクリア
      if (stopTimeoutRef.current) {
        clearTimeout(stopTimeoutRef.current);
        stopTimeoutRef.current = null;
      }
      
      // オシレーターとゲインノードを停止・切断
      if (currentOscillatorRef.current) {
        try {
          currentOscillatorRef.current.stop();
          currentOscillatorRef.current.disconnect();
        } catch (error) {
          logger.warn('クリーンアップ: オシレーター停止エラー:', error);
        }
        currentOscillatorRef.current = null;
      }
      
      if (currentGainNodeRef.current) {
        try {
          currentGainNodeRef.current.disconnect();
        } catch (error) {
          logger.warn('クリーンアップ: ゲインノード切断エラー:', error);
        }
        currentGainNodeRef.current = null;
      }
      
      // AudioContextのクリーンアップ
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          audioContextRef.current.suspend();
        } catch (error) {
          logger.warn('クリーンアップ: AudioContext停止エラー:', error);
        }
      }
      
      logger.debug('コンポーネントアンマウント: クリーンアップ完了');
    };
  }, []);

  // AudioContextの再利用用
  const audioContextRef = useRef<AudioContext | null>(null);

  const generateTone = async (frequency: number) => {
    try {
      // Web環境でのみ音声生成を実行
      if (Platform.OS !== 'web') {
        Alert.alert('音声再生', '音声再生機能はWeb環境でのみ利用できます');
        return;
      }

      // 既存の音声を停止
      await stopSound();

      // AudioContextを作成または再開
      let audioContext = audioContextRef.current;
      if (!audioContext || audioContext.state === 'closed') {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioContext;
      }
      
      // コンテキストを再開（ユーザーインタラクションが必要）
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      // AudioContextが正常に動作しているか確認
      if (audioContext.state !== 'running') {
        logger.warn('AudioContext state:', audioContext.state);
        Alert.alert('音声エラー', '音声コンテキストが正常に開始されませんでした。ページをタップしてから再試行してください。');
        return;
      }
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      // refに保存
      currentOscillatorRef.current = oscillator;
      currentGainNodeRef.current = gainNode;
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // 音色を設定（サイン波）
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      
      // 音量を設定（フェードイン/アウト付き）
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume * 0.3, audioContext.currentTime + 0.1);
      
      // 継続再生の場合はフェードアウトしない
      if (duration > 0 && !continuousPlay) {
        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration);
      }
      
      oscillator.start();
      setIsPlaying(true);
      
      logger.debug(`Playing tone: ${frequency}Hz, volume: ${volume}, duration: ${duration}s`);
      
      // 音の停止処理（durationが設定されていて、継続再生でない場合のみ）
      if (duration > 0 && !continuousPlay) {
        stopTimeoutRef.current = setTimeout(() => {
          logger.debug('自動停止タイマー発火');
          try {
            if (currentOscillatorRef.current) {
              try {
                currentOscillatorRef.current.stop();
                logger.debug('自動停止: オシレーターを停止');
              } catch (stopError) {
                logger.warn('自動停止: オシレーター停止エラー:', stopError);
              }
              
              try {
                currentOscillatorRef.current.disconnect();
                logger.debug('自動停止: オシレーターを切断');
              } catch (disconnectError) {
                logger.warn('自動停止: オシレーター切断エラー:', disconnectError);
              }
              
              currentOscillatorRef.current = null;
            }
            
            if (currentGainNodeRef.current) {
              try {
                currentGainNodeRef.current.disconnect();
                logger.debug('自動停止: ゲインノードを切断');
              } catch (disconnectError) {
                logger.warn('自動停止: ゲインノード切断エラー:', disconnectError);
              }
              
              currentGainNodeRef.current = null;
            }
            
            setIsPlaying(false);
            logger.debug('自動停止完了');
          } catch (error) {
            logger.warn('Oscillator cleanup error:', error);
            setIsPlaying(false);
          }
        }, duration * 1000);
      }
      
    } catch (error) {
      ErrorHandler.handle(error, 'Tone generation', true);
      Alert.alert('エラー', `音の再生に失敗しました: ${(error as Error).message}`);
    }
  };

  const playNote = async (note: TuningNote) => {
    setCurrentNote(note);
    
    // ユーザーインタラクション後にAudioContextを初期化
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioContext;
        
        // AudioContextを開始（ユーザーインタラクションが必要）
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }
      } catch (error) {
        ErrorHandler.handle(error, 'AudioContext initialization', true);
        Alert.alert('音声エラー', '音声システムの初期化に失敗しました。ページを再読み込みしてください。');
        return;
      }
    }
    
    await generateTone(note.frequency);
  };

  const stopSound = async () => {
    try {
      logger.debug('音声停止処理を開始');
      
      // 既存のタイマーをクリア
      if (stopTimeoutRef.current) {
        clearTimeout(stopTimeoutRef.current);
        stopTimeoutRef.current = null;
        logger.debug('停止タイマーをクリア');
      }
      
      // 現在のオシレーターを停止
      if (currentOscillatorRef.current) {
        try {
          // オシレーターが既に停止していないかチェック
          if (currentOscillatorRef.current.context.state !== 'closed') {
            currentOscillatorRef.current.stop();
            logger.debug('オシレーターを停止');
          }
        } catch (stopError) {
          logger.warn('オシレーター停止エラー（既に停止済み）:', stopError);
        }
        
        try {
          currentOscillatorRef.current.disconnect();
          logger.debug('オシレーターを切断');
        } catch (disconnectError) {
          logger.warn('オシレーター切断エラー（既に切断済み）:', disconnectError);
        }
        
        currentOscillatorRef.current = null;
      }
      
      // 現在のゲインノードを切断
      if (currentGainNodeRef.current) {
        try {
          currentGainNodeRef.current.disconnect();
          logger.debug('ゲインノードを切断');
        } catch (disconnectError) {
          logger.warn('ゲインノード切断エラー（既に切断済み）:', disconnectError);
        }
        
        currentGainNodeRef.current = null;
      }
      
      setIsPlaying(false);
      logger.debug('音声停止処理完了');
    } catch (error) {
      logger.warn('音声停止エラー:', error);
      setIsPlaying(false);
    }
  };

  const handleVolumeChange = (value: number) => {
    setVolume(value);
  };

  const handleDurationChange = (value: number) => {
    setDuration(value);
  };

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.surface }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: currentTheme.text }]}>チューニング音</Text>
        <Text style={[styles.subtitle, { color: currentTheme.textSecondary }]}>
          各音をタップして再生してください
        </Text>
      </View>

      {/* 音量・長さ調整 */}
      <View style={styles.controls}>
        <View style={styles.controlItem}>
          <Text style={[styles.controlLabel, { color: currentTheme.textSecondary }]}>音量</Text>
          <View style={styles.sliderContainer}>
            <Volume2 size={16} color={currentTheme.textSecondary} />
            <View style={styles.volumeControl}>
              <TouchableOpacity
                style={styles.volumeButton}
                onPress={() => handleVolumeChange(Math.max(0, volume - 0.1))}
              >
                <Text style={styles.volumeButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.volumeText}>{Math.round(volume * 100)}%</Text>
              <TouchableOpacity
                style={styles.volumeButton}
                onPress={() => handleVolumeChange(Math.min(1, volume + 0.1))}
              >
                <Text style={styles.volumeButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.controlItem}>
          <Text style={[styles.controlLabel, { color: currentTheme.textSecondary }]}>音の長さ</Text>
          <View style={styles.sliderContainer}>
            <RotateCcw size={16} color={currentTheme.textSecondary} />
            <View style={styles.durationControl}>
              <TouchableOpacity
                style={styles.durationButton}
                onPress={() => handleDurationChange(Math.max(1, duration - 0.5))}
              >
                <Text style={styles.durationButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.durationText}>{duration.toFixed(1)}秒</Text>
              <TouchableOpacity
                style={styles.durationButton}
                onPress={() => handleDurationChange(Math.min(5, duration + 0.5))}
              >
                <Text style={styles.durationButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.controlItem}>
          <Text style={[styles.controlLabel, { color: currentTheme.textSecondary }]}>継続再生</Text>
          <View style={styles.sliderContainer}>
            <RotateCcw size={16} color={currentTheme.textSecondary} />
            <TouchableOpacity
              style={[styles.toggleButton, { 
                backgroundColor: continuousPlay ? currentTheme.primary : currentTheme.background,
                borderColor: currentTheme.primary 
              }]}
              onPress={() => setContinuousPlay(!continuousPlay)}
            >
              <Text style={[styles.toggleButtonText, { 
                color: continuousPlay ? '#FFFFFF' : currentTheme.primary 
              }]}>
                {continuousPlay ? 'ON' : 'OFF'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* チューニング音ボタン */}
      <View style={styles.notesGrid}>
        {notes.map((note, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.noteButton,
              { 
                backgroundColor: currentNote?.name === note.name 
                  ? currentTheme.primary 
                  : currentTheme.secondary,
                borderColor: currentTheme.accent
              }
            ]}
            onPress={() => playNote(note)}
            activeOpacity={0.7}
          >
            <Text style={[styles.noteName, { color: currentTheme.surface }]}>
              {note.name}
            </Text>
            <Text style={[styles.noteFrequency, { color: currentTheme.surface }]}>
              {`${note.frequency}Hz`}
            </Text>
            <Text style={[styles.noteDescription, { color: currentTheme.surface }]}>
              {note.description}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 再生制御 */}
      {isPlaying && (
        <View style={styles.playbackControls}>
          <TouchableOpacity
            style={[styles.stopButton, { backgroundColor: currentTheme.accent }]}
            onPress={stopSound}
            activeOpacity={0.7}
          >
            <Pause size={20} color={currentTheme.surface} />
            <Text style={[styles.stopButtonText, { color: currentTheme.surface }]}>
              停止
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 現在再生中の音 */}
      {currentNote && (
        <View style={[styles.currentNote, { backgroundColor: currentTheme.background }]}>
          <Text style={[styles.currentNoteLabel, { color: currentTheme.textSecondary }]}>
            現在再生中:
          </Text>
          <Text style={[styles.currentNoteName, { color: currentTheme.text }]}>
            {currentNote.name} ({currentNote.frequency}Hz)
          </Text>
          <Text style={[styles.currentNoteDescription, { color: currentTheme.textSecondary }]}>
            {currentNote.description}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 16,
    marginVertical: 10,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  controls: {
    marginBottom: 20,
  },
  controlItem: {
    marginBottom: 16,
  },
  controlLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  sliderValue: {
    fontSize: 12,
    minWidth: 40,
    textAlign: 'right',
  },
  notesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  noteButton: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  noteName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  noteFrequency: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  noteDescription: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  playbackControls: {
    marginTop: 20,
    alignItems: 'center',
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  stopButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  currentNote: {
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  currentNoteLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  currentNoteName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  currentNoteDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  volumeControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
  },
  volumeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  volumeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  volumeText: {
    fontSize: 14,
    fontWeight: '500',
    minWidth: 40,
    textAlign: 'center',
  },
  durationControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
  },
  durationButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  durationText: {
    fontSize: 14,
    fontWeight: '500',
    minWidth: 60,
    textAlign: 'center',
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
