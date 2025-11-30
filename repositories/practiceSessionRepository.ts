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
    // input_methodを確実に検証
    const validInputMethods: ('manual' | 'preset' | 'voice' | 'timer')[] = ['manual', 'preset', 'voice', 'timer'];
    const rawInputMethod = session.input_method;
    let validatedInputMethod: 'manual' | 'preset' | 'voice' | 'timer' = 'manual';
    
    // より厳密な検証（大文字小文字を保持）
    if (rawInputMethod && typeof rawInputMethod === 'string' && rawInputMethod.trim() !== '') {
      const trimmedValue = rawInputMethod.trim();
      if (validInputMethods.includes(trimmedValue as any)) {
        validatedInputMethod = trimmedValue as 'manual' | 'preset' | 'voice' | 'timer';
      } else {
        logger.warn(`[${REPOSITORY_CONTEXT}] createPracticeSession:invalid input_method, using 'manual'`, {
          receivedValue: rawInputMethod,
          receivedType: typeof rawInputMethod,
          trimmedValue: trimmedValue,
          validValues: validInputMethods
        });
      }
    } else {
      logger.warn(`[${REPOSITORY_CONTEXT}] createPracticeSession:input_method is falsy/empty, using 'manual'`, {
        receivedValue: rawInputMethod,
        receivedType: typeof rawInputMethod
      });
    }
    
    // 最終的な検証（二重チェック）
    if (!validInputMethods.includes(validatedInputMethod)) {
      logger.error(`[${REPOSITORY_CONTEXT}] createPracticeSession:validatedInputMethod is still invalid, forcing 'manual'`, {
        validatedInputMethod,
        validatedInputMethodType: typeof validatedInputMethod,
        validValues: validInputMethods
      });
      validatedInputMethod = 'manual';
    }
    
    // 最終検証：payload作成直前に再度確認
    const finalInputMethod: 'manual' | 'preset' | 'voice' | 'timer' = 
      validInputMethods.includes(validatedInputMethod) ? validatedInputMethod : 'manual';
    
    if (finalInputMethod !== validatedInputMethod) {
      logger.error(`[${REPOSITORY_CONTEXT}] createPracticeSession:finalInputMethod differs from validatedInputMethod`, {
        validatedInputMethod,
        finalInputMethod
      });
    }
    
    // 必要なプロパティのみを明示的に抽出（スプレッド演算子を使わない）
    // 型を明示的に定義して、確実に正しい値が送信されるようにする
    const payload: {
      user_id: string;
      practice_date: string;
      duration_minutes: number;
      input_method: 'manual' | 'preset' | 'voice' | 'timer';
      created_at: string;
      instrument_id?: string | null;
      content?: string | null;
      audio_url?: string | null;
    } = {
      user_id: session.user_id,
      practice_date: session.practice_date,
      duration_minutes: session.duration_minutes,
      input_method: finalInputMethod,
      created_at: new Date().toISOString(),
    };
    
    // オプショナルなプロパティを追加（nullやundefinedは送信しない）
    if (session.instrument_id !== undefined && session.instrument_id !== null) {
      payload.instrument_id = session.instrument_id;
    } else if (session.instrument_id === null) {
      payload.instrument_id = null;
    }
    if (session.content !== undefined && session.content !== null) {
      payload.content = session.content;
    } else if (session.content === null) {
      payload.content = null;
    }
    if (session.audio_url !== undefined && session.audio_url !== null) {
      payload.audio_url = session.audio_url;
    } else if (session.audio_url === null) {
      payload.audio_url = null;
    }
    
    // デバッグログ: 実際に送信されるinput_methodの値を確認
    logger.debug(`[${REPOSITORY_CONTEXT}] createPracticeSession:payload`, {
      rawInputMethod: rawInputMethod,
      validatedInputMethod: validatedInputMethod,
      finalInputMethod: finalInputMethod,
      payload_input_method: payload.input_method,
      payload_input_method_type: typeof payload.input_method,
      payload_input_method_in_valid_list: validInputMethods.includes(payload.input_method),
      user_id: payload.user_id,
      practice_date: payload.practice_date,
      duration_minutes: payload.duration_minutes,
      full_payload: JSON.stringify(payload)
    });
    
    // Supabaseに送信する直前に、payloadを完全に再構築してinput_methodを確実に設定
    const insertPayload: Record<string, any> = {
      user_id: payload.user_id,
      practice_date: payload.practice_date,
      duration_minutes: payload.duration_minutes,
      input_method: finalInputMethod, // 確実に検証済みの値を使用
      created_at: payload.created_at,
    };
    
    // オプショナルなプロパティを追加
    if (payload.instrument_id !== undefined) {
      insertPayload.instrument_id = payload.instrument_id;
    }
    if (payload.content !== undefined) {
      insertPayload.content = payload.content;
    }
    if (payload.audio_url !== undefined) {
      insertPayload.audio_url = payload.audio_url;
    }
    
    // 最終検証：insertPayloadのinput_methodが確実に正しい値であることを確認
    if (!validInputMethods.includes(insertPayload.input_method)) {
      logger.error(`[${REPOSITORY_CONTEXT}] createPracticeSession:insertPayload.input_method is invalid, forcing 'manual'`, {
        insertPayload_input_method: insertPayload.input_method,
        insertPayload_input_method_type: typeof insertPayload.input_method,
        validValues: validInputMethods
      });
      insertPayload.input_method = 'manual';
    }
    
    logger.debug(`[${REPOSITORY_CONTEXT}] createPracticeSession:insertPayload`, {
      input_method: insertPayload.input_method,
      input_method_type: typeof insertPayload.input_method,
      input_method_in_valid_list: validInputMethods.includes(insertPayload.input_method),
      full_insert_payload: JSON.stringify(insertPayload)
    });
    
    const { data, error } = await supabase
      .from('practice_sessions')
      .insert(insertPayload)
      .select()
      .single();
    
    if (error) {
      ErrorHandler.handle(error, `${REPOSITORY_CONTEXT}:createPracticeSession`, false);
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
        original_payload: {
          ...payload,
          input_method: payload.input_method
        },
        rawInputMethod: rawInputMethod,
        validatedInputMethod: validatedInputMethod,
        finalInputMethod: finalInputMethod
      });
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
    // updated_atカラムが存在しない可能性があるため、payloadから除外
    const { updated_at, ...updatesWithoutTimestamp } = updates;
    
    // input_methodが含まれている場合は、許可された値かチェック
    if ('input_method' in updatesWithoutTimestamp && updatesWithoutTimestamp.input_method !== undefined) {
      const validInputMethods: ('manual' | 'preset' | 'voice' | 'timer')[] = ['manual', 'preset', 'voice', 'timer'];
      const rawInputMethod = updatesWithoutTimestamp.input_method;
      let validatedInputMethod: 'manual' | 'preset' | 'voice' | 'timer' = 'manual';
      
      // より厳密な検証
      if (rawInputMethod !== null && rawInputMethod !== undefined) {
        if (typeof rawInputMethod === 'string') {
          const trimmedValue = rawInputMethod.trim();
          if (trimmedValue && validInputMethods.includes(trimmedValue as any)) {
            validatedInputMethod = trimmedValue as 'manual' | 'preset' | 'voice' | 'timer';
          } else {
            logger.warn(`[${REPOSITORY_CONTEXT}] updatePracticeSession:invalid input_method string, using 'manual'`, {
              receivedValue: rawInputMethod,
              trimmedValue: trimmedValue,
              type: typeof rawInputMethod,
              validValues: validInputMethods
            });
          }
        } else {
          logger.warn(`[${REPOSITORY_CONTEXT}] updatePracticeSession:input_method is not a string, using 'manual'`, {
            receivedValue: rawInputMethod,
            type: typeof rawInputMethod
          });
        }
      } else {
        logger.warn(`[${REPOSITORY_CONTEXT}] updatePracticeSession:input_method is null/undefined, using 'manual'`, {
          receivedValue: rawInputMethod,
          type: typeof rawInputMethod
        });
      }
      
      // 最終検証
      if (!validInputMethods.includes(validatedInputMethod)) {
        logger.error(`[${REPOSITORY_CONTEXT}] updatePracticeSession:validatedInputMethod is still invalid, forcing 'manual'`, {
          validatedInputMethod,
          validatedInputMethodType: typeof validatedInputMethod,
          validValues: validInputMethods
        });
        validatedInputMethod = 'manual';
      }
      
      updatesWithoutTimestamp.input_method = validatedInputMethod;
      
      logger.debug(`[${REPOSITORY_CONTEXT}] updatePracticeSession:validated input_method`, {
        rawInputMethod,
        validatedInputMethod,
        input_method_type: typeof validatedInputMethod,
        input_method_in_valid_list: validInputMethods.includes(validatedInputMethod)
      });
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
          ErrorHandler.handle(retryError, `${REPOSITORY_CONTEXT}:updatePracticeSession`, false);
          return { data: null, error: retryError };
        }
        
        return { data: retryData, error: null };
      }
      
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
      inputMethod: rawInputMethod,
      existingContentPrefix = '練習記録'
    } = options;
    
    // inputMethodを確実に検証し、型をキャスト
    const validInputMethods: ('manual' | 'preset' | 'voice' | 'timer')[] = ['manual', 'preset', 'voice', 'timer'];
    let inputMethod: 'manual' | 'preset' | 'voice' | 'timer' = 'manual';
    
    // より厳密な検証
    if (rawInputMethod !== undefined && rawInputMethod !== null) {
      if (typeof rawInputMethod === 'string') {
        const trimmedValue = rawInputMethod.trim();
        if (trimmedValue && validInputMethods.includes(trimmedValue as any)) {
          inputMethod = trimmedValue as 'manual' | 'preset' | 'voice' | 'timer';
        } else {
          logger.warn(`[${REPOSITORY_CONTEXT}] savePracticeSessionWithIntegration:invalid inputMethod string, using 'manual'`, {
            receivedValue: rawInputMethod,
            trimmedValue: trimmedValue,
            type: typeof rawInputMethod,
            validValues: validInputMethods
          });
        }
      } else {
        logger.warn(`[${REPOSITORY_CONTEXT}] savePracticeSessionWithIntegration:inputMethod is not a string, using 'manual'`, {
          receivedValue: rawInputMethod,
          type: typeof rawInputMethod
        });
      }
    } else {
      logger.warn(`[${REPOSITORY_CONTEXT}] savePracticeSessionWithIntegration:inputMethod is undefined/null, using 'manual'`, {
        receivedValue: rawInputMethod,
        type: typeof rawInputMethod
      });
    }
    
    // 最終検証：確実に有効な値であることを確認
    if (!validInputMethods.includes(inputMethod)) {
      logger.error(`[${REPOSITORY_CONTEXT}] savePracticeSessionWithIntegration:inputMethod validation failed, forcing 'manual'`, {
        inputMethod,
        inputMethodType: typeof inputMethod,
        validValues: validInputMethods
      });
      inputMethod = 'manual';
    }
    
    // デバッグログ: 検証後のinputMethodの値を確認
    logger.debug(`[${REPOSITORY_CONTEXT}] savePracticeSessionWithIntegration:validated inputMethod`, {
      inputMethod,
      inputMethodType: typeof inputMethod,
      inputMethodInValidList: validInputMethods.includes(inputMethod),
      rawInputMethod,
      userId,
      minutes
    });
    
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
      
      // inputMethodを確実に検証済みの値を使用（型キャストは不要、既に検証済み）
      const updateData: Partial<PracticeSession> = {
        duration_minutes: totalMinutes,
        content: updateContent,
        instrument_id: instrumentId || null,
        input_method: inputMethod, // 既に検証済みの値を使用
      };
      
      // 最終確認：updateDataのinput_methodが有効であることを確認
      if (!validInputMethods.includes(updateData.input_method!)) {
        logger.error(`[${REPOSITORY_CONTEXT}] savePracticeSessionWithIntegration:updateData.input_method is invalid, forcing 'manual'`, {
          updateData_input_method: updateData.input_method,
          validatedInputMethod: inputMethod,
          validValues: validInputMethods
        });
        updateData.input_method = 'manual';
      }
      
      logger.debug(`[${REPOSITORY_CONTEXT}] savePracticeSessionWithIntegration:updating session`, {
        input_method: updateData.input_method,
        session_id: existing.id
      });
      
      const { error: updateError } = await updatePracticeSession(existing.id!, updateData);
      
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
      // inputMethodは既に検証済みの値を使用（型キャストは不要）
      const sessionData: Omit<PracticeSession, 'id' | 'created_at' | 'updated_at'> = {
        user_id: userId,
        practice_date: today,
        duration_minutes: minutes,
        content: content || null,
        input_method: inputMethod, // 既に検証済みの値を使用
        instrument_id: instrumentId || null,
      };
      
      // 最終確認：sessionDataのinput_methodが有効であることを確認
      if (!validInputMethods.includes(sessionData.input_method)) {
        logger.error(`[${REPOSITORY_CONTEXT}] savePracticeSessionWithIntegration:sessionData.input_method is invalid, forcing 'manual'`, {
          sessionData_input_method: sessionData.input_method,
          validatedInputMethod: inputMethod,
          validValues: validInputMethods
        });
        sessionData.input_method = 'manual';
      }
      
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

