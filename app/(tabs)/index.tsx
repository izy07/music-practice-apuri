import React, { useEffect, useState, useCallback, useRef, useMemo, useReducer } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Alert } from 'react-native';
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
import { saveRecording } from '@/lib/database';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { formatLocalDate, formatMinutesToHours } from '@/lib/dateUtils';
import { OfflineStorage, isOnline } from '../../lib/offlineStorage';
import { COMMON_STYLES } from '@/lib/appStyles';
import { logger } from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';

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
  selectedEvent: {id: string, title: string, description?: string} | null;
  successMessage: string;
  selectedDate: Date | null;
}

// UI状態のアクション型定義
type UIAction =
  | { type: 'SHOW_QUICK_RECORD'; payload: boolean }
  | { type: 'SHOW_PRACTICE_RECORD'; payload: boolean }
  | { type: 'SHOW_EVENT_MODAL'; payload: boolean }
  | { type: 'SET_SELECTED_EVENT'; payload: {id: string, title: string, description?: string} | null }
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
  const { isAuthenticated, isLoading } = useAuthAdvanced();
  const { currentTheme, practiceSettings, selectedInstrument } = useInstrumentTheme();
  
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
  const setSelectedEvent = useCallback((event: {id: string, title: string, description?: string} | null) => {
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
    loadAllData,
    loadPracticeData,
    loadTotalPracticeTime,
    loadEvents,
    loadRecordingsData,
    loadShortTermGoal,
  } = useCalendarData(currentDate);

  // 認証チェック
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      return; // 認証されていない場合は早期リターン
    }
  }, [isLoading, isAuthenticated]);

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

  // Load practice/events/recordings for current month and total
  useEffect(() => {
    if (isLoading || !isAuthenticated) {
      return;
    }
    loadAllData();
  }, [currentDate, isLoading, isAuthenticated, loadAllData]);

  // 画面に戻ってきたときに最新化（録音保存後の復帰など）
  useFocusEffect(
    React.useCallback(() => {
      if (isLoading || !isAuthenticated) {
        return;
      }
      loadAllData();
    }, [isLoading, isAuthenticated, loadAllData])
  );

  // タイマーからの練習記録更新通知をリッスン
  useEffect(() => {
    const handlePracticeRecordUpdate = async (event: Event & { detail?: { action?: string; source?: string } }) => {
      const detail = (event as CustomEvent).detail;
      logger.debug('練習記録更新通知を受信:', detail);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const action = detail?.action;
          const source = detail?.source;
          
          // タイマーからの通知の場合は少し待機してから更新（データベースの反映を待つ）
          const delay = source === 'timer' ? 1000 : 0;
          
          setTimeout(async () => {
            // 録音保存の場合は録音データも更新
            if (action === 'recording_saved') {
              await Promise.all([
                loadPracticeData(user),
                loadTotalPracticeTime(user),
                loadRecordingsData(user)
              ]);
              logger.info('✅ 録音保存後のカレンダーデータを更新しました');
            } else {
              // 通常の練習記録更新（タイマー含む）
              await Promise.all([
                loadPracticeData(user),
                loadTotalPracticeTime(user)
              ]);
              logger.info('✅ カレンダーデータを更新しました（ソース:', source || 'unknown', '）');
            }
          }, delay);
        }
      } catch (error) {
        ErrorHandler.handle(error, 'カレンダー更新', false);
        logger.error('❌ カレンダー更新エラー:', error);
      }
    };

    // 楽器変更イベントをリッスン
    const handleInstrumentChange = async (event: Event & { detail?: { instrumentId?: string } }) => {
      logger.debug('楽器変更通知を受信:', (event as CustomEvent).detail);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // 楽器変更時はすべてのデータを再取得
          await Promise.all([
            loadPracticeData(user),
            loadTotalPracticeTime(user),
            loadRecordingsData(user)
          ]);
          logger.info('✅ 楽器変更後のカレンダーデータを更新しました');
        }
      } catch (error) {
        ErrorHandler.handle(error, 'カレンダー更新', false);
        logger.error('❌ 楽器変更後のカレンダー更新エラー:', error);
      }
    };

    // カスタムイベントリスナーを追加
    if (typeof window !== 'undefined') {
      window.addEventListener('practiceRecordUpdated', handlePracticeRecordUpdate);
      window.addEventListener('instrumentChanged', handleInstrumentChange);
      
      // クリーンアップ
      return () => {
        window.removeEventListener('practiceRecordUpdated', handlePracticeRecordUpdate);
        window.removeEventListener('instrumentChanged', handleInstrumentChange);
      };
    }
  }, [loadPracticeData, loadTotalPracticeTime, loadRecordingsData]);

  // 楽器ID取得の共通関数（savePracticeRecordで使用）
  // コンテキストから取得（DBアクセス不要）
  const getCurrentInstrumentId = React.useCallback(async (user: { id: string }): Promise<string | null> => {
    // コンテキストから取得（既にキャッシュされている）
    return selectedInstrument || null;
  }, [selectedInstrument]);

  // 古いデータロジック関数は削除済み - useCalendarDataフックを使用

  const savePracticeRecord = async (minutes: number, content?: string, audioUrl?: string, date?: Date, videoUrl?: string) => {
    try {
      // 認証チェック
      if (!isAuthenticated) {
        Alert.alert('認証エラー', 'ログインが必要です');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('認証エラー', 'ユーザー情報が取得できませんでした');
        return;
      }

      // 現在の楽器IDを取得
      const currentInstrumentId = await getCurrentInstrumentId(user);

      const practiceDate = date || new Date();
      const practiceRecord = {
        user_id: user.id,
        practice_date: formatLocalDate(practiceDate),
        duration_minutes: minutes,
        content: content || null,
        audio_url: audioUrl || null,
        input_method: 'manual',
        instrument_id: currentInstrumentId || null
      };

      // 録音や動画URLがある場合は録音ライブラリにも保存
      if (audioUrl || videoUrl) {
        try {
          await saveRecording({
            user_id: user.id,
            instrument_id: currentInstrumentId || null, // 現在の楽器IDを追加
            title: content || '練習記録',
            memo: `練習時間: ${minutes}分`,
            file_path: audioUrl || videoUrl || '',
            duration_seconds: null,
            is_favorite: false,
            recorded_at: practiceDate.toISOString(),
          });
          logger.info('録音/動画を録音ライブラリに保存しました');
        } catch (recordingError) {
          ErrorHandler.handle(recordingError, '録音ライブラリへの保存', false);
          logger.error('録音ライブラリへの保存エラー:', recordingError);
          // 録音ライブラリ保存に失敗してもメインの練習記録は保存する
        }
      }

      // オンライン時はサーバーに保存を試行
      if (isOnline()) {
        try {
          // 既存の記録があるかチェック（同じ日付、同じ楽器、手動入力）
          let existingQuery = supabase
            .from('practice_sessions')
            .select('id, duration_minutes')
            .eq('user_id', user.id)
            .eq('practice_date', practiceRecord.practice_date)
            .eq('input_method', 'manual');
          
          // 楽器が選択されている場合はフィルタリング
          if (practiceRecord.instrument_id) {
            existingQuery = existingQuery.eq('instrument_id', practiceRecord.instrument_id);
          } else {
            existingQuery = existingQuery.is('instrument_id', null);
          }
          
          const { data: existingRecords } = await existingQuery;

          if (existingRecords && existingRecords.length > 0) {
            // 既存の記録がある場合は時間を加算して更新
            const existing = existingRecords[0];
            const totalMinutes = existing.duration_minutes + minutes;
            
            // contentから時間詳細を削除（時間詳細は表示しない）
            const cleanContent = content || '練習記録';
            
            const { error } = await supabase
              .from('practice_sessions')
              .update({
                duration_minutes: totalMinutes, // 既存時間 + 新規時間
                content: cleanContent, // 時間詳細を含めない
                updated_at: new Date().toISOString()
              })
              .eq('id', existing.id);

            if (error) {
              if (error.code === 'PGRST205' || error.code === 'PGRST116' || error.message?.includes('Could not find the table')) {
                // テーブルが存在しない場合
                Alert.alert('準備中', '練習記録機能は準備中です');
                return;
              }
              throw error;
            }
            
            logger.info(`練習時間を加算: ${existing.duration_minutes}分 + ${minutes}分 = ${totalMinutes}分`);
          } else {
            // 新規記録として挿入
            const { error } = await supabase
              .from('practice_sessions')
              .insert(practiceRecord);

            if (error) {
              if (error.code === 'PGRST205' || error.code === 'PGRST116' || error.message?.includes('Could not find the table')) {
                // テーブルが存在しない場合
                Alert.alert('準備中', '練習記録機能は準備中です');
                return;
              }
              throw error;
            }
          }
          
          // サーバー保存成功
          const mediaMessage = (audioUrl || videoUrl) ? '録音・動画ライブラリにも保存されました！' : '';
          let savedQuery = supabase
            .from('practice_sessions')
            .select('duration_minutes')
            .eq('user_id', user.id)
            .eq('practice_date', practiceRecord.practice_date)
            .eq('input_method', 'manual');
          
          // 楽器が選択されている場合はフィルタリング
          if (practiceRecord.instrument_id) {
            savedQuery = savedQuery.eq('instrument_id', practiceRecord.instrument_id);
          } else {
            savedQuery = savedQuery.is('instrument_id', null);
          }
          
          const savedRecords = await savedQuery;
          
          if (savedRecords.data && savedRecords.data.length > 0) {
            const totalMinutes = savedRecords.data[0].duration_minutes;
            setSuccessMessage(`${minutes}分を追加！合計${totalMinutes}分の練習記録を保存しました！${mediaMessage}`);
          } else {
            setSuccessMessage(`${minutes}分の練習記録を保存しました！${mediaMessage}`);
          }
          setTimeout(() => setSuccessMessage(''), 3000);
          
          // 即座にデータを更新
          await Promise.all([
            loadPracticeData(user),
            loadTotalPracticeTime(user),
            loadRecordingsData(user) // 録音データも更新
          ]);
          return;
        } catch (error) {
          ErrorHandler.handle(error, 'サーバー保存', false);
          logger.error('サーバー保存エラー:', error);
          // サーバー保存エラー、ローカルに保存
        }
      }

      // オフライン時またはサーバー保存失敗時はローカルに保存
      const result = await OfflineStorage.savePracticeRecord(practiceRecord);
      if (result.success) {
        const mediaMessage = (audioUrl || videoUrl) ? '録音・動画ライブラリにも保存されました！' : '';
        setSuccessMessage(`${minutes}分の練習記録をローカルに保存しました！${mediaMessage}（オフライン）`);
        setTimeout(() => setSuccessMessage(''), 3000);
        
        // ローカルデータを更新
        await Promise.all([
          loadPracticeData(user),
          loadTotalPracticeTime(user),
          loadRecordingsData(user) // 録音データも更新
        ]);
      } else {
        throw new Error('ローカル保存に失敗しました');
      }
    } catch (error) {
      ErrorHandler.handle(error, '練習記録保存', true);
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

  const handleEventSelection = useCallback((event: {id: string, title: string, description?: string}) => {
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
        const dayData = practiceData[day];
        const dayRecordings = recordingsData[day];
        const dayEvents: Array<{id: string, title: string, description?: string}> = events[day] || [];
        const hasPracticeRecord = dayData && dayData.hasRecord; // 練習時間が記録されたか（タイマー、クイック、手動入力など）
        const hasBasicPractice = dayData && dayData.hasBasicPractice; // 基礎練（input_method: 'preset'）があるか
        const hasRecording = dayRecordings && dayRecordings.hasRecording;
        
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

  // 認証中または認証されていない場合は何も表示しない
  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} edges={[]}>
      <InstrumentHeader />
      
      <ScrollView style={[styles.content, { backgroundColor: currentTheme.background }]} showsVerticalScrollIndicator={false}>
        <View style={[styles.calendarContainer, { backgroundColor: currentTheme.surface }]}>
          {shortTermGoal ? (
            <View style={[styles.goalTitleContainer, { 
              backgroundColor: currentTheme.primary + '20', // 薄い背景色
              borderColor: currentTheme.primary,
              borderWidth: 2,
              borderRadius: 12,
              paddingVertical: 1,
              paddingHorizontal: 16,
              marginHorizontal: 16,
            }]}>
              <Text style={[styles.goalTitle, { color: currentTheme.primary }]} numberOfLines={1}>
                {shortTermGoal.title}
                {shortTermGoal.target_date && (
                  <Text style={[styles.goalDeadlineText, { color: currentTheme.textSecondary }]}>
                    {' '}{new Date(shortTermGoal.target_date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
                  </Text>
                )}
              </Text>
            </View>
          ) : (
            <Text style={styles.title}>練習カレンダー</Text>
          )}
          
          {/* Month Navigation */}
          <View style={styles.monthHeader}>
            <TouchableOpacity 
              style={[styles.navButton, { backgroundColor: currentTheme.secondary }]}
              onPress={() => navigateMonth('prev')}
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

          {/* Total Practice Time - Simplified */}
          <View style={[styles.totalSummaryContainer, { backgroundColor: currentTheme.surface }]}>
            <Text style={[styles.summaryText, { color: currentTheme.text }]}>
              総合計練習時間: <Text style={[styles.highlightText, { color: currentTheme.primary }]}>{formatMinutesToHours(totalPracticeTime)}</Text>
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
          events={events}
          onAddEvent={() => setShowEventModal(true)}
          onEditEvent={(event) => {
            setSelectedEvent(event);
            setShowEventModal(true);
          }}
          onEventDeleted={async () => {
            await loadEvents();
            setSuccessMessage('イベントを削除しました！');
            setTimeout(() => setSuccessMessage(''), 3000);
          }}
        />
      </ScrollView>

      {/* Quick Record FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: currentTheme.primary }]}
        onPress={() => setShowQuickRecord(true)}
      >
        <Text style={[styles.fabLabel, { color: currentTheme.surface }]}>クイック{'\n'}記録</Text>
      </TouchableOpacity>

      {/* Modals */}
      <QuickRecordModal
        visible={uiState.showQuickRecord}
        onClose={() => setShowQuickRecord(false)}
        onRecord={async (minutes) => {
          await savePracticeRecord(minutes);
          setShowQuickRecord(false);
        }}
      />

      {/* Practice Record Modal */}
      <PracticeRecordModal
        visible={uiState.showPracticeRecord}
        onClose={() => setShowPracticeRecord(false)}
        selectedDate={uiState.selectedDate}
        onSave={async (minutes, content, audioUrl, videoUrl) => {
          try {
            // 実際に保存処理を実行
            await savePracticeRecord(minutes, content, audioUrl, uiState.selectedDate || undefined, videoUrl);
            
            // カレンダー画面に更新を通知
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('practiceRecordUpdated', {
                detail: { action: 'saved', date: uiState.selectedDate }
              }));
            }
            
            // 保存成功の通知（アラートは表示せず、ログのみ）
            logger.info('✅ 練習記録の保存が完了しました');
            
            // カレンダーデータを再読み込み（savePracticeRecord内でも読み込んでいるが、念のため）
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              await Promise.all([
                loadPracticeData(user),
                loadTotalPracticeTime(user),
                loadRecordingsData(user)
              ]);
            }
            
            logger.info('🔄 カレンダーデータの再読み込み完了');
          } catch (error) {
            ErrorHandler.handle(error, 'カレンダー更新', true);
            logger.error('カレンダー更新エラー:', error);
            Alert.alert('エラー', '練習記録の保存に失敗しました');
          }
        }}
        onRecordingSaved={async () => {
          // 録音保存後にデータを再読み込み
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await Promise.all([
              loadPracticeData(user),
              loadRecordingsData(user)
            ]);
          }
          // 成功メッセージを表示
          setSuccessMessage('録音が録音ライブラリとSupabaseに保存されました！');
          setTimeout(() => setSuccessMessage(''), 3000);
        }}
      />

      <EventModal
        visible={uiState.showEventModal}
        onClose={() => {
          setShowEventModal(false);
          setSelectedEvent(null);
        }}
        selectedDate={undefined}
        event={uiState.selectedEvent ? {
          id: uiState.selectedEvent!.id,
          title: uiState.selectedEvent!.title,
          date: '', // カレンダーから開く場合は日付は不要
          description: uiState.selectedEvent!.description,
          is_completed: false
        } : undefined}
        onEventSaved={async () => {
          logger.debug('🔄 onEventSavedコールバックが呼ばれました');
          await loadEvents();
          logger.debug('✅ loadEvents完了');
          setSelectedEvent(null);
          setSuccessMessage('イベントを保存しました！');
          setTimeout(() => setSuccessMessage(''), 3000);
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
    justifyContent: 'space-between',
    paddingHorizontal: getScaledSpacing(4),
    marginBottom: getScaledSpacing(6), // カレンダーとサマリーの間隔をさらに短く
    minHeight: 0, // 最小高さをリセット
  },
  emptyDay: {
    width: '13.5%',
    height: 28, // 固定値で短く
    margin: getScaledSpacing(1),
  },
  dayCell: {
    width: '13.5%',
    height: 28, // 固定値で短く
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: getScaledSize(8),
    margin: getScaledSpacing(1),
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
    paddingBottom: getScaledSpacing(6), // 下部のパディングを減らす
    borderRadius: 12,
    marginBottom: getScaledSpacing(-4), // 負のマージンで総合計に近づける
    marginHorizontal: getScaledSpacing(4), // 左右のマージンも追加
  },
  summaryText: {
    fontSize: 13,
    textAlign: 'center',
    color: '#666666',
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
    fontWeight: '600',
  },

  fab: {
    position: 'absolute',
    bottom: getScaledSpacing(40), // より下に移動
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
  totalSummaryContainer: {
    marginTop: getScaledSpacing(-4), // 負のマージンで今月の合計に近づける
    padding: getScaledSpacing(12),
    paddingTop: getScaledSpacing(6), // 上部のパディングを減らす
    paddingBottom: getScaledSpacing(6), // 下部のパディングを減らす
    borderRadius: 12,
    marginBottom: getScaledSpacing(4), // 下部のマージンを減らす
    marginHorizontal: getScaledSpacing(4), // 左右のマージンも追加
  },
  totalSummaryText: {
    fontSize: 13,
    textAlign: 'center',
    color: '#666666',
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