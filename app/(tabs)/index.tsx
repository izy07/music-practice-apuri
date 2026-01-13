import React, { useEffect, useState, useCallback, useRef, useMemo, useReducer } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import InstrumentHeader from '@/components/InstrumentHeader';
import QuickRecordModal from '@/components/QuickRecordModal';
import PracticeRecordModal from '@/components/PracticeRecordModal';
import EventModal from '@/components/EventModal';
import CalendarDayCell from './components/calendar/CalendarDayCell';
import EventManagementSection from './components/calendar/EventManagementSection';
import { useAuthAdvanced } from '@/hooks/useAuthAdvanced';
import { useCalendarData } from '@/hooks/tabs/useCalendarData';
import { supabase } from '@/lib/supabase';
import { ErrorHandler } from '@/lib/errorHandler';
import { saveRecording } from '@/lib/database';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { getEffectiveInstrumentId } from '@/lib/instrumentUtils';
import { formatLocalDate, formatMinutesToHours } from '@/lib/dateUtils';
import { OfflineStorage, isOnline } from '../../lib/offlineStorage';
import { COMMON_STYLES } from '@/lib/appStyles';
import logger from '@/lib/logger';
import { savePracticeSessionWithIntegration } from '@/repositories/practiceSessionRepository';
import { setCurrentRoute } from '@/lib/navigationHistory';
import { useSubscription } from '@/hooks/useSubscription';
import { canSaveDataForInstrument } from '@/lib/subscriptionLimits';

// テーマの型定義
interface InstrumentTheme {
  background: string;
  surface: string;
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  textSecondary: string;
}

const { width, height } = Dimensions.get('window');

// 画面サイズに応じたスケーリング関数
const getScaledSize = (baseSize: number, smallScreenFactor: number = 0.8) => {
  const isSmallScreen = width < 375 || height < 667; // iPhone SE や小さい画面
  return isSmallScreen ? baseSize * smallScreenFactor : baseSize;
};

// 画面サイズに応じたパディング・マージンの調整
const getScaledSpacing = (baseSpacing: number, smallScreenFactor: number = 0.7) => {
  const isSmallScreen = width < 375 || height < 667;
  return isSmallScreen ? baseSpacing * smallScreenFactor : baseSpacing;
};

// UI状態の型定義
interface UIState {
  showQuickRecord: boolean;
  showPracticeRecord: boolean;
  showEventModal: boolean;
  selectedEvent: {id: string, title: string, description?: string, color?: string | null, date?: string} | null;
  successMessage: string;
  selectedDate: Date | null;
}

// UI状態のアクション型定義
type UIAction =
  | { type: 'SHOW_QUICK_RECORD'; payload: boolean }
  | { type: 'SHOW_PRACTICE_RECORD'; payload: boolean }
  | { type: 'SHOW_EVENT_MODAL'; payload: boolean }
  | { type: 'SET_SELECTED_EVENT'; payload: {id: string, title: string, description?: string, color?: string | null, date?: string} | null }
  | { type: 'SET_SUCCESS_MESSAGE'; payload: string }
  | { type: 'SET_SELECTED_DATE'; payload: Date | null }
  | { type: 'CLOSE_ALL_MODALS' };

// UI状態のリデューサー
const uiReducer = (state: UIState, action: UIAction): UIState => {
  switch (action.type) {
    case 'SHOW_QUICK_RECORD':
      return { ...state, showQuickRecord: action.payload };
    case 'SHOW_PRACTICE_RECORD':
      return { ...state, showPracticeRecord: action.payload };
    case 'SHOW_EVENT_MODAL':
      return { ...state, showEventModal: action.payload };
    case 'SET_SELECTED_EVENT':
      return { ...state, selectedEvent: action.payload };
    case 'SET_SUCCESS_MESSAGE':
      return { ...state, successMessage: action.payload };
    case 'SET_SELECTED_DATE':
      return { ...state, selectedDate: action.payload };
    case 'CLOSE_ALL_MODALS':
      return {
        ...state,
        showQuickRecord: false,
        showPracticeRecord: false,
        showEventModal: false,
        selectedEvent: null,
      };
    default:
      return state;
  }
};

// 初期状態
const initialUIState: UIState = {
  showQuickRecord: false,
  showPracticeRecord: false,
  showEventModal: false,
  selectedEvent: null,
  successMessage: '',
  selectedDate: null,
};

