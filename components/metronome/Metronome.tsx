import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Play, Pause } from 'lucide-react-native';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';

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

interface MetronomeProps {
  audioContextRef: React.MutableRefObject<AudioContext | null>;
}

export default function Metronome({ audioContextRef }: MetronomeProps) {
  const { currentTheme } = useInstrumentTheme();
  
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

  // メトロノーム用のref
  const metronomeIntervalRef = useRef<number | null>(null);

  // コンポーネントの初期化
  useEffect(() => {
    return () => {
      // クリーンアップ
      if (metronomeIntervalRef.current) {
        clearInterval(metronomeIntervalRef.current);
      }
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

  // 拍子変更時の処理
  const handleTimeSignatureChange = (timeSignature: typeof timeSignatures[0]) => {
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
  };

  return (
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

      {/* 設定エリア */}
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
                onPress={() => handleTimeSignatureChange(timeSignature)}
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
});


