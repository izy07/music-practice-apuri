import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { formatLocalDate } from '@/lib/dateUtils';
import { OfflineStorage, isOnline } from '@/lib/offlineStorage';
import { logger } from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { getInstrumentId } from '@/lib/instrumentUtils';

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
  const [practiceData, setPracticeData] = useState<PracticeData>({});
  const [recordingsData, setRecordingsData] = useState<RecordingsData>({});
  const [events, setEvents] = useState<EventData>({});
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [totalPracticeTime, setTotalPracticeTime] = useState(0);
  const [shortTermGoal, setShortTermGoal] = useState<ShortTermGoal | null>(null);
  const [shortTermGoals, setShortTermGoals] = useState<ShortTermGoal[]>([]);
  const isFetchingRef = useRef(false);
  
  // コンテキストから楽器IDを取得（DBアクセス不要）
  const { selectedInstrument } = useInstrumentTheme();
  
  // 楽器ID取得は共通関数を使用（getInstrumentId）

  const loadPracticeData = useCallback(async (userParam?: { id: string }) => {
    try {
      const user = userParam ?? (await supabase.auth.getUser()).data.user;
      if (!user) return;

      const currentInstrumentId = getInstrumentId(selectedInstrument);
      
      // オフライン時はキャッシュから読み込み
      if (!isOnline()) {
        try {
          const cacheKey = `practice_data_cache_${user.id}_${currentInstrumentId || 'all'}_${currentDate.getFullYear()}_${currentDate.getMonth()}`;
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          const cachedData = await AsyncStorage.getItem(cacheKey);
          if (cachedData) {
            const parsed = JSON.parse(cachedData);
            // キャッシュが1日以内の場合は使用
            const cacheAge = Date.now() - (parsed.timestamp || 0);
            if (cacheAge < 24 * 60 * 60 * 1000) {
              setPracticeData(parsed.practiceData || {});
              setMonthlyTotal(parsed.monthlyTotal || 0);
              logger.debug('練習データをキャッシュから読み込みました（オフライン）');
              return;
            }
          }
        } catch (cacheError) {
          logger.debug('キャッシュ読み込みエラー（無視）:', cacheError);
        }
      }
      
      if (isOnline()) {
        try {
          const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
          const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
          
          let query = supabase
            .from('practice_sessions')
            .select('practice_date, duration_minutes, input_method')
            .eq('user_id', user.id)
            .gte('practice_date', formatLocalDate(startOfMonth))
            .lte('practice_date', formatLocalDate(endOfMonth));
          
          if (currentInstrumentId) {
            query = query.eq('instrument_id', currentInstrumentId);
          } else {
            // 楽器IDがnullの場合、instrument_idがnullのデータのみを取得
            // PracticeRecordModalと一致させるため
            query = query.is('instrument_id', null);
          }
          
          const { data: sessions, error } = await query;

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
            
            setPracticeData(newPracticeData);
            setMonthlyTotal(total);
            
            // キャッシュに保存（オフライン対応）
            try {
              const cacheKey = `practice_data_cache_${user.id}_${currentInstrumentId || 'all'}_${currentDate.getFullYear()}_${currentDate.getMonth()}`;
              const AsyncStorage = require('@react-native-async-storage/async-storage').default;
              await AsyncStorage.setItem(cacheKey, JSON.stringify({
                practiceData: newPracticeData,
                monthlyTotal: total,
                timestamp: Date.now()
              }));
              logger.debug('練習データをキャッシュに保存しました');
            } catch (saveError) {
              logger.debug('キャッシュ保存エラー（無視）:', saveError);
            }
            
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

      const currentInstrumentId = getInstrumentId(selectedInstrument);
      
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
      
      const { data: eventsData, error } = await supabase
        .from('events')
        .select('id, title, description, date')
        .eq('user_id', user.id)
        .eq('is_completed', false)
        .gte('date', formatLocalDate(startOfMonth))
        .lte('date', formatLocalDate(endOfMonth))
        .order('date', { ascending: true });

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
    } catch (error) {
      ErrorHandler.handle(error, 'イベントデータの読み込み', false);
      logger.error('イベントデータの読み込みエラー:', error);
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
            logger.debug('エラー時、イベントデータをキャッシュから読み込みました');
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

      const currentInstrumentId = getInstrumentId(selectedInstrument);
      
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
      
      // より広い範囲で取得（タイムゾーンの問題を回避するため、前後1日を含める）
      const extendedStart = new Date(startOfMonth);
      extendedStart.setDate(extendedStart.getDate() - 1);
      extendedStart.setHours(0, 0, 0, 0);
      
      const extendedEnd = new Date(endOfMonth);
      extendedEnd.setDate(extendedEnd.getDate() + 1);
      extendedEnd.setHours(23, 59, 59, 999);
      
      let query = supabase
        .from('recordings')
        .select('recorded_at, instrument_id')
        .eq('user_id', user.id)
        .gte('recorded_at', extendedStart.toISOString())
        .lte('recorded_at', extendedEnd.toISOString())
        .not('recorded_at', 'is', null); // recorded_atがnullのレコードを除外
      
      if (currentInstrumentId) {
        query = query.eq('instrument_id', currentInstrumentId);
      } else {
        // 楽器IDがnullの録音のみを含める
        query = query.is('instrument_id', null);
      }
      
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
        recordings: recordings?.map(r => ({
          recorded_at: r.recorded_at,
          instrument_id: r.instrument_id,
          localDate: r.recorded_at ? formatLocalDate(new Date(r.recorded_at)) : null
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
          
          // 現在表示している月と一致するか確認
          if (year === targetYear && month - 1 === targetMonth) {
            // 日付文字列（YYYY-MM-DD）をキーとして使用
            newRecordingsData[localDateStr] = { hasRecording: true };
            logger.debug(`録音データを日付 ${localDateStr} に追加 (recorded_at: ${recording.recorded_at})`);
          } else {
            logger.debug(`録音データをスキップ (recorded_at: ${recording.recorded_at}, localDate: ${localDateStr}, target: ${targetYear}-${targetMonth + 1})`);
          }
        });
        
        logger.debug('📅 最終的な録音データ:', newRecordingsData);
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

  const loadShortTermGoal = useCallback(async (userParam?: { id: string }) => {
    try {
      const user = userParam ?? (await supabase.auth.getUser()).data.user;
      if (!user) {
        setShortTermGoal(null);
        setShortTermGoals([]);
        return;
      }

      // オフライン時はキャッシュから読み込み
      if (!isOnline()) {
        try {
          const cacheKey = `short_term_goals_cache_${user.id}`;
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          const cachedData = await AsyncStorage.getItem(cacheKey);
          if (cachedData) {
            const parsed = JSON.parse(cachedData);
            const cacheAge = Date.now() - (parsed.timestamp || 0);
            if (cacheAge < 24 * 60 * 60 * 1000) {
              setShortTermGoal(parsed.shortTermGoal || null);
              setShortTermGoals(parsed.shortTermGoals || []);
              logger.debug('短期目標データをキャッシュから読み込みました（オフライン）');
              return;
            }
          }
        } catch (cacheError) {
          logger.debug('キャッシュ読み込みエラー（無視）:', cacheError);
        }
      }

      // show_on_calendarカラムの存在を確認（エラーを回避）
      const { checkShowOnCalendarSupport } = await import('@/repositories/goalRepository');
      const supportsShowOnCalendar = await checkShowOnCalendarSupport();

      // クエリに含めるカラムを決定
      const selectColumns = supportsShowOnCalendar
        ? 'title, target_date, show_on_calendar, is_completed, progress_percentage, goal_type'
        : 'title, target_date, is_completed, progress_percentage, goal_type';

      // show_on_calendarがtrueの目標をすべて取得（短期目標と長期目標の両方を含む）
      // 目標はカレンダーに1つだけ表示できるため、短期目標と長期目標の両方を読み込む
      const { data: goals, error } = await supabase
        .from('goals')
        .select(selectColumns)
        .eq('user_id', user.id)
        .in('goal_type', ['personal_short', 'personal_long'])
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === 'PGRST205' || error.code === 'PGRST116' || error.message?.includes('Could not find the table')) {
          logger.info('goalsテーブルが存在しません。マイグレーションを実行してください。');
          // エラー時もキャッシュから読み込みを試行
          try {
            const cacheKey = `short_term_goals_cache_${user.id}`;
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            const cachedData = await AsyncStorage.getItem(cacheKey);
            if (cachedData) {
              const parsed = JSON.parse(cachedData);
              setShortTermGoal(parsed.shortTermGoal || null);
              setShortTermGoals(parsed.shortTermGoals || []);
              logger.debug('エラー時、短期目標データをキャッシュから読み込みました');
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
        // エラー時もキャッシュから読み込みを試行
        try {
          const cacheKey = `short_term_goals_cache_${user.id}`;
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          const cachedData = await AsyncStorage.getItem(cacheKey);
          if (cachedData) {
            const parsed = JSON.parse(cachedData);
            setShortTermGoal(parsed.shortTermGoal || null);
            setShortTermGoals(parsed.shortTermGoals || []);
            logger.debug('エラー時、短期目標データをキャッシュから読み込みました');
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
        // 達成済みでない目標をフィルタリング
        const activeGoals = goals.filter((goal: any) => {
          const isCompleted = goal.is_completed === true || goal.progress_percentage === 100;
          return !isCompleted;
        });

        // show_on_calendarがtrueの目標をフィルタリング（カラムが存在する場合のみ）
        const visibleGoals = supportsShowOnCalendar
          ? activeGoals.filter((goal: any) => goal.show_on_calendar === true)
          : []; // カラムが存在しない場合は表示しない

        // 目標はカレンダーに1つだけ表示できるため、最初の1つだけを表示
        // ただし、複数の目標が表示されている場合は、すべて表示する（後方互換性のため）
        if (visibleGoals.length > 0) {
          const goalsList = visibleGoals.map((goal: any) => ({
            title: goal.title,
            target_date: goal.target_date || undefined
          }));
          setShortTermGoals(goalsList);
          // 最初の目標を後方互換性のため設定
          setShortTermGoal(goalsList[0]);
          
          // キャッシュに保存（オフライン対応）
          try {
            const cacheKey = `short_term_goals_cache_${user.id}`;
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            await AsyncStorage.setItem(cacheKey, JSON.stringify({
              shortTermGoal: goalsList[0],
              shortTermGoals: goalsList,
              timestamp: Date.now()
            }));
            logger.debug('短期目標データをキャッシュに保存しました');
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
      // エラー時もキャッシュから読み込みを試行
      try {
        const user = userParam ?? (await supabase.auth.getUser()).data.user;
        if (user) {
          const cacheKey = `short_term_goals_cache_${user.id}`;
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          const cachedData = await AsyncStorage.getItem(cacheKey);
          if (cachedData) {
            const parsed = JSON.parse(cachedData);
            setShortTermGoal(parsed.shortTermGoal || null);
            setShortTermGoals(parsed.shortTermGoals || []);
            logger.debug('エラー時、短期目標データをキャッシュから読み込みました');
            return;
          }
        }
      } catch (cacheError) {
        // キャッシュ読み込みエラーは無視
      }
      setShortTermGoal(null);
      setShortTermGoals([]);
    }
  }, []);

  const loadAllData = useCallback(async (userParam?: { id: string }) => {
    if (isFetchingRef.current) return;
    
    let cancelled = false;
    isFetchingRef.current = true;
    
    try {
      const user = userParam ?? (await supabase.auth.getUser()).data.user;
      if (!user || cancelled) return;

      await Promise.all([
        loadPracticeData(user),
        loadTotalPracticeTime(user),
        loadEvents(user),
        loadRecordingsData(user),
        loadShortTermGoal(user),
      ]);
    } catch (error) {
      if (!cancelled) {
        ErrorHandler.handle(error, 'データ読み込み', false);
        logger.error('データ読み込みエラー:', error);
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

