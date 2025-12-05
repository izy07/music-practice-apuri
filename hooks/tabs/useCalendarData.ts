import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { formatLocalDate } from '@/lib/dateUtils';
import { OfflineStorage, isOnline } from '@/lib/offlineStorage';
import { logger } from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';

interface PracticeData {
  [key: number]: {
    minutes: number;
    hasRecord: boolean; // 練習時間が記録されたか（タイマー、クイック、手動入力など）
    hasBasicPractice: boolean; // 基礎練（input_method: 'preset'）があるか
  };
}

interface RecordingsData {
  [key: number]: {
    hasRecording: boolean;
  };
}

interface EventData {
  [key: number]: Array<{
    id: string;
    title: string;
    description?: string;
  }>;
}

interface ShortTermGoal {
  title: string;
  target_date?: string;
}

// 月別データのキャッシュ（完全に遅延を無くすため）
interface MonthDataCache {
  practiceData: PracticeData;
  recordingsData: RecordingsData;
  events: EventData;
  monthlyTotal: number;
}

export function useCalendarData(currentDate: Date) {
  const [practiceData, setPracticeData] = useState<PracticeData>({});
  const [recordingsData, setRecordingsData] = useState<RecordingsData>({});
  const [events, setEvents] = useState<EventData>({});
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [totalPracticeTime, setTotalPracticeTime] = useState(0);
  const [shortTermGoal, setShortTermGoal] = useState<ShortTermGoal | null>(null);
  const isFetchingRef = useRef(false);
  const totalPracticeTimeRef = useRef(0); // 既存の値を保持するためのref
  const practiceDataRef = useRef<PracticeData>({}); // 既存の値を保持するためのref
  const monthlyTotalRef = useRef(0); // 既存の値を保持するためのref
  const eventsRef = useRef<EventData>({}); // 既存の値を保持するためのref
  const recordingsDataRef = useRef<RecordingsData>({}); // 既存の値を保持するためのref
  const shortTermGoalRef = useRef<ShortTermGoal | null>(null); // 既存の値を保持するためのref
  const currentMonthKeyRef = useRef<string>(''); // 現在の月のキー（YYYY-MM形式）を保持
  const monthDataCacheRef = useRef<Map<string, MonthDataCache>>(new Map()); // 月別データのキャッシュ
  
  // 月が変わった時にキャッシュから即座にデータを読み込む（完全に遅延を無くす）
  useEffect(() => {
    const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    
    // 月が変わった場合
    if (currentMonthKeyRef.current && currentMonthKeyRef.current !== monthKey) {
      // キャッシュから即座にデータを読み込む（遅延を完全に無くす）
      const cachedData = monthDataCacheRef.current.get(monthKey);
      if (cachedData) {
        // キャッシュがある場合は即座に表示（遅延ゼロ）
        setPracticeData(cachedData.practiceData);
        setRecordingsData(cachedData.recordingsData);
        setEvents(cachedData.events);
        setMonthlyTotal(cachedData.monthlyTotal);
        practiceDataRef.current = cachedData.practiceData;
        recordingsDataRef.current = cachedData.recordingsData;
        eventsRef.current = cachedData.events;
        monthlyTotalRef.current = cachedData.monthlyTotal;
        logger.debug(`✅ キャッシュから即座にデータを読み込み: ${monthKey}`);
      } else {
        // キャッシュがない場合は即座にクリア（古いデータが表示されないように）
        setPracticeData({});
        setRecordingsData({});
        setEvents({});
        setMonthlyTotal(0);
        practiceDataRef.current = {};
        recordingsDataRef.current = {};
        eventsRef.current = {};
        monthlyTotalRef.current = 0;
        logger.debug(`⏳ キャッシュなし、データを読み込み中: ${monthKey}`);
      }
    } else if (!currentMonthKeyRef.current) {
      // 初回読み込み時もキャッシュをチェック
      const cachedData = monthDataCacheRef.current.get(monthKey);
      if (cachedData) {
        setPracticeData(cachedData.practiceData);
        setRecordingsData(cachedData.recordingsData);
        setEvents(cachedData.events);
        setMonthlyTotal(cachedData.monthlyTotal);
        practiceDataRef.current = cachedData.practiceData;
        recordingsDataRef.current = cachedData.recordingsData;
        eventsRef.current = cachedData.events;
        monthlyTotalRef.current = cachedData.monthlyTotal;
      }
    }
    
    currentMonthKeyRef.current = monthKey;
  }, [currentDate]);
  
  // 状態が変更された時にrefも更新
  useEffect(() => {
    totalPracticeTimeRef.current = totalPracticeTime;
  }, [totalPracticeTime]);
  
  useEffect(() => {
    practiceDataRef.current = practiceData;
  }, [practiceData]);
  
  useEffect(() => {
    monthlyTotalRef.current = monthlyTotal;
  }, [monthlyTotal]);
  
  useEffect(() => {
    eventsRef.current = events;
  }, [events]);
  
  useEffect(() => {
    recordingsDataRef.current = recordingsData;
  }, [recordingsData]);
  
  useEffect(() => {
    shortTermGoalRef.current = shortTermGoal;
  }, [shortTermGoal]);
  
  // コンテキストから楽器IDを取得（DBアクセス不要）
  const { selectedInstrument } = useInstrumentTheme();
  
  // 楽器ID取得の共通関数（コンテキストから取得）
  const getCurrentInstrumentId = useCallback(async (user: { id: string }): Promise<string | null> => {
    // コンテキストから取得（既にキャッシュされている）
    return selectedInstrument || null;
  }, [selectedInstrument]);

  const loadPracticeData = useCallback(async (userParam?: { id: string }) => {
    try {
      const user = userParam ?? (await supabase.auth.getUser()).data.user;
      if (!user) return;

      const currentInstrumentId = await getCurrentInstrumentId(user);
      
      if (isOnline()) {
        try {
          const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
          const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
          
          // 必要なカラムのみを選択してパフォーマンス向上
          let query = supabase
            .from('practice_sessions')
            .select('practice_date, duration_minutes, input_method')
            .eq('user_id', user.id)
            .gte('practice_date', formatLocalDate(startOfMonth))
            .lte('practice_date', formatLocalDate(endOfMonth))
            .order('practice_date', { ascending: true }); // インデックスを活用
          
          if (currentInstrumentId) {
            query = query.eq('instrument_id', currentInstrumentId);
          }
          
          const { data: sessions, error } = await query;

          if (error) {
            if (error.code === 'PGRST205' || error.code === 'PGRST116' || error.message?.includes('Could not find the table')) {
              logger.info('ℹ️ practice_sessionsテーブルが存在しません。マイグレーションを実行してください。');
              // テーブルが存在しない場合のみ0にリセット（既存のデータがない場合のみ）
              if (Object.keys(practiceDataRef.current).length === 0) {
                setPracticeData({});
                setMonthlyTotal(0);
              }
              return;
            }
            ErrorHandler.handle(error, '練習データ読み込み', false);
            logger.error('❌ 練習データ読み込みエラー:', error);
            // エラー時は既存の値を保持（読み込み中に0にならないように）
            return;
          }

          if (sessions) {
            const newPracticeData: PracticeData = {};
            let total = 0;
            
            // データベース側で既に月の範囲でフィルタリングされているため、
            // クライアント側での年月検証は不要（パフォーマンス向上）
            const dailyTotals: { [date: string]: number } = {};
            const dailyHasRecord: { [date: string]: boolean } = {}; // 練習時間が記録されたか（タイマー、クイック、手動入力など）
            const dailyHasBasicPractice: { [date: string]: boolean } = {}; // 基礎練があるか
            
            // 単一ループで処理（パフォーマンス向上）
            sessions.forEach((session: { practice_date: string; duration_minutes: number; input_method?: string }) => {
              const date = session.practice_date;
              
              // 日だけを抽出（データベース側で既に月でフィルタリング済み）
              const day = parseInt(date.split('-')[2]);
              
              // 基礎練（input_method: 'preset'）の処理
              if (session.input_method === 'preset') {
                dailyHasBasicPractice[date] = true;
                // 基礎練は時間を加算しない
              } else {
                // タイマー、クイック、手動入力など、練習時間が記録された場合
                if (!dailyTotals[date]) {
                  dailyTotals[date] = 0;
                }
                dailyTotals[date] += session.duration_minutes;
                if (session.duration_minutes > 0) {
                  dailyHasRecord[date] = true;
                }
              }
            });
            
            // 練習時間が記録された日を処理（年月検証不要）
            Object.entries(dailyTotals).forEach(([date, minutes]) => {
              const day = parseInt(date.split('-')[2]);
              newPracticeData[day] = { 
                minutes, 
                hasRecord: dailyHasRecord[date] || false,
                hasBasicPractice: dailyHasBasicPractice[date] || false
              };
              total += minutes;
            });
            
            // 基礎練のみの日（時間が0だが基礎練がある日）も追加（年月検証不要）
            Object.entries(dailyHasBasicPractice).forEach(([date, hasBasicPractice]) => {
              if (hasBasicPractice && !dailyTotals[date]) {
                const day = parseInt(date.split('-')[2]);
                if (!newPracticeData[day]) {
                  newPracticeData[day] = { 
                    minutes: 0, 
                    hasRecord: false,
                    hasBasicPractice: true
                  };
                } else {
                  newPracticeData[day].hasBasicPractice = true;
                }
              }
            });
            
            // 月が変わった場合は必ずデータを更新（他の月のデータが残らないように）
            // 既存のデータを保持しながら更新（読み込み中でも既存データを表示）
            setPracticeData(newPracticeData);
            setMonthlyTotal(total);
            
            // キャッシュに保存（次回は即座に表示できるように）
            const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
            monthDataCacheRef.current.set(monthKey, {
              practiceData: newPracticeData,
              recordingsData: recordingsDataRef.current,
              events: eventsRef.current,
              monthlyTotal: total,
            });
            
            // キャッシュサイズを制限（最新3ヶ月分のみ保持）
            if (monthDataCacheRef.current.size > 3) {
              const oldestKey = Array.from(monthDataCacheRef.current.keys()).sort()[0];
              monthDataCacheRef.current.delete(oldestKey);
            }
            
            return;
          }
        } catch (error) {
          // サーバー取得エラー、ローカルから取得
        }
      }

      // オフライン時またはサーバー取得失敗時はローカルから取得
      const localRecords = await OfflineStorage.getPracticeRecords();
      const newPracticeData: PracticeData = {};
      let total = 0;
      
      // 現在表示している月の年と月を取得（オフライン時のみフィルタリングに使用）
      const targetYear = currentDate.getFullYear();
      const targetMonth = currentDate.getMonth();
      
      const dailyTotals: { [date: string]: number } = {};
      const dailyHasRecord: { [date: string]: boolean } = {}; // 練習時間が記録されたか（タイマー、クイック、手動入力など）
      const dailyHasBasicPractice: { [date: string]: boolean } = {}; // 基礎練があるか
      
      // オフライン時は年月でフィルタリング（ローカルストレージには全データが含まれるため）
      localRecords.forEach((record: { created_at: string; duration_minutes?: number; input_method?: string }) => {
        const date = new Date(record.created_at);
        // 現在表示している月と一致するか確認（オフライン時のみ必要）
        if (date.getMonth() === targetMonth && date.getFullYear() === targetYear) {
          const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          
          // 基礎練（input_method: 'preset'）の処理
          if (record.input_method === 'preset') {
            dailyHasBasicPractice[dateStr] = true;
            // 基礎練は時間を加算しない
          } else {
            // タイマー、クイック、手動入力など、練習時間が記録された場合
            if (!dailyTotals[dateStr]) {
              dailyTotals[dateStr] = 0;
            }
            const minutes = record.duration_minutes || 0;
            dailyTotals[dateStr] += minutes;
            if (minutes > 0) {
              dailyHasRecord[dateStr] = true;
            }
          }
        }
      });
      
      // 練習時間が記録された日を処理（オフライン時は既にフィルタリング済み）
      Object.entries(dailyTotals).forEach(([date, minutes]) => {
        const day = parseInt(date.split('-')[2]);
        newPracticeData[day] = { 
          minutes, 
          hasRecord: dailyHasRecord[date] || false,
          hasBasicPractice: dailyHasBasicPractice[date] || false
        };
        total += minutes;
      });
      
      // 基礎練のみの日（時間が0だが基礎練がある日）も追加（オフライン時は既にフィルタリング済み）
      Object.entries(dailyHasBasicPractice).forEach(([date, hasBasicPractice]) => {
        if (hasBasicPractice && !dailyTotals[date]) {
          const day = parseInt(date.split('-')[2]);
          if (!newPracticeData[day]) {
            newPracticeData[day] = { 
              minutes: 0, 
              hasRecord: false,
              hasBasicPractice: true
            };
          } else {
            newPracticeData[day].hasBasicPractice = true;
          }
        }
      });
      
      // 月が変わった場合は必ずデータを更新（他の月のデータが残らないように）
      // 既存のデータを保持しながら更新（読み込み中でも既存データを表示）
      setPracticeData(newPracticeData);
      setMonthlyTotal(total);
      
      // キャッシュに保存（次回は即座に表示できるように）
      const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      monthDataCacheRef.current.set(monthKey, {
        practiceData: newPracticeData,
        recordingsData: recordingsDataRef.current,
        events: eventsRef.current,
        monthlyTotal: total,
      });
      
      // キャッシュサイズを制限（最新3ヶ月分のみ保持）
      if (monthDataCacheRef.current.size > 3) {
        const oldestKey = Array.from(monthDataCacheRef.current.keys()).sort()[0];
        monthDataCacheRef.current.delete(oldestKey);
      }
    } catch (error) {
      ErrorHandler.handle(error, '練習データの読み込み', false);
      logger.error('練習データの読み込みエラー:', error);
    }
  }, [currentDate, getCurrentInstrumentId]);

  const loadTotalPracticeTime = useCallback(async (userParam?: { id: string }) => {
    try {
      const user = userParam ?? (await supabase.auth.getUser()).data.user;
      if (!user) return;

      const currentInstrumentId = await getCurrentInstrumentId(user);
      
      let query = supabase
        .from('practice_sessions')
        .select('duration_minutes')
        .eq('user_id', user.id);
      
      if (currentInstrumentId) {
        query = query.eq('instrument_id', currentInstrumentId);
      }
      
      const { data: sessions, error } = await query;

      if (error) {
        if (error.code === 'PGRST205' || error.code === 'PGRST116' || error.message?.includes('Could not find the table')) {
          // エラー時は既存の値を保持（0にリセットしない）
          return;
        }
        // エラー時は既存の値を保持（0にリセットしない）
        return;
      }

      if (sessions && sessions.length > 0) {
        const total = sessions.reduce((sum: number, session: { duration_minutes: number }) => sum + session.duration_minutes, 0);
        setTotalPracticeTime(total);
        totalPracticeTimeRef.current = total; // refも更新
      } else {
        // sessionsが空の場合も既存の値を保持（0にリセットしない）
        // 既存の値が0より大きい場合は、その値を保持
        if (totalPracticeTimeRef.current > 0) {
          // 既存の値を保持（何もしない）
          return;
        }
      }
    } catch (error) {
      ErrorHandler.handle(error, '総練習時間の読み込み', false);
      logger.error('総練習時間の読み込みエラー:', error);
      // エラー時は既存の値を保持（0にリセットしない）
    }
  }, [getCurrentInstrumentId]);

  const loadEvents = useCallback(async (userParam?: { id: string }) => {
    try {
      const user = userParam ?? (await supabase.auth.getUser()).data.user;
      if (!user) return;

      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      const { data: eventsData, error } = await supabase
        .from('events')
        .select('id, title, description, date')
        .eq('user_id', user.id)
        .eq('is_completed', false)
        .gte('date', formatLocalDate(startOfMonth))
        .lte('date', formatLocalDate(endOfMonth))
        .order('date', { ascending: true });

      if (error) {
        // 400エラー（Bad Request）の場合、dateカラムが存在しない可能性が高い
        if (error.code === '42703' || error.code === 'PGRST116' || error.status === 400 || 
            error.message?.includes('column') || error.message?.includes('does not exist') || 
            error.message?.includes('date') || error.message?.includes('date')) {
          logger.warn('ℹ️ eventsテーブルのdateカラムが存在しません。マイグレーションを実行してください。', { 
            error: {
              code: error.code,
              message: error.message,
              status: error.status,
              details: error.details,
              hint: error.hint
            }
          });
          // 既存のデータがない場合のみ空にする
          if (Object.keys(eventsRef.current).length === 0) {
            setEvents({});
          }
          return;
        }
        if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
          logger.info('ℹ️ eventsテーブルが存在しません。マイグレーションを実行してください。');
          // 既存のデータがない場合のみ空にする
          if (Object.keys(eventsRef.current).length === 0) {
            setEvents({});
          }
          return;
        }
        ErrorHandler.handle(error, 'イベント読み込み', false);
        logger.error('❌ イベント読み込みエラー:', error);
        // エラー時は既存の値を保持
        return;
      }

      if (eventsData) {
        const newEvents: EventData = {};
        
        eventsData.forEach((event: { id: string; title: string; description?: string; date: string }) => {
          const day = parseInt(event.date.split('-')[2]);
          if (!newEvents[day]) {
            newEvents[day] = [];
          }
          newEvents[day].push({
            id: event.id,
            title: event.title,
            description: event.description || undefined
          });
        });
        
        // 既存のデータを保持しながら更新（読み込み中でも既存データを表示）
        setEvents(newEvents);
        
        // キャッシュを更新
        const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        const cachedData = monthDataCacheRef.current.get(monthKey);
        if (cachedData) {
          cachedData.events = newEvents;
        }
      }
    } catch (error) {
      ErrorHandler.handle(error, 'イベントデータの読み込み', false);
      logger.error('イベントデータの読み込みエラー:', error);
    }
  }, [currentDate]);

  const loadRecordingsData = useCallback(async (userParam?: { id: string }) => {
    try {
      const user = userParam ?? (await supabase.auth.getUser()).data.user;
      if (!user) return;

      const currentInstrumentId = await getCurrentInstrumentId(user);
      
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
          logger.info('ℹ️ recordingsテーブルが存在しません');
          // 既存のデータがない場合のみ空にする
          if (Object.keys(recordingsDataRef.current).length === 0) {
            setRecordingsData({});
          }
          return;
        }
        ErrorHandler.handle(error, '録音データ読み込み', false);
        logger.error('❌ 録音データ読み込みエラー:', error);
        // エラー時は既存の値を保持
        return;
      }

      logger.debug('📊 取得した録音データ:', {
        count: recordings?.length || 0,
        recordings: recordings?.map((r: any) => ({
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
            newRecordingsData[day] = { hasRecording: true };
            logger.debug(`✅ 録音データを日付 ${day} に追加 (recorded_at: ${recording.recorded_at}, localDate: ${localDateStr})`);
          } else {
            logger.debug(`⏭️ 録音データをスキップ (recorded_at: ${recording.recorded_at}, localDate: ${localDateStr}, target: ${targetYear}-${targetMonth + 1})`);
          }
        });
        
        logger.debug('📅 最終的な録音データ:', newRecordingsData);
        // 既存のデータを保持しながら更新（読み込み中でも既存データを表示）
        setRecordingsData(newRecordingsData);
        
        // キャッシュを更新
        const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        const cachedData = monthDataCacheRef.current.get(monthKey);
        if (cachedData) {
          cachedData.recordingsData = newRecordingsData;
        }
      } else {
        logger.debug('ℹ️ 録音データが見つかりませんでした');
        // 既存のデータがない場合のみ空にする
        if (Object.keys(recordingsDataRef.current).length === 0) {
          setRecordingsData({});
        }
      }
    } catch (error) {
      ErrorHandler.handle(error, '録音データの読み込み', false);
      logger.error('❌ 録音データの読み込みエラー:', error);
      // エラー時は既存の値を保持
    }
  }, [currentDate, getCurrentInstrumentId]);

  const loadShortTermGoal = useCallback(async (userParam?: { id: string }) => {
    try {
      const user = userParam ?? (await supabase.auth.getUser()).data.user;
      if (!user) {
        // 既存の目標がない場合のみnullにする
        if (!shortTermGoalRef.current) {
          setShortTermGoal(null);
        }
        return;
      }

      // まず、show_on_calendarカラムが存在するかチェック（localStorageを先に確認して高速化）
      let supportsShowOnCalendar = true;
      
      // localStorageのフラグを先に確認（同期処理で高速化）
      if (typeof window !== 'undefined') {
        try {
          const flag = window.localStorage.getItem('disable_show_on_calendar');
          if (flag === '1') {
            supportsShowOnCalendar = false;
          }
        } catch (e) {
          // localStorageへのアクセスエラーは無視
        }
      }
      
      // フラグが設定されていない場合のみ、データベースをチェック
      if (supportsShowOnCalendar) {
        try {
          const { error: checkError } = await supabase
            .from('goals')
            .select('show_on_calendar')
            .limit(1);
          
          if (checkError) {
            const isColumnError = 
              checkError.code === 'PGRST204' || 
              checkError.code === '42703' || 
              checkError.code === 'PGRST116' ||
              checkError.status === 400 ||
              checkError.message?.includes('show_on_calendar') ||
              checkError.message?.includes('Could not find') ||
              checkError.message?.includes('schema cache') ||
              checkError.message?.includes('does not exist');
            
            if (isColumnError) {
              supportsShowOnCalendar = false;
              // フラグを設定して、以降のチェックをスキップ
              if (typeof window !== 'undefined') {
                try {
                  window.localStorage.setItem('disable_show_on_calendar', '1');
                } catch (e) {
                  // localStorageへの書き込みエラーは無視
                }
              }
            } else {
              // カラムエラー以外のエラーも無視（テーブルが存在しないなど）
              supportsShowOnCalendar = false;
            }
          }
        } catch (e) {
          // チェックエラーは無視して続行（カラムが存在しない場合は正常な動作）
          supportsShowOnCalendar = false;
        }
      }

      // クエリを構築（show_on_calendarカラムが存在しない場合はselectから除外）
      let selectFields = 'id, title, target_date, is_completed, progress_percentage, goal_type';
      if (supportsShowOnCalendar) {
        selectFields += ', show_on_calendar';
      }

      // 個人目標（短期・長期）の両方を取得
      let query = supabase
        .from('goals')
        .select(selectFields)
        .eq('user_id', user.id)
        .in('goal_type', ['personal_short', 'personal_long'])
        .order('created_at', { ascending: false });

      // show_on_calendarカラムが存在する場合はフィルタリング
      if (supportsShowOnCalendar) {
        query = query.eq('show_on_calendar', true);
      }

      const { data: goals, error } = await query;

      if (error) {
        if (error.code === 'PGRST205' || error.code === 'PGRST116' || error.message?.includes('Could not find the table')) {
          logger.info('ℹ️ goalsテーブルが存在しません。マイグレーションを実行してください。');
          // 既存の目標がない場合のみnullにする
          if (!shortTermGoalRef.current) {
            setShortTermGoal(null);
          }
          return;
        }
        ErrorHandler.handle(error, '短期目標の読み込み', false);
        logger.error('❌ 短期目標の読み込みエラー:', error);
        // エラー時は既存の値を保持
        return;
      }

      if (goals && goals.length > 0) {
        // 達成済みでない目標をフィルタリング
        const activeGoals = goals.filter((goal: any) => {
          const isCompleted = goal.is_completed === true || goal.progress_percentage === 100;
          return !isCompleted;
        });

        // show_on_calendarカラムが存在しない場合は、localStorageから状態を確認
        let filteredGoals = activeGoals;
        if (!supportsShowOnCalendar && typeof window !== 'undefined') {
          filteredGoals = activeGoals.filter((goal: any) => {
            try {
              const savedState = window.localStorage.getItem(`goal_show_calendar_${goal.id}`);
              if (savedState !== null) {
                return savedState === 'true';
              }
              // 旧形式のcalendar_goal_idもチェック
              const selectedId = window.localStorage.getItem('calendar_goal_id');
              return selectedId === goal.id;
            } catch (e) {
              return false;
            }
          });
        } else if (supportsShowOnCalendar) {
          // show_on_calendarがtrueの目標のみをフィルタリング（既にクエリでフィルタリング済みだが、念のため）
          filteredGoals = activeGoals.filter((goal: any) => goal.show_on_calendar === true);
        }

        // 最初の有効な目標を取得
        if (filteredGoals.length > 0) {
          const goal = filteredGoals[0];
          setShortTermGoal({
            title: goal.title,
            target_date: goal.target_date || undefined
          });
        } else {
          // 既存の目標がない場合のみnullにする
          if (!shortTermGoalRef.current) {
            setShortTermGoal(null);
          }
        }
      } else {
        // 既存の目標がない場合のみnullにする
        if (!shortTermGoalRef.current) {
          setShortTermGoal(null);
        }
      }
    } catch (error) {
      ErrorHandler.handle(error, '短期目標の読み込み', false);
      logger.error('短期目標の読み込みエラー:', error);
      // エラー時は既存の値を保持
    }
  }, []);

  // 各load関数をrefで保持して、依存関係の連鎖を断ち切る
  const loadPracticeDataRef = useRef(loadPracticeData);
  const loadTotalPracticeTimeRef = useRef(loadTotalPracticeTime);
  const loadEventsRef = useRef(loadEvents);
  const loadRecordingsDataRef = useRef(loadRecordingsData);
  const loadShortTermGoalRef = useRef(loadShortTermGoal);

  useEffect(() => {
    loadPracticeDataRef.current = loadPracticeData;
    loadTotalPracticeTimeRef.current = loadTotalPracticeTime;
    loadEventsRef.current = loadEvents;
    loadRecordingsDataRef.current = loadRecordingsData;
    loadShortTermGoalRef.current = loadShortTermGoal;
  }, [loadPracticeData, loadTotalPracticeTime, loadEvents, loadRecordingsData, loadShortTermGoal]);

  const loadAllData = useCallback(async (userParam?: { id: string }) => {
    if (isFetchingRef.current) return;
    
    let cancelled = false;
    isFetchingRef.current = true;
    
    try {
      const user = userParam ?? (await supabase.auth.getUser()).data.user;
      if (!user || cancelled) return;

      // 現在の月のキーを取得
      const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      
      // キャッシュがある場合は即座に返す（遅延ゼロ）
      const cachedData = monthDataCacheRef.current.get(monthKey);
      if (cachedData) {
        // キャッシュがある場合は即座に設定（既にuseEffectで設定済みの可能性があるが、念のため）
        if (practiceDataRef.current !== cachedData.practiceData) {
          setPracticeData(cachedData.practiceData);
          setRecordingsData(cachedData.recordingsData);
          setEvents(cachedData.events);
          setMonthlyTotal(cachedData.monthlyTotal);
        }
        // バックグラウンドで最新データを取得（キャッシュを更新）
        Promise.all([
          loadPracticeDataRef.current(user),
          loadTotalPracticeTimeRef.current(user),
          loadEventsRef.current(user),
          loadRecordingsDataRef.current(user),
          loadShortTermGoalRef.current(user),
        ]).catch(error => {
          ErrorHandler.handle(error, 'バックグラウンドデータ更新', false);
        });
        isFetchingRef.current = false;
        return;
      }

      // キャッシュがない場合は並列実行でパフォーマンス向上
      // 練習データを最優先で読み込み（UIに即座に反映）
      const practicePromise = loadPracticeDataRef.current(user);
      
      // その他のデータは並列で読み込み
      await Promise.all([
        practicePromise,
        loadTotalPracticeTimeRef.current(user),
        loadEventsRef.current(user),
        loadRecordingsDataRef.current(user),
        loadShortTermGoalRef.current(user),
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
  }, [currentDate]); // currentDateを依存配列に追加（キャッシュチェックのため）

  return {
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
  };
}

