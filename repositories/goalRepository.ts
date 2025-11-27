/**
 * 目標（goals）関連のリポジトリ
 */
import { supabase } from '@/lib/supabase';
import { Goal } from '@/app/(tabs)/goals/types';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';

// セッションで show_on_calendar カラムの対応可否を保持
let supportsShowOnCalendar: boolean | null = null; // nullの場合は未チェック
let supportsInstrumentId = true; // instrument_idカラムの存在をキャッシュ
let supportsIsCompleted = true; // is_completedカラムの存在をキャッシュ

// show_on_calendarカラムの存在を確認する関数
const checkShowOnCalendarSupport = async (): Promise<boolean> => {
  if (supportsShowOnCalendar !== null) {
    return supportsShowOnCalendar;
  }

  try {
    // 実際にデータベースにクエリを送信してカラムの存在を確認
    const { error } = await supabase
      .from('goals')
      .select('show_on_calendar')
      .limit(1);

    if (error) {
      const isColumnError = 
        error.code === 'PGRST204' || 
        error.code === '42703' || 
        error.message?.includes('show_on_calendar') ||
        error.message?.includes('Could not find') ||
        error.message?.includes('schema cache');
      
      if (isColumnError) {
        supportsShowOnCalendar = false;
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('disable_show_on_calendar', '1');
        }
        return false;
      }
    }

    // エラーがない場合はカラムが存在する
    supportsShowOnCalendar = true;
    // フラグをクリア（カラムが存在する場合）
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('disable_show_on_calendar');
    }
    return true;
  } catch (error) {
    // エラーが発生した場合は、localStorageのフラグを確認
    try {
      if (typeof window !== 'undefined') {
        const flag = window.localStorage.getItem('disable_show_on_calendar');
        supportsShowOnCalendar = flag !== '1';
      } else {
        supportsShowOnCalendar = true; // デフォルトはtrue
      }
    } catch {
      supportsShowOnCalendar = true; // デフォルトはtrue
    }
    return supportsShowOnCalendar;
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
            
            // localStorageの選択IDを反映
            let filtered = goalsWithDefaults.filter((g: any) => !g.is_completed);
            try {
              if (typeof window !== 'undefined') {
                // 各目標のlocalStorageから状態を読み込む
                filtered = filtered.map((g: any) => {
                  const savedState = window.localStorage.getItem(`goal_show_calendar_${g.id}`);
                  if (savedState !== null) {
                    return {
                      ...g,
                      show_on_calendar: savedState === 'true',
                    };
                  }
                  // 旧形式のcalendar_goal_idもチェック（後方互換性のため）
                  const selectedId = window.localStorage.getItem('calendar_goal_id');
                  if (selectedId && g.id === selectedId) {
                    return {
                      ...g,
                      show_on_calendar: true,
                    };
                  }
                  return {
                    ...g,
                    show_on_calendar: false,
                  };
                });
              }
            } catch {}
            
            return filtered;
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
          const fallbackSelect = isShowOnCalendarSupported 
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
            
            // localStorageの選択IDを反映
            let filtered = goalsWithDefaults.filter((g: any) => !g.is_completed);
            try {
              if (typeof window !== 'undefined') {
                // 各目標のlocalStorageから状態を読み込む
                filtered = filtered.map((g: any) => {
                  const savedState = window.localStorage.getItem(`goal_show_calendar_${g.id}`);
                  if (savedState !== null) {
                    return {
                      ...g,
                      show_on_calendar: savedState === 'true',
                    };
                  }
                  // 旧形式のcalendar_goal_idもチェック（後方互換性のため）
                  const selectedId = window.localStorage.getItem('calendar_goal_id');
                  if (selectedId && g.id === selectedId) {
                    return {
                      ...g,
                      show_on_calendar: true,
                    };
                  }
                  return {
                    ...g,
                    show_on_calendar: false,
                  };
                });
              }
            } catch {}
            
            return filtered;
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
            
            // localStorageの選択IDを反映
            let filtered = goalsWithDefaults.filter((g: any) => !g.is_completed);
            try {
              if (typeof window !== 'undefined') {
                // 各目標のlocalStorageから状態を読み込む
                filtered = filtered.map((g: any) => {
                  const savedState = window.localStorage.getItem(`goal_show_calendar_${g.id}`);
                  if (savedState !== null) {
                    return {
                      ...g,
                      show_on_calendar: savedState === 'true',
                    };
                  }
                  // 旧形式のcalendar_goal_idもチェック（後方互換性のため）
                  const selectedId = window.localStorage.getItem('calendar_goal_id');
                  if (selectedId && g.id === selectedId) {
                    return {
                      ...g,
                      show_on_calendar: true,
                    };
                  }
                  return {
                    ...g,
                    show_on_calendar: false,
                  };
                });
              }
            } catch {}
            
            return filtered;
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
      
      let filtered = goalsWithDefaults.filter((g: any) => !g.is_completed);
      
      // カラム未対応モードではローカルの選択IDを反映
      if (!isSupported) {
        try {
          if (typeof window !== 'undefined') {
            // 各目標のlocalStorageから状態を読み込む
            filtered = filtered.map((g: any) => {
              const savedState = window.localStorage.getItem(`goal_show_calendar_${g.id}`);
              if (savedState !== null) {
                return {
                  ...g,
                  show_on_calendar: savedState === 'true',
                };
              }
              // 旧形式のcalendar_goal_idもチェック（後方互換性のため）
              const selectedId = window.localStorage.getItem('calendar_goal_id');
              if (selectedId && g.id === selectedId) {
                return {
                  ...g,
                  show_on_calendar: true,
                };
              }
              return {
                ...g,
                show_on_calendar: false,
              };
            });
          }
        } catch {}
      }
      
      return filtered;
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
          const fallbackSelect = isShowOnCalendarSupported 
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
      return goalsWithDefaults.filter((g: any) => g.is_completed === true);
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
        // instrument_idカラムのエラーの場合、フィルタリングなしで再試行
        if ((error.code === '400' || error.code === '42703') && error.message?.includes('instrument_id')) {
          supportsInstrumentId = false;
          try { 
            if (typeof window !== 'undefined') {
              window.localStorage.setItem('disable_instrument_id', '1');
            }
          } catch {}
          
          const { count: fallbackCount, error: fbErr } = await supabase
            .from('goals')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId);
          
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
    goal_type: 'personal_short' | 'personal_long' | 'group';
    instrument_id?: string | null;
  }): Promise<void> {
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

    let { error } = await supabase
      .from('goals')
      .insert(insertPayload);

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
        const { error: retryError } = await supabase
          .from('goals')
          .insert(insertData);
        
        if (retryError) {
          throw retryError;
        }
        return;
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
        
        const { error: retryError } = await supabase
          .from('goals')
          .insert(retryPayload);
        
        if (retryError) {
          // まだエラーが発生する場合は、show_on_calendarも除外
          if (retryError.message?.includes('show_on_calendar') && supportsShowOnCalendar) {
            supportsShowOnCalendar = false;
            try { 
              if (typeof window !== 'undefined') {
                window.localStorage.setItem('disable_show_on_calendar', '1');
              }
            } catch {}
            
            const { error: finalError } = await supabase
              .from('goals')
              .insert(retryData);
            
            if (finalError) {
              throw finalError;
            }
          } else {
            throw retryError;
          }
        }
        return;
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
        
        const { error: retryError } = await supabase
          .from('goals')
          .insert(retryPayload);
        
        if (retryError) {
          throw retryError;
        }
        return;
      }

      // その他のエラー
      throw error;
    }
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
   * 目標を削除
   */
  async deleteGoal(goalId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', goalId)
      .eq('user_id', userId);
    
    if (error) {
      throw error;
    }
  },

  /**
   * 目標のカレンダー表示を更新
   */
  async updateShowOnCalendar(goalId: string, show: boolean, userId: string): Promise<void> {
    // カラムの存在を確認（初回のみ）
    const isSupported = await checkShowOnCalendarSupport();
    
    if (!isSupported) {
      // カラム未対応の場合はlocalStorageに保存
      try {
        if (typeof window !== 'undefined') {
          if (show) {
            window.localStorage.setItem('calendar_goal_id', goalId);
          } else {
            window.localStorage.removeItem('calendar_goal_id');
          }
          // 個別の目標の状態も保存
          window.localStorage.setItem(`goal_show_calendar_${goalId}`, String(show));
        }
      } catch {}
      return;
    }

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
        error.message?.includes('show_on_calendar') ||
        error.message?.includes('column') ||
        error.message?.includes('Could not find') ||
        error.message?.includes('schema cache');
      
      if (isShowOnCalendarError) {
        // フラグを設定（次回以降はリクエストを送らない）
        supportsShowOnCalendar = false;
        try { 
          if (typeof window !== 'undefined') {
            window.localStorage.setItem('disable_show_on_calendar', '1');
            // 個別の目標の状態も保存
            window.localStorage.setItem(`goal_show_calendar_${goalId}`, String(show));
            if (show) {
              window.localStorage.setItem('calendar_goal_id', goalId);
            } else {
              window.localStorage.removeItem('calendar_goal_id');
            }
          }
        } catch {}
        // エラーをthrowしない（ローカル状態のみ更新）
        return;
      }
      
      // その他のエラーはthrow
      throw error;
    }

    // 成功時はlocalStorageにも保存
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(`goal_show_calendar_${goalId}`, String(show));
        if (show) {
          window.localStorage.setItem('calendar_goal_id', goalId);
        } else {
          window.localStorage.removeItem('calendar_goal_id');
        }
      }
    } catch {}

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('calendarGoalUpdated'));
    }
  },
};

export default goalRepository;

