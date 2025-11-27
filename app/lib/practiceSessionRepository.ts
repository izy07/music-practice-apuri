/**
 * 練習セッション関連のリポジトリ
 * Supabaseへの直接アクセスを抽象化
 */
import { supabase } from '@/lib/supabase';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';

/**
 * 指定日の練習記録を取得
 * @param userId ユーザーID
 * @param practiceDate 練習日（YYYY-MM-DD形式）
 * @param instrumentId 楽器ID（オプション）
 * @returns 練習記録の配列
 */
export async function getPracticeSessionsByDate(
  userId: string,
  practiceDate: string,
  instrumentId?: string | null
) {
  try {
    let query = supabase
      .from('practice_sessions')
      .select('id, duration_minutes, content')
      .eq('user_id', userId)
      .eq('practice_date', practiceDate);
    
    if (instrumentId) {
      query = query.eq('instrument_id', instrumentId);
    } else {
      query = query.is('instrument_id', null);
    }
    
    const { data, error } = await query;
    
    if (error) {
      ErrorHandler.handle(error, '練習記録取得', false);
      return [];
    }
    
    return data || [];
  } catch (error) {
    ErrorHandler.handle(error, '練習記録取得', false);
    return [];
  }
}

/**
 * 練習記録を更新
 * @param sessionId セッションID
 * @param updates 更新するフィールド
 * @returns 更新成功時true、失敗時false
 */
export async function updatePracticeSession(
  sessionId: string,
  updates: Record<string, unknown>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('practice_sessions')
      .update(updates)
      .eq('id', sessionId);
    
    if (error) {
      ErrorHandler.handle(error, '練習記録更新', false);
      return false;
    }
    
    return true;
  } catch (error) {
    ErrorHandler.handle(error, '練習記録更新', false);
    return false;
  }
}

/**
 * 練習記録を作成
 * @param sessionData 練習セッションデータ
 * @returns 作成成功時true、失敗時false
 */
export async function createPracticeSession(
  sessionData: {
    user_id: string;
    practice_date: string;
    duration_minutes: number;
    content?: string | null;
    input_method: 'manual' | 'preset' | 'voice';
    instrument_id?: string | null;
  }
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('practice_sessions')
      .insert(sessionData);
    
    if (error) {
      ErrorHandler.handle(error, '練習記録作成', false);
      return false;
    }
    
    return true;
  } catch (error) {
    ErrorHandler.handle(error, '練習記録作成', false);
    return false;
  }
}

