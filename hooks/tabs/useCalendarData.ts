import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { formatLocalDate } from '@/lib/dateUtils';
import { OfflineStorage, isOnline } from '@/lib/offlineStorage';
import { logger } from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { getInstrumentId, getEffectiveInstrumentId } from '@/lib/instrumentUtils';
import { applyInstrumentFilter, filterByInstrumentIdInMemory } from '@/repositories/common/instrumentFilter';
import { useAuthAdvanced } from '@/hooks/useAuthAdvanced';

interface PracticeData {
  [key: string]: { // キーを日付文字列（YYYY-MM-DD）に変更
    minutes: number;
    hasRecord: boolean; // 練習時間が記録されたか（タイマー、クイック、手動入力など）
    hasBasicPractice: boolean; // 基礎練（input_method: 'preset'）があるか
  };
}

interface RecordingsData {
  [key: string]: { // キーを日付文字列（YYYY-MM-DD）に変更
    hasRecording: boolean;
  };
}

interface EventData {
  [key: string]: Array<{ // キーを日付文字列（YYYY-MM-DD）に変更
    id: string;
    title: string;
    description?: string;
    date: string;
  }>;
}

interface ShortTermGoal {
  title: string;
  target_date?: string;
}

export function useCalendarData(currentDate: Date) {
  const { selectedInstrument } = useInstrumentTheme();
  const { user } = useAuthAdvanced();
  const [practiceData, setPracticeData] = useState<PracticeData>({});
  const [recordingsData, setRecordingsData] = useState<RecordingsData>({});
  const [events, setEvents] = useState<EventData>({});
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [totalPracticeTime, setTotalPracticeTime] = useState(0);
  const [shortTermGoal, setShortTermGoal] = useState<ShortTermGoal | null>(null);
  const [shortTermGoals, setShortTermGoals] = useState<ShortTermGoal[]>([]);
  const isFetchingRef = useRef(false);
  const previousInstrumentIdRef = useRef<string | null>(null);
  const previousInstrumentIdForGoalsRef = useRef<string | null>(null);

  const loadPracticeData = useCallback(async (userParam?: { id: string }) => {
    try {
      const user = userParam ?? (await supabase.auth.getUser()).data.user;
      if (!user) {
        return;
      }

      // 有効な楽器IDを取得（統一的なフォールバック処理）
      const currentInstrumentId = getEffectiveInstrumentId(selectedInstrument, user?.selected_instrument_id);
      
      // 楽器が変わった場合のみ、キャッシュをクリア（楽器切り替え時のデータ更新を確実にする）
      const instrumentChanged = previousInstrumentIdRef.current !== currentInstrumentId && previousInstrumentIdRef.current !== null;
      if (instrumentChanged) {
        logger.debug('[useCalendarData.loadPracticeData] 楽器が変更されました。キャッシュをクリアします', {
          previousInstrumentId: previousInstrumentIdRef.current,
          currentInstrumentId
        });
        try {
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          const cacheKeyPattern = `practice_data_cache_${user.id}_`;
          const allKeys = await AsyncStorage.getAllKeys();
          const practiceCacheKeys = allKeys.filter(key => key.startsWith(cacheKeyPattern));
          
          if (practiceCacheKeys.length > 0) {
            await AsyncStorage.multiRemove(practiceCacheKeys);
            logger.debug('[useCalendarData.loadPracticeData] キャッシュをクリアしました', { cacheKeysCount: practiceCacheKeys.length });
          }
        } catch (cacheClearError) {
          logger.error(`[useCalendarData] キャッシュクリアエラー:`, cacheClearError);
        }
      }
      
      // 現在の楽器IDを記録（データ取得前に更新して、次回の比較を正しく行う）
      previousInstrumentIdRef.current = currentInstrumentId || null;
      
      // オフライン時はキャッシュから読み込み
      if (!isOnline()) {
        try {
          const cacheKey = `practice_data_cache_${user.id}_${currentInstrumentId || 'all'}_${currentDate.getFullYear()}_${currentDate.getMonth()}`;
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          const cachedData = await AsyncStorage.getItem(cacheKey);
          if (cachedData) {
            const parsed = JSON.parse(cachedData);
            const cacheAge = Date.now() - (parsed.timestamp || 0);
            
            if (cacheAge < 24 * 60 * 60 * 1000) {
              setPracticeData(parsed.practiceData || {});
              setMonthlyTotal(parsed.monthlyTotal || 0);
              return;
            }
          }
        } catch (cacheError) {
          logger.error(`[useCalendarData] キャッシュ読み込みエラー:`, cacheError);
        }
      }
      
      if (isOnline()) {
        try {
          const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
          const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
          
          let query = supabase
            .from('practice_sessions')
            .select('practice_date, duration_minutes, input_method, instrument_id')
            .eq('user_id', user.id)
            .gte('practice_date', formatLocalDate(startOfMonth))
            .lte('practice_date', formatLocalDate(endOfMonth));
          
          // 根本的な改善: applyInstrumentFilterは常に元のクエリを返すため、
          // 直接クエリを実行し、TypeScript側でフィルタリングする
          logger.debug('[useCalendarData.loadPracticeData] 楽器フィルタリングを適用します', {
            currentInstrumentId,
            previousInstrumentId: previousInstrumentIdRef.current,
            instrumentChanged
          });
          
          const { data: rawSessions, error } = await query;

          if (error) {
            if (error.code === 'PGRST205' || error.code === 'PGRST116' || error.message?.includes('Could not find the table')) {
              logger.info('practice_sessionsテーブルが存在しません。マイグレーションを実行してください。');
              setPracticeData({});
              setMonthlyTotal(0);
              return;
            }
            ErrorHandler.handle(error, '練習データ読み込み', false);
            logger.error('練習データ読み込みエラー:', error);
            return;
          }

          // TypeScript側で楽器フィルタリングを実行
          const sessions = filterByInstrumentIdInMemory(
            (rawSessions || []) as any[],
            currentInstrumentId,
            true
          );

          if (sessions && Array.isArray(sessions)) {
            
            const newPracticeData: PracticeData = {};
            let total = 0;
            
            const dailyTotals: { [date: string]: number } = {};
            const dailyHasRecord: { [date: string]: boolean } = {}; // 練習時間が記録されたか（タイマー、クイック、手動入力など）
            const dailyHasBasicPractice: { [date: string]: boolean } = {}; // 基礎練があるか
            
            sessions.forEach((session: { practice_date?: string; duration_minutes?: number; input_method?: string }) => {
              // Null/Undefinedチェック: 安全にアクセス
              const date = session?.practice_date;
              const minutes = session?.duration_minutes;
              const inputMethod = session?.input_method;
              
              // 有効な日付と分数のみ処理
              if (!date || typeof date !== 'string' || date.trim() === '') {
                return;
              }
              
              if (typeof minutes !== 'number' || isNaN(minutes) || minutes < 0) {
                return;
              }
              
              if (!dailyTotals[date]) {
                dailyTotals[date] = 0;
              }
              
              // 基礎練（input_method: 'preset'）の処理
              if (inputMethod === 'preset') {
                dailyHasBasicPractice[date] = true;
                // 基礎練は時間を加算しない
              } else {
                // タイマー、クイック、手動入力など、練習時間が記録された場合
                dailyTotals[date] += minutes;
                if (minutes > 0) {
                  dailyHasRecord[date] = true;
                }
              }
            });
            
            // 練習時間が記録された日を処理（日付文字列をキーに使用）
            Object.entries(dailyTotals).forEach(([date, minutes]) => {
              newPracticeData[date] = { 
                minutes, 
                hasRecord: dailyHasRecord[date] || false,
                hasBasicPractice: dailyHasBasicPractice[date] || false
              };
              total += minutes;
            });
            
            // 基礎練のみの日（時間が0だが基礎練がある日）も追加
            Object.entries(dailyHasBasicPractice).forEach(([date, hasBasicPractice]) => {
              if (hasBasicPractice && !dailyTotals[date]) {
                if (!newPracticeData[date]) {
                  newPracticeData[date] = { 
                    minutes: 0, 
                    hasRecord: false,
                    hasBasicPractice: true
                  };
                } else {
                  newPracticeData[date].hasBasicPractice = true;
                }
              }
            });
            
            logger.debug(`[useCalendarData.loadPracticeData] 練習データ処理完了`, {
              practiceDataDates: Object.keys(newPracticeData),
              practiceDataCount: Object.keys(newPracticeData).length,
              monthlyTotal: total,
              dailyTotals: Object.keys(dailyTotals).length,
              sampleDates: Object.keys(newPracticeData).slice(0, 5).map(date => ({
                date,
                minutes: newPracticeData[date]?.minutes,
                hasRecord: newPracticeData[date]?.hasRecord,
                hasBasicPractice: newPracticeData[date]?.hasBasicPractice
              })),
              allDatesWithData: Object.keys(newPracticeData).map(date => ({
                date,
                minutes: newPracticeData[date]?.minutes,
                hasRecord: newPracticeData[date]?.hasRecord,
                hasBasicPractice: newPracticeData[date]?.hasBasicPractice
              }))
            });
            
            logger.debug(`[useCalendarData.loadPracticeData] setPracticeDataを呼び出し`, {
              practiceDataCount: Object.keys(newPracticeData).length,
              monthlyTotal: total
            });
            setPracticeData(newPracticeData);
            setMonthlyTotal(total);
            logger.debug(`[useCalendarData.loadPracticeData] setPracticeData完了`);
            
            // キャッシュに保存（オフライン対応）
            try {
              const cacheKey = `practice_data_cache_${user.id}_${currentInstrumentId || 'all'}_${currentDate.getFullYear()}_${currentDate.getMonth()}`;
              const AsyncStorage = require('@react-native-async-storage/async-storage').default;
              await AsyncStorage.setItem(cacheKey, JSON.stringify({
                practiceData: newPracticeData,
                monthlyTotal: total,
                timestamp: Date.now()
              }));
              logger.debug(`[useCalendarData.loadPracticeData] ✅ 練習データをキャッシュに保存しました`, {
                cacheKey,
                practiceDataCount: Object.keys(newPracticeData).length,
                monthlyTotal: total
              });
            } catch (saveError) {
              logger.error(`[useCalendarData.loadPracticeData] ❌ キャッシュ保存エラー:`, saveError);
            }
            
            logger.debug(`[useCalendarData.loadPracticeData] ========== 練習データ読み込み完了 ==========`);
            return;
          }
        } catch (error) {
          // サーバー取得エラー、キャッシュから取得を試行
          try {
            const cacheKey = `practice_data_cache_${user.id}_${currentInstrumentId || 'all'}_${currentDate.getFullYear()}_${currentDate.getMonth()}`;
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            const cachedData = await AsyncStorage.getItem(cacheKey);
            if (cachedData) {
              const parsed = JSON.parse(cachedData);
              setPracticeData(parsed.practiceData || {});
              setMonthlyTotal(parsed.monthlyTotal || 0);
              logger.debug('エラー時、練習データをキャッシュから読み込みました');
              return;
            }
          } catch (cacheError) {
            logger.debug('キャッシュ読み込みエラー（無視）:', cacheError);
          }
        }
      }

      // オフライン時またはサーバー取得失敗時はローカルから取得
      const localRecords = await OfflineStorage.getPracticeRecords();
      const newPracticeData: PracticeData = {};
      let total = 0;
      
      const dailyTotals: { [date: string]: number } = {};
      const dailyHasRecord: { [date: string]: boolean } = {}; // 練習時間が記録されたか（タイマー、クイック、手動入力など）
      const dailyHasBasicPractice: { [date: string]: boolean } = {}; // 基礎練があるか
      
      localRecords.forEach((record: { created_at: string; duration_minutes?: number; input_method?: string }) => {
        const date = new Date(record.created_at);
        if (date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear()) {
          const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          if (!dailyTotals[dateStr]) {
            dailyTotals[dateStr] = 0;
          }
          
          // 基礎練（input_method: 'preset'）の処理
          if (record.input_method === 'preset') {
            dailyHasBasicPractice[dateStr] = true;
            // 基礎練は時間を加算しない
          } else {
            // タイマー、クイック、手動入力など、練習時間が記録された場合
            const minutes = record.duration_minutes || 0;
            dailyTotals[dateStr] += minutes;
            if (minutes > 0) {
              dailyHasRecord[dateStr] = true;
            }
          }
        }
      });
      
      // 練習時間が記録された日を処理（日付文字列をキーに使用）
      Object.entries(dailyTotals).forEach(([date, minutes]) => {
        newPracticeData[date] = { 
          minutes, 
          hasRecord: dailyHasRecord[date] || false,
          hasBasicPractice: dailyHasBasicPractice[date] || false
        };
        total += minutes;
      });
      
      // 基礎練のみの日（時間が0だが基礎練がある日）も追加
      Object.entries(dailyHasBasicPractice).forEach(([date, hasBasicPractice]) => {
        if (hasBasicPractice && !dailyTotals[date]) {
          if (!newPracticeData[date]) {
            newPracticeData[date] = { 
              minutes: 0, 
              hasRecord: false,
              hasBasicPractice: true
            };
          } else {
            newPracticeData[date].hasBasicPractice = true;
          }
        }
      });
      
      setPracticeData(newPracticeData);
      setMonthlyTotal(total);
    } catch (error) {
      ErrorHandler.handle(error, '練習データの読み込み', false);
      logger.error('練習データの読み込みエラー:', error);
    }
  }, [currentDate, selectedInstrument]);

  const loadTotalPracticeTime = useCallback(async (userParam?: { id: string }) => {
    try {
      const user = userParam ?? (await supabase.auth.getUser()).data.user;
      if (!user) return;

      const currentInstrumentId = getEffectiveInstrumentId(selectedInstrument, user?.selected_instrument_id);
      
      // RPC関数を使用してデータベース側で集計（パフォーマンス最適化）
      try {
        const { data: totalMinutes, error: rpcError } = await supabase.rpc('get_total_practice_time', {
          p_user_id: user.id,
          p_instrument_id: currentInstrumentId || null
        });

        if (rpcError) {
          // RPC関数が存在しない場合、フォールバックとして直接クエリを使用
          if (rpcError.code === '42883' || rpcError.message?.includes('function') || rpcError.message?.includes('does not exist')) {
            logger.debug('RPC関数が存在しないため、フォールバック方式を使用');
      
      let query = supabase
        .from('practice_sessions')
        .select('duration_minutes')
              .eq('user_id', user.id)
              .neq('input_method', 'preset'); // 基礎練を除外
      
      if (currentInstrumentId) {
        query = query.eq('instrument_id', currentInstrumentId);
      } else {
        query = query.is('instrument_id', null);
      }
      
            const { data: sessions, error: queryError } = await query;

            if (queryError) {
              if (queryError.code === 'PGRST205' || queryError.code === 'PGRST116' || queryError.message?.includes('Could not find the table')) {
          return;
        }
        return;
      }

      if (sessions) {
              const total = sessions.reduce((sum: number, session: { duration_minutes: number }) => sum + (session.duration_minutes || 0), 0);
              setTotalPracticeTime(total);
            }
          } else {
            logger.error('RPC関数実行エラー:', rpcError);
          }
          return;
        }

        if (totalMinutes !== null && totalMinutes !== undefined) {
          setTotalPracticeTime(totalMinutes);
        }
      } catch (rpcException) {
        // RPC関数の例外時もフォールバック
        logger.warn('RPC関数実行で例外が発生、フォールバック方式を使用:', rpcException);
        
        let query = supabase
          .from('practice_sessions')
          .select('duration_minutes')
          .eq('user_id', user.id)
          .neq('input_method', 'preset'); // 基礎練を除外
        
        if (currentInstrumentId) {
          query = query.eq('instrument_id', currentInstrumentId);
        } else {
          query = query.is('instrument_id', null);
        }
        
        const { data: sessions, error: queryError } = await query;

        if (!queryError && sessions) {
          const total = sessions.reduce((sum: number, session: { duration_minutes: number }) => sum + (session.duration_minutes || 0), 0);
        setTotalPracticeTime(total);
        }
      }
    } catch (error) {
      ErrorHandler.handle(error, '総練習時間の読み込み', false);
      logger.error('総練習時間の読み込みエラー:', error);
    }
  }, [selectedInstrument]);

  const loadEvents = useCallback(async (userParam?: { id: string }) => {
    try {
      const user = userParam ?? (await supabase.auth.getUser()).data.user;
      if (!user) return;

      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      // オフライン時はキャッシュから読み込み
      if (!isOnline()) {
        try {
          const cacheKey = `events_cache_${user.id}_${currentDate.getFullYear()}_${currentDate.getMonth()}`;
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          const cachedData = await AsyncStorage.getItem(cacheKey);
          if (cachedData) {
            const parsed = JSON.parse(cachedData);
            const cacheAge = Date.now() - (parsed.timestamp || 0);
            if (cacheAge < 24 * 60 * 60 * 1000) {
              setEvents(parsed.events || {});
              logger.debug('イベントデータをキャッシュから読み込みました（オフライン）');
              return;
            }
          }
        } catch (cacheError) {
          logger.debug('キャッシュ読み込みエラー（無視）:', cacheError);
        }
      }
      
      // 有効な楽器IDを取得（統一的なフォールバック処理）
      const currentInstrumentId = getEffectiveInstrumentId(selectedInstrument, user?.selected_instrument_id);
      
      // ベースクエリ（instrument_id なし）
      const baseQuery = supabase
        .from('events')
        .select('id, title, description, date')
        .eq('user_id', user.id)
        .eq('is_completed', false)
        .gte('date', formatLocalDate(startOfMonth))
        .lte('date', formatLocalDate(endOfMonth));
      
      // instrument_id カラムを含めたクエリ
      let query: any = supabase
        .from('events')
        .select('id, title, description, date, instrument_id')
        .eq('user_id', user.id)
        .eq('is_completed', false)
        .gte('date', formatLocalDate(startOfMonth))
        .lte('date', formatLocalDate(endOfMonth))
        .order('date', { ascending: true });
      
      // 根本的な改善: applyInstrumentFilterは常に元のクエリを返すため、
      // 直接クエリを実行し、TypeScript側でフィルタリングする
      const { data: rawData, error } = await query;
      
      let eventsData: any[] | null = null;
      
      if (error) {
        // エラー処理は後続のコードで行う
      } else {
        // TypeScript側で楽器フィルタリングを実行
        const filtered = filterByInstrumentIdInMemory(
          (rawData || []) as any[],
          currentInstrumentId,
          true
        );
        
        // instrument_id は以降使わないので落としておく
        eventsData = filtered.map(row => ({
          id: row.id,
          title: row.title,
          description: row.description,
          date: row.date,
        }));
        
        logger.debug('[useCalendarData.loadEvents] イベントデータ取得に成功しました（楽器ごとに絞り込み済み）', {
          rawCount: rawData?.length || 0,
          filteredCount: filtered.length,
          instrumentId: currentInstrumentId,
        });
      }

      if (error) {
        if (error.code === 'PGRST205' || error.code === 'PGRST116' || error.message?.includes('Could not find the table')) {
          logger.info('eventsテーブルが存在しません。マイグレーションを実行してください。');
          // エラー時もキャッシュから読み込みを試行
          try {
            const cacheKey = `events_cache_${user.id}_${currentDate.getFullYear()}_${currentDate.getMonth()}`;
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            const cachedData = await AsyncStorage.getItem(cacheKey);
            if (cachedData) {
              const parsed = JSON.parse(cachedData);
              setEvents(parsed.events || {});
              logger.debug('エラー時、イベントデータをキャッシュから読み込みました');
            }
          } catch (cacheError) {
            // キャッシュ読み込みエラーは無視
          }
          return;
        }
        ErrorHandler.handle(error, 'イベント読み込み', false);
        logger.error('イベント読み込みエラー:', error);
        // エラー時もキャッシュから読み込みを試行
        try {
          const cacheKey = `events_cache_${user.id}_${currentDate.getFullYear()}_${currentDate.getMonth()}`;
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          const cachedData = await AsyncStorage.getItem(cacheKey);
          if (cachedData) {
            const parsed = JSON.parse(cachedData);
            setEvents(parsed.events || {});
            logger.debug('エラー時、イベントデータをキャッシュから読み込みました');
          }
        } catch (cacheError) {
          // キャッシュ読み込みエラーは無視
        }
        return;
      }

      if (eventsData) {
        const newEvents: EventData = {};
        
        eventsData.forEach((event: { id: string; title: string; description?: string; date: string }) => {
          // 日付文字列（YYYY-MM-DD）をキーとして使用
          const dateStr = event.date;
          if (!newEvents[dateStr]) {
            newEvents[dateStr] = [];
          }
          newEvents[dateStr].push({
            id: event.id,
            title: event.title,
            description: event.description || undefined,
            date: event.date
          });
        });
        
        logger.debug('📅 イベントデータを設定:', {
          count: eventsData.length,
          eventsByDay: Object.keys(newEvents).length,
          newEvents
        });
        setEvents(newEvents);
        
        // キャッシュに保存（オフライン対応）
        try {
          const cacheKey = `events_cache_${user.id}_${currentDate.getFullYear()}_${currentDate.getMonth()}`;
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          await AsyncStorage.setItem(cacheKey, JSON.stringify({
            events: newEvents,
            timestamp: Date.now()
          }));
          logger.debug('イベントデータをキャッシュに保存しました');
        } catch (saveError) {
          logger.debug('キャッシュ保存エラー（無視）:', saveError);
        }
      } else {
        // イベントデータが空の場合も状態をクリア
        logger.debug('📅 イベントデータが空です');
        setEvents({});
      }
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      const errorCode = error?.code;
      ErrorHandler.handle(error, 'イベントデータの読み込み', false);
      logger.error('イベントデータの読み込みエラー:', {
        message: errorMessage,
        code: errorCode,
        error
      });
      // エラー時もキャッシュから読み込みを試行
      try {
        const user = userParam ?? (await supabase.auth.getUser()).data.user;
        if (user) {
          const cacheKey = `events_cache_${user.id}_${currentDate.getFullYear()}_${currentDate.getMonth()}`;
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          const cachedData = await AsyncStorage.getItem(cacheKey);
          if (cachedData) {
            const parsed = JSON.parse(cachedData);
            setEvents(parsed.events || {});
          }
        }
      } catch (cacheError) {
        // キャッシュ読み込みエラーは無視
      }
    }
  }, [currentDate]);

  const loadRecordingsData = useCallback(async (userParam?: { id: string }) => {
    try {
      const user = userParam ?? (await supabase.auth.getUser()).data.user;
      if (!user) return;

      const currentInstrumentId = getEffectiveInstrumentId(selectedInstrument, user?.selected_instrument_id);
      
      // 月の開始日時（ローカルタイムゾーンで00:00:00）
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      // 月の終了日時（ローカルタイムゾーンで23:59:59.999）
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      endOfMonth.setHours(23, 59, 59, 999);
      
      logger.debug('🔍 録音データ取得開始:', {
        year: currentDate.getFullYear(),
        month: currentDate.getMonth() + 1,
        instrumentId: currentInstrumentId,
        startOfMonth: startOfMonth.toISOString(),
        endOfMonth: endOfMonth.toISOString(),
        today: formatLocalDate(new Date())
      });
      
      // より広い範囲で取得（タイムゾーンの問題を回避するため、前後2日を含める）
      const extendedStart = new Date(startOfMonth);
      extendedStart.setDate(extendedStart.getDate() - 2);
      extendedStart.setHours(0, 0, 0, 0);
      
      const extendedEnd = new Date(endOfMonth);
      extendedEnd.setDate(extendedEnd.getDate() + 2);
      extendedEnd.setHours(23, 59, 59, 999);
      
      logger.debug('🔍 録音データ取得範囲:', {
        startOfMonth: startOfMonth.toISOString(),
        endOfMonth: endOfMonth.toISOString(),
        extendedStart: extendedStart.toISOString(),
        extendedEnd: extendedEnd.toISOString(),
        targetYear: currentDate.getFullYear(),
        targetMonth: currentDate.getMonth() + 1
      });
      
      // 楽器IDのフィルタリング（統一関数を使用、既存nullデータも含める）
      let query = supabase
        .from('recordings')
        .select('recorded_at, instrument_id')
        .eq('user_id', user.id)
        .gte('recorded_at', extendedStart.toISOString())
        .lte('recorded_at', extendedEnd.toISOString())
        .not('recorded_at', 'is', null); // recorded_atがnullのレコードを除外
      
      // 統一関数を使用してフィルタリング（テーブル名を指定して自動作成を試みる）
      query = await applyInstrumentFilter(query, currentInstrumentId, true, 'recordings');
      
      const { data: recordings, error } = await query;

      if (error) {
        if (error.code === 'PGRST205' || error.code === 'PGRST116' || error.message?.includes('Could not find the table')) {
          logger.info('recordingsテーブルが存在しません');
          setRecordingsData({});
          return;
        }
        ErrorHandler.handle(error, '録音データ読み込み', false);
        logger.error('録音データ読み込みエラー:', error);
        setRecordingsData({});
        return;
      }

      logger.debug('📊 取得した録音データ:', {
        count: recordings?.length || 0,
        recordings: recordings?.map((rec: { recorded_at: string; instrument_id?: string | null }) => ({
          recorded_at: rec.recorded_at,
          instrument_id: rec.instrument_id,
          localDate: rec.recorded_at ? formatLocalDate(new Date(rec.recorded_at)) : null
        }))
      });

      if (recordings && recordings.length > 0) {
        const newRecordingsData: RecordingsData = {};
        const targetYear = currentDate.getFullYear();
        const targetMonth = currentDate.getMonth();
        
        recordings.forEach((recording: { recorded_at: string; instrument_id?: string | null }) => {
          if (!recording.recorded_at) return; // recorded_atがnullの場合はスキップ
          
          // recorded_atをローカル日付に変換
          const recordedDate = new Date(recording.recorded_at);
          const localDateStr = formatLocalDate(recordedDate);
          const [year, month, day] = localDateStr.split('-').map(Number);
          
          // 現在表示している月と一致するか確認（月の比較を修正）
          // monthは1-12の値なので、targetMonth（0-11）と比較する際は month - 1 を使用
          if (year === targetYear && (month - 1) === targetMonth) {
            // 日付文字列（YYYY-MM-DD）をキーとして使用
            // 同じ日に複数の録音がある場合でも、hasRecording: trueを設定（上書き）
            newRecordingsData[localDateStr] = { hasRecording: true };
            logger.debug(`✅ 録音データを日付 ${localDateStr} に追加 (recorded_at: ${recording.recorded_at}, instrument_id: ${recording.instrument_id})`);
          } else {
            // デバッグログを削減（過去の月のデータは正常な動作）
            if (year === targetYear && Math.abs((month - 1) - targetMonth) <= 1) {
              logger.debug(`録音データをスキップ (recorded_at: ${recording.recorded_at}, localDate: ${localDateStr}, target: ${targetYear}-${targetMonth + 1})`);
            }
          }
        });
        
        logger.debug('📅 最終的な録音データ:', {
          count: Object.keys(newRecordingsData).length,
          dates: Object.keys(newRecordingsData).sort(),
          targetMonth: `${targetYear}-${targetMonth + 1}`,
          totalRecordings: recordings.length
        });
        setRecordingsData(newRecordingsData);
      } else {
        logger.debug('録音データが見つかりませんでした');
        setRecordingsData({});
      }
    } catch (error) {
      ErrorHandler.handle(error, '録音データの読み込み', false);
      logger.error('録音データの読み込みエラー:', error);
      setRecordingsData({});
    }
  }, [currentDate, selectedInstrument]);

  const loadShortTermGoal = useCallback(async (userParam?: { id: string }, forceRefresh: boolean = false) => {
    try {
      const user = userParam ?? (await supabase.auth.getUser()).data.user;
      if (!user) {
        setShortTermGoal(null);
        setShortTermGoals([]);
        return;
      }

      // 楽器IDを取得（キャッシュキーとDBフィルタリングの両方で使用）
      const { getInstrumentId } = require('@/lib/instrumentUtils') as { getInstrumentId: (instrument: string | null) => string | null };
      const currentInstrumentId = getEffectiveInstrumentId(selectedInstrument, user?.selected_instrument_id);

      // 強制リフレッシュまたは楽器が変わった場合、目標のキャッシュをクリア
      if (forceRefresh || (previousInstrumentIdForGoalsRef.current !== currentInstrumentId && previousInstrumentIdForGoalsRef.current !== null)) {
        try {
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          const cacheKeyPattern = `short_term_goals_cache_${user.id}_`;
          const allKeys = await AsyncStorage.getAllKeys();
          const goalCacheKeys = allKeys.filter(key => key.startsWith(cacheKeyPattern));
          
          if (goalCacheKeys.length > 0) {
            await AsyncStorage.multiRemove(goalCacheKeys);
            logger.debug(`[useCalendarData] 目標キャッシュをクリアしました`, {
              forceRefresh,
              previousInstrumentId: previousInstrumentIdForGoalsRef.current,
              currentInstrumentId,
              clearedCacheKeys: goalCacheKeys.length
            });
          }
        } catch (cacheClearError) {
          logger.error(`[useCalendarData] 目標キャッシュクリアエラー:`, cacheClearError);
        }
      }
      
      // 現在の楽器IDを記録
      previousInstrumentIdForGoalsRef.current = currentInstrumentId || null;

      // 強制リフレッシュの場合はキャッシュを無視してデータベースから読み込む
      // オフライン時はキャッシュから読み込み（現在選択されている楽器の目標のみ）
      if (!forceRefresh && !isOnline()) {
        try {
          const cacheKey = `short_term_goals_cache_${user.id}_${currentInstrumentId || 'null'}`;
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          const cachedData = await AsyncStorage.getItem(cacheKey);
          if (cachedData) {
            const parsed = JSON.parse(cachedData);
            const cacheAge = Date.now() - (parsed.timestamp || 0);
            if (cacheAge < 24 * 60 * 60 * 1000) {
              setShortTermGoal(parsed.shortTermGoal || null);
              setShortTermGoals(parsed.shortTermGoals || []);
              logger.debug('短期目標データをキャッシュから読み込みました（オフライン、現在選択されている楽器のみ）', {
                instrumentId: currentInstrumentId
              });
              return;
            }
          }
        } catch (cacheError) {
          logger.debug('キャッシュ読み込みエラー（無視）:', cacheError);
        }
      }

      // show_on_calendarカラムは初期スキーマに含まれているため、常に存在する前提でクエリを構築
      // 目標を取得（短期目標と長期目標の両方を含む、現在選択されている楽器の目標のみ）
      let query = supabase
        .from('goals')
        .select('title, target_date, show_on_calendar, is_completed, progress_percentage, goal_type, instrument_id')
        .eq('user_id', user.id)
        .in('goal_type', ['personal_short', 'personal_long'])
        .eq('show_on_calendar', true); // show_on_calendarがtrueの目標のみを取得
      
      // 現在選択されている楽器IDでフィルタリング（各楽器で設定された目標のみを各楽器カレンダーに表示）
      if (currentInstrumentId) {
        query = query.eq('instrument_id', currentInstrumentId);
      } else {
        query = query.is('instrument_id', null);
      }
      
      let { data: goals, error } = await query.order('created_at', { ascending: false });

      // instrument_idカラムが存在しない場合は、フィルタリングなしで再試行
      if (error && (error.code === '42703' || error.message?.includes('instrument_id') || error.message?.includes('does not exist'))) {
        logger.debug('instrument_idカラムが存在しないため、フィルタリングなしで再試行します');
        const { data: retryGoals, error: retryError } = await supabase
          .from('goals')
          .select('title, target_date, show_on_calendar, is_completed, progress_percentage, goal_type')
          .eq('user_id', user.id)
          .in('goal_type', ['personal_short', 'personal_long'])
          .eq('show_on_calendar', true)
          .order('created_at', { ascending: false });
        if (retryError) {
          error = retryError;
        } else {
          goals = retryGoals;
          error = null;
        }
      }

      if (error) {
        if (error.code === 'PGRST205' || error.code === 'PGRST116' || error.message?.includes('Could not find the table')) {
          logger.info('goalsテーブルが存在しません。マイグレーションを実行してください。');
          // エラー時もキャッシュから読み込みを試行（現在選択されている楽器の目標のみ）
          try {
            const cacheKey = `short_term_goals_cache_${user.id}_${currentInstrumentId || 'null'}`;
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            const cachedData = await AsyncStorage.getItem(cacheKey);
            if (cachedData) {
              const parsed = JSON.parse(cachedData);
              setShortTermGoal(parsed.shortTermGoal || null);
              setShortTermGoals(parsed.shortTermGoals || []);
              logger.debug('エラー時、短期目標データをキャッシュから読み込みました（現在選択されている楽器のみ）', {
                instrumentId: currentInstrumentId
              });
            }
          } catch (cacheError) {
            // キャッシュ読み込みエラーは無視
          }
          setShortTermGoal(null);
          setShortTermGoals([]);
          return;
        }
        ErrorHandler.handle(error, '目標の読み込み', false);
        logger.error('目標の読み込みエラー:', error);
        // エラー時もキャッシュから読み込みを試行（現在選択されている楽器の目標のみ）
        try {
          const cacheKey = `short_term_goals_cache_${user.id}_${currentInstrumentId || 'null'}`;
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          const cachedData = await AsyncStorage.getItem(cacheKey);
          if (cachedData) {
            const parsed = JSON.parse(cachedData);
            setShortTermGoal(parsed.shortTermGoal || null);
            setShortTermGoals(parsed.shortTermGoals || []);
            logger.debug('エラー時、短期目標データをキャッシュから読み込みました（現在選択されている楽器のみ）', {
              instrumentId: currentInstrumentId
            });
            return;
          }
        } catch (cacheError) {
          // キャッシュ読み込みエラーは無視
        }
        setShortTermGoal(null);
        setShortTermGoals([]);
        return;
      }

      if (goals && goals.length > 0) {
        logger.debug('[loadShortTermGoal] 取得した目標:', {
          goalsCount: goals.length,
          goals: goals.map((g: any) => ({
            title: g.title,
            show_on_calendar: g.show_on_calendar,
            is_completed: g.is_completed,
            progress_percentage: g.progress_percentage,
            instrument_id: g.instrument_id,
            currentInstrumentId
          }))
        });
        
        // 達成済みでない目標をフィルタリング
        const activeGoals = goals.filter((goal: any) => {
          const isCompleted = goal.is_completed === true || goal.progress_percentage === 100;
          return !isCompleted;
        });

        logger.debug('[loadShortTermGoal] 達成済みでない目標:', {
          activeGoalsCount: activeGoals.length,
          activeGoals: activeGoals.map((g: any) => ({
            title: g.title,
            show_on_calendar: g.show_on_calendar,
            instrument_id: g.instrument_id
          }))
        });

        // show_on_calendarがtrueの目標のみを表示（クエリで既にフィルタリング済みだが、念のためクライアント側でも確認）
        const visibleGoals = activeGoals.filter((goal: any) => {
          return goal.show_on_calendar === true;
        });

        logger.debug('[loadShortTermGoal] 表示対象の目標:', {
          visibleGoalsCount: visibleGoals.length,
          visibleGoals: visibleGoals.map((g: any) => ({
            title: g.title,
            show_on_calendar: g.show_on_calendar,
            instrument_id: g.instrument_id,
            currentInstrumentId
          }))
        });

        // 現在選択されている楽器の目標のみを表示（既に楽器IDでフィルタリング済み）
        if (visibleGoals.length > 0) {
          // 目標リストを作成（既に現在選択されている楽器の目標のみが含まれている）
          const goalsList = visibleGoals.map((goal: any) => ({
            title: goal.title,
            target_date: goal.target_date || undefined
          }));
          
          // 最初の目標を設定（後方互換性のため）
          setShortTermGoal(goalsList[0] || null);
          setShortTermGoals(goalsList);
          
          // キャッシュに保存（オフライン対応、現在選択されている楽器の目標のみ）
          try {
            const cacheKey = `short_term_goals_cache_${user.id}_${currentInstrumentId || 'null'}`;
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            await AsyncStorage.setItem(cacheKey, JSON.stringify({
              shortTermGoal: goalsList[0] || null,
              shortTermGoals: goalsList,
              timestamp: Date.now()
            }));
            logger.debug('短期目標データをキャッシュに保存しました（現在選択されている楽器のみ）', {
              instrumentId: currentInstrumentId,
              goalsCount: goalsList.length
            });
          } catch (saveError) {
            logger.debug('キャッシュ保存エラー（無視）:', saveError);
          }
        } else {
          setShortTermGoal(null);
          setShortTermGoals([]);
        }
      } else {
        setShortTermGoal(null);
        setShortTermGoals([]);
      }
    } catch (error) {
      ErrorHandler.handle(error, '目標の読み込み', false);
      logger.error('目標の読み込みエラー:', error);
      // エラー時もキャッシュから読み込みを試行（現在選択されている楽器の目標のみ）
        try {
          const errorUser = userParam ?? (await supabase.auth.getUser()).data.user;
          if (errorUser) {
            const errorInstrumentId = getEffectiveInstrumentId(selectedInstrument, errorUser?.selected_instrument_id);
            const cacheKey = `short_term_goals_cache_${errorUser.id}_${errorInstrumentId || 'null'}`;
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          const cachedData = await AsyncStorage.getItem(cacheKey);
          if (cachedData) {
            const parsed = JSON.parse(cachedData);
            setShortTermGoal(parsed.shortTermGoal || null);
            setShortTermGoals(parsed.shortTermGoals || []);
            logger.debug('エラー時、短期目標データをキャッシュから読み込みました（現在選択されている楽器のみ）', {
              instrumentId: errorInstrumentId
            });
            return;
          }
        }
      } catch (cacheError) {
        // キャッシュ読み込みエラーは無視
      }
      setShortTermGoal(null);
      setShortTermGoals([]);
    }
  }, [selectedInstrument, user]);

  const loadAllData = useCallback(async (userParam?: { id: string }) => {
    if (isFetchingRef.current) {
      return;
    }
    
    let cancelled = false;
    isFetchingRef.current = true;
    
    try {
      const user = userParam ?? (await supabase.auth.getUser()).data.user;
      if (!user || cancelled) {
        isFetchingRef.current = false;
        return;
      }

      await Promise.all([
        loadPracticeData(user).catch(error => {
          logger.error(`[useCalendarData] loadPracticeDataエラー:`, error);
        }),
        loadTotalPracticeTime(user).catch(error => {
          logger.error(`[useCalendarData] loadTotalPracticeTimeエラー:`, error);
        }),
        loadEvents(user).catch(error => {
          logger.error(`[useCalendarData] loadEventsエラー:`, error);
        }),
        loadRecordingsData(user).catch(error => {
          logger.error(`[useCalendarData] loadRecordingsDataエラー:`, error);
        }),
        loadShortTermGoal(user).catch(error => {
          logger.error(`[useCalendarData] loadShortTermGoalエラー:`, error);
        })
      ]);
    } catch (error) {
      if (!cancelled) {
        ErrorHandler.handle(error, 'データ読み込み', false);
        logger.error('[useCalendarData] データ読み込みエラー:', error);
      }
    } finally {
      if (!cancelled) {
        isFetchingRef.current = false;
      }
    }
    
    return () => {
      cancelled = true;
      isFetchingRef.current = false;
    };
  }, [loadPracticeData, loadTotalPracticeTime, loadEvents, loadRecordingsData, loadShortTermGoal]);

  return {
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
  };
}

