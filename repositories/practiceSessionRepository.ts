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
    // instrument_idは常に設定（nullの場合も明示的に設定）
    // これにより、Supabaseに正しく保存される
    insertPayload.instrument_id = session.instrument_id ?? null;
    
    if (session.content !== undefined) {
      insertPayload.content = session.content;
    }
    if (session.audio_url !== undefined) {
      insertPayload.audio_url = session.audio_url;
    }
    
    // デバッグログ: 実際に送信される値を確認
    console.log('💾 createPracticeSession: instrument_id保存状況', {
      session_instrument_id: session.instrument_id,
      insertPayload_instrument_id: insertPayload.instrument_id,
      instrument_id_type: typeof insertPayload.instrument_id
    });
    logger.debug(`[${REPOSITORY_CONTEXT}] createPracticeSession:insertPayload`, {
      input_method: insertPayload.input_method,
      input_method_type: typeof insertPayload.input_method,
      input_method_in_valid_list: validInputMethods.includes(insertPayload.input_method),
      instrument_id: insertPayload.instrument_id,
      instrument_id_type: typeof insertPayload.instrument_id,
      full_payload: JSON.stringify(insertPayload)
    });
    
    const { data, error } = await supabase
      .from('practice_sessions')
      .insert(insertPayload)
      .select()
      .single();
    
    // 保存後のデータを確認
    if (data) {
      console.log('✅ createPracticeSession: 保存成功', {
        saved_instrument_id: data.instrument_id,
        requested_instrument_id: insertPayload.instrument_id,
        record_id: data.id
      });
      logger.debug(`[${REPOSITORY_CONTEXT}] createPracticeSession:saved`, {
        record_id: data.id,
        saved_instrument_id: data.instrument_id,
        requested_instrument_id: insertPayload.instrument_id
      });
    }
    
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
      // 基礎練（preset）と時間を加算する記録（manual, voice, timer）を分離
      const basicPracticeRecords = existingRecords.filter(record => record.input_method === 'preset');
      const timeRecords = existingRecords.filter(record => record.input_method !== 'preset');
      
      // 基礎練の記録は保持し、時間を加算する記録のみを統合
      if (timeRecords.length > 0) {
        // 時間を加算する記録がある場合
        const existing = timeRecords[0];
        // 時間を加算する記録の時間のみを合計（基礎練は除外）
        const existingTotalMinutes = timeRecords.reduce((sum, record) => sum + (record.duration_minutes || 0), 0);
        const totalMinutes = existingTotalMinutes + minutes;
        
        // 既存の記録を更新（すべての時間記録のcontentを結合）
        // すべての時間記録のcontentを結合（基礎練は除外）
        const allContents = timeRecords
          .map(record => cleanContentFromTimeDetails(record.content))
          .filter(content => content && content.trim() !== '')
          .concat([existingContentPrefix])
          .filter((content, index, arr) => arr.indexOf(content) === index); // 重複を除去
        
        const updateContent = allContents.length > 0 
          ? allContents.join(', ')
          : existingContentPrefix;
        
        // inputMethodは既に検証済みの値を使用（型安全）
        // instrument_idが指定されている場合は更新、nullの場合は既存の値を保持（既存がnullの場合はnullのまま）
        const updateData: Partial<PracticeSession> = {
          duration_minutes: totalMinutes,
          content: updateContent,
          instrument_id: instrumentId !== undefined ? instrumentId : existing.instrument_id, // 指定されていない場合は既存の値を保持
          input_method: inputMethod, // 既に検証済みの値を使用
        };
        
        console.log('💾 既存記録更新:', {
          existingInstrumentId: existing.instrument_id,
          newInstrumentId: instrumentId,
          updateInstrumentId: updateData.instrument_id
        });
        
        logger.debug(`[${REPOSITORY_CONTEXT}] savePracticeSessionWithIntegration:updating session`, {
          input_method: updateData.input_method,
          session_id: existing.id,
          preservingBasicPractice: basicPracticeRecords.length > 0
        });
        
        const { error: updateError } = await updatePracticeSession(existing.id!, updateData);
        
        if (updateError) {
          // ErrorHandler.handle(updateError, `${REPOSITORY_CONTEXT}:savePracticeSessionWithIntegration:update`, false);
          return { success: false, error: updateError };
        }
        
        // 他の時間を加算する記録を削除（統合のため）
        // 基礎練の記録は削除しない
        if (timeRecords.length > 1) {
          const otherRecordIds = timeRecords.slice(1).map(record => record.id!).filter(Boolean);
          if (otherRecordIds.length > 0) {
            logger.debug(`[${REPOSITORY_CONTEXT}] savePracticeSessionWithIntegration:deleting-duplicate-records`, {
              count: otherRecordIds.length,
              ids: otherRecordIds,
              preservingBasicPractice: basicPracticeRecords.length
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
          total: totalMinutes,
          preservedBasicPractice: basicPracticeRecords.length
        });
        
        return { success: true };
      } else {
        // 基礎練の記録のみがある場合、新しい時間記録を追加（基礎練は保持）
        // 基礎練の記録は保持し、新しい時間記録を別レコードとして作成
        const sessionData: Omit<PracticeSession, 'id' | 'created_at' | 'updated_at'> = {
          user_id: userId,
          practice_date: targetDate,
          duration_minutes: minutes,
          content: content || null,
          input_method: inputMethod,
          instrument_id: instrumentId || null,
        };
        
        logger.debug(`[${REPOSITORY_CONTEXT}] savePracticeSessionWithIntegration:creating-time-record-with-basic-practice`, {
          input_method: sessionData.input_method,
          preservedBasicPractice: basicPracticeRecords.length
        });
        
        const result = await createPracticeSession(sessionData);
        const insertError = result.error;
        
        if (insertError) {
          // ErrorHandler.handle(insertError, `${REPOSITORY_CONTEXT}:savePracticeSessionWithIntegration:insert`, false);
          return { success: false, error: insertError };
        }
        
        logger.debug(`[${REPOSITORY_CONTEXT}] savePracticeSessionWithIntegration:created-time-record`, { minutes });
        return { success: true };
      }
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
      
      console.log('💾 savePracticeSessionWithIntegration: 新規記録作成開始', {
        practice_date: targetDate,
        duration_minutes: minutes,
        input_method: inputMethod,
        instrumentId: instrumentId,
        instrumentId_type: typeof instrumentId,
        sessionDataInstrumentId: sessionData.instrument_id,
        sessionDataInstrumentId_type: typeof sessionData.instrument_id
      });
      logger.debug(`[${REPOSITORY_CONTEXT}] savePracticeSessionWithIntegration:creating session`, {
        input_method: sessionData.input_method,
        input_method_type: typeof sessionData.input_method,
        input_method_in_valid_list: validInputMethods.includes(sessionData.input_method),
        validatedInputMethod: inputMethod,
        user_id: sessionData.user_id,
        practice_date: sessionData.practice_date,
        instrumentId: sessionData.instrument_id,
        instrumentId_type: typeof sessionData.instrument_id
      });
      
      const result = await createPracticeSession(sessionData);
      const insertError = result.error;
      const newRecord = result.data;
      
      console.log('💾 savePracticeSessionWithIntegration: 新規記録作成結果', {
        success: !insertError,
        error: insertError?.message,
        recordId: newRecord?.id,
        savedInstrumentId: newRecord?.instrument_id,
        savedInstrumentId_type: typeof newRecord?.instrument_id,
        requestedInstrumentId: instrumentId,
        requestedInstrumentId_type: typeof instrumentId,
        match: newRecord?.instrument_id === instrumentId
      });
      
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
    } else {
      query = query.is('instrument_id', null);
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

