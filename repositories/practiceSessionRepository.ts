/**
 * 練習セッションリポジトリ
 * practice_sessionsテーブルへのアクセスを集約
 */

import { supabase } from '@/lib/supabase';
import { formatLocalDate } from '@/lib/dateUtils';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import { cleanContentFromTimeDetails, appendToContent } from '@/lib/utils/contentCleaner';

const REPOSITORY_CONTEXT = 'practiceSessionRepository';

/**
 * Supabaseエラー型
 */
type SupabaseError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
} | null;

export interface PracticeSession {
  id?: string;
  user_id: string;
  instrument_id?: string | null;
  practice_date: string;
  duration_minutes: number;
  content?: string | null;
  audio_url?: string | null;
  input_method: 'manual' | 'preset' | 'voice' | 'timer';
  created_at?: string;
  updated_at?: string;
}

export interface PracticeSessionQuery {
  userId: string;
  practiceDate?: string;
  instrumentId?: string | null;
}

/**
 * 今日の練習セッションを取得（楽器IDでフィルタリング）
 */
export const getTodayPracticeSessions = async (
  userId: string,
  instrumentId?: string | null
): Promise<{ data: PracticeSession[] | null; error: SupabaseError }> => {
  try {
    const today = formatLocalDate(new Date());
    
    let query = supabase
      .from('practice_sessions')
      .select('id, duration_minutes, input_method, content, instrument_id')
      .eq('user_id', userId)
      .eq('practice_date', today);
    
    if (instrumentId) {
      query = query.eq('instrument_id', instrumentId);
    } else {
      query = query.is('instrument_id', null);
    }
    
    const { data, error } = await query.order('created_at', { ascending: true });
    
    // テーブルが存在しない場合のエラーハンドリング
    if (error && error.code === 'PGRST205') {
      logger.warn(`[${REPOSITORY_CONTEXT}] getTodayPracticeSessions:table-not-found`, { error });
      return { data: null, error };
    }
    
    if (error) {
      ErrorHandler.handle(error, `${REPOSITORY_CONTEXT}:getTodayPracticeSessions`, false);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error) {
    ErrorHandler.handle(error, `${REPOSITORY_CONTEXT}:getTodayPracticeSessions:exception`, false);
    return { data: null, error: error as SupabaseError };
  }
};

/**
 * 練習セッションを保存（新規作成）
 */
export const createPracticeSession = async (
  session: Omit<PracticeSession, 'id' | 'created_at' | 'updated_at'>
): Promise<{ data: PracticeSession | null; error: SupabaseError }> => {
  try {
    const payload = {
      ...session,
      created_at: new Date().toISOString(),
    };
    
    const { data, error } = await supabase
      .from('practice_sessions')
      .insert(payload)
      .select()
      .single();
    
    if (error) {
      ErrorHandler.handle(error, `${REPOSITORY_CONTEXT}:createPracticeSession`, false);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error) {
    ErrorHandler.handle(error, `${REPOSITORY_CONTEXT}:createPracticeSession:exception`, false);
    return { data: null, error: error as SupabaseError };
  }
};

/**
 * 練習セッションを更新
 */
export const updatePracticeSession = async (
  sessionId: string,
  updates: Partial<PracticeSession>
): Promise<{ data: PracticeSession | null; error: SupabaseError }> => {
  try {
    const payload = {
      ...updates,
      updated_at: new Date().toISOString(),
    };
    
    const { data, error } = await supabase
      .from('practice_sessions')
      .update(payload)
      .eq('id', sessionId)
      .select()
      .single();
    
    if (error) {
      ErrorHandler.handle(error, `${REPOSITORY_CONTEXT}:updatePracticeSession`, false);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error) {
    ErrorHandler.handle(error, `${REPOSITORY_CONTEXT}:updatePracticeSession:exception`, false);
    return { data: null, error: error as SupabaseError };
  }
};

/**
 * 複数の練習セッションを削除
 */
export const deletePracticeSessions = async (
  sessionIds: string[],
  instrumentId?: string | null
): Promise<{ error: SupabaseError }> => {
  try {
    let query = supabase
      .from('practice_sessions')
      .delete()
      .in('id', sessionIds);
    
    if (instrumentId) {
      query = query.eq('instrument_id', instrumentId);
    } else {
      query = query.is('instrument_id', null);
    }
    
    const { error } = await query;
    
    if (error) {
      ErrorHandler.handle(error, `${REPOSITORY_CONTEXT}:deletePracticeSessions`, false);
      return { error };
    }
    
    return { error: null };
  } catch (error) {
    ErrorHandler.handle(error, `${REPOSITORY_CONTEXT}:deletePracticeSessions:exception`, false);
    return { error: error as SupabaseError };
  }
};

/**
 * 練習セッションを統合保存（既存があれば更新、なければ新規作成）
 */
export const savePracticeSessionWithIntegration = async (
  userId: string,
  minutes: number,
  options: {
    instrumentId?: string | null;
    content?: string;
    inputMethod?: 'manual' | 'preset' | 'voice' | 'timer';
    existingContentPrefix?: string;
  } = {}
): Promise<{ success: boolean; error?: SupabaseError }> => {
  try {
    const today = formatLocalDate(new Date());
    const {
      instrumentId = null,
      content = '練習記録',
      inputMethod = 'manual',
      existingContentPrefix = '練習記録'
    } = options;
    
    // 今日の既存の練習記録を取得
    const { data: existingRecords, error: fetchError } = await getTodayPracticeSessions(userId, instrumentId);
    
    if (fetchError && fetchError.code === 'PGRST205') {
      logger.warn(`[${REPOSITORY_CONTEXT}] savePracticeSessionWithIntegration:table-not-found`);
      return { success: false, error: fetchError };
    }
    
    if (fetchError) {
      logger.error(`[${REPOSITORY_CONTEXT}] savePracticeSessionWithIntegration:fetch-error`, { error: fetchError });
      return { success: false, error: fetchError };
    }
    
    if (existingRecords && existingRecords.length > 0) {
      // 既存の記録がある場合は時間を加算して更新（統合）
      const existing = existingRecords[0];
      // 全ての既存記録の時間を合計
      const existingTotalMinutes = existingRecords.reduce((sum, record) => sum + (record.duration_minutes || 0), 0);
      const totalMinutes = existingTotalMinutes + minutes;
      
      // 既存の記録を更新（時間詳細は含めない）
      const updateContent = appendToContent(existing.content, existingContentPrefix);
      
      const { error: updateError } = await updatePracticeSession(existing.id!, {
        duration_minutes: totalMinutes,
        content: updateContent,
        instrument_id: instrumentId,
        input_method: inputMethod,
      });
      
      if (updateError) {
        ErrorHandler.handle(updateError, `${REPOSITORY_CONTEXT}:savePracticeSessionWithIntegration:update`, false);
        return { success: false, error: updateError };
      }
      
      // 他の記録を削除（統合のため）
      if (existingRecords.length > 1) {
        const otherRecordIds = existingRecords.slice(1).map(record => record.id!).filter(Boolean);
        if (otherRecordIds.length > 0) {
          const { error: deleteError } = await deletePracticeSessions(otherRecordIds, instrumentId);
          if (deleteError) {
            logger.warn(`[${REPOSITORY_CONTEXT}] savePracticeSessionWithIntegration:delete-error`, { error: deleteError });
            // 削除エラーは警告のみ（統合は成功している）
          }
        }
      }
      
      logger.debug(`[${REPOSITORY_CONTEXT}] savePracticeSessionWithIntegration:merged`, {
        existing: existingTotalMinutes,
        added: minutes,
        total: totalMinutes
      });
      
      return { success: true };
    } else {
      // 新規記録として挿入
      const { error: insertError } = await createPracticeSession({
        user_id: userId,
        practice_date: today,
        duration_minutes: minutes,
        content,
        input_method: inputMethod,
        instrument_id: instrumentId,
      });
      
      if (insertError) {
        ErrorHandler.handle(insertError, `${REPOSITORY_CONTEXT}:savePracticeSessionWithIntegration:insert`, false);
        return { success: false, error: insertError };
      }
      
      logger.debug(`[${REPOSITORY_CONTEXT}] savePracticeSessionWithIntegration:created`, { minutes });
      return { success: true };
    }
  } catch (error) {
    ErrorHandler.handle(error, `${REPOSITORY_CONTEXT}:savePracticeSessionWithIntegration:exception`, false);
    return { success: false, error: error as SupabaseError };
  }
};

/**
 * 期間指定で練習セッションを取得（統計用）
 */
export const getPracticeSessionsByDateRange = async (
  userId: string,
  startDate: string,
  endDate?: string,
  instrumentId?: string | null,
  limit: number = 1000
): Promise<{ data: PracticeSession[] | null; error: SupabaseError }> => {
  try {
    let query = supabase
      .from('practice_sessions')
      .select(`
        practice_date,
        duration_minutes,
        input_method,
        created_at
      `)
      .eq('user_id', userId)
      .gte('practice_date', startDate)
      .order('practice_date', { ascending: false })
      .limit(limit);
    
    if (endDate) {
      query = query.lte('practice_date', endDate);
    }
    
    if (instrumentId) {
      query = query.eq('instrument_id', instrumentId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      ErrorHandler.handle(error, `${REPOSITORY_CONTEXT}:getPracticeSessionsByDateRange`, false);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error) {
    ErrorHandler.handle(error, `${REPOSITORY_CONTEXT}:getPracticeSessionsByDateRange:exception`, false);
    return { data: null, error: error as SupabaseError };
  }
};

/**
 * 指定日の練習セッションを取得
 */
export const getPracticeSessionsByDate = async (
  userId: string,
  practiceDate: string,
  instrumentId?: string | null
): Promise<{ data: PracticeSession[] | null; error: SupabaseError }> => {
  try {
    let query = supabase
      .from('practice_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('practice_date', practiceDate);
    
    if (instrumentId) {
      query = query.eq('instrument_id', instrumentId);
    } else {
      query = query.is('instrument_id', null);
    }
    
    const { data, error } = await query.order('created_at', { ascending: true });
    
    if (error) {
      ErrorHandler.handle(error, `${REPOSITORY_CONTEXT}:getPracticeSessionsByDate`, false);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error) {
    ErrorHandler.handle(error, `${REPOSITORY_CONTEXT}:getPracticeSessionsByDate:exception`, false);
    return { data: null, error: error as SupabaseError };
  }
};