export default function CalendarScreen() {
  const router = useRouter();
  const [allEvents, setAllEvents] = useState<{ [key: string]: Array<{id: string, title: string, description?: string, color?: string | null, date?: string}> }>({});
  const { isAuthenticated, isLoading, isInitialized, user } = useAuthAdvanced();
  const { currentTheme, practiceSettings, selectedInstrument, isInitializing: isInstrumentInitializing } = useInstrumentTheme();
  const { entitlement } = useSubscription();
  const { Platform } = require('react-native');
  
  // 現在のルートを記録（マウント時）
  useEffect(() => {
    setCurrentRoute('/(tabs)/index');
    return () => {
      // アンマウント時はクリアしない（他の画面に遷移する際に使用するため）
    };
  }, []);
  
  // 初期化完了を追跡するためのref（初回データ読み込み用）
  const hasInitialLoadRef = useRef(false);
  
  // データ取得のデバウンス用ref
  const loadAllDataTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastDataFetchTimeRef = useRef<number>(0);
  const lastMonthRef = useRef<{ year: number; month: number } | null>(null);
  const lastInstrumentRef = useRef<string | null>(null);
  // イベント保存後のデータ更新用タイマーIDを保持（メモリリーク防止）
  const eventUpdateTimerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);
  // 成功メッセージ表示用タイマーIDを保持（メモリリーク防止）
  const successMessageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // 練習記録更新処理の重複実行を防ぐためのフラグ
  const isUpdatingRef = useRef(false);
  
  // 日付管理
  const [currentDate, setCurrentDate] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedDate = localStorage.getItem('home_calendar_view_date');
      logger.debug('📅 ホーム画面 - 保存された日付を読み込み:', savedDate);
      if (savedDate) {
        const date = new Date(savedDate);
        logger.debug('📅 ホーム画面 - 読み込んだ日付:', date.getFullYear(), '年', date.getMonth() + 1, '月');
        return date;
      }
    }
    const defaultDate = new Date();
    logger.debug('📅 ホーム画面 - デフォルト日付を使用:', defaultDate.getFullYear(), '年', defaultDate.getMonth() + 1, '月');
    return defaultDate;
  });
  
  // UI状態（useReducerで集約）
  const [uiState, dispatchUI] = useReducer(uiReducer, initialUIState);
  const [isOffline, setIsOffline] = useState(false);
  const [practiceRecordRefreshKey, setPracticeRecordRefreshKey] = useState(0); // PracticeRecordModalのリフレッシュキー
  
  // UI状態のヘルパー関数
  const setShowQuickRecord = useCallback((show: boolean) => {
    dispatchUI({ type: 'SHOW_QUICK_RECORD', payload: show });
  }, []);
  const setShowPracticeRecord = useCallback((show: boolean) => {
    dispatchUI({ type: 'SHOW_PRACTICE_RECORD', payload: show });
  }, []);
  const setShowEventModal = useCallback((show: boolean) => {
    dispatchUI({ type: 'SHOW_EVENT_MODAL', payload: show });
  }, []);
  const setSelectedEvent = useCallback((event: {id: string, title: string, description?: string, color?: string | null, date?: string} | null) => {
    dispatchUI({ type: 'SET_SELECTED_EVENT', payload: event });
  }, []);
  const setSuccessMessage = useCallback((message: string) => {
    dispatchUI({ type: 'SET_SUCCESS_MESSAGE', payload: message });
  }, []);
  const setSelectedDate = useCallback((date: Date | null) => {
    dispatchUI({ type: 'SET_SELECTED_DATE', payload: date });
  }, []);
  
  // カレンダーデータ管理（カスタムフックに移行）
  const {
    practiceData,
    recordingsData,
    events,
    monthlyTotal,
    totalPracticeTime,
    shortTermGoal,
    shortTermGoals,
    loadAllData,
    loadPracticeData,
    loadTotalPracticeTime,
    loadEvents,
    loadRecordingsData,
    loadShortTermGoal,
    loadAllEvents,
  } = useCalendarData(currentDate);

  // 認証チェック
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      return; // 認証されていない場合は早期リターン
    }
  }, [isLoading, isAuthenticated]);

  // 全イベントを読み込む（イベント管理セクション用）
  useEffect(() => {
    const loadAllEventsData = async () => {
      if (isAuthenticated && !isLoading && loadAllEvents) {
        const allEventsData = await loadAllEvents();
        setAllEvents(allEventsData || {});
      }
    };
    loadAllEventsData();
  }, [isAuthenticated, isLoading, loadAllEvents]);

  // ネットワーク状態監視
  useEffect(() => {
    const updateNetworkStatus = () => {
      setIsOffline(!isOnline());
    };

    updateNetworkStatus();
    
    if (typeof window !== 'undefined') {
      window.addEventListener('online', updateNetworkStatus);
      window.addEventListener('offline', updateNetworkStatus);
      
      return () => {
        window.removeEventListener('online', updateNetworkStatus);
        window.removeEventListener('offline', updateNetworkStatus);
      };
    }
  }, []);

  // currentDateが変更されたらlocalStorageに保存
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dateStr = currentDate.toISOString();
      localStorage.setItem('home_calendar_view_date', dateStr);
    }
  }, [currentDate]);

  // ログイン成功時にカレンダーの日付を今日にリセット
  useEffect(() => {
    if (!isAuthenticated || isLoading || !isInitialized) {
      return;
    }
    
    if (typeof window !== 'undefined') {
      try {
        const loginSuccessFlag = localStorage.getItem('login_success_reset_calendar');
        if (loginSuccessFlag === 'true') {
          // ログイン成功フラグが存在する場合、カレンダーの日付を今日にリセット
          const today = new Date();
          setCurrentDate(today);
          localStorage.removeItem('login_success_reset_calendar');
          logger.debug('ログイン成功を検出 - カレンダーの日付を今日にリセットしました', {
            year: today.getFullYear(),
            month: today.getMonth() + 1
          });
        }
      } catch (error) {
        logger.warn('ログイン成功時のカレンダー日付リセットに失敗しました（続行）:', error);
      }
    }
  }, [isAuthenticated, isLoading, isInitialized]);

  // 初回データ読み込み（初期化完了後、認証済み、楽器選択済みの場合）
  useEffect(() => {
    if (isLoading || !isInitialized || !isAuthenticated || isInstrumentInitializing || !selectedInstrument || selectedInstrument.trim() === '') {
      return;
    }
    
    // 初回データ読み込みを実行（一度だけ）
    if (!hasInitialLoadRef.current) {
      logger.debug('初回データ読み込みを開始します', { 
        selectedInstrument, 
        isInitialized, 
        isInstrumentInitializing,
        instrumentId: getEffectiveInstrumentId(selectedInstrument, user?.selected_instrument_id)
      });
      hasInitialLoadRef.current = true;
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      loadAllData().then(() => {
        lastDataFetchTimeRef.current = Date.now();
        lastMonthRef.current = { year: currentYear, month: currentMonth };
        lastInstrumentRef.current = selectedInstrument || null;
      });
    }
  }, [isLoading, isInitialized, isAuthenticated, isInstrumentInitializing, selectedInstrument]); // loadAllDataを依存配列から削除（安定した参照を保持）
  
  // クリーンアップ: タイマーをクリア
  useEffect(() => {
    return () => {
      if (loadAllDataTimeoutRef.current) {
        clearTimeout(loadAllDataTimeoutRef.current);
        loadAllDataTimeoutRef.current = null;
      }
    };
  }, []);

  // デバウンス付きデータ取得関数（useEffectの前に定義）
  const debouncedLoadAllData = useCallback((force: boolean = false) => {
    // 既存のタイマーをクリア
    if (loadAllDataTimeoutRef.current) {
      clearTimeout(loadAllDataTimeoutRef.current);
    }
    
    // 月または楽器が変更された場合は強制取得
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    const currentInstrument = selectedInstrument || '';
    
    const monthChanged = !lastMonthRef.current || 
      lastMonthRef.current.year !== currentYear || 
      lastMonthRef.current.month !== currentMonth;
    
    const instrumentChanged = lastInstrumentRef.current !== currentInstrument;
    
    // 強制取得フラグがtrue、または月/楽器が変更された場合は必ず取得
    const shouldForceFetch = force || monthChanged || instrumentChanged;
    
    // 強制取得でない場合、前回取得から60秒以内の場合はスキップ（パフォーマンス最適化）
    if (!shouldForceFetch) {
      const now = Date.now();
      const timeSinceLastFetch = now - lastDataFetchTimeRef.current;
      if (timeSinceLastFetch < 60000) {
        logger.debug('前回取得から60秒以内のため、データ取得をスキップします', {
          timeSinceLastFetch,
          lastFetchTime: lastDataFetchTimeRef.current
        });
        return;
      }
    }
    
    // 300ms後に実行（デバウンス）
    loadAllDataTimeoutRef.current = setTimeout(async () => {
      try {
        await loadAllData();
        lastDataFetchTimeRef.current = Date.now();
        lastMonthRef.current = { year: currentYear, month: currentMonth };
        lastInstrumentRef.current = currentInstrument;
        logger.debug('デバウンス付きデータ取得完了', {
          monthChanged,
          instrumentChanged,
          force
        });
      } catch (error) {
        logger.error('デバウンス付きデータ取得エラー:', error);
      }
      loadAllDataTimeoutRef.current = null;
    }, 300);
  }, [loadAllData, currentDate, selectedInstrument]);

  // Load practice/events/recordings for current month and total（デバウンス付き）
  useEffect(() => {
    if (isLoading || !isInitialized || !isAuthenticated || isInstrumentInitializing || !selectedInstrument || selectedInstrument.trim() === '') {
      return;
    }
    
    // 初回ロード後の月変更のみを処理（初回ロードは別のuseEffectで処理）
    if (hasInitialLoadRef.current) {
      // 月が変わった時はデバウンス付きでデータを読み込む
      logger.debug('月が変更されました、デバウンス付きでデータを再読み込みします', { 
        year: currentDate.getFullYear(), 
        month: currentDate.getMonth() + 1,
        selectedInstrument,
        instrumentId: getEffectiveInstrumentId(selectedInstrument, user?.selected_instrument_id)
      });
      debouncedLoadAllData();
    }
  }, [currentDate, isLoading, isInitialized, isAuthenticated, isInstrumentInitializing, selectedInstrument, debouncedLoadAllData]);

  // 楽器変更時にデータを再読み込み（デバウンス付き）
  useEffect(() => {
    if (isLoading || !isInitialized || !isAuthenticated || isInstrumentInitializing || !selectedInstrument || selectedInstrument.trim() === '') {
      return;
    }
    
    // 初回ロード後の楽器変更のみを処理（初回ロードは別のuseEffectで処理）
    if (hasInitialLoadRef.current) {
      // 楽器が変更された時はデバウンス付きでデータを読み込む
      logger.debug('楽器が変更されました、デバウンス付きでデータを再読み込みします', { 
        selectedInstrument,
        instrumentId: getEffectiveInstrumentId(selectedInstrument, user?.selected_instrument_id)
      });
      debouncedLoadAllData();
    }
  }, [selectedInstrument, isLoading, isInitialized, isAuthenticated, isInstrumentInitializing, debouncedLoadAllData]);

  // 画面に戻ってきたときに最新化（最適化版）
  useFocusEffect(
    useCallback(() => {
      if (isLoading || !isInitialized || !isAuthenticated || isInstrumentInitializing || !selectedInstrument || selectedInstrument.trim() === '') {
        return;
      }
      
      // 最近の練習記録がある場合は強制的にデータを更新（タイマー完了時の自動記録など）
      if (typeof window !== 'undefined') {
        try {
          const lastTimestamp = window.localStorage.getItem('last_practice_record_timestamp');
          const lastInstrumentId = window.localStorage.getItem('last_practice_record_instrument_id');
          // 共通関数を使用して楽器IDを取得
          const currentInstrumentId = getEffectiveInstrumentId(selectedInstrument, user?.selected_instrument_id);
          
          if (lastTimestamp && Date.now() - parseInt(lastTimestamp) < 60000) {
            // 60秒以内に記録があった場合、楽器IDが一致する場合は強制更新（デバウンスなし）
            if (lastInstrumentId === (currentInstrumentId || 'null')) {
              logger.debug('最近の記録を検出、データを強制更新します', {
                lastTimestamp,
                lastInstrumentId,
                currentInstrumentId,
                timeDiff: Date.now() - parseInt(lastTimestamp)
              });
              // データベースの反映を待つため、少し遅延させてから更新（1回のみ）
              // 既存のタイマーをクリア（メモリリーク防止）
              if (loadAllDataTimeoutRef.current) {
                clearTimeout(loadAllDataTimeoutRef.current);
              }
              loadAllDataTimeoutRef.current = setTimeout(async () => {
                try {
                  await loadAllData();
                  lastDataFetchTimeRef.current = Date.now();
                  logger.debug('useFocusEffect: 強制データ更新完了');
                  loadAllDataTimeoutRef.current = null;
                } catch (error) {
                  logger.error('useFocusEffect: 強制データ更新エラー:', error);
                  loadAllDataTimeoutRef.current = null;
                }
              }, 500); // 1500msから500msに短縮
              return;
            }
          }
        } catch (e) {
          // localStorageへのアクセスエラーは無視
        }
      }
      
      // 通常の場合はデバウンス付きで取得
      logger.debug('画面にフォーカス、デバウンス付きでデータを再読み込みします', { 
        isInitialized, 
        selectedInstrument 
      });
      debouncedLoadAllData();
    }, [isLoading, isInitialized, isAuthenticated, debouncedLoadAllData, selectedInstrument])
  );

  // 練習記録保存後のデータ更新関数（直接呼び出し用）
  const refreshPracticeData = useCallback(async (includeRecordings: boolean = false) => {
    logger.debug('[refreshPracticeData] ========== refreshPracticeData開始 ==========');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        logger.debug('[refreshPracticeData] ❌ ユーザーが存在しません');
        return;
      }
      
      logger.debug('[refreshPracticeData] パラメータ:', { 
        includeRecordings, 
        userId: user.id,
        loadPracticeDataExists: typeof loadPracticeData === 'function',
        loadTotalPracticeTimeExists: typeof loadTotalPracticeTime === 'function',
        loadRecordingsDataExists: typeof loadRecordingsData === 'function'
      });
      
      if (includeRecordings) {
        logger.debug('[refreshPracticeData] 録音データを含めてデータを読み込みます');
        await Promise.all([
          (async () => {
            logger.debug('[refreshPracticeData] loadPracticeData呼び出し開始');
            try {
              await loadPracticeData(user);
              logger.debug('[refreshPracticeData] loadPracticeData完了');
            } catch (error) {
              logger.error('[refreshPracticeData] loadPracticeDataエラー:', error);
              throw error;
            }
          })(),
          (async () => {
            logger.debug('[refreshPracticeData] loadTotalPracticeTime呼び出し開始');
            try {
              await loadTotalPracticeTime(user);
              logger.debug('[refreshPracticeData] loadTotalPracticeTime完了');
            } catch (error) {
              logger.error('[refreshPracticeData] loadTotalPracticeTimeエラー:', error);
              throw error;
            }
          })(),
          (async () => {
            logger.debug('[refreshPracticeData] loadRecordingsData呼び出し開始');
            try {
              await loadRecordingsData(user);
              logger.debug('[refreshPracticeData] loadRecordingsData完了');
            } catch (error) {
              logger.error('[refreshPracticeData] loadRecordingsDataエラー:', error);
              throw error;
            }
          })()
        ]);
      } else {
        logger.debug('[refreshPracticeData] 練習データと合計練習時間を読み込みます');
        await Promise.all([
          (async () => {
            logger.debug('[refreshPracticeData] loadPracticeData呼び出し開始');
            try {
              await loadPracticeData(user);
              logger.debug('[refreshPracticeData] loadPracticeData完了');
            } catch (error) {
              logger.error('[refreshPracticeData] loadPracticeDataエラー:', error);
              throw error;
            }
          })(),
          (async () => {
            logger.debug('[refreshPracticeData] loadTotalPracticeTime呼び出し開始');
            try {
              await loadTotalPracticeTime(user);
              logger.debug('[refreshPracticeData] loadTotalPracticeTime完了');
            } catch (error) {
              logger.error('[refreshPracticeData] loadTotalPracticeTimeエラー:', error);
              throw error;
            }
          })()
        ]);
      }
      logger.debug('[refreshPracticeData] ========== refreshPracticeData完了 ==========');
    } catch (error) {
      // エラーは無視（データ読み込み失敗は致命的ではない）
      logger.error('[refreshPracticeData] ❌ カレンダーデータ読み込みエラー:', error);
      console.error('カレンダーデータ読み込みエラー:', error);
    }
  }, [loadPracticeData, loadTotalPracticeTime, loadRecordingsData]);

  // 目標表示更新関数（直接呼び出し用）
  const refreshGoalDisplay = useCallback(async (immediate: boolean = false) => {
    try {
      if (immediate) {
        // 即時更新の場合は少し待ってから読み込み（データベース反映を待つ）
        setTimeout(async () => {
          try {
            // 強制リフレッシュでキャッシュを無視してデータベースから読み込む
            await loadShortTermGoal(undefined, true);
            logger.debug('目標表示を即時再読み込みしました（強制リフレッシュ）');
          } catch (error) {
            logger.error('目標表示即時再読み込みエラー:', error);
          }
        }, 300); // データベース反映を待つため300ms待機
      } else {
        // データベースの反映を待つため、少し遅延させてから読み込み
        // 初回読み込み（強制リフレッシュでキャッシュを無視）
        await loadShortTermGoal(undefined, true);
        
        // データベースの反映が遅い場合に備えて、少し待ってから再読み込み
        setTimeout(async () => {
          try {
            await loadShortTermGoal(undefined, true);
            logger.debug('目標表示を再読み込みしました（強制リフレッシュ）');
          } catch (error) {
            logger.error('目標表示再読み込みエラー:', error);
          }
        }, 500);
      }
    } catch (error) {
      // エラーは無視（目標表示更新失敗は致命的ではない）
      logger.error('目標表示更新エラー:', error);
    }
  }, [loadShortTermGoal]);

  // 目標画面からのカレンダー表示更新イベントをリッスン
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleCalendarGoalUpdated = (event: Event) => {
      const customEvent = event as CustomEvent;
      logger.debug('📅 カレンダー目標更新イベントを受信、目標を再読み込みします', customEvent?.detail);
      // ボタン押下時は即座に反映（ラグを解消）
      refreshGoalDisplay(true);
    };

    window.addEventListener('calendarGoalUpdated', handleCalendarGoalUpdated as EventListener);

    return () => {
      window.removeEventListener('calendarGoalUpdated', handleCalendarGoalUpdated);
    };
  }, [refreshGoalDisplay]);

  // 練習記録更新イベントをリッスン（タイマー記録など）
  // 練習記録更新イベントの処理（重複実行を防ぐ）
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handlePracticeRecordUpdated = (event: Event) => {
      // 既に更新処理中の場合はスキップ（重複実行を防ぐ）
      if (isUpdatingRef.current) {
        logger.debug('📅 練習記録更新イベントを受信しましたが、既に更新処理中のためスキップします');
        return;
      }

      const customEvent = event as CustomEvent;
      const detail = customEvent?.detail;
      logger.debug('📅 練習記録更新イベントを受信、データを再読み込みします', detail);
      
      // 更新処理中フラグを設定
      isUpdatingRef.current = true;
      
      // verifiedフラグがtrueの場合は、データベースへの反映が確認済みなので即座に更新
      // falseの場合は、データベース反映を待つ必要がある
      const isVerified = detail?.verified === true;
      const initialDelay = isVerified ? 300 : 500; // 遅延時間を短縮（重複実行を防ぐため）
      
      // データベースの反映を待つため、適切な遅延を設けてから更新（1回のみ）
      setTimeout(async () => {
        try {
          await loadAllData();
          logger.debug('データ更新完了', { isVerified, source: detail?.source });
        } catch (error) {
          logger.error('データ更新エラー:', error);
        } finally {
          // 更新処理完了後、フラグをリセット
          isUpdatingRef.current = false;
        }
      }, initialDelay);
    };

    window.addEventListener('practiceRecordUpdated', handlePracticeRecordUpdated as EventListener);

    return () => {
      window.removeEventListener('practiceRecordUpdated', handlePracticeRecordUpdated);
      // クリーンアップ時にフラグをリセット
      isUpdatingRef.current = false;
    };
  }, [loadAllData]);

  // イベント作成イベントをリッスン（練習日程からイベントが作成された場合）
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleEventCreated = (event: Event) => {
      const customEvent = event as CustomEvent;
      logger.debug('📅 イベント作成イベントを受信、イベントを再読み込みします', customEvent?.detail);
      
      // イベントを再読み込み
      setTimeout(async () => {
        try {
          await loadEvents();
          logger.debug('loadEvents完了（イベント作成後）');
        } catch (error) {
          logger.error('イベント読み込みエラー（イベント作成後）:', error);
        }
      }, 500);
    };

    window.addEventListener('eventCreated', handleEventCreated as EventListener);

    return () => {
      window.removeEventListener('eventCreated', handleEventCreated);
    };
  }, [loadEvents]);

  // 楽器ID取得は共通関数を使用（getInstrumentId）

  // 古いデータロジック関数は削除済み - useCalendarDataフックを使用

  const savePracticeRecord = async (minutes: number, content?: string, audioUrl?: string, date?: Date, videoUrl?: string) => {
    try {
      // 認証チェック
      if (!isAuthenticated) {
        Alert.alert('認証エラー', 'ログインが必要です');
        return;
      }

      // ユーザーを取得（既存の認証状態を使用）
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('認証エラー', 'ユーザー情報が取得できませんでした。再度ログインしてください。');
        return;
      }

      // 共通関数を使用して楽器IDを取得
      const currentInstrumentId = getEffectiveInstrumentId(selectedInstrument, user?.selected_instrument_id);

      // Freeプランの場合、新しい楽器でデータを保存できるかチェック
      const canSaveCheck = await canSaveDataForInstrument(user.id, currentInstrumentId, entitlement);
      if (!canSaveCheck.canSave) {
        Alert.alert(
          'アップグレードが必要です',
          canSaveCheck.reason || '新しい楽器でデータを追加するには、プレミアムへアップグレードしてください。',
          [
            { text: 'キャンセル', style: 'cancel' },
            { text: 'プレミアムを見る', onPress: () => router.push('/(tabs)/pricing-plans') }
          ]
        );
        return;
      }

      const practiceDate = date || new Date();
      const practiceRecord = {
        user_id: user.id,
        practice_date: formatLocalDate(practiceDate),
        duration_minutes: minutes,
        content: content || undefined,
        audio_url: audioUrl || undefined,
        video_url: videoUrl || undefined,
        input_method: 'manual' as const,
        instrument_id: currentInstrumentId || undefined
      };

      // 録音や動画URLがある場合は録音ライブラリにも保存
      if (audioUrl || videoUrl) {
        try {
          // Freeプランの場合、選択された日付が今月であることを確認
          const { useSubscription } = await import('@/hooks/useSubscription');
          const { isCurrentMonth } = await import('@/lib/subscriptionLimits');
          // 注意: フックはコンポーネント内でのみ使用可能なため、ここでは直接チェック
          // 実際のチェックはAudioRecorderコンポーネントで行われるため、ここでは保存のみ実行
          await saveRecording({
            user_id: user.id,
            instrument_id: currentInstrumentId || null, // 現在の楽器IDを追加
            title: content || '練習記録',
            memo: `練習時間: ${minutes}分`,
            file_path: audioUrl || videoUrl || '',
            duration_seconds: null,
            is_favorite: false,
            recorded_at: practiceDate.toISOString(),
            recording_type: 'performance', // デフォルトは演奏録音
          });
          logger.info('録音/動画を録音ライブラリに保存しました');
        } catch (recordingError) {
          // 録音ライブラリへの保存エラーは無視
          logger.error('録音ライブラリへの保存エラー:', recordingError);
          // 録音ライブラリ保存に失敗してもメインの練習記録は保存する
        }
      }

      // オンライン時はサーバーに保存を試行
      if (isOnline()) {
        try {
          // savePracticeSessionWithIntegrationを使用して保存
          logger.debug(`[savePracticeRecord] 練習記録保存開始`, {
            userId: user.id,
            minutes,
            currentInstrumentId,
            practiceDate: practiceRecord.practice_date,
            options: {
              instrumentId: currentInstrumentId || null,
              content: content || undefined,
              inputMethod: 'manual',
              practiceDate: practiceRecord.practice_date
            }
          });
          
          const result = await savePracticeSessionWithIntegration(
            user.id,
            minutes,
            {
              instrumentId: currentInstrumentId || null,
              content: content || undefined,
              inputMethod: 'manual',
              practiceDate: practiceRecord.practice_date, // 選択された日付を指定
              replaceMinutes: true, // 既存の時間を置き換える（加算しない）
              audioUrl: audioUrl || null,
              videoUrl: videoUrl || null,
            }
          );
          
          logger.debug(`[savePracticeRecord] 練習記録保存結果`, {
            success: result.success,
            error: result.error ? {
              code: result.error.code,
              message: result.error.message
            } : null
          });
          
          // 保存結果を確認
          if (!result.success) {
            // エラーが発生した場合は、明確にエラーメッセージを表示
            const errorMessage = result.error?.message || '練習記録の保存に失敗しました';
            
            // テーブルが存在しないエラーの場合
            if (result.error?.code === 'PGRST205' || result.error?.code === 'PGRST116') {
              Alert.alert('準備中', '練習記録機能は準備中です');
              throw new Error('練習記録機能は準備中です');
            }
            
            // その他のエラー
            Alert.alert('保存エラー', errorMessage);
            throw new Error(errorMessage);
          }
          
          // サーバー保存成功
          // 録音や動画がある場合のみメッセージに追加
          const hasMedia = !!(audioUrl || videoUrl);
          const mediaMessage = hasMedia ? '録音・動画ライブラリにも保存されました！' : '';
          
            setSuccessMessage(`${minutes}分の練習記録を保存しました！${mediaMessage}`);
          setTimeout(() => setSuccessMessage(''), 3000);
          
          // 保存完了後にlocalStorageにタイムスタンプを保存
          if (typeof window !== 'undefined') {
            try {
              window.localStorage.setItem('last_practice_record_timestamp', Date.now().toString());
              if (currentInstrumentId) {
                window.localStorage.setItem('last_practice_record_instrument_id', currentInstrumentId);
              } else {
                window.localStorage.setItem('last_practice_record_instrument_id', 'null');
              }
            } catch (e) {
              // localStorageへの書き込みエラーは無視
            }
          }
          
          logger.debug(`[savePracticeRecord] ========== 練習記録保存成功 ==========`, {
            minutes,
            practiceDate: practiceRecord.practice_date,
            instrumentId: currentInstrumentId,
            practiceRecord
          });
          
          // キャッシュをクリアしてからデータを更新（確実に最新データを取得）
          // 楽器切り替え後のデータ表示を考慮して、すべての楽器のキャッシュをクリア
          logger.debug(`[savePracticeRecord] Step 1: キャッシュクリア開始`);
          try {
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            const currentYear = new Date().getFullYear();
            const currentMonth = new Date().getMonth();
            
            // 現在の楽器IDのキャッシュをクリア
            const currentInstrumentId = getEffectiveInstrumentId(selectedInstrument, user?.selected_instrument_id);
            const currentCacheKey = `practice_data_cache_${user.id}_${currentInstrumentId || 'all'}_${currentYear}_${currentMonth}`;
            
            logger.debug(`[savePracticeRecord] キャッシュキー確認:`, {
              currentInstrumentId,
              currentCacheKey,
              practiceDate: practiceRecord.practice_date
            });
            
            // すべてのキャッシュキーを検索して削除（より確実に）
            const cacheKeyPattern = `practice_data_cache_${user.id}_`;
            const allKeys = await AsyncStorage.getAllKeys();
            const practiceCacheKeys = allKeys.filter((key: string) => key.startsWith(cacheKeyPattern));
            logger.debug(`[savePracticeRecord] 検出されたキャッシュキー:`, {
              allKeysCount: allKeys.length,
              practiceCacheKeysCount: practiceCacheKeys.length,
              practiceCacheKeys
            });
            
            if (practiceCacheKeys.length > 0) {
              await AsyncStorage.multiRemove(practiceCacheKeys);
              logger.debug(`[savePracticeRecord] ✅ 練習データのキャッシュをクリアしました（すべての楽器）`, {
                currentInstrumentId,
                clearedKeys: practiceCacheKeys.length,
                clearedKeysList: practiceCacheKeys
              });
            } else {
              logger.debug(`[savePracticeRecord] クリアするキャッシュキーが見つかりませんでした`);
            }
          } catch (cacheError) {
            // キャッシュクリアのエラーは無視
            logger.error(`[savePracticeRecord] ❌ キャッシュクリアエラー:`, cacheError);
          }
          
          // 保存完了後に直接データを更新（データベースの反映を待つため少し遅延）
          logger.debug(`[savePracticeRecord] Step 2: データベース反映待機中（500ms）`);
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // データ更新を確実に実行
          // 注意: イベントハンドラー（loadAllData）が既に実行されるため、
          // ここではrefreshPracticeDataを呼ばず、イベントの発火のみに任せる
          // ただし、イベントが発火されない場合に備えて、短い遅延後にrefreshPracticeDataを呼ぶ
          logger.debug(`[savePracticeRecord] Step 3: イベントによるデータ更新を待機中（イベントが発火されるため、refreshPracticeDataは呼び出さない）`);
          
          // イベントが発火されない場合に備えて、フォールバックとしてrefreshPracticeDataを呼ぶ
          setTimeout(async () => {
            try {
              logger.debug(`[savePracticeRecord] フォールバック: refreshPracticeDataを呼び出し`);
              await refreshPracticeData(false);
              logger.debug(`[savePracticeRecord] ✅ フォールバックデータ更新完了`);
            } catch (refreshError) {
              logger.error(`[savePracticeRecord] ❌ フォールバックデータ更新エラー:`, refreshError);
            }
          }, 1500); // イベントハンドラーが実行された後に実行されるように長めの遅延
          
          logger.debug(`[savePracticeRecord] ========== 処理完了 ==========`);
          
          return;
        } catch (error) {
          Alert.alert('エラー', 'サーバーへの保存に失敗しました');
          logger.error('サーバー保存エラー:', error);
          
          // エラーメッセージを表示
          const errorMessage = error instanceof Error ? error.message : '練習記録の保存に失敗しました';
          Alert.alert('保存エラー', errorMessage);
          
          // サーバー保存エラー、ローカルに保存を試みる
        }
      }

      // オフライン時またはサーバー保存失敗時はローカルに保存
      const result = await OfflineStorage.savePracticeRecord(practiceRecord);
      if (result.success) {
        const hasMedia = !!(audioUrl || videoUrl);
        const mediaMessage = hasMedia ? '録音・動画ライブラリにも保存されました！' : '';
        setSuccessMessage(`${minutes}分の練習記録をローカルに保存しました！${mediaMessage}（オフライン）`);
        setTimeout(() => setSuccessMessage(''), 3000);
        
        // 保存完了後にlocalStorageにタイムスタンプを保存
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem('last_practice_record_timestamp', Date.now().toString());
            if (currentInstrumentId) {
              window.localStorage.setItem('last_practice_record_instrument_id', currentInstrumentId);
            }
          } catch (e) {
            // localStorageへの書き込みエラーは無視
          }
        }
        
        // オフライン時も直接データを更新
        await refreshPracticeData(false);
      } else {
        throw new Error('ローカル保存に失敗しました');
      }
    } catch (error) {
      Alert.alert('エラー', '練習記録の保存に失敗しました');
      logger.error('練習記録保存エラー:', error);
      Alert.alert('エラー', '練習記録の保存に失敗しました');
    }
  };



  const getDaysInMonth = useCallback((date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }, []);

  const getFirstDayOfMonth = useCallback((date: Date) => {
    // 月の最初の日の曜日を取得（0=日曜日, 1=月曜日, ..., 6=土曜日）
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    return firstDay;
  }, []);

  const handleDateSelection = useCallback((date: Date) => {
    setSelectedDate(date);
    setShowPracticeRecord(true);
  }, [setSelectedDate, setShowPracticeRecord]);

  // 選択された日付のイベントを取得
  const getEventsForDate = useCallback((date: Date | null): Array<{id: string, title: string, description?: string, color?: string | null, date?: string}> => {
    if (!date) return [];
    const dateStr = formatLocalDate(date);
    const dateEvents = events[dateStr] || [];
    // 各イベントに日付を追加
    return dateEvents.map(event => ({ ...event, date: dateStr }));
  }, [events]);

  const handleEventSelection = useCallback((event: {id: string, title: string, description?: string, color?: string | null, date?: string}) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  }, [setSelectedEvent, setShowEventModal]);

  const navigateMonth = useCallback((direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(currentDate.getMonth() - 1);
    } else {
      newDate.setMonth(currentDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  }, [currentDate]);

  // 現在表示している月が今日の月かどうかをチェック
  const isCurrentMonth = useMemo(() => {
    const today = new Date();
    return (
      currentDate.getFullYear() === today.getFullYear() &&
      currentDate.getMonth() === today.getMonth()
    );
  }, [currentDate]);

  // 今日の月に戻る
  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  // 今日の日付情報をuseMemoでキャッシュ
  const todayInfo = useMemo(() => {
    const today = new Date();
    return {
      year: today.getFullYear(),
      month: today.getMonth(),
      date: today.getDate()
    };
  }, []);

  // カレンダーの日付表示を1から作り直し（日曜始まり）- useMemoでキャッシュ
  // 最適化: データが読み込まれたら順次表示（全データ待機しない）
  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    
    // カレンダーグリッドの作成（7列 × 必要な行数）
    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
    const calendarCells: React.ReactElement[] = [];
    
    for (let i = 0; i < totalCells; i++) {
      const cellIndex = i - firstDay;
      const isCurrentMonth = cellIndex >= 0 && cellIndex < daysInMonth;
      const day = isCurrentMonth ? cellIndex + 1 : null;
      
      if (isCurrentMonth && day) {
        // 実際の日付セル
        // データが読み込まれていなくても、空の状態で表示（段階的表示）
        // 日付文字列（YYYY-MM-DD）をキーとして使用
        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayData = practiceData[dateStr];
        const dayRecordings = recordingsData[dateStr]; // 日付文字列をキーとして使用
        const dateEvents = events[dateStr] || [];
        // 各イベントに日付を追加
        const dayEvents: Array<{id: string, title: string, description?: string, color?: string | null, date?: string}> = dateEvents.map(event => ({ ...event, date: dateStr }));
        const hasPracticeRecord = dayData?.hasRecord || false; // 練習時間が記録されたか（タイマー、クイック、手動入力など）
        const hasBasicPractice = dayData?.hasBasicPractice || false; // 基礎練（input_method: 'preset'）があるか
        const hasRecording = dayRecordings?.hasRecording || false;
        
        // 今日の日付かどうかをチェック
        const isToday = currentDate.getFullYear() === todayInfo.year &&
                       currentDate.getMonth() === todayInfo.month &&
                       day === todayInfo.date;

        // 日曜日か土曜日かチェック
        const dayOfWeek = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).getDay();
        const isSunday = dayOfWeek === 0;
        const isSaturday = dayOfWeek === 6;
        
        calendarCells.push(
          <CalendarDayCell
            key={`day-${currentDate.getFullYear()}-${currentDate.getMonth()}-${day}`}
            day={day}
            currentDate={currentDate}
            hasPracticeRecord={hasPracticeRecord}
            hasBasicPractice={hasBasicPractice}
            hasRecording={hasRecording}
            dayEvents={dayEvents}
            isToday={isToday}
            isSunday={isSunday}
            isSaturday={isSaturday}
            currentTheme={currentTheme}
            onDatePress={handleDateSelection}
            onEventPress={handleEventSelection}
          />
        );
      } else {
        // 空のセル（前月または翌月の日付）
        calendarCells.push(
          <View
            key={`empty-${i}`}
            style={styles.emptyDay}
          />
        );
      }
    }
    
    return calendarCells;
  }, [currentDate, practiceData, recordingsData, events, getDaysInMonth, getFirstDayOfMonth, todayInfo, currentTheme, handleDateSelection, handleEventSelection]);

  // 認証チェックはレイアウトレベルで実行されるため、ここでは不要

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} >
      <InstrumentHeader />
      
      <ScrollView style={[styles.content, { backgroundColor: currentTheme.background }]} showsVerticalScrollIndicator={false}>
        <View style={[styles.calendarContainer, { backgroundColor: currentTheme.surface }]}>
          {shortTermGoals && shortTermGoals.length > 0 ? (
            <View style={styles.goalsContainer}>
              {shortTermGoals.map((goal, index) => (
                <View 
                  key={index}
                  style={[styles.goalTitleContainer, { 
                    backgroundColor: currentTheme.primary + '20', // 薄い背景色
                    borderColor: currentTheme.primary,
                    borderWidth: 2,
                    borderRadius: 12,
                    paddingVertical: 1,
                    paddingHorizontal: 16,
                    marginHorizontal: 16,
                    marginBottom: index < shortTermGoals.length - 1 ? 8 : 0,
                  }]}
                >
                  <Text style={[styles.goalTitle, { color: currentTheme.primary }]} numberOfLines={1}>
                    {goal.title}
                    {goal.target_date && (
                      <Text style={[styles.goalDeadlineText, { color: currentTheme.textSecondary }]}>
                        {' '}{new Date(goal.target_date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
                      </Text>
                    )}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.title}>練習カレンダー</Text>
          )}
          
          {/* Month Navigation */}
          <View style={styles.monthHeader}>
            <TouchableOpacity 
              style={[styles.navButton, { backgroundColor: currentTheme.secondary }]}
              onPress={() => navigateMonth('prev')}
              accessibilityRole="button"
              accessibilityLabel="前の月"
              accessibilityHint="前の月のカレンダーを表示します"
            >
              <ChevronLeft size={24} color={currentTheme.primary} />
            </TouchableOpacity>
            
            <View style={{ flex: 1, alignItems: 'center', position: 'relative' }}>
              <Text style={[styles.monthText, { color: currentTheme.text }]}>
                {currentDate.getFullYear()}年{currentDate.getMonth() + 1}月
              </Text>
              {!isCurrentMonth && (
                <TouchableOpacity 
                  style={[styles.todayButton, { position: 'absolute', right: 0, backgroundColor: currentTheme.primary }]}
                  onPress={goToToday}
                  accessibilityRole="button"
                  accessibilityLabel="今日の日付に戻る"
                  accessibilityHint="カレンダーを今日の日付に移動します"
                >
                  <Text style={[styles.todayButtonText, { color: currentTheme.surface, writingDirection: 'ltr' }]}>
                    今日
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            
            <TouchableOpacity 
              style={[styles.navButton, { backgroundColor: currentTheme.secondary }]}
              onPress={() => navigateMonth('next')}
              accessibilityRole="button"
              accessibilityLabel="次の月"
              accessibilityHint="次の月のカレンダーを表示します"
            >
              <ChevronRight size={24} color={currentTheme.primary} />
            </TouchableOpacity>
          </View>

          {/* Day Headers */}
          <View style={styles.dayHeaders}>
            {['日', '月', '火', '水', '木', '金', '土'].map((day, index) => (
              <View
                key={`day-header-${index}`}
                style={styles.dayHeader}
              >
                <Text style={styles.dayHeaderText}>
                  {day}
                </Text>
              </View>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.calendarGrid}>
            {calendarDays}
          </View>

          {/* Monthly Summary - Simplified */}
          <View style={[styles.summaryContainer, { backgroundColor: currentTheme.surface }]}>
            <Text style={[styles.summaryText, { color: currentTheme.text }]}>
              今月の合計練習時間: <Text style={[styles.highlightText, { color: currentTheme.primary }]}>{formatMinutesToHours(monthlyTotal)}</Text>
            </Text>
          </View>

                  {/* Success Message */}
        {uiState.successMessage ? (
          <View style={styles.successMessageContainer}>
            <Text style={styles.successMessageText}>{uiState.successMessage}</Text>
          </View>
        ) : null}

        {/* オフライン状態表示 */}
        {isOffline && (
          <View style={styles.offlineContainer}>
            <Text style={styles.offlineText}>オフラインで動作中</Text>
            <Text style={styles.offlineSubText}>データはローカルに保存されます</Text>
          </View>
        )}
        </View>

        {/* イベント管理セクション */}
        <EventManagementSection
          currentTheme={currentTheme}
          events={allEvents}
          onAddEvent={() => setShowEventModal(true)}
          onEditEvent={(event) => {
            setSelectedEvent(event);
            setShowEventModal(true);
          }}
          onEventDeleted={async () => {
            try {
              // イベントデータを再読み込み
              await loadEvents();
              // 全イベントも再読み込み
              if (loadAllEvents) {
                const allEventsData = await loadAllEvents();
                setAllEvents(allEventsData || {});
              }
              // 練習データも再読み込み（カレンダー表示を更新）
              await refreshPracticeData();
              setSuccessMessage('イベントを削除しました！');
              setTimeout(() => setSuccessMessage(''), 3000);
            } catch (error) {
              logger.error('イベント削除後のデータ再読み込みエラー:', error);
            }
          }}
        />
      </ScrollView>

      {/* Quick Record FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: currentTheme.primary }]}
        onPress={() => setShowQuickRecord(true)}
        accessibilityRole="button"
        accessibilityLabel="クイック記録"
        accessibilityHint="音声を録音して練習記録を保存します"
      >
        <Text style={[styles.fabLabel, { color: currentTheme.surface }]}>クイック{'\n'}記録</Text>
      </TouchableOpacity>

      {/* Modals */}
      <QuickRecordModal
        visible={uiState.showQuickRecord}
        onClose={() => setShowQuickRecord(false)}
        onRecord={async (minutes) => {
          // QuickRecordModal内で既に保存処理とpracticeRecordUpdatedイベントの発火が完了しているため、
          // データ更新はイベントリスナー（handlePracticeRecordUpdated）に任せる
          // 直接refreshPracticeDataを呼ぶ必要はない（重複実行を防ぐため）
          logger.info('クイック記録を保存: ' + minutes + '分', { 
            practiceDate: formatLocalDate(uiState.selectedDate || new Date()),
            instrumentId: getEffectiveInstrumentId(selectedInstrument, user?.selected_instrument_id)
          });
          
          // PracticeRecordModalが開いている場合は、そのモーダル内のデータも再読み込み
          if (uiState.showPracticeRecord) {
            logger.info('PracticeRecordModalが開いているため、モーダル内のデータを再読み込みします');
            setPracticeRecordRefreshKey(prev => prev + 1);
          }
          
          setShowQuickRecord(false);
        }}
      />

      {/* Practice Record Modal */}
      <PracticeRecordModal
        visible={uiState.showPracticeRecord}
        onClose={() => setShowPracticeRecord(false)}
        selectedDate={uiState.selectedDate}
        events={getEventsForDate(uiState.selectedDate)}
        onSave={async (minutes, content, audioUrl, videoUrl) => {
          // 保存処理を実行
          try {
            await savePracticeRecord(minutes, content, audioUrl, uiState.selectedDate || undefined, videoUrl);
          } catch (error) {
            // エラーはsavePracticeRecord内で処理済み
            throw error;
          }
        }}
        onRecordingSaved={async () => {
          // 録音保存後にデータを再読み込み（録音がある場合のみ）
          await refreshPracticeData(true);
        }}
        onRefresh={practiceRecordRefreshKey}
        onEventEdit={(event) => {
          // イベント編集モーダルを開く
          setSelectedEvent(event);
          setShowEventModal(true);
        }}
        onEventDelete={async (event) => {
          // イベント削除
          try {
            logger.debug('カレンダー画面: イベント削除開始', { eventId: event.id, eventTitle: event.title });
            const { error } = await supabase
              .from('events')
              .delete()
              .eq('id', event.id);

            if (error) {
              logger.error('カレンダー画面: イベント削除エラー:', error);
              throw error;
            }
            
            logger.info('カレンダー画面: イベントを削除しました', event.id);
            
            // イベントデータを再読み込み
            logger.debug('カレンダー画面: イベントデータを再読み込みします');
            await loadEvents();
            if (loadAllEvents) {
              const allEventsData = await loadAllEvents();
              setAllEvents(allEventsData || {});
              logger.debug('カレンダー画面: 全イベントデータを再読み込みしました', Object.keys(allEventsData || {}).length);
            }
            
            // 練習データも再読み込み（カレンダー表示を更新）
            logger.debug('カレンダー画面: 練習データを再読み込みします');
            await refreshPracticeData();
            
            // 練習記録画面のデータも更新
            logger.debug('カレンダー画面: 練習記録画面のデータを更新します');
            setPracticeRecordRefreshKey(prev => prev + 1);
            
            setSuccessMessage('イベントを削除しました！');
            // 既存のタイマーをクリア（メモリリーク防止）
            if (successMessageTimerRef.current) {
              clearTimeout(successMessageTimerRef.current);
            }
            successMessageTimerRef.current = setTimeout(() => setSuccessMessage(''), 3000);
            
            // 削除成功のアラートを表示
            Alert.alert('削除完了', 'イベントを削除しました');
          } catch (error) {
            logger.error('カレンダー画面: イベントの削除エラー:', error);
            ErrorHandler.handle(error, 'イベントの削除', true);
            Alert.alert('エラー', 'イベントの削除に失敗しました');
          }
        }}
        onEventCreate={(date) => {
          // イベント作成モーダルを開く（PracticeRecordModalは開いたまま）
          setSelectedDate(date);
          setSelectedEvent(null);
          setShowEventModal(true);
        }}
      />

      <EventModal
        visible={uiState.showEventModal}
        onClose={() => {
          setShowEventModal(false);
          setSelectedEvent(null);
        }}
        selectedDate={uiState.selectedDate || undefined}
        event={uiState.selectedEvent ? {
          id: uiState.selectedEvent!.id,
          title: uiState.selectedEvent!.title,
          date: uiState.selectedEvent!.date || formatLocalDate(uiState.selectedDate || new Date()),
          description: uiState.selectedEvent!.description,
          color: uiState.selectedEvent!.color || undefined,
          is_completed: false
        } : undefined}
        onEventSaved={async () => {
          logger.debug('onEventSavedコールバックが呼ばれました');
          setSelectedEvent(null);
          
          // データベースへの反映を待つため、少し遅延を設けてから更新
          // 複数回試行して確実にデータを取得する
          // 既存のタイマーをクリア（メモリリーク防止）
          eventUpdateTimerRefs.current.forEach(timer => clearTimeout(timer));
          eventUpdateTimerRefs.current = [];
          
          const timer1 = setTimeout(async () => {
            try {
              await loadEvents();
              logger.debug('loadEvents完了（1回目）');
              // 全イベントも再読み込み
              if (loadAllEvents) {
                const allEventsData = await loadAllEvents();
                setAllEvents(allEventsData || {});
              }
            } catch (error) {
              logger.error('イベント読み込みエラー（1回目）:', error);
            }
            
            // さらに待機してから2回目の更新を試行（データベース反映の遅延に対応）
            const timer2 = setTimeout(async () => {
              try {
                await loadEvents();
                logger.debug('loadEvents完了（2回目）');
                // 全イベントも再読み込み
                if (loadAllEvents) {
                  const allEventsData = await loadAllEvents();
                  setAllEvents(allEventsData || {});
                }
                setSuccessMessage('イベントを保存しました！');
                // 既存のタイマーをクリア（メモリリーク防止）
                if (successMessageTimerRef.current) {
                  clearTimeout(successMessageTimerRef.current);
                }
                successMessageTimerRef.current = setTimeout(() => setSuccessMessage(''), 3000);
              } catch (error) {
                logger.error('イベント読み込みエラー（2回目）:', error);
              }
            }, 500);
            eventUpdateTimerRefs.current.push(timer2);
          }, 300);
          eventUpdateTimerRefs.current.push(timer1);
        }}
      />


    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 12, // パディングを少し増やす
    paddingBottom: 65, // タブバーの高さ
  },
  calendarContainer: {
    borderRadius: 12,
    paddingVertical: getScaledSpacing(12),
    paddingHorizontal: getScaledSpacing(12),
    paddingBottom: getScaledSpacing(20), // 下部のパディングを増やしてサマリーとの間隔を確保
    marginTop: getScaledSpacing(8),
    marginBottom: getScaledSpacing(5),
    elevation: 4,
  },
  title: {
    fontSize: getScaledSize(22),
    fontWeight: '700',
    textAlign: 'center',
    color: '#333333',
    marginTop: getScaledSpacing(4),
    marginBottom: getScaledSpacing(12),
  },
  goalsContainer: {
    marginBottom: getScaledSpacing(12),
  },
  goalTitleContainer: {
    alignItems: 'center',
    marginBottom: getScaledSpacing(12),
    paddingHorizontal: 16,
    // 枠線のスタイルはインラインで指定
  },
  goalTitle: {
    fontSize: getScaledSize(20),
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  goalDeadlineText: {
    fontSize: getScaledSize(13),
    textAlign: 'center',
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getScaledSpacing(12),
  },
  navButton: {
    backgroundColor: '#F0F8FF',
    borderRadius: getScaledSize(16),
    padding: getScaledSpacing(8),
  },
  logoutButton: {
    backgroundColor: '#FFF0F0',
    borderRadius: 16,
    padding: 8,
  },
  monthText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
  },
  todayButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 50,
  },
  todayButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: getScaledSpacing(0),
    paddingHorizontal: getScaledSpacing(0.5), // 日付セルと同じマージンを適用
    paddingVertical: getScaledSpacing(4),
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: getScaledSize(13),
    fontWeight: '500',
    color: '#666666',
    paddingVertical: getScaledSpacing(6), // 日付セルの高さに合わせて調整
    height: getScaledSize(40), // 日付セルより少し小さく
  },
  dayHeaderText: {
    textAlign: 'center',
    fontSize: getScaledSize(13),
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    alignItems: 'stretch',
    maxHeight: 350, // カレンダーの最大高さを増加
    paddingVertical: getScaledSpacing(4),
    justifyContent: 'flex-start',
    paddingHorizontal: getScaledSpacing(0.5), // dayHeadersと同じパディングを適用
    marginBottom: getScaledSpacing(6), // カレンダーとサマリーの間隔をさらに短く
    minHeight: 0, // 最小高さをリセット
  },
  emptyDay: {
    width: '14.28%',
    height: 28, // 固定値で短く
    marginHorizontal: 0,
    marginVertical: getScaledSpacing(0.25),
    paddingHorizontal: 0, // calendarGridのpaddingHorizontalで調整するため0に
  },
  dayCell: {
    width: '14.28%',
    height: 28, // 固定値で短く
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: getScaledSize(8),
    marginHorizontal: 0,
    marginVertical: getScaledSpacing(0.25),
    paddingHorizontal: 0, // calendarGridのpaddingHorizontalで調整するため0に
    backgroundColor: '#E8E8E8',
    position: 'relative',
    paddingVertical: 2, // 固定値で短く
  },
  todayCell: {
    backgroundColor: '#E3F2FD',
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  dayWithLongPractice: {
    backgroundColor: '#E6F3FF',
  },
  dayText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    textAlign: 'center',
  },
  sundayText: {
    color: '#FF6B6B', // 日曜日は赤色
  },
  saturdayText: {
    color: '#4ECDC4', // 土曜日は青色
  },
  dayTextHighlight: {
    color: '#8B4513',
    fontWeight: '600',
  },
  indicatorsContainer: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    gap: 4,
  },
  practiceIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2196F3', // 青色（練習記録）
  },
  recordingIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF4444', // 赤色（録音）
  },
  bothIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#9C27B0', // 紫色（両方記録）
  },
  eventText: {
    position: 'absolute',
    bottom: 2,
    fontSize: 8,
    color: '#FF8800',
    fontWeight: '500',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 4,
    borderRadius: 6,
  },
  eventIndicator: {
    position: 'absolute',
    bottom: 3,
    left: 2,
    right: 2,
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 2,
    paddingVertical: 1,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#2196F3',
    maxHeight: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventIndicatorText: {
    fontSize: 7,
    color: '#1976D2',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 9,
  },
  summaryContainer: {
    marginTop: getScaledSpacing(4), // カレンダーとの間隔をさらに短く
    padding: getScaledSpacing(12),
    paddingLeft: getScaledSpacing(16), // 左側の余白を追加
    paddingBottom: getScaledSpacing(6), // 下部のパディングを減らす
    borderRadius: 12,
    marginHorizontal: getScaledSpacing(4), // 左右のマージンも追加
  },
  summaryText: {
    fontSize: 13, // 14 → 13にさらに小さく
    textAlign: 'left', // 左寄せに変更
    color: '#666666',
    fontWeight: '500', // 少し太くして読みやすく
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    color: '#333333',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666666',
    flex: 1,
  },
  highlightText: {
    color: '#8B4513',
    fontWeight: '700', // 600 → 700に太く
    fontSize: 14, // 18 → 14に小さく（テキストと同じサイズ）
  },

  fab: {
    position: 'absolute',
    bottom: getScaledSpacing(100), // 少し上に移動（60 → 100）
    right: getScaledSpacing(20),
    width: getScaledSize(96),
    height: getScaledSize(96),
    borderRadius: getScaledSize(48),
    backgroundColor: '#8B4513',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    
    
    elevation: 6,
  },

  fabLabel: {
    color: '#FFFFFF',
    fontSize: getScaledSize(18),
    fontWeight: '600',
    marginLeft: 0,
    textAlign: 'center',
    lineHeight: getScaledSize(22),
  },

  successMessageContainer: {
    backgroundColor: '#E8F5E8',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#4CAF50',
    alignItems: 'center',
  },
  successMessageText: {
    color: '#2E7D32',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },

  // イベント管理セクションのスタイルは EventManagementSection コンポーネントに移動済み

  // オフライン状態表示のスタイル
  offlineContainer: {
    backgroundColor: '#FFF3CD',
    borderColor: '#FFEAA7',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    alignItems: 'center',
  },
  offlineText: {
    color: '#856404',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  offlineSubText: {
    color: '#856404',
    fontSize: 12,
    textAlign: 'center',
  },
});