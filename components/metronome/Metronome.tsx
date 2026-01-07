import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform, Modal } from 'react-native';
import { Play, Pause } from 'lucide-react-native';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import audioResourceManager from '@/lib/audioResourceManager';

// 拍子の選択肢（画像に合わせて拡張）
const timeSignatures = [
  { id: '2/4', name: '2/4拍子', beats: 2, noteValue: 4, display: '2/4' },
  { id: '3/4', name: '3/4拍子', beats: 3, noteValue: 4, display: '3/4' },
  { id: '4/4', name: '4/4拍子', beats: 4, noteValue: 4, display: '4/4' },
  { id: '3/8', name: '3/8拍子', beats: 3, noteValue: 8, display: '3/8' },
  { id: '5/4', name: '5/4拍子', beats: 5, noteValue: 4, display: '5/4' },
  { id: '5/8', name: '5/8拍子', beats: 5, noteValue: 8, display: '5/8' },
  { id: '6/4', name: '6/4拍子', beats: 6, noteValue: 4, display: '6/4' },
  { id: '6/8', name: '6/8拍子', beats: 6, noteValue: 8, display: '6/8' },
  { id: '7/4', name: '7/4拍子', beats: 7, noteValue: 4, display: '7/4' },
  { id: '7/8', name: '7/8拍子', beats: 7, noteValue: 8, display: '7/8' },
  { id: '9/8', name: '9/8拍子', beats: 9, noteValue: 8, display: '9/8' },
  { id: '12/8', name: '12/8拍子', beats: 12, noteValue: 8, display: '12/8' },
];

interface MetronomeProps {
  audioContextRef: React.MutableRefObject<AudioContext | null>;
  ownerName?: string; // オーナー名をpropsとして受け取る（TunerScreenと共有するため）
}

