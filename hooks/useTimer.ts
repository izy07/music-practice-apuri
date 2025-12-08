import { useState, useEffect, useRef } from 'react';
import TimerService from '@/components/TimerService';
import logger from '@/lib/logger';

export function useTimer(onTimerComplete?: () => void) {
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [stopwatchSeconds, setStopwatchSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isStopwatchRunning, setIsStopwatchRunning] = useState(false);
  const timerService = TimerService.getInstance();
  
  // 最新の値を保持するためのref（クロージャ問題を解決）
  const timerSecondsRef = useRef(timerSeconds);
  const isTimerRunningRef = useRef(isTimerRunning);
  const onTimerCompleteRef = useRef(onTimerComplete);

  // refを最新の値に更新
  useEffect(() => {
    timerSecondsRef.current = timerSeconds;
    isTimerRunningRef.current = isTimerRunning;
    onTimerCompleteRef.current = onTimerComplete;
  }, [timerSeconds, isTimerRunning, onTimerComplete]);

  useEffect(() => {
    // Initialize with current timer state
    setTimerSeconds(timerService.getTimerSeconds());
    setStopwatchSeconds(timerService.getStopwatchSeconds());
    setIsTimerRunning(timerService.isTimerRunning());
    setIsStopwatchRunning(timerService.isStopwatchRunning());

    // Listen for timer updates
    const listener = (newTimerSeconds: number, newStopwatchSeconds: number, newIsTimerRunning: boolean, newIsStopwatchRunning: boolean) => {
      // refから最新の値を取得（クロージャ問題を回避）
      const prevTimerSeconds = timerSecondsRef.current;
      const prevIsTimerRunning = isTimerRunningRef.current;
      
      console.log('🔄 タイマー状態更新', {
        prevTimerSeconds,
        newTimerSeconds,
        prevIsTimerRunning,
        newIsTimerRunning,
        hasCallback: !!onTimerCompleteRef.current
      });
      
      setTimerSeconds(newTimerSeconds);
      setStopwatchSeconds(newStopwatchSeconds);
      setIsTimerRunning(newIsTimerRunning);
      setIsStopwatchRunning(newIsStopwatchRunning);
      
      // タイマー完了の検出
      const isTimerComplete = prevIsTimerRunning && !newIsTimerRunning && newTimerSeconds === 0 && onTimerCompleteRef.current;
      console.log('🔍 タイマー完了チェック', {
        prevIsTimerRunning,
        newIsTimerRunning,
        newTimerSeconds,
        hasCallback: !!onTimerCompleteRef.current,
        isTimerComplete
      });
      
      if (isTimerComplete) {
        console.log('✅ タイマー完了検出 - コールバックを実行');
        logger.debug('useTimer: タイマー完了検出');
        onTimerCompleteRef.current();
      }
    };

    timerService.addListener(listener);

    return () => {
      timerService.removeListener(listener);
    };
  }, []);

  const startTimer = () => timerService.startTimer();
  const pauseTimer = () => timerService.pauseTimer();
  const resetTimer = () => timerService.resetTimer();
  const clearTimer = () => timerService.clearTimer();
  const setTimerPreset = (seconds: number) => {
    logger.debug('useTimer setTimerPreset called with:', seconds);
    timerService.setTimerPreset(seconds);
    const newSeconds = timerService.getTimerSeconds();
    logger.debug('TimerService returned:', newSeconds);
    // 設定後に状態を強制的に更新
    setTimerSeconds(newSeconds);
    logger.debug('useTimer state updated to:', newSeconds);
  };
  const addTimerTime = (seconds: number) => timerService.addTimerTime(seconds);
  
  const startStopwatch = () => timerService.startStopwatch();
  const pauseStopwatch = () => timerService.pauseStopwatch();
  const resetStopwatch = () => timerService.resetStopwatch();

  return {
    timerSeconds,
    stopwatchSeconds,
    isTimerRunning,
    isStopwatchRunning,
    startTimer,
    pauseTimer,
    resetTimer,
    clearTimer,
    setTimerPreset,
    addTimerTime,
    startStopwatch,
    pauseStopwatch,
    resetStopwatch,
  };
}