import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Play, Pause, RotateCcw } from 'lucide-react-native';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { useTimer } from '@/hooks/useTimer';
import { createShadowStyle } from '@/lib/shadowStyles';

interface StopwatchProps {
  onComplete?: () => void;
}

export default function Stopwatch({ onComplete }: StopwatchProps) {
  const { currentTheme } = useInstrumentTheme();
  const [lapTimes, setLapTimes] = useState<Array<{ id: number; time: number; lapTime: number }>>([]);
  const lapIdRef = useRef<number>(0);
  const previousLapTimeRef = useRef<number>(0);

  const {
    stopwatchSeconds,
    isStopwatchRunning,
    startStopwatch,
    pauseStopwatch,
    resetStopwatch,
  } = useTimer(onComplete);

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleLap = () => {
    const currentLapTime = stopwatchSeconds - previousLapTimeRef.current;
    const newLap = {
      id: lapIdRef.current++,
      time: stopwatchSeconds,
      lapTime: currentLapTime,
    };
    setLapTimes(prev => [newLap, ...prev]);
    previousLapTimeRef.current = stopwatchSeconds;
  };

  const handleReset = () => {
    resetStopwatch();
    setLapTimes([]);
    lapIdRef.current = 0;
    previousLapTimeRef.current = 0;
  };

  const handleStart = () => {
    startStopwatch();
    if (stopwatchSeconds === 0) {
      previousLapTimeRef.current = 0;
    }
  };

  return (
    <>
      {/* 時間表示 */}
      <View style={[styles.stopwatchTimeContainer, { backgroundColor: currentTheme.surface }]}>
        <Text style={[styles.stopwatchTime, { color: currentTheme.text }]}>
          {formatTime(stopwatchSeconds)}
        </Text>
      </View>
      
      {/* ラップタイムリスト */}
      {lapTimes.length > 0 && (
        <View style={[styles.lapTimesContainer, { backgroundColor: currentTheme.surface }]}>
          <View style={styles.lapTimesHeader}>
            <Text style={[styles.lapTimesTitle, { color: currentTheme.text }]}>
              ラップ ({lapTimes.length})
            </Text>
            <TouchableOpacity
              onPress={() => {
                setLapTimes([]);
                lapIdRef.current = 0;
                previousLapTimeRef.current = 0;
              }}
            >
              <Text style={[styles.clearLapsButton, { color: currentTheme.primary }]}>クリア</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.lapTimesList} showsVerticalScrollIndicator={false}>
            {lapTimes.map((lap, index) => (
              <View key={lap.id} style={[styles.lapTimeItem, { borderBottomColor: currentTheme.textSecondary + '20' }]}>
                <Text style={[styles.lapNumber, { color: currentTheme.textSecondary }]}>
                  #{lapTimes.length - index}
                </Text>
                <Text style={[styles.lapTimeText, { color: currentTheme.text }]}>
                  {formatTime(lap.lapTime)}
                </Text>
                <Text style={[styles.lapTotalTime, { color: currentTheme.textSecondary }]}>
                  {formatTime(lap.time)}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* コントロールボタン */}
      <View style={styles.stopwatchControls}>
        {isStopwatchRunning ? (
          // 計測中：ラップボタンと一時停止ボタン
          <>
            <TouchableOpacity
              style={[styles.stopwatchButton, { backgroundColor: currentTheme.secondary }]}
              onPress={handleLap}
            >
              <Text style={[styles.stopwatchButtonText, { color: currentTheme.text, fontSize: 12 }]}>ラップ</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.stopwatchButton, styles.stopwatchMainButton, { 
                backgroundColor: currentTheme.primary
              }]}
              onPress={pauseStopwatch}
            >
              <Pause size={22} color={currentTheme.surface} />
            </TouchableOpacity>
          </>
        ) : (
          // 停止中：開始ボタンとリセットボタン
          <>
            {stopwatchSeconds > 0 && (
              <TouchableOpacity
                style={[styles.stopwatchButton, { backgroundColor: currentTheme.secondary }]}
                onPress={handleReset}
              >
                <RotateCcw size={20} color={currentTheme.text} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.stopwatchButton, styles.stopwatchMainButton, { 
                backgroundColor: currentTheme.primary
              }]}
              onPress={handleStart}
            >
              <Play size={22} color={currentTheme.surface} />
            </TouchableOpacity>
          </>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  stopwatchTimeContainer: {
    width: '100%',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    ...createShadowStyle({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 2,
    }),
    marginBottom: 12,
  },
  stopwatchTime: {
    fontSize: 48,
    fontWeight: '700',
    fontFamily: 'monospace',
    letterSpacing: 1,
    textAlign: 'center',
  },
  stopwatchControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
    paddingHorizontal: 16,
  },
  stopwatchButton: {
    minWidth: 80,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    elevation: 2,
    ...createShadowStyle({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    }),
  },
  stopwatchMainButton: {
    minWidth: 100,
    height: 48,
    borderRadius: 24,
  },
  stopwatchButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  lapTimesContainer: {
    width: '100%',
    maxWidth: 400,
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
    maxHeight: 300,
    elevation: 2,
    ...createShadowStyle({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 2,
    }),
  },
  lapTimesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  lapTimesTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  clearLapsButton: {
    fontSize: 11,
    fontWeight: '600',
  },
  lapTimesList: {
    maxHeight: 200,
  },
  lapTimeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  lapNumber: {
    fontSize: 11,
    fontWeight: '500',
    width: 30,
  },
  lapTimeText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  lapTotalTime: {
    fontSize: 11,
    fontWeight: '500',
    width: 70,
    textAlign: 'right',
  },
});

