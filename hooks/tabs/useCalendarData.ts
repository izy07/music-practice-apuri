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

export function useCalendarData(currentDate: Date) {
  const [practiceData, setPracticeData] = useState<PracticeData>({});
  const [recordingsData, setRecordingsData] = useState<RecordingsData>({});
  const [events, setEvents] = useState<EventData>({});
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [totalPracticeTime, setTotalPracticeTime] = useState(0);
  const [shortTermGoal, setShortTermGoal] = useState<ShortTermGoal | null>(null);
  const isFetchingRef = useRef(false);
  
  // コンテキストから楽器IDを取得（DBアクセス不要）- useEffectより前に定義する必要がある
  const { selectedInstrument } = useInstrumentTheme();
  
  // 楽器変更時に状態をクリアしてデータを再読み込み
  const previousInstrumentIdRef = useRef<string | null>(null);
  
  // loadAllDataを先に定義する必要があるため、後でuseEffectを追加
  
  // 楽器ID取得の共通関数（コンテキストから取得）
  const getCurrentInstrumentId = useCallback(async (user: { id: string }): Promise<string | null> => {
    // コンテキストから取得（既にキャッシュされている）
    return selectedInstrument?.id || null;
  }, [selectedInstrument]);


  const loadPracticeData = useCallback(async (userParam?: { id: string }) => {
    try {
      const user = userParam ?? (await supabase.auth.getUser()).data.user;
      if (!user) return;

      const currentInstrumentId = await getCurrentInstrumentId(user);
      
      console.log('📥 練習データを読み込み中...', {
        userId: user.id,
        currentInstrumentId,
        month: currentDate.getMonth() + 1,
        year: currentDate.getFullYear()
      });
      
      if (isOnline()) {
        try {
          const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
          const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
          
          let query = supabase
            .from('practice_sessions')
            .select('practice_date, duration_minutes, input_method, instrument_id')
            .eq('user_id', user.id)
            .gte('practice_date', formatLocalDate(startOfMonth))
            .lte('practice_date', formatLocalDate(endOfMonth))
            .order('practice_date', { ascending: true });
          
          if (currentInstrumentId) {
            query = query.eq('instrument_id', currentInstrumentId);
          } else {
            query = query.is('instrument_id', null);
          }
          
          const { data: sessions, error } = await query;
          
          console.log('📊 データベースから取得したセッション数:', sessions?.length || 0, {
            currentInstrumentId,
            error: error?.message
          });

          if (error) {
            if (error.code === 'PGRST205' || error.code === 'PGRST116' || error.message?.includes('Could not find the table')) {
              logger.info('ℹ️ practice_sessionsテーブルが存在しません。マイグレーションを実行してください。');
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
            const dailyTotals: { [date: string]: number } = {};
            const dailyHasRecord: { [date: string]: boolean } = {};
            const dailyHasBasicPractice: { [date: string]: boolean } = {};
            
            sessions.forEach((session: { practice_date: string; duration_minutes: number; input_method?: string }) => {
              const date = session.practice_date;
              const day = parseInt(date.split('-')[2]);
              
              console.log('📝 セッション処理', { date, day, duration_minutes: session.duration_minutes, input_method: session.input_method });
              
              // 基礎練（preset）の場合は基礎練フラグのみ設定
              if (session.input_method === 'preset') {
                dailyHasBasicPractice[date] = true;
                console.log('✅ 基礎練として処理', { date });
              } else {
                // タイマー、クイック、手動入力など、練習時間が記録された場合
                if (!dailyTotals[date]) {
                  dailyTotals[date] = 0;
                }
                dailyTotals[date] += session.duration_minutes;
                // duration_minutesが0より大きい場合、hasRecordをtrueに設定
                if (session.duration_minutes > 0) {
                  dailyHasRecord[date] = true;
                  console.log('✅ 練習記録として処理', { date, minutes: session.duration_minutes, input_method: session.input_method });
                } else {
                  console.log('⚠️ 時間が0のためhasRecordを設定しません', { date, minutes: session.duration_minutes });
                }
              }
            });
            
            console.log('📊 集計結果', { 
              dailyTotals: Object.entries(dailyTotals).slice(0, 5),
              dailyHasRecord: Object.entries(dailyHasRecord).slice(0, 5),
              dailyHasBasicPractice: Object.entries(dailyHasBasicPractice).slice(0, 5)
            });
            
            Object.entries(dailyTotals).forEach(([date, minutes]) => {
              const day = parseInt(date.split('-')[2]);
              newPracticeData[day] = { 
                minutes, 
                hasRecord: dailyHasRecord[date] || false,
                hasBasicPractice: dailyHasBasicPractice[date] || false
              };
              total += minutes;
              console.log('✅ 日付データ追加', { date, day, minutes, hasRecord: dailyHasRecord[date] || false });
            });
            
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
            
            console.log('📊 練習データを更新', { 
              sessionsCount: sessions.length, 
              practiceDataKeys: Object.keys(newPracticeData),
              practiceDataFull: newPracticeData,
              total,
              currentInstrumentId
            });
            setPracticeData(newPracticeData);
            setMonthlyTotal(total);
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
      
      setPracticeData(newPracticeData);
      setMonthlyTotal(total);
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
      
      console.log('📊 総練習時間を読み込み中...', {
        userId: user.id,
        currentInstrumentId
      });
      
      let query = supabase
        .from('practice_sessions')
        .select('duration_minutes')
        .eq('user_id', user.id);
      
      if (currentInstrumentId) {
        query = query.eq('instrument_id', currentInstrumentId);
      } else {
        query = query.is('instrument_id', null);
      }
      
      const { data: sessions, error } = await query;

      if (error) {
        if (error.code === 'PGRST205' || error.code === 'PGRST116' || error.message?.includes('Could not find the table')) {
          // エラー時は既存の値を保持（0にリセットしない）
          return;
        }
        console.error('❌ 総練習時間読み込みエラー:', error);
        // エラー時は既存の値を保持（0にリセットしない）
        return;
      }

      if (sessions && sessions.length > 0) {
        const total = sessions.reduce((sum: number, session: { duration_minutes: number }) => sum + session.duration_minutes, 0);
        console.log('✅ 総練習時間を更新', {
          sessionsCount: sessions.length,
          total,
          currentInstrumentId
        });
        setTotalPracticeTime(total);
      } else {
        console.log('ℹ️ 練習セッションが見つかりませんでした', { currentInstrumentId });
        setTotalPracticeTime(0);
      }
    } catch (error) {
      console.error('❌ 総練習時間の読み込みエラー:', error);
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
          logger.warn('ℹ️ eventsテーブルのdateカラムが存在しません。マイグレーションを実行してください。');
          return;
        }
        if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
          logger.info('ℹ️ eventsテーブルが存在しません。マイグレーションを実行してください。');
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
        
        setEvents(newEvents);
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
        setRecordingsData(newRecordingsData);
      } else {
        logger.debug('ℹ️ 録音データが見つかりませんでした');
        setRecordingsData({});
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
        setShortTermGoal(null);
        return;
      }

      // show_on_calendarカラムが存在するかチェック
      // まずlocalStorageをチェックして、不要なDBクエリを避ける
      let supportsShowOnCalendar = true;
      
      // localStorageのフラグを先に確認（同期処理で即座に結果を得る）
      if (typeof window !== 'undefined') {
        try {
          const flag = window.localStorage.getItem('disable_show_on_calendar');
          if (flag === '1') {
            // カラムが存在しないことが既に分かっている
            supportsShowOnCalendar = false;
          } else {
            // フラグがない場合のみDBクエリを実行
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
                  // フラグを設定して以降のチェックをスキップ
                  try {
                    window.localStorage.setItem('disable_show_on_calendar', '1');
                  } catch (e) {
                    // localStorageへの書き込みエラーは無視
                  }
                } else {
                  supportsShowOnCalendar = false;
                }
              }
            } catch (e) {
              supportsShowOnCalendar = false;
              // エラー時もフラグを設定
              try {
                if (typeof window !== 'undefined') {
                  window.localStorage.setItem('disable_show_on_calendar', '1');
                }
              } catch (storageError) {
                // localStorageへの書き込みエラーは無視
              }
            }
          }
        } catch (storageError) {
          // localStorageへのアクセスエラーは無視し、デフォルト（true）を使用
          supportsShowOnCalendar = true;
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
          setShortTermGoal(null);
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

        // show_on_calendarがtrueの目標のみをフィルタリング
        let filteredGoals = activeGoals;
        if (supportsShowOnCalendar) {
          console.log('📅 カレンダー表示対応: 有効な目標をフィルタリング中', {
            activeGoalsCount: activeGoals.length,
            goalsWithShowOnCalendar: activeGoals.map((g: any) => ({
              id: g.id,
              title: g.title,
              show_on_calendar: g.show_on_calendar
            }))
          });
          filteredGoals = activeGoals.filter((goal: any) => goal.show_on_calendar === true);
          console.log('📅 フィルタリング後の目標数:', filteredGoals.length);
        } else {
          // カラムが存在しない場合は機能を無効化（空配列を返す）
          console.log('⚠️ show_on_calendarカラムが存在しないため、カレンダー表示機能を無効化');
          filteredGoals = [];
        }

        // 最初の有効な目標を取得
        if (filteredGoals.length > 0) {
          const goal = filteredGoals[0];
          console.log('✅ カレンダーに表示する目標を設定:', {
            title: goal.title,
            target_date: goal.target_date,
            show_on_calendar: goal.show_on_calendar
          });
          setShortTermGoal({
            title: goal.title,
            target_date: goal.target_date || undefined
          });
        } else {
          console.log('ℹ️ カレンダーに表示する目標がありません');
          setShortTermGoal(null);
        }
      } else {
        setShortTermGoal(null);
      }
    } catch (error) {
      ErrorHandler.handle(error, '短期目標の読み込み', false);
      logger.error('短期目標の読み込みエラー:', error);
      // エラー時は既存の値を保持
    }
  }, []);

  const loadAllData = useCallback(async (userParam?: { id: string }) => {
    if (isFetchingRef.current) {
      return;
    }
    
    let cancelled = false;
    isFetchingRef.current = true;
    
    try {
      const user = userParam ?? (await supabase.auth.getUser()).data.user;
      if (!user || cancelled) return;

      // 並列実行でパフォーマンス向上
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
  }, [currentDate, loadPracticeData, loadTotalPracticeTime, loadEvents, loadRecordingsData, loadShortTermGoal]);

  // 楽器変更時に状態をクリアしてデータを再読み込み
  useEffect(() => {
    if (typeof selectedInstrument === 'undefined') return;
    const currentInstrumentId = selectedInstrument?.id || null;
    
    // 楽器が変更された場合、状態をクリアしてデータを再読み込み
    if (previousInstrumentIdRef.current !== null && previousInstrumentIdRef.current !== currentInstrumentId) {
      setPracticeData({});
      setRecordingsData({});
      setEvents({});
      setMonthlyTotal(0);
      setTotalPracticeTime(0);
      setShortTermGoal(null);
      
      // データを再読み込み
      loadAllData().catch(() => {
        // エラーは無視
      });
    }
    
    previousInstrumentIdRef.current = currentInstrumentId;
  }, [selectedInstrument?.id, loadAllData]);

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

