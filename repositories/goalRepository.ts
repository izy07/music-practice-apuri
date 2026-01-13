/**
 * 目標（goals）関連のリポジトリ
 */
import { supabase } from '@/lib/supabase';
import { Goal, SubGoal } from '@/lib/tabs/goals/types';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import { subGoalRepository } from './subGoalRepository';

// セッションで show_on_calendar カラムの対応可否を保持
let supportsShowOnCalendar: boolean | null = null; // nullの場合は未チェック
let supportsInstrumentId = true; // instrument_idカラムの存在をキャッシュ
let supportsIsCompleted = true; // is_completedカラムの存在をキャッシュ
let isInitializing = false; // 初期化中フラグ
let initializationPromise: Promise<void> | null = null; // 初期化のPromise

// show_on_calendarカラムの存在を確認する関数
// 根本的解決: localStorageのフラグを無視して、常にDBクエリを実行して確認
export const checkShowOnCalendarSupport = async (forceCheck: boolean = false): Promise<boolean> => {
  // 強制チェックの場合は、キャッシュとlocalStorageのフラグを無視
  if (forceCheck) {
    supportsShowOnCalendar = null;
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem('disable_show_on_calendar');
      } catch (e) {
        // localStorageへのアクセスエラーは無視
      }
    }
  }
  
  // 既にチェック済みの場合は即座に返す（強制チェックの場合は除く）
  const isFirstCheck = supportsShowOnCalendar === null;
    if (!isFirstCheck && !forceCheck) {
    return supportsShowOnCalendar ?? true;
  }
  
  // 初期化中の場合、初期化の完了を待つ
  if (isInitializing && initializationPromise && !forceCheck) {
    await initializationPromise;
    return supportsShowOnCalendar ?? true;
  }

  // 常にデータベースにクエリを送信して確認（localStorageのフラグは無視）
  try {
    if (isFirstCheck || forceCheck) {
      logger.debug('📅 show_on_calendarカラムの存在を確認中...');
    }
    const { error } = await supabase
      .from('goals')
      .select('show_on_calendar')
      .limit(1);

    if (error) {
      const isColumnError = 
        error.code === 'PGRST204' || 
        error.code === '42703' || 
        error.code === 'PGRST116' ||
        error.status === 400 ||
        (error.message && (
          error.message.includes('show_on_calendar') ||
          error.message.includes('Could not find') ||
          error.message.includes('schema cache') ||
          error.message.includes('does not exist') ||
          error.message.includes('column') ||
          error.message.includes('not found')
        ));
      
      if (isColumnError) {
        // カラムが存在しない場合
        if (isFirstCheck || forceCheck) {
          logger.warn('show_on_calendarカラムが存在しません');
        }
        supportsShowOnCalendar = false;
        // フラグは設定しない（次回も確認するため）
        return false;
      }
      
      // カラムエラー以外のエラー（テーブルが存在しないなど）
      if (isFirstCheck || forceCheck) {
        logger.error('goalsテーブルのクエリエラー:', error);
      }
      supportsShowOnCalendar = false;
      return false;
    }

    // エラーがない場合はカラムが存在する
    supportsShowOnCalendar = true;
    // フラグをクリア（カラムが存在する場合）
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem('disable_show_on_calendar');
      } catch (e) {
        // localStorageへのアクセスエラーは無視
      }
    }
    return true;
  } catch (error) {
    // エラーが発生した場合
    logger.error('show_on_calendarカラムの確認中にエラーが発生しました:', error);
    // デフォルトはtrue（カラムが存在すると仮定）
    supportsShowOnCalendar = true;
    return true;
  }
};

// 初期化時にlocalStorageのフラグを確認（非同期チェックの前に使用）
try {
  if (typeof window !== 'undefined') {
    const flag = window.localStorage.getItem('disable_show_on_calendar');
    if (flag === '1') {
      supportsShowOnCalendar = false;
    }
    const instrumentIdFlag = window.localStorage.getItem('disable_instrument_id');
    if (instrumentIdFlag === '1') supportsInstrumentId = false;
    const isCompletedFlag = window.localStorage.getItem('disable_is_completed');
    if (isCompletedFlag === '1') supportsIsCompleted = false;
  }
} catch {}

/**
 * カラム存在確認を初期化時に一度だけ実行する関数
 * アプリ起動時に呼び出すことで、パフォーマンスを向上
 * 
 * 注意: 初期スキーマ（20251219000000_initial_schema.sql）に既にshow_on_calendarカラムが含まれているため、
 *       カラム作成関数は削除しました。マイグレーションが未適用の場合は、初期スキーマを適用してください。
 */

