/**
 * 練習セッションリポジトリ
 * practice_sessionsテーブルへのアクセスを集約
 */

import { supabase } from '@/lib/supabase';
import { formatLocalDate } from '@/lib/dateUtils';
import logger from '@/lib/logger';
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
      // エラーをそのまま返す
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error) {
    // エラーをそのまま返す
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
    // input_methodを確実に検証（型安全な方法）
    const validInputMethods = ['manual', 'preset', 'voice', 'timer'] as const;
    type ValidInputMethod = typeof validInputMethods[number];
    
    // TypeScriptの型システムに依存
    const validatedInputMethod: ValidInputMethod = (session.input_method && validInputMethods.includes(session.input_method as ValidInputMethod))
      ? (session.input_method as ValidInputMethod)
      : 'manual';
    
    // 型安全なペイロードを作成
    const insertPayload: {
      user_id: string;
      practice_date: string;
      duration_minutes: number;
      input_method: ValidInputMethod;
      created_at: string;
      instrument_id?: string | null;
      content?: string | null;
      audio_url?: string | null;
    } = {
      user_id: session.user_id,
      practice_date: session.practice_date,
      duration_minutes: session.duration_minutes,
      input_method: validatedInputMethod, // 型安全な値
      created_at: new Date().toISOString(),
    };
    
    // オプショナルなプロパティを追加
    if (session.instrument_id !== undefined) {
      insertPayload.instrument_id = session.instrument_id;
    }
    if (session.content !== undefined) {
      insertPayload.content = session.content;
    }
    if (session.audio_url !== undefined) {
      insertPayload.audio_url = session.audio_url;
    }
    
    // デバッグログ: 実際に送信される値を確認
    logger.debug(`[${REPOSITORY_CONTEXT}] createPracticeSession:insertPayload`, {
      input_method: insertPayload.input_method,
      input_method_type: typeof insertPayload.input_method,
      input_method_in_valid_list: validInputMethods.includes(insertPayload.input_method),
      full_payload: JSON.stringify(insertPayload)
    });
    
    const { data, error } = await supabase
      .from('practice_sessions')
      .insert(insertPayload)
      .select()
      .single();
    
    if (error) {
      // ErrorHandler.handle(error, `${REPOSITORY_CONTEXT}:createPracticeSession`, false);
      logger.error(`[${REPOSITORY_CONTEXT}] createPracticeSession:error`, {
        error,
        error_code: error.code,
        error_message: error.message,
        insertPayload: {
          ...insertPayload,
          input_method: insertPayload.input_method,
          input_method_type: typeof insertPayload.input_method,
          input_method_in_valid_list: validInputMethods.includes(insertPayload.input_method)
        },
        original_session_input_method: session.input_method,
        validatedInputMethod: validatedInputMethod
      });
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error) {
    // ErrorHandler.handle(error, `${REPOSITORY_CONTEXT}:createPracticeSession:exception`, false);
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
    // updated_atカラムが存在しない可能性があるため、payloadから除外
    const { updated_at, ...updatesWithoutTimestamp } = updates;
    
    // input_methodが含まれている場合は、許可された値かチェック（型安全な方法）
    if ('input_method' in updatesWithoutTimestamp && updatesWithoutTimestamp.input_method !== undefined) {
      const validInputMethods = ['manual', 'preset', 'voice', 'timer'] as const;
      type ValidInputMethod = typeof validInputMethods[number];
      
      const validateInputMethod = (value: unknown): ValidInputMethod => {
        if (typeof value === 'string' && validInputMethods.includes(value as ValidInputMethod)) {
          return value as ValidInputMethod;
        }
        logger.warn(`[${REPOSITORY_CONTEXT}] updatePracticeSession:invalid input_method, using 'manual'`, {
          receivedValue: value,
          receivedType: typeof value,
          validValues: validInputMethods
        });
        return 'manual';
      };
      
      // TypeScriptの型システムに依存
      if (updatesWithoutTimestamp.input_method) {
        updatesWithoutTimestamp.input_method = (validInputMethods.includes(updatesWithoutTimestamp.input_method as ValidInputMethod))
          ? (updatesWithoutTimestamp.input_method as ValidInputMethod)
          : 'manual';
      }
    }
    
    const payload = {
      ...updatesWithoutTimestamp,
    };
    
    const { data, error } = await supabase
      .from('practice_sessions')
      .update(payload)
      .eq('id', sessionId)
      .select()
      .single();
    
    if (error) {
      // updated_atカラムが存在しないエラーの場合は、payloadから除外して再試行
      if (error.code === 'PGRST204' && error.message?.includes('updated_at')) {
        logger.warn(`[${REPOSITORY_CONTEXT}] updatePracticeSession:updated_at column not found, retrying without it`);
        const { data: retryData, error: retryError } = await supabase
          .from('practice_sessions')
          .update(updatesWithoutTimestamp)
          .eq('id', sessionId)
          .select()
          .single();
        
        if (retryError) {
          // ErrorHandler.handle(retryError, `${REPOSITORY_CONTEXT}:updatePracticeSession`, false);
          return { data: null, error: retryError };
        }
        
        return { data: retryData, error: null };
      }
      
      // ErrorHandler.handle(error, `${REPOSITORY_CONTEXT}:updatePracticeSession`, false);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error) {
    // ErrorHandler.handle(error, `${REPOSITORY_CONTEXT}:updatePracticeSession:exception`, false);
    return { data: null, error: error as SupabaseError };
  }
};

/**
 * 複数の練習セッションを削除
 */
/**
 * 練習セッションを削除（リトライ機能付き）
 */
export const deletePracticeSessions = async (
  sessionIds: string[],
  instrumentId?: string | null,
  options: {
    maxRetries?: number;
    baseDelay?: number;
  } = {}
): Promise<{ error: SupabaseError; retryCount?: number }> => {
  const { maxRetries = 3, baseDelay = 200 } = options;
  let retryCount = 0;
  let lastError: SupabaseError = null;

  while (retryCount < maxRetries) {
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
      
      if (!error) {
        if (retryCount > 0) {
          logger.debug(`[${REPOSITORY_CONTEXT}] deletePracticeSessions:succeeded-after-retry`, {
            retryCount,
            sessionIds
          });
        }
        return { error: null, retryCount };
      }

      lastError = error;
      
      // リトライ不可なエラーの場合は即座に終了
      const isNonRetryableError = error.code === 'PGRST205' || // テーブル不存在
                                   error.code === 'PGRST116' || // レコード不存在
                                   error.code === '23503' ||   // 外部キー制約違反
                                   error.code === '23505';     // 一意制約違反
      
      if (isNonRetryableError) {
        logger.warn(`[${REPOSITORY_CONTEXT}] deletePracticeSessions:non-retryable-error`, {
          error,
          sessionIds
        });
        // ErrorHandler.handle(error, `${REPOSITORY_CONTEXT}:deletePracticeSessions`, false);
        return { error, retryCount };
      }

      // リトライ可能なエラーの場合
      retryCount++;
      if (retryCount < maxRetries) {
        // 指数バックオフ: 200ms, 400ms, 800ms
        const delay = baseDelay * Math.pow(2, retryCount - 1);
        logger.debug(`[${REPOSITORY_CONTEXT}] deletePracticeSessions:retrying`, {
          retryCount,
          maxRetries,
          delay,
          error: error.message
        });
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    } catch (error) {
      lastError = error as SupabaseError;
      retryCount++;
      
      if (retryCount < maxRetries) {
        const delay = baseDelay * Math.pow(2, retryCount - 1);
        logger.debug(`[${REPOSITORY_CONTEXT}] deletePracticeSessions:exception-retrying`, {
          retryCount,
          maxRetries,
          delay,
          error: error instanceof Error ? error.message : String(error)
        });
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    }
  }

  // リトライ上限に達した場合
  logger.error(`[${REPOSITORY_CONTEXT}] deletePracticeSessions:failed-after-retries`, {
    retryCount,
    maxRetries,
    sessionIds,
    error: lastError
  });
  // ErrorHandler.handle(lastError, `${REPOSITORY_CONTEXT}:deletePracticeSessions:exception`, false);
  return { error: lastError, retryCount };
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
    practiceDate?: string; // 練習日付（指定がない場合は今日）
  } = {}
): Promise<{ success: boolean; error?: SupabaseError }> => {
  try {
    const {
      instrumentId = null,
      content = '練習記録',
      inputMethod: rawInputMethod,
      existingContentPrefix = '練習記録',
      practiceDate
    } = options;
    
    // 練習日付が指定されていない場合は今日の日付を使用
    const targetDate = practiceDate || formatLocalDate(new Date());
    
    // inputMethodを確実に検証（型安全な方法）
    const validInputMethods = ['manual', 'preset', 'voice', 'timer'] as const;
    type ValidInputMethod = typeof validInputMethods[number];
    
    // TypeScriptの型システムに依存
    const inputMethod: ValidInputMethod = (rawInputMethod && validInputMethods.includes(rawInputMethod as ValidInputMethod))
      ? (rawInputMethod as ValidInputMethod)
      : 'manual';
    
    // 指定された日付の既存の練習記録を取得
    let query = supabase
      .from('practice_sessions')
      .select('id, duration_minutes, input_method, content, instrument_id')
      .eq('user_id', userId)
      .eq('practice_date', targetDate);
    
    if (instrumentId) {
      query = query.eq('instrument_id', instrumentId);
    } else {
      query = query.is('instrument_id', null);
    }
    
    const { data: existingRecords, error: fetchError } = await query.order('created_at', { ascending: true });
    
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
      
      // inputMethodは既に検証済みの値を使用（型安全）
      const updateData: Partial<PracticeSession> = {
        duration_minutes: totalMinutes,
        content: updateContent,
        instrument_id: instrumentId || null,
        input_method: inputMethod, // 既に検証済みの値を使用
      };
      
      logger.debug(`[${REPOSITORY_CONTEXT}] savePracticeSessionWithIntegration:updating session`, {
        input_method: updateData.input_method,
        session_id: existing.id
      });
      
      const { error: updateError } = await updatePracticeSession(existing.id!, updateData);
      
      if (updateError) {
        // ErrorHandler.handle(updateError, `${REPOSITORY_CONTEXT}:savePracticeSessionWithIntegration:update`, false);
        return { success: false, error: updateError };
      }
      
      // 他の記録を削除（統合のため）
      // 注意: 削除に失敗しても統合保存は成功しているため、警告として扱う
      // ただし、データ整合性を保つため、削除処理は重要
      if (existingRecords.length > 1) {
        const otherRecordIds = existingRecords.slice(1).map(record => record.id!).filter(Boolean);
        if (otherRecordIds.length > 0) {
          logger.debug(`[${REPOSITORY_CONTEXT}] savePracticeSessionWithIntegration:deleting-duplicate-records`, {
            count: otherRecordIds.length,
            ids: otherRecordIds
          });
          
          // リトライ機能付きで削除を実行
          const { error: deleteError, retryCount: deleteRetryCount } = await deletePracticeSessions(
            otherRecordIds, 
            instrumentId,
            {
              maxRetries: 3,
              baseDelay: 200
            }
          );
          
          if (deleteError) {
            // 削除エラーは警告として記録（統合保存は成功しているため、処理は続行）
            // ただし、データ整合性の問題が発生する可能性があるため、詳細を記録
            logger.warn(`[${REPOSITORY_CONTEXT}] savePracticeSessionWithIntegration:delete-error`, {
              error: deleteError,
              deletedCount: 0,
              failedIds: otherRecordIds,
              retryCount: deleteRetryCount,
              message: '統合保存は成功しましたが、重複記録の削除に失敗しました。データ整合性に問題が発生する可能性があります。'
            });
            // ErrorHandler.handle(deleteError, `${REPOSITORY_CONTEXT}:savePracticeSessionWithIntegration:delete-duplicates`, false);
          } else {
            logger.debug(`[${REPOSITORY_CONTEXT}] savePracticeSessionWithIntegration:deleted-duplicate-records`, {
              count: otherRecordIds.length,
              retryCount: deleteRetryCount || 0
            });
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
      // inputMethodは既に検証済みの値を使用（型安全）
      const sessionData: Omit<PracticeSession, 'id' | 'created_at' | 'updated_at'> = {
        user_id: userId,
        practice_date: targetDate, // 選択された日付を使用
        duration_minutes: minutes,
        content: content || null,
        input_method: inputMethod, // 既に検証済みの値を使用
        instrument_id: instrumentId || null,
      };
      
      logger.debug(`[${REPOSITORY_CONTEXT}] savePracticeSessionWithIntegration:creating session`, {
        input_method: sessionData.input_method,
        input_method_type: typeof sessionData.input_method,
        input_method_in_valid_list: validInputMethods.includes(sessionData.input_method),
        validatedInputMethod: inputMethod,
        user_id: sessionData.user_id,
        practice_date: sessionData.practice_date
      });
      
      const { error: insertError } = await createPracticeSession(sessionData);
      
      if (insertError) {
        // ErrorHandler.handle(insertError, `${REPOSITORY_CONTEXT}:savePracticeSessionWithIntegration:insert`, false);
        return { success: false, error: insertError };
      }
      
      logger.debug(`[${REPOSITORY_CONTEXT}] savePracticeSessionWithIntegration:created`, { minutes });
      return { success: true };
    }
  } catch (error) {
    // ErrorHandler.handle(error, `${REPOSITORY_CONTEXT}:savePracticeSessionWithIntegration:exception`, false);
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
      // ErrorHandler.handle(error, `${REPOSITORY_CONTEXT}:getPracticeSessionsByDateRange`, false);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error) {
    // ErrorHandler.handle(error, `${REPOSITORY_CONTEXT}:getPracticeSessionsByDateRange:exception`, false);
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
      // ErrorHandler.handle(error, `${REPOSITORY_CONTEXT}:getPracticeSessionsByDate`, false);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error) {
    // ErrorHandler.handle(error, `${REPOSITORY_CONTEXT}:getPracticeSessionsByDate:exception`, false);
    return { data: null, error: error as SupabaseError };
  }
};

