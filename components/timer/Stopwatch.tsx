import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Clock, Pencil, RotateCcw } from 'lucide-react-native';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { useTimer } from '@/hooks/useTimer';
import { createShadowStyle } from '@/lib/shadowStyles';

interface StopwatchProps {
  onComplete?: () => void;
}

interface LapTime {
  id: string;
  lapTime: number; // ミリ秒
  totalTime: number; // ミリ秒
}

export default function Stopwatch({ onComplete }: StopwatchProps) {
  const { currentTheme } = useInstrumentTheme();
  
  // ミリ秒追跡用
  const [milliseconds, setMilliseconds] = useState<number>(0);
  const startTimeRef = useRef<number | null>(null);
  const pausedTotalMsRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // ラップタイム管理
  const [laps, setLaps] = useState<LapTime[]>([]);
  const lastLapTimeRef = useRef<number>(0); // 前回のラップ時点での経過時間（ミリ秒）

  const {
    stopwatchSeconds,
    isStopwatchRunning,
    startStopwatch,
    pauseStopwatch,
    resetStopwatch,
  } = useTimer(onComplete);

  // ミリ秒の更新処理
  useEffect(() => {
    if (isStopwatchRunning) {
      // 再開時：停止前の経過時間を考慮してstartTimeRefを設定
      if (startTimeRef.current === null) {
        // 停止時に保存した経過時間（ミリ秒）を基準に開始時刻を計算
        // pausedTotalMsRef.currentには停止時の全体の経過時間が保存されている
        startTimeRef.current = Date.now() - pausedTotalMsRef.current;
      }
      
      intervalRef.current = setInterval(() => {
        if (startTimeRef.current !== null) {
          const elapsed = Date.now() - startTimeRef.current;
          pausedTotalMsRef.current = elapsed;
          setMilliseconds(elapsed % 1000);
        }
      }, 10); // 10msごとに更新（滑らかな表示）
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // 一時停止時：現在の経過時間を保存してstartTimeRefをリセット
      if (startTimeRef.current !== null) {
        // 停止時の全体の経過時間（ミリ秒）を保存
        // stopwatchSecondsとmillisecondsを合わせて正確な経過時間を計算
        const currentTotalMs = stopwatchSeconds * 1000 + milliseconds;
        pausedTotalMsRef.current = currentTotalMs;
        // 一時停止時のミリ秒を保持
        setMilliseconds(currentTotalMs % 1000);
        // 再開時に正しく計算できるようにstartTimeRefをリセット
        startTimeRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isStopwatchRunning]);
  
  // stopwatchSecondsが更新された時に、停止中なら経過時間を更新
  useEffect(() => {
    if (!isStopwatchRunning && stopwatchSeconds > 0) {
      // 停止中にstopwatchSecondsが更新された場合（外部からの更新など）、
      // 経過時間を再計算（ただし、startTimeRefがnullの場合のみ）
      if (startTimeRef.current === null) {
        const currentTotalMs = stopwatchSeconds * 1000 + milliseconds;
        pausedTotalMsRef.current = currentTotalMs;
      }
    }
  }, [stopwatchSeconds, isStopwatchRunning, milliseconds]);

  // リセット時にミリ秒もリセット
  useEffect(() => {
    if (stopwatchSeconds === 0 && !isStopwatchRunning) {
      setMilliseconds(0);
      pausedTotalMsRef.current = 0;
      startTimeRef.current = null;
      setLaps([]);
      lastLapTimeRef.current = 0;
    }
  }, [stopwatchSeconds, isStopwatchRunning]);

  const formatTime = (totalSeconds: number, ms: number = 0) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    const msStr = Math.floor(ms / 10).toString().padStart(2, '0'); // 10ms単位で表示
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${msStr}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${msStr}`;
  };

  const formatTimeFromMs = (totalMs: number) => {
    const totalSeconds = Math.floor(totalMs / 1000);
    const ms = totalMs % 1000;
    return formatTime(totalSeconds, ms);
  };

  const handleStop = () => {
    // 停止時に現在の経過時間（秒 + ミリ秒）を正確に保存
    const currentTotalMs = stopwatchSeconds * 1000 + milliseconds;
    pausedTotalMsRef.current = currentTotalMs;
    pauseStopwatch();
  };

  const handleLap = () => {
    if (!isStopwatchRunning) return;
    
    const currentTotalMs = stopwatchSeconds * 1000 + milliseconds;
    const lapTime = currentTotalMs - lastLapTimeRef.current;
    
    const newLap: LapTime = {
      id: Date.now().toString(),
      lapTime: lapTime,
      totalTime: currentTotalMs,
    };
    
    setLaps(prev => [newLap, ...prev]);
    lastLapTimeRef.current = currentTotalMs;
  };

  const handleClear = () => {
    // ストップウォッチの時間をリセット
    resetStopwatch();
    setMilliseconds(0);
    pausedTotalMsRef.current = 0;
    startTimeRef.current = null;
    // ラップタイムもクリア
    setLaps([]);
    lastLapTimeRef.current = 0;
  };

  const handleStart = () => {
    if (!isStopwatchRunning) {
      // 新規開始時（時間が0）はラップ時点をリセット
      if (stopwatchSeconds === 0 && milliseconds === 0) {
        lastLapTimeRef.current = 0;
        pausedTotalMsRef.current = 0;
      } else {
        // 再開時：停止前の経過時間を正確に保存（念のため）
        const currentTotalMs = stopwatchSeconds * 1000 + milliseconds;
        pausedTotalMsRef.current = currentTotalMs;
      }
      startStopwatch();
    }
  };

  const handleReset = () => {
    resetStopwatch();
    setMilliseconds(0);
    pausedTotalMsRef.current = 0;
    startTimeRef.current = null;
    setLaps([]);
    lastLapTimeRef.current = 0;
  };

  return (
    <>
      {/* 時間表示 */}
      <View style={[styles.stopwatchTimeContainer, { backgroundColor: currentTheme.surface }]}>
        <Text style={[styles.stopwatchTime, { color: currentTheme.primary }]}>
          {formatTime(stopwatchSeconds, milliseconds)}
        </Text>
      </View>

      {/* コントロールボタン（3つのボタン横並び） */}
      <View style={styles.stopwatchControls}>
        <TouchableOpacity
          style={[
            styles.stopwatchControlButton,
            { 
              backgroundColor: isStopwatchRunning ? currentTheme.primary : currentTheme.secondary,
              borderWidth: isStopwatchRunning ? 0 : 1,
              borderColor: currentTheme.secondary,
            }
          ]}
          onPress={isStopwatchRunning ? handleStop : handleStart}
          activeOpacity={0.7}
        >
          <Clock size={16} color={isStopwatchRunning ? currentTheme.surface : currentTheme.text} />
          <Text 
            style={[
              styles.stopwatchControlButtonText,
              { color: isStopwatchRunning ? currentTheme.surface : currentTheme.text }
            ]}
            numberOfLines={1}
          >
            {isStopwatchRunning ? 'ストップ' : '開始'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.stopwatchControlButton,
            { 
              backgroundColor: isStopwatchRunning ? currentTheme.primary : currentTheme.secondary,
              borderWidth: 1,
              borderColor: currentTheme.primary,
            }
          ]}
          onPress={handleLap}
          disabled={!isStopwatchRunning}
          activeOpacity={0.7}
        >
          <Pencil size={16} color={isStopwatchRunning ? currentTheme.surface : currentTheme.textSecondary} />
          <Text 
            style={[
              styles.stopwatchControlButtonText,
              { color: isStopwatchRunning ? currentTheme.surface : currentTheme.textSecondary }
            ]}
            numberOfLines={1}
          >
            ラップ
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.stopwatchControlButton,
            { 
              backgroundColor: currentTheme.secondary,
              borderWidth: 1,
              borderColor: currentTheme.secondary,
            }
          ]}
          onPress={handleClear}
          activeOpacity={0.7}
        >
          <RotateCcw size={16} color={currentTheme.text} />
          <Text 
            style={[
              styles.stopwatchControlButtonText,
              { color: currentTheme.text }
            ]}
            numberOfLines={1}
          >
            クリア
          </Text>
        </TouchableOpacity>
      </View>

      {/* ラップタイムテーブル */}
      {laps.length > 0 && (
        <View style={[styles.lapTableContainer, { backgroundColor: currentTheme.surface }]}>
          <View style={styles.lapTableHeader}>
            <Text style={[styles.lapTableHeaderText, { color: currentTheme.text }]}>ラップ</Text>
            <Text style={[styles.lapTableHeaderText, { color: currentTheme.text }]}>ラップ時間</Text>
            <Text style={[styles.lapTableHeaderText, { color: currentTheme.text }]}>合計時間</Text>
          </View>
          <ScrollView style={styles.lapTableBody} showsVerticalScrollIndicator={false}>
            {laps.map((lap, index) => (
              <View key={lap.id} style={styles.lapTableRow}>
                <Text style={[styles.lapTableCell, styles.lapNumber, { color: currentTheme.text }]}>
                  {laps.length - index}
                </Text>
                <Text style={[styles.lapTableCell, { color: currentTheme.text }]}>
                  {formatTimeFromMs(lap.lapTime)}
                </Text>
                <Text style={[styles.lapTableCell, { color: currentTheme.text }]}>
                  {formatTimeFromMs(lap.totalTime)}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  stopwatchTimeContainer: {
    width: '100%',
    paddingVertical: 32,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  stopwatchTime: {
    fontSize: 64,
    fontWeight: '700',
    fontFamily: 'monospace',
    letterSpacing: 2,
    textAlign: 'center',
  },
  stopwatchControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
    marginBottom: 24,
    gap: 8,
  },
  stopwatchControlButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 6,
  },
  stopwatchControlButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  lapTableContainer: {
    width: '100%',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  lapTableHeader: {
    flexDirection: 'row',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    marginBottom: 8,
  },
  lapTableHeaderText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  lapTableBody: {
    maxHeight: 300,
  },
  lapTableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  lapTableCell: {
    flex: 1,
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  lapNumber: {
    fontWeight: '600',
  },
});

