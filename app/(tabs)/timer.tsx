import React, { useState, useEffect, useRef, useReducer, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView, Alert, Switch, Vibration, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Play, Pause, Square, RotateCcw, Plus, Minus, Timer as TimerIcon, Clock } from 'lucide-react-native';
import { Svg, Circle } from 'react-native-svg';
import InstrumentHeader from '@/components/InstrumentHeader';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { useLanguage } from '@/components/LanguageContext';
import { useTimer } from '@/hooks/useTimer';
import { formatLocalDate } from '@/lib/dateUtils';
import { COMMON_STYLES } from '@/lib/appStyles';
import { useAuthAdvanced } from '@/hooks/useAuthAdvanced';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { savePracticeSessionWithIntegration } from '@/repositories/practiceSessionRepository';
import { logger } from '@/lib/logger';
import Stopwatch from '@/components/timer/Stopwatch';
import { styles } from '@/lib/tabs/timer/styles';

const { width } = Dimensions.get('window');

// アニメーション付き円形プログレスバーコンポーネント
function AnimatedCircularProgress({ 
  progress, 
  size = 280, 
  strokeWidth = 12, 
  color = '#00D4FF',
  backgroundColor = '#2A2A2A'
}: {
  progress: number; // 0-1の値
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
}) {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  
  // requestAnimationFrameのIDを保持するためのref
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    // 前のアニメーションをキャンセル
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // スムーズなアニメーション効果を実現するため、requestAnimationFrameを使用
    const animateProgress = () => {
      const startProgress = animatedProgress;
      const endProgress = progress;
      const duration = 300; // 300ms
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progressRatio = Math.min(elapsed / duration, 1);
        
        // イージング関数（ease-out）
        const easeOut = 1 - Math.pow(1 - progressRatio, 3);
        const currentProgress = startProgress + (endProgress - startProgress) * easeOut;
        
        setAnimatedProgress(currentProgress);
        
        if (progressRatio < 1) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          animationFrameRef.current = null;
        }
      };
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animateProgress();
    
    // クリーンアップ: コンポーネントがアンマウントされるか、progressが変わる前にアニメーションを停止
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [progress, animatedProgress]);

  const strokeDashoffset = animatedProgress * circumference;

  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
      {/* 背景円 */}
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={backgroundColor}
        strokeWidth={strokeWidth}
        fill="transparent"
      />
      {/* アニメーション付きプログレス円 */}
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="transparent"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// ドラムロール風のボタンベースピッカー（Web環境対応）
function WheelPicker({ value, onChange, max, highlightColor }: { value: number; onChange: (v: number) => void; max: number; highlightColor: string }) {
  const itemHeight = 28; // 36から28に縮小して上下の矢印部分の余白を減らす
  const list = Array.from({ length: max + 1 }, (_, i) => i);

  const handleValueChange = (newValue: number) => {
    const clamped = Math.max(0, Math.min(max, newValue));
    if (process.env.NODE_ENV === 'development') {
      logger.debug('WheelPicker handleValueChange:', { newValue, clamped, currentValue: value });
    }
    if (clamped !== value) {
      if (process.env.NODE_ENV === 'development') {
        logger.debug('WheelPicker calling onChange with:', clamped);
      }
      onChange(clamped);
    }
  };

  return (
    <View style={{ width: 72, height: itemHeight * 3, overflow: 'hidden' }}>
      {/* ハイライト背景 */}
      <View style={{ position: 'absolute', top: itemHeight, left: 0, right: 0, height: itemHeight, borderRadius: 8, backgroundColor: highlightColor + '33' }} />
      
      {/* 上向き矢印ボタン */}
      <TouchableOpacity 
        style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          right: 0, 
          height: itemHeight, 
          alignItems: 'center', 
          justifyContent: 'center',
          zIndex: 10
        }}
        onPress={() => handleValueChange(value - 1)}
        disabled={value <= 0}
      >
        <Text style={{ fontSize: 16, color: value <= 0 ? '#ccc' : highlightColor }}>▲</Text>
      </TouchableOpacity>

      {/* 中央の値表示 */}
      <View style={{ 
        position: 'absolute', 
        top: itemHeight, 
        left: 0, 
        right: 0, 
        height: itemHeight, 
        alignItems: 'center', 
        justifyContent: 'center',
        zIndex: 5
      }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#333' }}>
          {String(value).padStart(2, '0')}
        </Text>
      </View>

      {/* 下向き矢印ボタン */}
      <TouchableOpacity 
        style={{ 
          position: 'absolute', 
          bottom: 0, 
          left: 0, 
          right: 0, 
          height: itemHeight, 
          alignItems: 'center', 
          justifyContent: 'center',
          zIndex: 10
        }}
        onPress={() => handleValueChange(value + 1)}
        disabled={value >= max}
      >
        <Text style={{ fontSize: 16, color: value >= max ? '#ccc' : highlightColor }}>▼</Text>
      </TouchableOpacity>

      {/* 背景の数字表示（ドラムロール風の見た目） */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 }}>
        {list.map((n) => (
          <View 
            key={`time-picker-item-${n}`}
            style={{ 
              position: 'absolute',
              top: n * itemHeight, 
              left: 0, 
              right: 0, 
              height: itemHeight, 
              alignItems: 'center', 
              justifyContent: 'center',
              opacity: Math.abs(n - value) <= 1 ? 0.3 : 0.1
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '500', color: '#999' }}>
              {String(n).padStart(2, '0')}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// カスタム時間の状態型定義
interface CustomTimeState {
  hours: number;
  minutes: number;
  seconds: number;
}

// カスタム時間のアクション型定義
type CustomTimeAction =
  | { type: 'SET_HOURS'; payload: number }
  | { type: 'SET_MINUTES'; payload: number }
  | { type: 'SET_SECONDS'; payload: number }
  | { type: 'RESET' };

// カスタム時間のリデューサー
const customTimeReducer = (state: CustomTimeState, action: CustomTimeAction): CustomTimeState => {
  switch (action.type) {
    case 'SET_HOURS':
      return { ...state, hours: Math.max(0, Math.min(99, action.payload)) };
    case 'SET_MINUTES':
      return { ...state, minutes: Math.max(0, Math.min(59, action.payload)) };
    case 'SET_SECONDS':
      return { ...state, seconds: Math.max(0, Math.min(59, action.payload)) };
    case 'RESET':
      return { hours: 0, minutes: 0, seconds: 0 };
    default:
      return state;
  }
};

// 設定の状態型定義
interface SettingsState {
  autoSave: boolean;
  soundOn: boolean;
  soundType: 'beep' | 'chime' | 'bell';
}

// 設定のアクション型定義
type SettingsAction =
  | { type: 'SET_AUTO_SAVE'; payload: boolean }
  | { type: 'SET_SOUND_ON'; payload: boolean }
  | { type: 'SET_SOUND_TYPE'; payload: 'beep' | 'chime' | 'bell' };

// 設定のリデューサー
const settingsReducer = (state: SettingsState, action: SettingsAction): SettingsState => {
  switch (action.type) {
    case 'SET_AUTO_SAVE':
      return { ...state, autoSave: action.payload };
    case 'SET_SOUND_ON':
      return { ...state, soundOn: action.payload };
    case 'SET_SOUND_TYPE':
      return { ...state, soundType: action.payload };
    default:
      return state;
  }
};

export default function TimerScreen() {
  const { isAuthenticated, isLoading, user } = useAuthAdvanced();
  const { currentTheme, selectedInstrument } = useInstrumentTheme();
  const { t } = useLanguage();
  const [mode, setMode] = useState<'timer' | 'stopwatch'>('timer');
  
  // カスタム時間の状態（useReducerで集約）
  const [customTime, dispatchCustomTime] = useReducer(customTimeReducer, { hours: 0, minutes: 0, seconds: 0 });

  // カスタム時間の状態変更をログ出力（デバッグ時のみ）
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Custom time state changed:', customTime);
    }
  }, [customTime]);
  
  const completedPracticeTimeRef = useRef<number | null>(null); // 完了した練習時間を追跡（重複実行を防ぐ）
  
  // 設定の状態（useReducerで集約）
  const [settings, dispatchSettings] = useReducer(settingsReducer, {
    autoSave: false,
    soundOn: true,
    soundType: 'beep',
  });
  
  // 固定値: 音量とバイブレーション（UIから削除された設定）
  const VOLUME = 0.7;
  const VIBRATE_ON = true;
  
  // 設定のヘルパー関数
  const setAutoSave = useCallback((value: boolean) => {
    dispatchSettings({ type: 'SET_AUTO_SAVE', payload: value });
  }, []);
  const setSoundOn = useCallback((value: boolean) => {
    dispatchSettings({ type: 'SET_SOUND_ON', payload: value });
  }, []);
  const setSoundType = useCallback((value: 'beep' | 'chime' | 'bell') => {
    dispatchSettings({ type: 'SET_SOUND_TYPE', payload: value });
  }, []);
  
  // カスタム時間のヘルパー関数
  const setCustomHours = useCallback((value: number) => {
    dispatchCustomTime({ type: 'SET_HOURS', payload: value });
  }, []);
  const setCustomMinutes = useCallback((value: number) => {
    dispatchCustomTime({ type: 'SET_MINUTES', payload: value });
  }, []);
  const setCustomSeconds = useCallback((value: number) => {
    dispatchCustomTime({ type: 'SET_SECONDS', payload: value });
  }, []);
  const timerPresetRef = useRef<number>(0); // タイマー設定時間を保存
  const wasTimerRunningRef = useRef<boolean>(false); // 前回のタイマー実行状態を保存
  const audioContextRef = useRef<AudioContext | null>(null); // AudioContextを保存
  
  const {
    timerSeconds,
    isTimerRunning,
    startTimer,
    pauseTimer,
    resetTimer: originalResetTimer,
    clearTimer: originalClearTimer,
    setTimerPreset: originalSetTimerPreset,
  } = useTimer(() => {
    // タイマー完了時の処理（useTimerフックのコールバックで一元化）
    console.log('🎯 タイマー完了コールバックが実行されました！');
    
    // 練習時間の計算: 30秒単位でカウント（30秒未満は0分、31秒以上は30秒単位で切り上げ）
    // 例: 30秒未満→0分、31秒→1分、1分29秒→1分、1分45秒→2分
    const practiceMinutes = timerPresetRef.current >= 30
      ? Math.ceil(timerPresetRef.current / 30)
      : 0;
    
    console.log('📊 タイマー完了コールバック実行', { 
      practiceMinutes,
      timerPreset: timerPresetRef.current,
      completedPracticeTime: completedPracticeTimeRef.current,
      soundOn: settings.soundOn, 
      vibrateOn: VIBRATE_ON,
      autoSave: settings.autoSave
    });
    
    logger.debug('タイマー完了コールバック実行', { 
      practiceMinutes,
      timerPreset: timerPresetRef.current,
      soundOn: settings.soundOn, 
      vibrateOn: VIBRATE_ON,
      autoSave: settings.autoSave
    });
    
    // 練習時間が0の場合は処理しない
    if (practiceMinutes === 0) {
      console.log('⚠️ タイマー完了: 練習時間が0のため処理をスキップ');
      logger.debug('タイマー完了: 練習時間が0のため処理をスキップ');
      return;
    }
    
    // 重複実行を防ぐ（既に処理済みの場合はスキップ）
    // 完了状態を先にチェックして、すぐに設定することで重複実行を防ぐ
    if (completedPracticeTimeRef.current === practiceMinutes) {
      console.log('⚠️ タイマー完了処理は既に実行済み - スキップ', { 
        completedPracticeTime: completedPracticeTimeRef.current,
        practiceMinutes
      });
      logger.debug('タイマー完了処理は既に実行済み - スキップ');
      return;
    }
    
    // 完了状態を記録（重複実行を防ぐ）- 処理の最初に設定
    completedPracticeTimeRef.current = practiceMinutes;
    console.log('✅ 完了状態を記録', { practiceMinutes });
    
    // サウンド再生
    if (settings.soundOn) {
      logger.debug('タイマー完了サウンド通知を再生');
      setTimeout(() => {
        playSynthNotification();
        setTimeout(() => {
          playSynthNotification();
        }, 500);
        setTimeout(() => {
          playSynthNotification();
        }, 1000);
      }, 100);
    } else {
      logger.debug('サウンド通知は無効');
    }
    
    // バイブレーション
    if (VIBRATE_ON) {
      try { 
        Vibration.vibrate([0, 250, 120, 250]); 
        logger.debug('バイブレーション実行');
      } catch (error) {
        logger.debug('バイブレーションエラー:', error);
      }
    }
    
    // 練習記録の保存処理
    logger.debug('🔍 タイマー完了時の処理:', {
      autoSave: settings.autoSave,
      practiceMinutes
    });
    
    if (settings.autoSave) {
      console.log('🔄 自動記録を開始:', practiceMinutes, '分');
      logger.info('🔄 自動記録を開始:', practiceMinutes, '分');
      // 非同期処理を実行（エラーハンドリング付き）
      (async () => {
        try {
          console.log('💾 練習記録を保存中...', { minutes: practiceMinutes });
          const result = await savePracticeRecord(practiceMinutes);
          if (result) {
            console.log('✅ タイマー自動記録が正常に完了しました', { minutes: practiceMinutes });
            logger.info('✅ タイマー自動記録が正常に完了しました', { minutes: practiceMinutes });
          } else {
            console.warn('⚠️ タイマー自動記録が失敗しました（結果がfalse）', { minutes: practiceMinutes });
            logger.warn('⚠️ タイマー自動記録が失敗しました（結果がfalse）', { minutes: practiceMinutes });
          }
        } catch (error) {
          console.error('❌ タイマー自動記録エラー:', error);
          logger.error('❌ タイマー自動記録エラー:', error);
          // エラーは無視（自動記録なのでユーザーに通知しない）
        }
      })();
    } else {
      console.log('📋 自動記録が無効 - 手動記録ダイアログを表示');
      logger.debug('📋 自動記録が無効 - 手動記録ダイアログを表示');
      showPracticeRecordDialog(practiceMinutes);
    }
  });

  // タイマーの実行状態を追跡（完了検出のため）
  useEffect(() => {
    // タイマーが停止した時のみ更新（完了検出のため）
    if (!isTimerRunning) {
      wasTimerRunningRef.current = false;
    } else {
      wasTimerRunningRef.current = true;
    }
  }, [isTimerRunning]);

  // resetTimerとclearTimerをラップして完了状態もリセット
  const resetTimer = () => {
    logger.debug('resetTimer called - 完了状態をリセット');
    completedPracticeTimeRef.current = null;
    originalResetTimer();
  };

  const clearTimer = () => {
    logger.debug('clearTimer called - 完了状態をリセット');
    completedPracticeTimeRef.current = null;
    originalClearTimer();
  };

  // setTimerPresetをラップしてtimerPresetRefも更新
  const setTimerPreset = (seconds: number) => {
    logger.debug('setTimerPreset called with:', seconds);
    timerPresetRef.current = seconds;
    originalSetTimerPreset(seconds);
  };
  
  // 認証チェック
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // 認証されていない場合は何もしない
    }
  }, [isLoading, isAuthenticated]);

  // 自動保存設定の読み込み
  useEffect(() => {
    (async () => {
      try {
        const autoSaveValue = await AsyncStorage.getItem('timer_auto_save');
        const soundValue = await AsyncStorage.getItem('timer_sound');
        const typeValue = await AsyncStorage.getItem('timer_sound_type');
        
        logger.debug('🔍 タイマー設定を読み込み中...', {
          autoSaveValue,
          soundValue,
          typeValue
        });
        
        if (autoSaveValue === '1') {
          setAutoSave(true);
          logger.info('✅ 自動記録設定を読み込み: 有効');
        } else {
          setAutoSave(false);
          logger.debug('自動記録設定を読み込み: 無効');
        }
        
        if (soundValue !== null) {
          const soundEnabled = soundValue === '1';
          setSoundOn(soundEnabled);
          logger.debug('サウンド設定を読み込み:', soundEnabled ? '有効' : '無効');
        } else {
          logger.debug('サウンド設定を読み込み: デフォルト（有効）');
        }

        if (typeValue === 'beep' || typeValue === 'chime' || typeValue === 'bell') {
          setSoundType(typeValue);
        }
      } catch (error) {
        // 設定の読み込みエラーは無視
      }
    })();
  }, [setAutoSave, setSoundOn, setSoundType]);

  // 既存記録との統合処理
  const savePracticeRecordWithIntegration = async (minutes: number) => {
    try {
      if (!user || !user.id) {
        throw new Error('ユーザーが認証されていません');
      }

      // 今日の日付を明示的に指定
      const today = new Date();
      const practiceDate = formatLocalDate(today);

      const result = await savePracticeSessionWithIntegration(
        user.id,
        minutes,
        {
          instrumentId: selectedInstrument?.id || null, // IDを明示的に指定
          content: 'タイマー',
          inputMethod: 'timer',
          existingContentPrefix: 'タイマー',
          practiceDate: practiceDate // 今日の日付を明示的に指定
        }
      );

      if (!result.success) {
        const errorMessage = result.error?.message || '練習記録の保存に失敗しました';
        
        // テーブルが存在しないエラーの場合
        if (result.error?.code === 'PGRST205' || result.error?.code === 'PGRST116') {
          throw new Error('データベースの設定が完了していません。管理者にお問い合わせください。');
        }
        
        // その他のエラー
        throw new Error(errorMessage);
      }
      
      logger.info(`✅ タイマー記録を保存: ${minutes}分`, {
        practiceDate,
        instrumentId: selectedInstrument?.id || null
      });
      
      // localStorageにタイムスタンプを保存（カレンダー画面でのデータ更新をトリガー）
      if (typeof window !== 'undefined') {
        try {
          const timestamp = Date.now().toString();
          window.localStorage.setItem('last_practice_record_timestamp', timestamp);
          if (selectedInstrument?.id) {
            window.localStorage.setItem('last_practice_record_instrument_id', selectedInstrument.id);
          } else {
            window.localStorage.setItem('last_practice_record_instrument_id', 'null');
          }
          console.log('💾 タイマー記録のタイムスタンプを保存しました', {
            timestamp,
            instrumentId: selectedInstrument?.id || null
          });
        } catch (e) {
          // localStorageへの書き込みエラーは無視
        }
      }
      
      return true;
    } catch (error) {
      throw error;
    }
  };

  const savePracticeRecord = async (minutes: number) => {
    try {
      const result = await savePracticeRecordWithIntegration(minutes);
      
      if (result) {
        // 成功メッセージ（自動記録の場合は表示しない）
        if (!settings.autoSave) {
          Alert.alert(
            '保存完了',
            `${minutes}分の練習記録を保存しました！`,
            [{ text: 'OK' }]
          );
        } else {
          logger.debug('自動記録で保存完了（メッセージは表示しない）');
        }
        
        return true;
      } else {
        throw new Error('練習記録の保存に失敗しました');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '練習記録の保存に失敗しました';
      
      // 既にAlertが表示されている場合は、重複して表示しない
      if (!errorMessage.includes('データベース')) {
        Alert.alert('エラー', errorMessage);
      } else {
        // データベースエラーの場合は、より詳細なメッセージを表示
        Alert.alert('データベースエラー', errorMessage);
      }
      
      return false;
    }
  };

  const showPracticeRecordDialog = (practiceMinutes: number) => {
    console.log('📋 練習記録ダイアログを表示', { practiceMinutes });
    Alert.alert(
      '練習完了！',
      `${practiceMinutes}分間お疲れ様でした！\nこの練習時間をカレンダーに記録しますか？`,
      [
        { 
          text: 'いいえ', 
          style: 'cancel',
          onPress: () => {
            console.log('❌ ユーザーが「いいえ」を選択');
          }
        },
        { 
          text: '次回から自動で記録', 
          onPress: async () => {
            // 最初に確実にコンソールに表示
            console.log('========================================');
            console.log('🔄 「次回から自動で記録」ボタンが押されました！');
            console.log('========================================');
            console.log('📊 パラメータ:', { practiceMinutes });
            
            try {
              console.log('💾 自動記録設定を保存中...');
              // まず設定を保存（保存の失敗を防ぐため先に保存）
              await AsyncStorage.setItem('timer_auto_save', '1');
              console.log('✅ 自動記録設定を保存: 有効');
              logger.debug('✅ 自動記録設定を保存: 有効');
              
              console.log('🔄 状態を更新中...');
              // 状態を更新
              dispatchSettings({ type: 'SET_AUTO_SAVE', payload: true });
              console.log('✅ 状態を更新完了');
              
              console.log('💾 練習記録を保存中...', { practiceMinutes });
              // 練習記録を保存
              const saveResult = await savePracticeRecord(practiceMinutes);
              console.log('📊 保存結果:', { saveResult });
              
              if (saveResult) {
                console.log('✅ 保存成功 - 設定完了ダイアログを表示');
                Alert.alert('設定完了', '次回から自動で記録されます');
                logger.info('✅ 「次回から自動で記録」設定が有効になりました');
              } else {
                console.error('❌ 保存失敗');
                Alert.alert('エラー', '記録の保存に失敗しました');
              }
            } catch (error) {
              console.error('❌ エラーが発生しました:', error);
              Alert.alert('エラー', '設定の保存に失敗しました');
            }
          }
        },
        { 
          text: 'はい', 
          onPress: async () => {
            console.log('✅ ユーザーが「はい」を選択', { practiceMinutes });
            await savePracticeRecord(practiceMinutes);
          }
        }
      ]
    );
  };
  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const playNotificationSound = () => {
    try {
      logger.debug('サウンド再生開始');
      
      // 合成音で音色・音量を反映
      playSynthNotification();
      
    } catch (error) {
      logger.debug('Sound play error:', error);
      playSystemBeep();
    }
  };

  const playSimpleNotification = () => {
    try {
      logger.debug('シンプル通知音再生開始');
      
      // 方法1: ブラウザのビープ音（最も確実）
      if (typeof window !== 'undefined') {
        // 複数の方法を試す
        try {
          // 方法1: コンソールビープ
          logger.debug('\x07'); // ベル文字
          logger.debug('コンソールビープ実行');
        } catch (e) {
          logger.debug('コンソールビープ失敗:', e);
        }
        
        try {
          // 方法2: アラート音
          const audio = new Audio();
          audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1unEiBC13yO/eizEIHWq+8+OWT';
          audio.volume = 0.8;
          audio.play()
            .then(() => {
              logger.debug('WAV音声再生成功');
            })
            .catch((error) => {
              logger.debug('WAV音声再生失敗:', error);
              playBeepWithAudioContext();
            });
        } catch (e) {
          logger.debug('WAV音声エラー:', e);
          playBeepWithAudioContext();
        }
      } else {
        logger.debug('Window not available');
        playSystemBeep();
      }
    } catch (error) {
      logger.debug('シンプル通知音エラー:', error);
      playSystemBeep();
    }
  };

  const playBeepWithAudioContext = () => {
    try {
      logger.debug('AudioContextビープ音再生開始');
      
      if (typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)) {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // ユーザーインタラクションが必要な場合があるので、resumeを試す
        if (audioContext.state === 'suspended') {
          audioContext.resume().then(() => {
            logger.debug('AudioContext resumed');
            generateBeep(audioContext);
          }).catch((error) => {
            logger.debug('AudioContext resume failed:', error);
            playSystemBeep();
          });
        } else {
          generateBeep(audioContext);
        }
      } else {
        logger.debug('AudioContext not available');
        playSystemBeep();
      }
    } catch (error) {
      logger.debug('AudioContextビープ音エラー:', error);
      playSystemBeep();
    }
  };


  const playSimpleBeep = () => {
    try {
      logger.debug('シンプルビープ音再生開始');
      
      // AudioContextを取得または作成
      let audioContext = audioContextRef.current;
      
      if (!audioContext) {
        if (typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)) {
          audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          audioContextRef.current = audioContext;
          logger.debug('AudioContext created');
        } else {
          logger.debug('AudioContext not available');
          playSystemBeep();
          return;
        }
      }
      
      // ユーザーインタラクションが必要な場合があるので、resumeを試す
      if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
          logger.debug('AudioContext resumed');
          generateBeep(audioContext);
        }).catch((error) => {
          logger.debug('AudioContext resume failed:', error);
          playSystemBeep();
        });
      } else {
        generateBeep(audioContext);
      }
    } catch (error) {
      logger.debug('シンプルビープ音エラー:', error);
      playSystemBeep();
    }
  };

  const generateBeep = (audioContext: AudioContext) => {
    try {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // ビープ音のパターン
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
      
      gainNode.gain.setValueAtTime(Math.max(0.05, VOLUME), audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
      
      logger.debug('ビープ音生成成功');
    } catch (error) {
      logger.debug('ビープ音生成エラー:', error);
      playSystemBeep();
    }
  };

  // 音色別に合成して再生
  const playSynthNotification = () => {
    try {
      let audioContext = audioContextRef.current;
      if (!audioContext) {
        if (typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)) {
          audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          audioContextRef.current = audioContext;
        }
      }
      if (!audioContext) return playSimpleNotification();
      if (audioContext.state === 'suspended') {
        audioContext.resume().catch(() => {});
      }

      switch (settings.soundType) {
        case 'beep':
          synthBeep(audioContext);
          break;
        case 'chime':
          synthChime(audioContext);
          break;
        case 'bell':
          synthBell(audioContext);
          break;
      }
    } catch (e) {
      playSimpleNotification();
    }
  };

  const synthBeep = (ctx: AudioContext) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.05, VOLUME), ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  };

  const synthChime = (ctx: AudioContext) => {
    const makeTone = (freq: number, start: number, dur: number) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + start);
      g.gain.exponentialRampToValueAtTime(Math.max(0.04, VOLUME * 0.8), ctx.currentTime + start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
      o.connect(g); g.connect(ctx.destination);
      o.start(ctx.currentTime + start);
      o.stop(ctx.currentTime + start + dur);
    };
    // 上行2音チャイム
    makeTone(660, 0, 0.35);
    makeTone(880, 0.2, 0.5);
  };

  const synthBell = (ctx: AudioContext) => {
    // 基音+倍音の減衰でベル風
    const partials = [660, 990, 1320];
    partials.forEach((freq, idx) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = freq;
      const start = 0;
      const dur = 0.8 - idx * 0.15;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + start);
      g.gain.exponentialRampToValueAtTime(Math.max(0.03, VOLUME * (1 - idx * 0.3)), ctx.currentTime + start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
      o.connect(g); g.connect(ctx.destination);
      o.start(ctx.currentTime + start);
      o.stop(ctx.currentTime + start + dur);
    });
  };

  const playBeepSound = () => {
    try {
      logger.debug('ビープ音再生開始');
      
      // 方法2: シンプルなビープ音（より確実）
      if (typeof Audio !== 'undefined') {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
        
        logger.debug('ビープ音再生成功');
      } else {
        // 方法3: システム音
        playSystemBeep();
      }
    } catch (error) {
      logger.debug('ビープ音再生エラー:', error);
      playSystemBeep();
    }
  };

  const playSystemBeep = () => {
    try {
      // システム音のフォールバック
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        // 音声合成でビープ音をシミュレート
        const utterance = new SpeechSynthesisUtterance('');
        utterance.volume = 0.1;
        utterance.rate = 0.1;
        window.speechSynthesis.speak(utterance);
      }
    } catch (error) {
      logger.debug('System beep failed:', error);
    }
  };

  // タイマー完了時のサウンド再生
  const playTimerCompleteSound = useCallback(() => {
    try {
      logger.debug('タイマー完了サウンド再生開始', { soundOn: settings.soundOn, soundType: settings.soundType, volume: VOLUME });
      
      if (!settings.soundOn) {
        logger.debug('サウンドがOFFのため再生をスキップ');
        return;
      }
      
      // AudioContextを取得または作成
      let audioContext = audioContextRef.current;
      if (!audioContext) {
        if (typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)) {
          audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          audioContextRef.current = audioContext;
          logger.debug('AudioContext created');
        }
      }
      
      if (!audioContext) {
        logger.debug('AudioContext not available, using simple notification');
        playSimpleNotification();
        return;
      }
      
      // AudioContextを確実に再開
      const resumeAudioContext = async () => {
        try {
          if (audioContext.state === 'suspended') {
            await audioContext.resume();
            logger.debug('AudioContext resumed for timer complete sound');
          }
          
          if (audioContext.state === 'running') {
            playTimerCompleteSoundInternal(audioContext);
          } else {
            logger.debug('AudioContext state:', audioContext.state, 'using simple notification');
            playSimpleNotification();
          }
        } catch (error) {
          logger.debug('AudioContext resume failed:', error);
          playSimpleNotification();
        }
      };
      
      resumeAudioContext();
    } catch (error) {
      logger.debug('タイマー完了サウンドエラー:', error);
      playSimpleNotification();
    }
  }, [settings.soundOn, settings.soundType]);

  // タイマー完了時のサウンド再生（内部実装）
  const playTimerCompleteSoundInternal = useCallback((ctx: AudioContext) => {
    try {
      if (ctx.state !== 'running') {
        logger.debug('AudioContext is not running, state:', ctx.state);
        playSimpleNotification();
        return;
      }
      
      const currentTime = ctx.currentTime;
      const volume = Math.max(0.1, VOLUME * 0.8); // 音量を少し上げて確実に聞こえるように
      
      logger.debug('サウンド再生開始', { soundType: settings.soundType, volume });
      
      switch (settings.soundType) {
        case 'beep':
          // ビープ音：3回連続（より目立つように）
          [0, 0.4, 0.8].forEach((delay) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(880, currentTime + delay);
            gain.gain.setValueAtTime(0, currentTime + delay);
            gain.gain.linearRampToValueAtTime(volume, currentTime + delay + 0.05);
            gain.gain.linearRampToValueAtTime(0, currentTime + delay + 0.25);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(currentTime + delay);
            osc.stop(currentTime + delay + 0.25);
          });
          break;
          
        case 'chime':
          // チム音：上昇する音階
          [660, 784, 880, 1047].forEach((freq, index) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, currentTime + index * 0.15);
            gain.gain.setValueAtTime(0, currentTime + index * 0.15);
            gain.gain.linearRampToValueAtTime(volume * 0.9, currentTime + index * 0.15 + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, currentTime + index * 0.15 + 0.6);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(currentTime + index * 0.15);
            osc.stop(currentTime + index * 0.15 + 0.6);
          });
          break;
          
        case 'bell':
          // ベル音：複数の倍音で豊かな音色
          const bellFreqs = [440, 660, 880, 1320];
          bellFreqs.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, currentTime);
            const dur = 1.2 - idx * 0.2;
            gain.gain.setValueAtTime(0, currentTime);
            gain.gain.linearRampToValueAtTime(volume * (1 - idx * 0.15), currentTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, currentTime + dur);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(currentTime);
            osc.stop(currentTime + dur);
          });
          break;
          
        default:
          // デフォルトはビープ音（1回）
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(880, currentTime);
          gain.gain.setValueAtTime(0, currentTime);
          gain.gain.linearRampToValueAtTime(volume, currentTime + 0.05);
          gain.gain.linearRampToValueAtTime(0, currentTime + 0.4);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(currentTime);
          osc.stop(currentTime + 0.4);
          break;
      }
      
      logger.debug('タイマー完了サウンド再生成功');
    } catch (error) {
      logger.debug('タイマー完了サウンド内部エラー:', error);
      playSimpleNotification();
    }
  }, [settings.soundType]);


  const handleStartPause = () => {
    if (timerSeconds === 0 && !isTimerRunning) {
      // Set timer if not set
      const totalSeconds = customTime.hours * 3600 + customTime.minutes * 60 + customTime.seconds;
      if (totalSeconds > 0) {
        logger.debug('Setting timer preset to:', totalSeconds);
        setTimerPreset(totalSeconds);
        setTimeout(() => startTimer(), 100);
      } else {
        Alert.alert('エラー', 'タイマー時間を設定してください');
      }
    } else if (isTimerRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  };

  const handleReset = () => {
    resetTimer();
  };

  const handleClear = () => {
    if (mode === 'timer') {
      clearTimer();
      dispatchCustomTime({ type: 'RESET' });
      setCustomMinutes(25); // デフォルト値を設定
      timerPresetRef.current = 0; // 設定時間をクリア
    }
  };

  const setQuickTimer = (minutes: number) => {
    dispatchCustomTime({ type: 'RESET' });
    setCustomMinutes(minutes);
    const totalSeconds = minutes * 60;
    setTimerPreset(totalSeconds);
    timerPresetRef.current = totalSeconds; // 設定時間を保存
    // 即座にタイマーに反映
      Alert.alert(t('settingsCompleted'), t('timerSetTo').replace('{time}', `${minutes}${t('minutes')}`));
  };

  const adjustCustomTime = (type: 'minutes' | 'seconds', delta: number) => {
    if (type === 'minutes') {
      const newMinutes = Math.max(0, Math.min(999, customTime.minutes + delta));
      setCustomMinutes(newMinutes);
    } else {
      const newSeconds = Math.max(0, Math.min(59, customTime.seconds + delta));
      setCustomSeconds(newSeconds);
    }
  };

  const applyCustomTime = () => {
    const totalSeconds = customTime.hours * 3600 + customTime.minutes * 60 + customTime.seconds;
    logger.debug('applyCustomTime called:', { customHours: customTime.hours, customMinutes: customTime.minutes, customSeconds: customTime.seconds, totalSeconds });
    
    if (totalSeconds > 0) {
      // タイマーに設定
      logger.debug('Setting timer preset to:', totalSeconds);
      setTimerPreset(totalSeconds);
      timerPresetRef.current = totalSeconds; // 設定時間を保存
      
      // タイマーが停止中の場合、表示を即座に更新
      if (!isTimerRunning) {
        logger.debug('Timer not running, forcing update');
        // 強制的に表示を更新するため、少し遅延を入れる
        setTimeout(() => {
          logger.debug('Timer seconds after apply:', timerSeconds);
        }, 100);
      }
      const timeStr = `${customTime.hours > 0 ? customTime.hours + t('hours') : ''}${customTime.minutes}${t('minutes')}${customTime.seconds > 0 ? customTime.seconds + t('seconds') : ''}`;
      Alert.alert(t('settingsCompleted'), t('timerSetTo').replace('{time}', timeStr));
      } else {
      Alert.alert(t('error'), t('pleaseSetValidTime'));
    }
  };

  const currentSeconds = timerSeconds;
  const isRunning = isTimerRunning;

  // プログレス計算（左回りで時間の経過とともに減る）
  const totalTimerSeconds = customTime.hours * 3600 + customTime.minutes * 60 + customTime.seconds;
  
  // プログレス計算：timerPresetRefまたはtotalTimerSecondsの大きい方を使用
  const presetSeconds = Math.max(timerPresetRef.current, totalTimerSeconds);
  const progress = (presetSeconds > 0 && timerSeconds > 0) ? 
    Math.max(0, Math.min(1, 1 - (timerSeconds / presetSeconds))) : 0;

  // Quick timer presets
  const quickTimers = [
    { label: '5分', minutes: 5 },
    { label: '10分', minutes: 10 },
    { label: '15分', minutes: 15 },
    { label: '25分', minutes: 25 },
    { label: '30分', minutes: 30 },
    { label: '45分', minutes: 45 },
    { label: '60分', minutes: 60 },
    { label: '90分', minutes: 90 },
  ];

  // タイマーが再開された時に完了状態をクリア（resetTimer/clearTimerで明示的にリセット済み）
  useEffect(() => {
    if (mode === 'timer' && timerSeconds > 0 && isTimerRunning) {
      // タイマーが実行中に再開された場合は完了状態をクリア
      // （resetTimer/clearTimerで既にリセットされているが、念のため）
      completedPracticeTimeRef.current = null;
    }
  }, [timerSeconds, isTimerRunning, mode]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} >
      <InstrumentHeader />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Mode Toggle */}
        <View style={[styles.modeToggle, { backgroundColor: currentTheme.surface }]}>
          <TouchableOpacity
            style={[
              styles.modeButton, 
              mode === 'timer' && { backgroundColor: currentTheme.primary }
            ]}
            onPress={() => setMode('timer')}
          >
            <TimerIcon size={20} color={mode === 'timer' ? currentTheme.surface : currentTheme.primary} />
            <Text style={[
              styles.modeButtonText, 
              { color: mode === 'timer' ? currentTheme.surface : currentTheme.primary }
            ]}>
              {t('timerMode')}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.modeButton, 
              mode === 'stopwatch' && { backgroundColor: currentTheme.primary }
            ]}
            onPress={() => setMode('stopwatch')}
          >
            <Clock size={20} color={mode === 'stopwatch' ? currentTheme.surface : currentTheme.primary} />
            <Text style={[
              styles.modeButtonText, 
              { color: mode === 'stopwatch' ? currentTheme.surface : currentTheme.primary }
            ]}>
              {t('stopwatchMode')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Timer Display with Animated Circular Progress */}
        <View style={[
          styles.timerContainer, 
          { backgroundColor: '#FFFFFF' },
          mode === 'stopwatch' && { borderWidth: 0, paddingVertical: 0, paddingHorizontal: 0 }
        ]}>
          {/* タイマーモード：アニメーション付き円形プログレスバー */}
          {mode === 'timer' && (
            <View style={styles.circularProgressContainer}>
              <AnimatedCircularProgress
                progress={progress}
                size={280}
                strokeWidth={10}
                color={currentTheme.primary}
                backgroundColor="#2A2A2A"
              />
              
              {/* 中央のタイマー表示 */}
              <View style={styles.timerCenterContent}>
                <Text style={[styles.timerTitle, { color: currentTheme.text }]}>タイマー</Text>
                <Text style={[styles.timerDisplay, { color: currentTheme.primary }]}>
                  {formatTime(currentSeconds)}
                </Text>
                
                {/* 設定時間表示 */}
                {timerPresetRef.current > 0 && (
                  <View style={styles.alarmTimeContainer}>
                    <Text style={styles.alarmIcon}>⏰</Text>
                    <Text style={[styles.alarmTime, { color: '#FF6B35' }]}>
                      {formatTime(timerPresetRef.current)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* ストップウォッチモード：シンプルな表示 */}
          {mode === 'stopwatch' && (
            <Stopwatch />
          )}

          {/* コントロールボタン */}
          <View style={styles.controlButtonsContainer}>
            {mode === 'timer' && (
              // タイマーモード：円形ボタン
              <>
                <TouchableOpacity
                  style={[styles.controlButton, { backgroundColor: currentTheme.secondary }]}
                  onPress={resetTimer}
                >
                  <RotateCcw size={20} color={currentTheme.text} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.controlButton, { backgroundColor: currentTheme.primary }]}
                  onPress={() => {
                    if (timerSeconds === 0 && !isTimerRunning) {
                      const totalSeconds = customTime.hours * 3600 + customTime.minutes * 60 + customTime.seconds;
                      if (totalSeconds > 0) {
                        logger.debug('Control button: Setting timer preset to:', totalSeconds);
                        setTimerPreset(totalSeconds);
                        setTimeout(() => startTimer(), 100);
                      } else {
                        Alert.alert(t('error'), t('pleaseSetTimerTime') || 'タイマー時間を設定してください');
                      }
                    } else if (isTimerRunning) {
                      pauseTimer();
                    } else {
                      startTimer();
                    }
                  }}
                >
                  {isTimerRunning ? (
                    <Pause size={20} color={currentTheme.surface} />
                  ) : (
                    <Play size={20} color={currentTheme.surface} />
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
          
          {/* Timer completion indicator */}
          {mode === 'timer' && timerSeconds === 0 && !isTimerRunning && timerPresetRef.current > 0 && (
            <View style={[styles.completedIndicator, { backgroundColor: currentTheme.primary }]}>
              <Text style={[styles.completedText, { color: currentTheme.surface }]}>{t('practiceCompleted')}</Text>
            </View>
          )}
        </View>

        {/* Timer Settings（タイマー時のみ） */}
        {mode === 'timer' && (
          <View style={styles.timerSettings}>
            {/* Custom Time - ドラムロール式ホイールピッカー */}
            <View style={[styles.customTimeContainer, { backgroundColor: currentTheme.surface }]}>
              <View style={styles.wheelsRow}>
                <View style={styles.wheelBlock}>
                  <Text style={[styles.wheelLabel, { color: currentTheme.textSecondary }]}>{t('hours') || '時間'}</Text>
                  <WheelPicker
                    value={customTime.hours}
                    onChange={(value) => {
                      if (process.env.NODE_ENV === 'development') {
                        logger.debug('Hours changed to:', value);
                      }
                      setCustomHours(value);
                    }}
                    max={99}
                    highlightColor={currentTheme.secondary}
                  />
                </View>
                <Text style={[styles.wheelColon, { color: currentTheme.textSecondary }]}>:</Text>
                <View style={styles.wheelBlock}>
                  <Text style={[styles.wheelLabel, { color: currentTheme.textSecondary }]}>{t('minutes') || '分'}</Text>
                  <WheelPicker
                    value={customTime.minutes}
                    onChange={(value) => {
                      if (process.env.NODE_ENV === 'development') {
                        logger.debug('Minutes changed to:', value);
                      }
                      setCustomMinutes(value);
                    }}
                    max={59}
                    highlightColor={currentTheme.secondary}
                  />
                </View>
                <Text style={[styles.wheelColon, { color: currentTheme.textSecondary }]}>:</Text>
                <View style={styles.wheelBlock}>
                  <Text style={[styles.wheelLabel, { color: currentTheme.textSecondary }]}>{t('seconds') || '秒'}</Text>
                  <WheelPicker
                    value={customTime.seconds}
                    onChange={(value) => {
                      if (process.env.NODE_ENV === 'development') {
                        logger.debug('Seconds changed to:', value);
                      }
                      setCustomSeconds(value);
                    }}
                    max={59}
                    highlightColor={currentTheme.secondary}
                  />
                </View>
              </View>
              <TouchableOpacity style={[styles.applyButton, { backgroundColor: currentTheme.primary, marginTop: 4 }]} onPress={applyCustomTime}>
                <Text style={[styles.applyButtonText, { color: currentTheme.surface }]}>{t('apply') || '適用'}</Text>
              </TouchableOpacity>
            </View>

            {/* 設定オプション */}
            <View style={[styles.settingsContainer, { backgroundColor: currentTheme.surface }]}>
              <Text style={[styles.settingsTitle, { color: currentTheme.text }]}>{t('settings')}</Text>
              
              {/* 自動記録設定 */}
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Text style={[styles.settingLabel, { color: currentTheme.text }]}>{t('autoRecord') || '次回から自動で記録'}</Text>
                  <Text style={[styles.settingDescription, { color: currentTheme.textSecondary }]}>
                    {t('autoRecordDescription') || 'タイマー完了時に自動で練習記録を保存'}
                  </Text>
                  <Text style={[styles.settingDescription, { color: currentTheme.textSecondary, fontSize: 12, marginTop: 4 }]}>
                    ※ 30秒未満は記録されません。30秒単位で切り上げ（例: 31秒→1分、1分45秒→2分）
                  </Text>
                </View>
                  <Switch
                    value={settings.autoSave}
                    onValueChange={async (v) => {
                      logger.debug('自動記録設定変更:', v);
                      setAutoSave(v);
                      try { 
                        await AsyncStorage.setItem('timer_auto_save', v ? '1' : '0');
                        logger.debug('自動記録設定を保存:', v ? '有効' : '無効');
                      } catch (error) {
                        // 設定の保存エラーは無視
                      }
                    }}
                    thumbColor={settings.autoSave ? currentTheme.primary : '#f4f3f4'}
                    trackColor={{ false: '#ddd', true: `${currentTheme.primary}66` }}
                  />
              </View>

              {/* サウンド設定 */}
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Text style={[styles.settingLabel, { color: currentTheme.text }]}>{t('soundOnCompletion') || '完了時にサウンド'}</Text>
                  <Text style={[styles.settingDescription, { color: currentTheme.textSecondary }]}>
                    {t('soundOnCompletionDescription') || 'タイマー完了時に通知音を再生'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TouchableOpacity
                    style={[styles.testSoundButton, { backgroundColor: currentTheme.secondary }]}
                    onPress={() => {
                      logger.debug('テストサウンドボタン押下');
                      playNotificationSound();
                    }}
                  >
                    <Text style={[styles.testSoundButtonText, { color: currentTheme.text }]}>テスト</Text>
                  </TouchableOpacity>
                  <Switch
                    value={settings.soundOn}
                    onValueChange={async (v) => {
                      logger.debug('サウンド設定変更:', v);
                      setSoundOn(v);
                      try { 
                        await AsyncStorage.setItem('timer_sound', v ? '1' : '0');
                        logger.debug('サウンド設定を保存:', v ? '有効' : '無効');
                      } catch (error) {
                        // 設定の保存エラーは無視
                      }
                    }}
                    thumbColor={settings.soundOn ? currentTheme.primary : '#f4f3f4'}
                    trackColor={{ false: '#ddd', true: `${currentTheme.primary}66` }}
                    style={{ marginLeft: 8 }}
                  />
                </View>
              </View>
              {/* 音色選択 */}
              <View style={styles.settingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingLabel, { color: currentTheme.text }]}>音色</Text>
                  <Text style={[styles.settingDescription, { color: currentTheme.textSecondary }]}>通知音のタイプ</Text>
                </View>
                <View style={{ flexDirection: 'row' }}>
                  {(
                    [
                      { id: 'beep', label: 'ビープ' },
                      { id: 'chime', label: 'チャイム' },
                      { id: 'bell', label: 'ベル' }
                    ] as const
                  ).map(opt => (
                    <TouchableOpacity
                      key={opt.id}
                      style={[
                        styles.smallChoiceButton,
                        settings.soundType === opt.id && { backgroundColor: currentTheme.primary }
                      ]}
                      onPress={async () => {
                        setSoundType(opt.id);
                        await AsyncStorage.setItem('timer_sound_type', opt.id);
                      }}
                    >
                      <Text style={{ color: settings.soundType === opt.id ? currentTheme.surface : currentTheme.text, fontWeight: '600', fontSize: 14 }}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