export default function Metronome({ audioContextRef, ownerName = 'Metronome' }: MetronomeProps) {
  const { currentTheme } = useInstrumentTheme();
  const OWNER_NAME = ownerName; // propsから受け取ったオーナー名を使用
  
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
  const [metronomeSoundType, setMetronomeSoundType] = useState<'click' | 'beep' | 'bell'>('click');
  const [isTimeSignatureModalVisible, setIsTimeSignatureModalVisible] = useState(false);

  // メトロノーム設定の読み込み
  useEffect(() => {
    const loadMetronomeSettings = async () => {
      try {
        const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
        const savedSoundType = await AsyncStorage.getItem('metronome_sound_type');
        if (savedSoundType === 'click' || savedSoundType === 'beep' || savedSoundType === 'bell') {
          setMetronomeSoundType(savedSoundType);
          logger.debug('メトロノーム音設定を読み込み:', savedSoundType);
        }
      } catch (error) {
        logger.debug('メトロノーム音設定の読み込みエラー:', error);
      }
    };
    loadMetronomeSettings();
  }, []);

  // メトロノーム音設定の保存
  useEffect(() => {
    const saveMetronomeSettings = async () => {
      try {
        const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
        await AsyncStorage.setItem('metronome_sound_type', metronomeSoundType);
        logger.debug('メトロノーム音設定を保存:', metronomeSoundType);
        
        // 音の変更時にメトロノームが再生中なら再起動
        if (isMetronomePlaying) {
          stopMetronome();
          setTimeout(() => {
            startMetronome(false);
          }, 100);
        }
      } catch (error) {
        logger.debug('メトロノーム音設定の保存エラー:', error);
      }
    };
    saveMetronomeSettings();
  }, [metronomeSoundType]);

  // メトロノーム用のref
  const metronomeIntervalRef = useRef<number | null>(null);
  const activeOscillatorsRef = useRef<OscillatorNode[]>([]);

  // コンポーネントの初期化とクリーンアップ
  useEffect(() => {
    // 根本的な解決: マウント時に既存のメトロノーム状態をリセット
    // リロード時にメトロノームが再生中だった場合、状態を確実にリセットする
    setIsMetronomePlaying(false);
    setCurrentBeat(0);
    
    // 既存のインターバルをクリア（念のため）
    if (metronomeIntervalRef.current) {
      clearInterval(metronomeIntervalRef.current);
      metronomeIntervalRef.current = null;
    }
    
    // 既存のオシレーターを停止（念のため）
    activeOscillatorsRef.current.forEach(osc => {
      try {
        osc.stop();
        osc.disconnect();
      } catch (error) {
        // 既に停止している場合は無視
      }
    });
    activeOscillatorsRef.current = [];
    
    // audioContextRefが既に設定されている場合はそれを使用、そうでない場合は取得
    const initializeAudioContext = async () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        // 既にAudioContextが設定されている場合はそれを使用
        logger.debug('Metronome: Using existing AudioContext from ref');
        return;
      }
      
      // AudioContextを取得
      try {
        const ctx = await audioResourceManager.acquireAudioContext(OWNER_NAME);
        if (ctx) {
          audioContextRef.current = ctx;
        }
      } catch (error) {
        logger.warn('Metronome: Failed to acquire AudioContext, using existing ref:', error);
        // エラーが発生しても既存のaudioContextRefを使用
      }
    };

    initializeAudioContext();

    return () => {
      // クリーンアップ
      if (metronomeIntervalRef.current) {
        clearInterval(metronomeIntervalRef.current);
        metronomeIntervalRef.current = null;
      }
      
      // アクティブなオシレーターを停止
      activeOscillatorsRef.current.forEach(osc => {
        try {
          osc.stop();
          osc.disconnect();
        } catch (error) {
          logger.warn('Failed to stop oscillator during cleanup:', error);
        }
      });
      activeOscillatorsRef.current = [];
      
      // リソースを解放（ownerNameが'Metronome'の場合のみ、共有している場合は解放しない）
      if (ownerName === 'Metronome') {
        audioResourceManager.releaseAllResources(OWNER_NAME);
      }
    };
  }, [ownerName]);

  // AudioContextの初期化と再開（リソース管理サービスを使用）
  const ensureAudioContext = async (): Promise<AudioContext | null> => {
    try {
      // 既にaudioContextRefにAudioContextが設定されている場合はそれを使用
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        const ctx = audioContextRef.current;
        // AudioContextがsuspended状態の場合はresumeする
        if (ctx.state === 'suspended') {
          await ctx.resume();
          logger.debug('AudioContext resumed for metronome');
        }
        return ctx;
      }
      
      // リソース管理サービスからAudioContextを取得
      const ctx = await audioResourceManager.acquireAudioContext(OWNER_NAME);
      if (ctx) {
        audioContextRef.current = ctx;
        
        // AudioContextがsuspended状態の場合はresumeする
        if (ctx.state === 'suspended') {
          await ctx.resume();
          logger.debug('AudioContext resumed for metronome');
        }
      }
      return ctx;
    } catch (error) {
      logger.error('Failed to initialize AudioContext:', error);
      ErrorHandler.handle(error, 'AudioContextの初期化', false);
      return null;
    }
  };

  // メトロノームのクリック音を再生
  const playMetronomeClick = async (isStrongBeat: boolean) => {
    const ctx = await ensureAudioContext();
    if (!ctx) {
      logger.warn('AudioContext not available for metronome');
      return;
    }
    
    // AudioContextの状態を確認して必要に応じてresume
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
        logger.debug('AudioContext resumed before playing metronome sound');
      } catch (error) {
        logger.error('Failed to resume AudioContext:', error);
        return;
      }
    }
    
    if (ctx.state !== 'running') {
      logger.warn('AudioContext state is not running:', ctx.state);
      return;
    }
    
    const currentTime = ctx.currentTime;
    
    switch (metronomeSoundType) {
      case 'click':
        // 典型的なメトロノームのクリック音（チック・トック）
        {
          if (isStrongBeat) {
            // 強拍: 「チック」音（高い音、短く鋭い）
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            // オシレーターをリソース管理サービスに登録
            audioResourceManager.registerOscillator(OWNER_NAME, oscillator);
            activeOscillatorsRef.current.push(oscillator);
            
            // 典型的なメトロノームの強拍音: 約1000Hz
            oscillator.frequency.setValueAtTime(1000, currentTime);
            oscillator.type = 'square'; // より明確な音色
            
            // 短く鋭いアタック（典型的なメトロノームの「チック」音）
            // スマホでも聞こえるように音量を上げる（修正）
            gainNode.gain.setValueAtTime(0, currentTime);
            gainNode.gain.linearRampToValueAtTime(metronomeVolume * 1.2, currentTime + 0.003);
            gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.06);
            
            oscillator.start(currentTime);
            oscillator.stop(currentTime + 0.05);
            
            // 停止後に配列から削除
            oscillator.onended = () => {
              activeOscillatorsRef.current = activeOscillatorsRef.current.filter(osc => osc !== oscillator);
            };
          } else {
            // 弱拍: 「トック」音（低い音、やや柔らかい）
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            // オシレーターをリソース管理サービスに登録
            audioResourceManager.registerOscillator(OWNER_NAME, oscillator);
            activeOscillatorsRef.current.push(oscillator);
            
            // 典型的なメトロノームの弱拍音: 約600Hz
            oscillator.frequency.setValueAtTime(600, currentTime);
            oscillator.type = 'square'; // 強拍と同じ音色で統一感を出す
            
            // やや柔らかいアタック（典型的なメトロノームの「トック」音）
            // スマホでも聞こえるように音量を上げる（修正）
            gainNode.gain.setValueAtTime(0, currentTime);
            gainNode.gain.linearRampToValueAtTime(metronomeVolume * 1.0, currentTime + 0.003);
            gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.09);
            
            oscillator.start(currentTime);
            oscillator.stop(currentTime + 0.08);
            
            // 停止後に配列から削除
            oscillator.onended = () => {
              activeOscillatorsRef.current = activeOscillatorsRef.current.filter(osc => osc !== oscillator);
            };
          }
        }
        break;
        
      case 'beep':
        // ビープ音（明確な音色、強拍と弱拍で周波数を変える）
        {
          const oscillator = ctx.createOscillator();
          const gainNode = ctx.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(ctx.destination);
          
          // オシレーターをリソース管理サービスに登録
          audioResourceManager.registerOscillator(OWNER_NAME, oscillator);
          activeOscillatorsRef.current.push(oscillator);
          
          oscillator.type = 'square'; // より明確な音色
          if (isStrongBeat) {
            oscillator.frequency.setValueAtTime(1200, currentTime); // 強拍：高い音
          } else {
            oscillator.frequency.setValueAtTime(600, currentTime); // 弱拍：低い音
          }
          
          // スマホでも聞こえるように音量を上げる
          gainNode.gain.setValueAtTime(0, currentTime);
          gainNode.gain.linearRampToValueAtTime(metronomeVolume * 1.0, currentTime + 0.005);
          gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.12);
          
          oscillator.start(currentTime);
          oscillator.stop(currentTime + 0.12);
          
          // 停止後に配列から削除
          oscillator.onended = () => {
            activeOscillatorsRef.current = activeOscillatorsRef.current.filter(osc => osc !== oscillator);
          };
        }
        break;
        
      case 'bell':
        // ベル音（複数のオシレーターで倍音を生成、より自然な音色）
        {
          const baseFreq = isStrongBeat ? 880 : 440;
          const oscillators: OscillatorNode[] = [];
          const gainNodes: GainNode[] = [];
          const volumes = [1.0, 0.5, 0.3, 0.2]; // 倍音ごとの音量
          
          // 基本音と倍音を生成（4つの倍音でより豊かな音色）
          for (let i = 0; i < 4; i++) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            // オシレーターをリソース管理サービスに登録
            audioResourceManager.registerOscillator(OWNER_NAME, osc);
            activeOscillatorsRef.current.push(osc);
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(baseFreq * (i + 1), currentTime);
            
            // スマホでも聞こえるように音量を上げる
            const volume = metronomeVolume * volumes[i] * (isStrongBeat ? 0.8 : 0.6);
            const duration = isStrongBeat ? 0.25 : 0.2;
            gain.gain.setValueAtTime(0, currentTime);
            gain.gain.linearRampToValueAtTime(volume, currentTime + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.01, currentTime + duration);
            
            osc.start(currentTime);
            osc.stop(currentTime + duration);
            
            // 停止後に配列から削除
            osc.onended = () => {
              activeOscillatorsRef.current = activeOscillatorsRef.current.filter(o => o !== osc);
            };
            
            oscillators.push(osc);
            gainNodes.push(gain);
          }
        }
        break;
    }
  };

  // メトロノームの開始
  const startMetronome = (resetBeatCount = true) => {
    // 根本的な解決: 既存のインターバルとオシレーターを確実にクリーンアップ
    // これにより、二重再生を防ぐ
    if (metronomeIntervalRef.current) {
      clearInterval(metronomeIntervalRef.current);
      metronomeIntervalRef.current = null;
    }
    
    // 既存のオシレーターを停止（念のため）
    activeOscillatorsRef.current.forEach(osc => {
      try {
        osc.stop();
        osc.disconnect();
      } catch (error) {
        // 既に停止している場合は無視
      }
    });
    activeOscillatorsRef.current = [];
    
    // 状態を更新
    setIsMetronomePlaying(true);
    setCurrentBeat(0);
    
    const interval = (60 / bpm) * 1000;
    let beatCount = resetBeatCount ? 0 : 0; // 常に0から開始
    
    // 最初のビートを即座に設定して音を再生
    setCurrentBeat(0);
    playMetronomeClick(true).catch((error) => {
      logger.error('Failed to play initial metronome click:', error);
    });
    
    metronomeIntervalRef.current = setInterval(() => {
      beatCount++;
      const currentBeatIndex = beatCount % selectedTimeSignature.beats;
      setCurrentBeat(currentBeatIndex);
      playMetronomeClick(currentBeatIndex === 0).catch((error) => {
        logger.error('Failed to play metronome click:', error);
      }); // 強拍は1拍目のみ
    }, interval);
  };

  // メトロノームの停止
  const stopMetronome = () => {
    // 根本的な解決: 状態を先に更新してから、リソースをクリーンアップ
    setIsMetronomePlaying(false);
    setCurrentBeat(0);
    
    // インターバルをクリア
    if (metronomeIntervalRef.current) {
      clearInterval(metronomeIntervalRef.current);
      metronomeIntervalRef.current = null;
    }
    
    // アクティブなオシレーターを停止
    activeOscillatorsRef.current.forEach(osc => {
      try {
        osc.stop();
        osc.disconnect();
      } catch (error) {
        // 既に停止している場合は無視
      }
    });
    activeOscillatorsRef.current = [];
  };

  // BPMを直接設定（即座に反映）
  const setBpmDirect = (value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 30 && numValue <= 300) {
      const wasPlaying = isMetronomePlaying;
      
      // まずBPMを更新
      setBpm(numValue);
      setBpmInput(numValue.toString()); // 入力値も正しい値に更新
      
      // 再生中の場合は、即座にインターバルを更新
      if (wasPlaying && metronomeIntervalRef.current) {
        // 既存のインターバルをクリア
        clearInterval(metronomeIntervalRef.current);
        metronomeIntervalRef.current = null;
        
        // 新しいBPMで即座に再開
        const newInterval = (60 / numValue) * 1000;
        let beatCount = 0;
        
        // 最初のビートを即座に再生
        setCurrentBeat(0);
        playMetronomeClick(true).catch((error) => {
          logger.error('Failed to play initial metronome click:', error);
        });
        
        // 新しいインターバルを設定
        metronomeIntervalRef.current = setInterval(() => {
          beatCount++;
          const currentBeatIndex = beatCount % selectedTimeSignature.beats;
          setCurrentBeat(currentBeatIndex);
          playMetronomeClick(currentBeatIndex === 0).catch((error) => {
            logger.error('Failed to play metronome click:', error);
          });
        }, newInterval);
      }
    } else {
      // 無効な値の場合は、現在のBPMに戻す
      setBpmInput(bpm.toString());
    }
  };

  // BPM入力用の状態
  const [bpmInput, setBpmInput] = useState<string>('');

  // BPMが変更されたら入力値も更新
  useEffect(() => {
    setBpmInput(bpm.toString());
  }, [bpm]);

  // 拍子変更時の処理
  const handleTimeSignatureChange = (timeSignature: typeof timeSignatures[0]) => {
    const wasPlaying = isMetronomePlaying; // 現在の再生状態を保存
    
    // 拍子を先に変更
    setSelectedTimeSignature(timeSignature);
    
    // モーダルを閉じる
    setIsTimeSignatureModalVisible(false);
    
    // メトロノームが再生中だった場合は再起動
    if (wasPlaying) {
      // インターバルをクリアして即座に再開
      if (metronomeIntervalRef.current) {
        clearInterval(metronomeIntervalRef.current);
        metronomeIntervalRef.current = null;
      }
      
      // 新しい拍子で即座に再開
      setCurrentBeat(0);
      playMetronomeClick(true).catch((error) => {
        logger.error('Failed to play initial metronome click:', error);
      }); // 最初のビートを再生
      
      const interval = (60 / bpm) * 1000;
      let beatCount = 0;
      
      metronomeIntervalRef.current = setInterval(() => {
        beatCount++;
        const currentBeatIndex = beatCount % timeSignature.beats;
        setCurrentBeat(currentBeatIndex);
        playMetronomeClick(currentBeatIndex === 0).catch((error) => {
          logger.error('Failed to play metronome click:', error);
        });
      }, interval);
    }
  };

  return (
    <>
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

      {/* 設定エリア */}
      <View style={[styles.settingsContainer, { backgroundColor: currentTheme.surface }]}>
        {/* BPM調整 */}
        <View style={styles.bpmAdjustContainer}>
          <Text style={[styles.settingLabel, { color: currentTheme.textSecondary }]}>
            BPM調整
          </Text>
          
          {/* スライダー（Web環境） */}
          {Platform.OS === 'web' && (
            <View style={styles.bpmSliderContainer}>
              <input
                type="range"
                min="30"
                max="300"
                value={bpm}
                onChange={(e) => {
                  const newBpm = parseInt(e.target.value, 10);
                  if (!isNaN(newBpm) && newBpm >= 30 && newBpm <= 300) {
                    setBpmDirect(newBpm.toString());
                    setBpmInput(newBpm.toString());
                  }
                }}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  outline: 'none',
                  backgroundColor: currentTheme.secondary,
                  accentColor: currentTheme.primary,
                }}
              />
            </View>
          )}
          
          {/* 直接入力 */}
          <View style={styles.bpmInputContainer}>
            <TextInput
              style={[
                styles.bpmInput,
                {
                  backgroundColor: currentTheme.secondary,
                  color: currentTheme.text,
                  borderColor: currentTheme.primary,
                }
              ]}
              value={bpmInput}
              onChangeText={(text) => {
                // 数字のみを許可（空文字も許可して入力中を可能にする）
                const numericText = text.replace(/[^0-9]/g, '');
                setBpmInput(numericText);
              }}
              onBlur={() => {
                // フォーカスを外した時にバリデーションして設定
                setBpmDirect(bpmInput);
              }}
              onSubmitEditing={() => {
                // Enterキーで確定時にバリデーションして設定
                setBpmDirect(bpmInput);
              }}
              keyboardType="numeric"
              placeholder="BPM"
              placeholderTextColor={currentTheme.textSecondary}
            />
            <Text style={[styles.bpmInputLabel, { color: currentTheme.textSecondary }]}>
              BPM (30-300)
            </Text>
          </View>
        </View>

        {/* 拍子設定 */}
        <View style={styles.timeSignatureSettingContainer}>
          <Text style={[styles.settingLabel, { color: currentTheme.textSecondary }]}>
            拍子設定
          </Text>
          <TouchableOpacity
            style={[
              styles.timeSignatureDisplayButton,
              {
                backgroundColor: currentTheme.secondary,
              }
            ]}
            onPress={() => setIsTimeSignatureModalVisible(true)}
          >
            <Text
              style={[
                styles.timeSignatureDisplayButtonText,
                {
                  color: currentTheme.text,
                }
              ]}
            >
              {selectedTimeSignature.display}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 拍子選択モーダル */}
        <Modal
          visible={isTimeSignatureModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsTimeSignatureModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setIsTimeSignatureModalVisible(false)}
          >
            <View
              style={[
                styles.modalContent,
                { backgroundColor: currentTheme.surface }
              ]}
              onStartShouldSetResponder={() => true}
            >
              <View style={styles.timeSignatureModalGrid}>
                {timeSignatures.map((timeSignature) => (
                  <TouchableOpacity
                    key={timeSignature.id}
                    style={[
                      styles.timeSignatureModalButton,
                      {
                        backgroundColor: selectedTimeSignature.id === timeSignature.id
                          ? currentTheme.primary
                          : currentTheme.secondary,
                        borderColor: selectedTimeSignature.id === timeSignature.id
                          ? currentTheme.primary
                          : currentTheme.textSecondary + '60',
                      }
                    ]}
                    onPress={() => handleTimeSignatureChange(timeSignature)}
                  >
                    <Text
                      style={[
                        styles.timeSignatureModalButtonText,
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
          </TouchableOpacity>
        </Modal>

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
                onPress={() => setMetronomeSoundType(sound.id as 'click' | 'beep' | 'bell')}
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
    </>
  );
}

const styles = StyleSheet.create({
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
  bpmSliderContainer: {
    width: '100%',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  bpmInputContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  bpmInput: {
    width: 120,
    height: 40,
    borderWidth: 2,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  bpmInputLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  timeSignatureSettingContainer: {
    marginBottom: 20,
  },
  timeSignatureDisplayButton: {
    width: 60,
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    alignSelf: 'center',
    elevation: 3,
    borderWidth: 2,
  },
  timeSignatureDisplayButtonText: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    backdropFilter: 'blur(4px)',
  },
  modalContent: {
    borderRadius: 24,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    elevation: 8,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
    }),
  },
  timeSignatureModalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
  },
  timeSignatureModalButton: {
    width: 70,
    height: 70,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  timeSignatureModalButtonText: {
    fontSize: 18,
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
});


