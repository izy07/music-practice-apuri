import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
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
  const [displayTimeMs, setDisplayTimeMs] = useState<number>(0); // 表示用の経過時間（ミリ秒）
  const startTimeRef = useRef<number | null>(null);
  const pausedTotalMsRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
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

  // ミリ秒の更新処理（完全に独立した計算）
  useEffect(() => {
    if (isStopwatchRunning) {
      // 再開時：停止前の経過時間を考慮してstartTimeRefを設定
      if (startTimeRef.current === null) {
        // 停止時に保存した経過時間（ミリ秒）を基準に開始時刻を計算
        startTimeRef.current = Date.now() - pausedTotalMsRef.current;
        // 開始直後にdisplayTimeMsを更新（1秒戻る問題を防ぐ）
        setDisplayTimeMs(pausedTotalMsRef.current);
      }
      
      intervalRef.current = setInterval(() => {
        if (startTimeRef.current !== null) {
          const elapsed = Date.now() - startTimeRef.current;
          pausedTotalMsRef.current = elapsed;
          const ms = elapsed % 1000;
          setMilliseconds(ms);
          setDisplayTimeMs(elapsed); // 表示用の経過時間を更新
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
        const elapsed = Date.now() - startTimeRef.current;
        pausedTotalMsRef.current = elapsed;
        const ms = elapsed % 1000;
        setMilliseconds(ms);
        setDisplayTimeMs(elapsed); // 表示用の経過時間を更新
        // 再開時に正しく計算できるようにstartTimeRefをリセット
        startTimeRef.current = null;
      } else if (pausedTotalMsRef.current > 0) {
        // 停止中で、startTimeRefがnullの場合（既に停止済み）
        // pausedTotalMsRefから直接ミリ秒を計算して表示を保持
        const pausedMs = pausedTotalMsRef.current % 1000;
        setMilliseconds(pausedMs);
        setDisplayTimeMs(pausedTotalMsRef.current); // 表示用の経過時間を更新
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isStopwatchRunning]);
  
  // stopwatchSecondsは完全に無視し、displayTimeMsを完全に独立して管理
  // これにより、開始時に1秒戻る問題を根本的に解決

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
    // 停止時に現在の経過時間（ミリ秒）を正確に保存
    if (startTimeRef.current !== null) {
      const elapsed = Date.now() - startTimeRef.current;
      pausedTotalMsRef.current = elapsed;
      const ms = elapsed % 1000;
      setMilliseconds(ms);
      setDisplayTimeMs(elapsed); // 表示用の経過時間を更新（重要：これがないとゼロになる）
      startTimeRef.current = null;
    } else {
      // startTimeRefがnullの場合でも、pausedTotalMsRefから表示を更新
      setDisplayTimeMs(pausedTotalMsRef.current);
    }
    
    pauseStopwatch();
  };

  const handleLapProcessing = useRef(false); // ラップ処理中フラグ
  const lapHandler = useCallback(() => {
    // 既に処理中の場合は何もしない（重複実行を防ぐ）
    if (handleLapProcessing.current) {
      return;
    }
    
    // ストップウォッチが実行中でない、または開始時刻が設定されていない場合は何もしない
    if (!isStopwatchRunning || startTimeRef.current === null) {
      return;
    }
    
    handleLapProcessing.current = true;
    
    // 現在の経過時間を正確に計算（ミリ秒単位）
    const elapsed = Date.now() - startTimeRef.current;
    const lapTime = elapsed - lastLapTimeRef.current;
    
    const newLap: LapTime = {
      id: Date.now().toString(),
      lapTime: lapTime,
      totalTime: elapsed,
    };
    
    setLaps(prev => [newLap, ...prev]);
    lastLapTimeRef.current = elapsed;
    
    // 少し遅延してフラグをリセット（重複実行を防ぐ）
    setTimeout(() => {
      handleLapProcessing.current = false;
    }, 300);
  }, [isStopwatchRunning]);

  const handleClear = () => {
    // ストップウォッチの時間をリセット
    resetStopwatch();
    setMilliseconds(0);
    setDisplayTimeMs(0);
    pausedTotalMsRef.current = 0;
    startTimeRef.current = null;
    // ラップタイムもクリア
    setLaps([]);
    lastLapTimeRef.current = 0;
  };

  const handleStart = useRef(false); // 開始処理中フラグ
  const startHandler = () => {
    // 既に処理中の場合は何もしない（重複実行を防ぐ）
    if (handleStart.current) {
      return;
    }
    
    handleStart.current = true;
    
    if (!isStopwatchRunning) {
      // 新規開始時（時間が0）はラップ時点をリセット
      if (pausedTotalMsRef.current === 0) {
        lastLapTimeRef.current = 0;
        startTimeRef.current = Date.now();
        setDisplayTimeMs(0); // 新規開始時は0に設定
      } else {
        // 再開時：停止前の経過時間を保持して、すぐに表示を更新
        // useEffectでstartTimeRefが設定される前に、displayTimeMsを保持
        setDisplayTimeMs(pausedTotalMsRef.current);
      }
      startStopwatch();
    }
    
    // 少し遅延してフラグをリセット（重複実行を防ぐ）
    setTimeout(() => {
      handleStart.current = false;
    }, 300);
  };

  const handleReset = () => {
    resetStopwatch();
    setMilliseconds(0);
    setDisplayTimeMs(0);
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
          {formatTimeFromMs(displayTimeMs)}
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
          onPress={() => {
            if (isStopwatchRunning) {
              handleStop();
            } else {
              startHandler();
            }
          }}
          activeOpacity={0.7}
          hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
        >
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
              backgroundColor: currentTheme.secondary,
              borderWidth: 1,
              borderColor: currentTheme.primary,
            }
          ]}
          onPress={lapHandler}
          disabled={!isStopwatchRunning}
          activeOpacity={0.7}
          hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
        >
          <Text 
            style={[
              styles.stopwatchControlButtonText,
              { color: currentTheme.textSecondary }
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
    fontSize: 48,
    fontWeight: '700',
    fontFamily: 'monospace',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  stopwatchControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 8,
    marginBottom: 24,
    gap: 8, // ボタン間の間隔を調整
  },
  stopwatchControlButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 8,
    gap: 4,
    minWidth: 0, // flexアイテムが縮小できるようにする
  },
  stopwatchControlButtonText: {
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1, // テキストが縮小できるようにする
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