export const initializeGoalRepository = async (forceRecheck: boolean = false): Promise<void> => {
  // 既に初期化済みの場合はスキップ（強制再チェックの場合は除く）
  if (supportsShowOnCalendar !== null && !isInitializing && !forceRecheck) {
    return;
  }
  
  // 初期化中の場合は既存のPromiseを返す（強制再チェックの場合は除く）
  if (isInitializing && initializationPromise && !forceRecheck) {
    return initializationPromise;
  }
  
  // 強制再チェックの場合は、localStorageのフラグをクリア
  if (forceRecheck && typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem('disable_show_on_calendar');
      supportsShowOnCalendar = null; // キャッシュをクリア
    } catch (e) {
      // localStorageへのアクセスエラーは無視
    }
  }
  
  // 初期化を開始
  isInitializing = true;
  initializationPromise = (async () => {
    try {
      // show_on_calendarカラムの存在確認（強制再チェックの場合はキャッシュを無視）
      if (supportsShowOnCalendar === null || forceRecheck) {
        // 強制再チェックの場合は、localStorageのフラグを無視してDBクエリを実行
        if (forceRecheck) {
          supportsShowOnCalendar = null;
        }
        const columnExists = await checkShowOnCalendarSupport();
        
        // カラムが存在しない場合（初期スキーマ未適用の可能性）
        // 注意: 初期スキーマ（20251219000000_initial_schema.sql）に既にshow_on_calendarカラムが含まれているため、
        //       カラム作成は行いません。マイグレーションが未適用の場合は、初期スキーマを適用してください。
        if (!columnExists) {
          logger.warn('⚠️ show_on_calendarカラムが存在しません。初期スキーマが適用されていない可能性があります。初期スキーマ（20251219000000_initial_schema.sql）を適用してください。');
        }
      }
      
      // instrument_idカラムの存在確認（必要に応じて）
      if (supportsInstrumentId) {
        try {
          const { error } = await supabase
            .from('goals')
            .select('instrument_id')
            .limit(1);
          
          if (error && (error.code === 'PGRST204' || error.code === '42703' || error.message?.includes('instrument_id'))) {
            supportsInstrumentId = false;
            if (typeof window !== 'undefined') {
              try {
                window.localStorage.setItem('disable_instrument_id', '1');
              } catch {}
            }
          }
        } catch {
          // エラーは無視（デフォルトはtrue）
        }
      }
      
      // is_completedカラムの存在確認（必要に応じて）
      if (supportsIsCompleted) {
        try {
          const { error } = await supabase
            .from('goals')
            .select('is_completed')
            .limit(1);
          
          if (error && (error.code === 'PGRST204' || error.code === '42703' || error.message?.includes('is_completed'))) {
            supportsIsCompleted = false;
            if (typeof window !== 'undefined') {
              try {
                window.localStorage.setItem('disable_is_completed', '1');
              } catch {}
            }
          }
        } catch {
          // エラーは無視（デフォルトはtrue）
        }
      }
      
      logger.debug('[goalRepository] カラム存在確認の初期化が完了しました', {
        supportsShowOnCalendar,
        supportsInstrumentId,
        supportsIsCompleted
      });
    } catch (error) {
      logger.error('[goalRepository] カラム存在確認の初期化でエラーが発生しました', error);
    } finally {
      isInitializing = false;
    }
  })();
  
  return initializationPromise;
};

export const goalRepository = {
  /**
   * 現在のユーザーIDを取得
   */
  async getCurrentUserId(): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  },

  /**
   * ユーザーの目標一覧を取得（未達成のみ）
   */
  async getGoals(userId: string, instrumentId?: string | null): Promise<Goal[]> {
    // カラムの存在を確認してから使用
    let isSupported = await checkShowOnCalendarSupport();
    const baseFields = 'id, user_id, title, description, target_date, goal_type, progress_percentage, is_active';
    const fieldsWithCompleted = supportsIsCompleted ? `${baseFields}, is_completed, completed_at` : baseFields;
    const baseSelectWithoutInstrument = fieldsWithCompleted;
    const baseSelectWithInstrument = `${baseSelectWithoutInstrument}, instrument_id`;
    const baseSelect = supportsInstrumentId ? baseSelectWithInstrument : baseSelectWithoutInstrument;
    const selectFields = isSupported ? `${baseSelect}, show_on_calendar` : baseSelect;
    
    let query = supabase
      .from('goals')
      .select(selectFields)
      .eq('user_id', userId);
    
    // 楽器IDでフィルタリング（カラムが存在する場合のみ）
    if (supportsInstrumentId) {
      if (instrumentId) {
        query = query.eq('instrument_id', instrumentId);
      } else {
        query = query.is('instrument_id', null);
      }
    }
    
    query = query.order('created_at', { ascending: false }).limit(50);

    const { data: goals, error } = await query;

    if (error) {
      const isColumnError = error.code === '42703' || 
                           error.code === '400' || 
                           error.code === 'PGRST204' ||
                           (error.message && (
                             error.message.includes('column') || 
                             error.message.includes('show_on_calendar') ||
                             error.message.includes('42703') ||
                             error.message.includes('Could not find') ||
                             error.message.includes('schema cache')
                           ));
      
      if (!isColumnError && error.code !== '42703' && error.code !== 'PGRST204') {
        ErrorHandler.handle(error, '目標データ読み込み', false);
      }
      
      if (error.code === 'PGRST116') {
        logger.warn('goalsテーブルが存在しません');
        return [];
      }
      
      // カラム不存在の場合はフォールバック
      if (isColumnError) {
        // is_completedカラムのエラーの場合
        if (error.message?.includes('is_completed')) {
          supportsIsCompleted = false;
          try { 
            if (typeof window !== 'undefined') {
              window.localStorage.setItem('disable_is_completed', '1');
            }
          } catch {}
          
          // is_completedカラムを含めずに再試行
          const fallbackBase = 'id, user_id, title, description, target_date, goal_type, progress_percentage, is_active';
          const fallbackBaseWithInstrument = supportsInstrumentId ? `${fallbackBase}, instrument_id` : fallbackBase;
          const fallbackSelect = isSupported 
            ? `${fallbackBaseWithInstrument}, show_on_calendar` 
            : fallbackBaseWithInstrument;
          
          let fallbackQuery = supabase
            .from('goals')
            .select(fallbackSelect)
            .eq('user_id', userId);
          
          if (supportsInstrumentId) {
            if (instrumentId) {
              fallbackQuery = fallbackQuery.eq('instrument_id', instrumentId);
            } else {
              fallbackQuery = fallbackQuery.is('instrument_id', null);
            }
          }
          
          const { data: fallbackGoals, error: fbErr } = await fallbackQuery
            .order('created_at', { ascending: false })
            .limit(50);
          
          if (fbErr) {
            return [];
          }
          
          if (fallbackGoals) {
            const goalsWithDefaults = fallbackGoals.map((g: any) => ({
              ...g,
              is_completed: false, // デフォルト値
              completed_at: null,
              show_on_calendar: g.show_on_calendar ?? false,
            }));
            
            // 長期目標の場合、サブ目標も取得
            const goalsWithSubGoals = await Promise.all(
              goalsWithDefaults.map(async (g: any) => {
                if (g.goal_type === 'personal_long') {
                  try {
                    const subGoals = await subGoalRepository.getSubGoalsByGoalId(g.id, userId);
                    if (subGoals && subGoals.length > 0) {
                      const calculatedProgress = subGoalRepository.calculateProgressFromSubGoals(subGoals);
                      return {
                        ...g,
                        sub_goals: subGoals,
                        progress_percentage: calculatedProgress,
                        is_completed: calculatedProgress === 100,
                      };
                    }
                    return { ...g, sub_goals: [] };
                  } catch (error) {
                    logger.debug('サブ目標取得エラー（無視）:', error);
                    return { ...g, sub_goals: [] };
                  }
                }
                return g;
              })
            );
            
            // DBから取得した値をそのまま使用
            return goalsWithSubGoals.filter((g: any) => !g.is_completed);
          }
        }
        
        // instrument_idカラムのエラーの場合
        if (error.message?.includes('instrument_id') || error.code === '400') {
          supportsInstrumentId = false;
          try { 
            if (typeof window !== 'undefined') {
              window.localStorage.setItem('disable_instrument_id', '1');
            }
          } catch {}
          
          // instrument_idカラムを含めずに再試行
          const fallbackSelect = isSupported 
            ? `${baseSelectWithoutInstrument}, show_on_calendar` 
            : baseSelectWithoutInstrument;
          
          let fallbackQuery = supabase
            .from('goals')
            .select(fallbackSelect)
            .eq('user_id', userId);
          
          const { data: fallbackGoals, error: fbErr } = await fallbackQuery
            .order('created_at', { ascending: false })
            .limit(50);
          
          if (fbErr) {
            // エラーログは出力しない（正常な動作の可能性があるため）
            return [];
          }
          
          if (fallbackGoals) {
            const goalsWithDefaults = fallbackGoals.map((g: any) => ({
              ...g,
              is_completed: g.is_completed ?? (g.progress_percentage === 100),
              show_on_calendar: g.show_on_calendar ?? false,
            }));
            
            // 長期目標の場合、サブ目標も取得
            const goalsWithSubGoals = await Promise.all(
              goalsWithDefaults.map(async (g: any) => {
                if (g.goal_type === 'personal_long') {
                  try {
                    const subGoals = await subGoalRepository.getSubGoalsByGoalId(g.id, userId);
                    if (subGoals && subGoals.length > 0) {
                      const calculatedProgress = subGoalRepository.calculateProgressFromSubGoals(subGoals);
                      return {
                        ...g,
                        sub_goals: subGoals,
                        progress_percentage: calculatedProgress,
                        is_completed: calculatedProgress === 100,
                      };
                    }
                    return { ...g, sub_goals: [] };
                  } catch (error) {
                    logger.debug('サブ目標取得エラー（無視）:', error);
                    return { ...g, sub_goals: [] };
                  }
                }
                return g;
              })
            );
            
            // DBから取得した値をそのまま使用
            return goalsWithSubGoals.filter((g: any) => !g.is_completed);
          }
        }
        
        // show_on_calendarカラムのエラーの場合
        if (error.message?.includes('show_on_calendar')) {
          supportsShowOnCalendar = false;
          try { 
            if (typeof window !== 'undefined') {
              window.localStorage.setItem('disable_show_on_calendar', '1');
            }
          } catch {}
          
          // show_on_calendarカラムを含めずに再試行
          const fallbackSelect = supportsInstrumentId ? baseSelectWithInstrument : baseSelectWithoutInstrument;
          
          let fallbackQuery = supabase
            .from('goals')
            .select(fallbackSelect)
            .eq('user_id', userId);
          
          if (supportsInstrumentId) {
            if (instrumentId) {
              fallbackQuery = fallbackQuery.eq('instrument_id', instrumentId);
            } else {
              fallbackQuery = fallbackQuery.is('instrument_id', null);
            }
          }
          
          const { data: fallbackGoals, error: fbErr } = await fallbackQuery
            .order('created_at', { ascending: false })
            .limit(50);
          
          if (fbErr) {
            return [];
          }
          
          if (fallbackGoals) {
            const goalsWithDefaults = fallbackGoals.map((g: any) => ({
              ...g,
              is_completed: g.is_completed ?? (g.progress_percentage === 100),
              show_on_calendar: false,
            }));
            
            // 長期目標の場合、サブ目標も取得
            const goalsWithSubGoals = await Promise.all(
              goalsWithDefaults.map(async (g: any) => {
                if (g.goal_type === 'personal_long') {
                  try {
                    const subGoals = await subGoalRepository.getSubGoalsByGoalId(g.id, userId);
                    if (subGoals && subGoals.length > 0) {
                      const calculatedProgress = subGoalRepository.calculateProgressFromSubGoals(subGoals);
                      return {
                        ...g,
                        sub_goals: subGoals,
                        progress_percentage: calculatedProgress,
                        is_completed: calculatedProgress === 100,
                      };
                    }
                    return { ...g, sub_goals: [] };
                  } catch (error) {
                    logger.debug('サブ目標取得エラー（無視）:', error);
                    return { ...g, sub_goals: [] };
                  }
                }
                return g;
              })
            );
            
            // DBから取得した値をそのまま使用
            return goalsWithSubGoals.filter((g: any) => !g.is_completed);
          }
        }
      }
      return [];
    }

    if (goals) {
      const goalsWithDefaults = goals.map((g: any) => ({
        ...g,
        is_completed: g.is_completed ?? (g.progress_percentage === 100),
        show_on_calendar: g.show_on_calendar ?? false,
      }));
      
      // 長期目標の場合、サブ目標も取得（一括取得でパフォーマンス最適化）
      const longTermGoalIds = goalsWithDefaults
        .filter((g: any) => g.goal_type === 'personal_long')
        .map((g: any) => g.id);
      
      let subGoalsMap = new Map<string, SubGoal[]>();
      if (longTermGoalIds.length > 0) {
        try {
          subGoalsMap = await subGoalRepository.getSubGoalsByGoalIds(longTermGoalIds, userId);
        } catch (error) {
          // サブ目標取得エラーは無視（既存機能に影響しない）
          logger.debug('サブ目標一括取得エラー（無視）:', error);
        }
      }
      
      const goalsWithSubGoals = goalsWithDefaults.map((g: any) => {
        if (g.goal_type === 'personal_long') {
          const subGoals = subGoalsMap.get(g.id) || [];
          // サブ目標がある場合は進捗率を自動計算
          if (subGoals && subGoals.length > 0) {
            const calculatedProgress = subGoalRepository.calculateProgressFromSubGoals(subGoals);
            return {
              ...g,
              sub_goals: subGoals,
              progress_percentage: calculatedProgress,
              // 進捗率が100%の場合は完了としてマーク
              is_completed: calculatedProgress === 100,
            };
          }
          return { ...g, sub_goals: [] };
        }
        return g;
      });
      
      // DBから取得した値をそのまま使用
      return goalsWithSubGoals.filter((g: any) => !g.is_completed);
    }
    
    return [];
  },

  /**
   * 達成済み目標一覧を取得
   */
  async getCompletedGoals(userId: string, instrumentId?: string | null): Promise<Goal[]> {
    // instrument_idカラムの存在を確認してから使用
    const baseSelectWithoutInstrument = 'id, user_id, title, description, target_date, goal_type, progress_percentage, is_active, is_completed, completed_at';
    const baseSelectWithInstrument = `${baseSelectWithoutInstrument}, instrument_id`;
    const baseSelect = supportsInstrumentId ? baseSelectWithInstrument : baseSelectWithoutInstrument;
    // カラムの存在を確認（初回のみ）
    const isSupported = await checkShowOnCalendarSupport();
    const selectFields = isSupported ? `${baseSelect}, show_on_calendar` : baseSelect;
    
    let query = supabase
      .from('goals')
      .select(selectFields)
      .eq('user_id', userId)
      .or('is_completed.eq.true,progress_percentage.eq.100'); // 達成済み目標のみを取得
    
    // 楽器IDでフィルタリング（カラムが存在する場合のみ）
    if (supportsInstrumentId) {
      if (instrumentId) {
        query = query.eq('instrument_id', instrumentId);
      } else {
        query = query.is('instrument_id', null);
      }
    }
    
    query = query.order('created_at', { ascending: false }).limit(50);

    const { data: goals, error } = await query;

    if (error) {
      const isColumnError = error.code === '42703' || 
                           error.code === '400' || 
                           (error.message && (
                             error.message.includes('column') || 
                             error.message.includes('show_on_calendar') ||
                             error.message.includes('42703')
                           ));
      
      if (!isColumnError && error.code !== '42703') {
        ErrorHandler.handle(error, '達成済み目標データ読み込み', false);
      }
      
      if (error.code === 'PGRST116') {
        logger.warn('goalsテーブルが存在しません');
        return [];
      }
      
      if (isColumnError) {
        // instrument_idカラムのエラーの場合
        if (error.message?.includes('instrument_id') || error.code === '400') {
          supportsInstrumentId = false;
          try { 
            if (typeof window !== 'undefined') {
              window.localStorage.setItem('disable_instrument_id', '1');
            }
          } catch {}
          
          // instrument_idカラムを含めずに再試行
          const fallbackSelect = isSupported 
            ? `${baseSelectWithoutInstrument}, show_on_calendar` 
            : baseSelectWithoutInstrument;
          
          const { data: fbCompleted, error: fbErr } = await supabase
            .from('goals')
            .select(fallbackSelect)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(50);
          
          if (fbErr) {
            return [];
          }
          
          if (fbCompleted) {
            const goalsWithDefaults = fbCompleted.map((g: any) => ({
              ...g,
              is_completed: g.is_completed ?? (g.progress_percentage === 100),
              show_on_calendar: g.show_on_calendar ?? false,
            }));
            return goalsWithDefaults.filter((g: any) => g.is_completed === true);
          }
        }
        
        // show_on_calendarカラムのエラーの場合
        if (error.message?.includes('show_on_calendar')) {
          supportsShowOnCalendar = false;
          try { 
            if (typeof window !== 'undefined') {
              window.localStorage.setItem('disable_show_on_calendar', '1');
            }
          } catch {}
          
          // show_on_calendarカラムを含めずに再試行
          const fallbackSelect = supportsInstrumentId ? baseSelectWithInstrument : baseSelectWithoutInstrument;
          
          let fallbackQuery = supabase
            .from('goals')
            .select(fallbackSelect)
            .eq('user_id', userId);
          
          if (supportsInstrumentId) {
            if (instrumentId) {
              fallbackQuery = fallbackQuery.eq('instrument_id', instrumentId);
            } else {
              fallbackQuery = fallbackQuery.is('instrument_id', null);
            }
          }
          
          const { data: fbCompleted, error: fbErr } = await fallbackQuery
            .order('created_at', { ascending: false })
            .limit(50);
          
          if (fbErr) {
            return [];
          }
          
          if (fbCompleted) {
            const goalsWithDefaults = fbCompleted.map((g: any) => ({
              ...g,
              is_completed: g.is_completed ?? (g.progress_percentage === 100),
              show_on_calendar: false,
            }));
            return goalsWithDefaults.filter((g: any) => g.is_completed === true);
          }
        }
      }
      return [];
    }

    if (goals) {
      const goalsWithDefaults = goals.map((g: any) => ({
        ...g,
        is_completed: g.is_completed ?? (g.progress_percentage === 100),
        show_on_calendar: g.show_on_calendar ?? false,
      }));
      
      // 長期目標の場合、サブ目標も取得（一括取得でパフォーマンス最適化）
      const longTermGoalIds = goalsWithDefaults
        .filter((g: any) => g.goal_type === 'personal_long')
        .map((g: any) => g.id);
      
      let subGoalsMap = new Map<string, SubGoal[]>();
      if (longTermGoalIds.length > 0) {
        try {
          subGoalsMap = await subGoalRepository.getSubGoalsByGoalIds(longTermGoalIds, userId);
        } catch (error) {
          // サブ目標取得エラーは無視（既存機能に影響しない）
          logger.debug('サブ目標一括取得エラー（無視）:', error);
        }
      }
      
      const goalsWithSubGoals = goalsWithDefaults.map((g: any) => {
        if (g.goal_type === 'personal_long') {
          const subGoals = subGoalsMap.get(g.id) || [];
          // サブ目標がある場合は進捗率を自動計算
          if (subGoals && subGoals.length > 0) {
            const calculatedProgress = subGoalRepository.calculateProgressFromSubGoals(subGoals);
            return {
              ...g,
              sub_goals: subGoals,
              progress_percentage: calculatedProgress,
              is_completed: calculatedProgress === 100,
            };
          }
          return { ...g, sub_goals: [] };
        }
        return g;
      });
      
      return goalsWithSubGoals.filter((g: any) => g.is_completed === true);
    }
    
    return [];
  },

  /**
   * 既存の目標数を取得（最初の目標かどうかを判定するため）
   */
  async getExistingGoalsCount(userId: string, instrumentId?: string | null): Promise<number> {
    try {
      let query = supabase
        .from('goals')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);
      
      // 達成済み目標を除外（is_completedがfalse、またはprogress_percentage < 100）
      // 制限チェックでは未達成目標のみをカウント
      if (supportsIsCompleted) {
        query = query.eq('is_completed', false);
      } else {
        // is_completedカラムが存在しない場合は、progress_percentage < 100でフィルタリング
        query = query.lt('progress_percentage', 100);
      }
      
      // 楽器IDでフィルタリング（カラムが存在する場合のみ）
      if (supportsInstrumentId) {
        if (instrumentId) {
          query = query.eq('instrument_id', instrumentId);
        } else {
          query = query.is('instrument_id', null);
        }
      }
      
      const { count, error } = await query;
      
      if (error) {
        // 達成済みフィルタリングのエラーの場合、フィルタリングなしで再試行
        const isCompletedError = (error.code === '400' || error.code === '42703') && 
                                 (error.message?.includes('is_completed') || error.message?.includes('progress_percentage'));
        
        if (isCompletedError) {
          // 達成済みフィルタリングなしで再試行
          let fallbackQuery = supabase
            .from('goals')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId);
          
          // 楽器IDでフィルタリング（カラムが存在する場合のみ）
          if (supportsInstrumentId) {
            if (instrumentId) {
              fallbackQuery = fallbackQuery.eq('instrument_id', instrumentId);
            } else {
              fallbackQuery = fallbackQuery.is('instrument_id', null);
            }
          }
          
          const { count: fallbackCount, error: fbErr } = await fallbackQuery;
          
          if (fbErr) {
            return 0;
          }
          
          return fallbackCount || 0;
        }
        
        // instrument_idカラムのエラーの場合、フィルタリングなしで再試行
        if ((error.code === '400' || error.code === '42703') && error.message?.includes('instrument_id')) {
          supportsInstrumentId = false;
          try { 
            if (typeof window !== 'undefined') {
              window.localStorage.setItem('disable_instrument_id', '1');
            }
          } catch {}
          
          // 達成済みフィルタリングは再試行
          let fallbackQuery = supabase
            .from('goals')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId);
          
          if (supportsIsCompleted) {
            fallbackQuery = fallbackQuery.eq('is_completed', false);
          } else {
            fallbackQuery = fallbackQuery.lt('progress_percentage', 100);
          }
          
          const { count: fallbackCount, error: fbErr } = await fallbackQuery;
          
          if (fbErr) {
            return 0;
          }
          
          return fallbackCount || 0;
        }
        
        return 0;
      }
      
      return count || 0;
    } catch (error) {
      return 0;
    }
  },

  /**
   * 目標を作成
   */
  async createGoal(userId: string, goal: {
    title: string;
    description?: string;
    target_date?: string;
    goal_type: 'personal_short' | 'personal_long';
    instrument_id?: string | null;
  }): Promise<string | null> {
    // 最初の目標かどうかをチェック（instrument_idカラムが存在する場合のみフィルタリング）
    const existingGoalsCount = await this.getExistingGoalsCount(
      userId, 
      supportsInstrumentId ? goal.instrument_id : undefined
    );
    const isFirstGoal = existingGoalsCount === 0;
    
    const insertData: any = {
      user_id: userId,
      title: goal.title.trim(),
      description: goal.description?.trim() || null,
      target_date: goal.target_date || null,
      goal_type: goal.goal_type,
      progress_percentage: 0,
      is_active: true,
    };
    
    // is_completedカラムが存在する場合のみ追加
    if (supportsIsCompleted) {
      insertData.is_completed = false;
    }

    // instrument_idカラムが存在する場合のみ追加
    if (supportsInstrumentId) {
      insertData.instrument_id = goal.instrument_id || null;
    }

    // 最初の目標の場合はカレンダー表示をONにする
    const showOnCalendar = isFirstGoal && supportsShowOnCalendar;

    // show_on_calendarカラムを試行
    let insertPayload: any = { ...insertData };
    if (supportsShowOnCalendar) {
      insertPayload.show_on_calendar = showOnCalendar;
    }

    let { data: insertedData, error } = await supabase
      .from('goals')
      .insert(insertPayload)
      .select('id')
      .single();

    // エラーハンドリング
    if (error) {
      const isShowOnCalendarError = error.code === 'PGRST204' || 
                                     error.code === '42703' || 
                                     error.message?.includes('show_on_calendar');
      
      const isInstrumentIdError = error.code === 'PGRST204' || 
                                  error.code === '42703' || 
                                  error.message?.includes('instrument_id') ||
                                  (error as any)?.status === 400;

      const isCompletedError = error.code === 'PGRST204' || 
                               error.code === '42703' || 
                               error.message?.includes('is_completed');

      // show_on_calendarカラムのエラーの場合
      if (isShowOnCalendarError && supportsShowOnCalendar) {
        supportsShowOnCalendar = false;
        try { 
          if (typeof window !== 'undefined') {
            window.localStorage.setItem('disable_show_on_calendar', '1');
          }
        } catch {}
        
        // show_on_calendarを除外して再試行
        const { data: retryData, error: retryError } = await supabase
          .from('goals')
          .insert(insertData)
          .select('id')
          .single();
        
        if (retryError) {
          throw retryError;
        }
        return retryData?.id || null;
      }

      // instrument_idカラムのエラーの場合
      if (isInstrumentIdError && supportsInstrumentId) {
        supportsInstrumentId = false;
        try { 
          if (typeof window !== 'undefined') {
            window.localStorage.setItem('disable_instrument_id', '1');
          }
        } catch {}
        
        // instrument_idを除外して再試行
        const retryData = { ...insertData };
        delete retryData.instrument_id;
        
        const retryPayload: any = { ...retryData };
        if (supportsShowOnCalendar) {
          retryPayload.show_on_calendar = showOnCalendar;
        }
        
        const { data: retryData2, error: retryError } = await supabase
          .from('goals')
          .insert(retryPayload)
          .select('id')
          .single();
        
        if (retryError) {
          // まだエラーが発生する場合は、show_on_calendarも除外
          if (retryError.message?.includes('show_on_calendar') && supportsShowOnCalendar) {
            supportsShowOnCalendar = false;
            try { 
              if (typeof window !== 'undefined') {
                window.localStorage.setItem('disable_show_on_calendar', '1');
              }
            } catch {}
            
            const { data: finalData, error: finalError } = await supabase
              .from('goals')
              .insert(retryData)
              .select('id')
              .single();
            
            if (finalError) {
              throw finalError;
            }
            return finalData?.id || null;
          } else {
            throw retryError;
          }
        }
        return retryData2?.id || null;
      }

      // is_completedカラムのエラーの場合
      if (isCompletedError) {
        // is_completedを除外して再試行
        const retryData = { ...insertData };
        delete retryData.is_completed;
        
        const retryPayload: any = { ...retryData };
        if (supportsShowOnCalendar) {
          retryPayload.show_on_calendar = showOnCalendar;
        }
        if (supportsInstrumentId) {
          retryPayload.instrument_id = goal.instrument_id || null;
        }
        
        const { data: retryData3, error: retryError } = await supabase
          .from('goals')
          .insert(retryPayload)
          .select('id')
          .single();
        
        if (retryError) {
          throw retryError;
        }
        return retryData3?.id || null;
      }

      // その他のエラー
      throw error;
    }
    
    // 成功した場合、作成した目標のIDを返す
    return insertedData?.id || null;
  },

  /**
   * 目標の進捗を更新
   */
  async updateProgress(goalId: string, newProgress: number, userId: string): Promise<void> {
    const clampedProgress = Math.max(0, Math.min(100, newProgress));
    
    const updateData: any = { progress_percentage: clampedProgress };
    if (clampedProgress === 100) {
      updateData.is_completed = true;
      updateData.completed_at = new Date().toISOString();
    } else {
      updateData.is_completed = false;
      updateData.completed_at = null;
    }

    let { error } = await supabase
      .from('goals')
      .update(updateData)
      .eq('id', goalId)
      .eq('user_id', userId);

    if (error) {
      if ((error.code === 'PGRST204' || error.code === '42703') && error.message?.includes('is_completed')) {
        const { error: retryError } = await supabase
          .from('goals')
          .update({ progress_percentage: clampedProgress })
          .eq('id', goalId)
          .eq('user_id', userId);
        
        if (retryError) {
          throw retryError;
        }
      } else {
        throw error;
      }
    }

    // 100%達成の場合はカレンダー表示を解除
    if (clampedProgress === 100 && supportsShowOnCalendar) {
      try {
        await supabase
          .from('goals')
          .update({ show_on_calendar: false })
          .eq('id', goalId);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('calendarGoalUpdated'));
        }
      } catch {}
    }
  },

  /**
   * 目標を更新（タイトル、説明、目標日など）
   */
  async updateGoal(
    goalId: string,
    userId: string,
    updates: {
      title?: string;
      description?: string | null;
      target_date?: string | null;
      goal_type?: 'personal_short' | 'personal_long';
    }
  ): Promise<void> {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.title !== undefined) {
      updateData.title = updates.title.trim();
    }
    if (updates.description !== undefined) {
      updateData.description = updates.description?.trim() || null;
    }
    if (updates.target_date !== undefined) {
      updateData.target_date = updates.target_date || null;
    }
    if (updates.goal_type !== undefined) {
      updateData.goal_type = updates.goal_type;
    }

    const { error } = await supabase
      .from('goals')
      .update(updateData)
      .eq('id', goalId)
      .eq('user_id', userId);

    if (error) {
      logger.error('[goalRepository.updateGoal] エラー:', error);
      throw error;
    }

    logger.debug('[goalRepository.updateGoal] 成功:', { goalId, updates });
  },

  /**
   * 目標を達成としてマーク
   */
  async completeGoal(goalId: string, userId: string): Promise<void> {
    const updateData: any = { 
      progress_percentage: 100
    };
    
    // is_completedカラムが存在する場合のみ追加
    if (supportsIsCompleted) {
      updateData.is_completed = true;
    }
    
    // completed_atカラムが存在する可能性がある場合は追加（エラー時は除外）
    updateData.completed_at = new Date().toISOString();
    
    let { error } = await supabase
      .from('goals')
      .update(updateData)
      .eq('id', goalId)
      .eq('user_id', userId);

    if (error) {
      const isCompletedError = (error.code === 'PGRST204' || error.code === '42703') && 
                                (error.message?.includes('is_completed') || error.message?.includes('completed_at'));
      
      if (isCompletedError) {
        // is_completedまたはcompleted_atカラムが存在しない場合、除外して再試行
        const retryData: any = { progress_percentage: 100 };
        
        // completed_atのエラーの場合、除外
        if (error.message?.includes('completed_at')) {
          // completed_atは除外（既にretryDataには含まれていない）
        }
        
        // is_completedのエラーの場合、除外
        if (error.message?.includes('is_completed')) {
          supportsIsCompleted = false;
          try { 
            if (typeof window !== 'undefined') {
              window.localStorage.setItem('disable_is_completed', '1');
            }
          } catch {}
          // is_completedは除外（既にretryDataには含まれていない）
        }
        
        const { error: retryError } = await supabase
          .from('goals')
          .update(retryData)
          .eq('id', goalId)
          .eq('user_id', userId);
        
        if (retryError) {
          throw retryError;
        }
      } else {
        throw error;
      }
    }

    // カレンダー表示を解除
    if (supportsShowOnCalendar) {
      try {
        await supabase
          .from('goals')
          .update({ show_on_calendar: false })
          .eq('id', goalId);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('calendarGoalUpdated'));
        }
      } catch {}
    }
  },

  /**
   * 達成済み目標を未達成に戻す
   */
  async uncompleteGoal(goalId: string, userId: string): Promise<void> {
    const updateData: any = {};
    
    // まず目標の情報を取得（goal_typeを確認するため）
    const { data: goalData, error: fetchError } = await supabase
      .from('goals')
      .select('goal_type')
      .eq('id', goalId)
      .eq('user_id', userId)
      .single();
    
    if (fetchError) {
      logger.error('目標の取得エラー:', fetchError);
      throw fetchError;
    }
    
    // サブ目標がある場合（長期目標の場合）、サブ目標の状態から進捗率を再計算
    let progressPercentage = 90; // デフォルト値
    if (goalData?.goal_type === 'personal_long') {
      try {
        const subGoals = await subGoalRepository.getSubGoalsByGoalId(goalId, userId);
        if (subGoals && subGoals.length > 0) {
          // サブ目標の状態から進捗率を計算
          progressPercentage = subGoalRepository.calculateProgressFromSubGoals(subGoals);
        }
      } catch (error) {
        logger.debug('サブ目標取得エラー（進捗率計算をスキップ）:', error);
        // エラー時はデフォルト値（90%）を使用
      }
    }
    
    // is_completedカラムが存在する場合のみ追加
    if (supportsIsCompleted) {
      updateData.is_completed = false;
    }
    
    // completed_atカラムをnullに設定（エラー時は除外）
    updateData.completed_at = null;
    
    // 進捗率を設定（サブ目標がある場合は再計算した値、ない場合は90%）
    updateData.progress_percentage = progressPercentage;
    
    let { error } = await supabase
      .from('goals')
      .update(updateData)
      .eq('id', goalId)
      .eq('user_id', userId);

    if (error) {
      const isCompletedError = (error.code === 'PGRST204' || error.code === '42703') && 
                                (error.message?.includes('is_completed') || error.message?.includes('completed_at'));
      
      if (isCompletedError) {
        // is_completedまたはcompleted_atカラムが存在しない場合、除外して再試行
        const retryData: any = { progress_percentage: progressPercentage };
        
        // completed_atのエラーの場合、除外
        if (error.message?.includes('completed_at')) {
          // completed_atは除外（既にretryDataには含まれていない）
        }
        
        // is_completedのエラーの場合、除外
        if (error.message?.includes('is_completed')) {
          // is_completedは除外（既にretryDataには含まれていない）
        }
        
        const { error: retryError } = await supabase
          .from('goals')
          .update(retryData)
          .eq('id', goalId)
          .eq('user_id', userId);
        
        if (retryError) {
          throw retryError;
        }
      } else {
        throw error;
      }
    }

    // カレンダー更新イベントを発火
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('calendarGoalUpdated'));
    }
  },

  /**
   * 目標を削除
   */
  async deleteGoal(goalId: string, userId: string): Promise<void> {
    logger.debug('[goalRepository] deleteGoal called:', { goalId, userId });
    
    const { data, error } = await supabase
      .from('goals')
      .delete()
      .eq('id', goalId)
      .eq('user_id', userId)
      .select();
    
    if (error) {
      logger.error('[goalRepository] deleteGoal error:', error);
      console.error('[goalRepository] deleteGoal error:', error);
      throw error;
    }
    
    logger.debug('[goalRepository] deleteGoal success:', { goalId, deletedCount: data?.length || 0 });
  },

  /**
   * 目標のカレンダー表示を更新（DBのみ使用）
   * show=trueの場合、同じ楽器の他の目標は自動的にfalseになる（各楽器で1つだけ表示）
   */
  async updateShowOnCalendar(
    goalId: string, 
    show: boolean, 
    userId: string,
    instrumentId?: string | null
  ): Promise<void> {
    // カラム存在チェック
    let isSupported = supportsShowOnCalendar;
    if (isSupported === null) {
      isSupported = await checkShowOnCalendarSupport();
    }
    
    if (!isSupported) {
      // カラムが存在しない場合は機能を無効化（何もしない）
      return;
    }

    // show=trueの場合、同じ楽器の他の目標をfalseにする（各楽器で1つだけ表示）
    if (show && supportsInstrumentId) {
      // 目標情報を取得してinstrument_idを確認（instrumentIdが指定されていない場合）
      let targetInstrumentId = instrumentId;
      if (targetInstrumentId === undefined) {
        const { data: goalData } = await supabase
          .from('goals')
          .select('instrument_id')
          .eq('id', goalId)
          .eq('user_id', userId)
          .single();
        
        targetInstrumentId = goalData?.instrument_id ?? null;
      }

      // 同じ楽器の他の目標をfalseにする
      let otherGoalsQuery = supabase
        .from('goals')
        .update({ show_on_calendar: false })
        .eq('user_id', userId)
        .neq('id', goalId);
      
      if (targetInstrumentId === null) {
        otherGoalsQuery = otherGoalsQuery.is('instrument_id', null);
      } else {
        otherGoalsQuery = otherGoalsQuery.eq('instrument_id', targetInstrumentId);
      }
      
      const { error: otherGoalsError } = await otherGoalsQuery;
      if (otherGoalsError) {
        // エラーはログに記録するが、続行する（主な更新処理に影響させない）
        logger.debug('[goalRepository.updateShowOnCalendar] 同じ楽器の他の目標の更新エラー（続行）:', otherGoalsError);
      }
    }

    // データベースを更新
    const { error } = await supabase
      .from('goals')
      .update({ show_on_calendar: show })
      .eq('id', goalId)
      .eq('user_id', userId);
    
    if (error) {
      // show_on_calendarカラムが存在しない場合のエラーを検出
      const isShowOnCalendarError = 
        error.code === 'PGRST204' || 
        error.code === '42703' || 
        error.status === 400 ||
        error.message?.includes('show_on_calendar') ||
        error.message?.includes('column') ||
        error.message?.includes('Could not find') ||
        error.message?.includes('schema cache');
      
      if (isShowOnCalendarError) {
        // カラムが存在しない場合は機能を無効化（エラーをthrowしない）
        supportsShowOnCalendar = false;
        return;
      }
      
      // その他のエラーはthrow
      throw error;
    }
  },

  /**
   * 達成された目標の代わりに、同じ楽器の次の目標を取得（カレンダー表示用）
   */
  async getNextGoalForCalendar(
    userId: string,
    instrumentId: string | null,
    excludeGoalId: string
  ): Promise<string | null> {
    try {
      let query = supabase
        .from('goals')
        .select('id')
        .eq('user_id', userId)
        .in('goal_type', ['personal_short', 'personal_long'])
        .neq('id', excludeGoalId)
        .eq('is_completed', false)
        .neq('progress_percentage', 100)
        .eq('show_on_calendar', false); // まだカレンダーに表示されていない目標
      
      // 楽器IDでフィルタリング
      if (instrumentId) {
        query = query.eq('instrument_id', instrumentId);
      } else {
        query = query.is('instrument_id', null);
      }
      
      const { data: goals, error } = await query
        .order('created_at', { ascending: true })
        .limit(1);
      
      if (error) {
        // エラーは無視（次の目標の自動表示は補助的な機能のため）
        logger.debug('[goalRepository.getNextGoalForCalendar] エラー（無視）:', error);
        return null;
      }
      
      if (goals && goals.length > 0) {
        return goals[0].id;
      }
      
      return null;
    } catch (error) {
      // エラーは無視（次の目標の自動表示は補助的な機能のため）
      logger.debug('[goalRepository.getNextGoalForCalendar] 例外（無視）:', error);
      return null;
    }
  },
};

export default goalRepository;

