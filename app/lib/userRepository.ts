/**
 * ユーザー関連のリポジトリ
 * Supabaseへの直接アクセスを抽象化
 */
import { supabase } from '@/lib/supabase';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';

/**
 * 現在ログインしているユーザーを取得
 * @returns ユーザーオブジェクト、未ログインの場合はnull
 */
export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      ErrorHandler.handle(error, 'ユーザー取得', false);
      return null;
    }
    
    return user;
  } catch (error) {
    ErrorHandler.handle(error, 'ユーザー取得', false);
    return null;
  }
}

/**
 * ユーザープロフィールを取得
 * @param userId ユーザーID
 * @returns プロフィールデータ、存在しない場合はnull
 */
export async function getUserProfile(userId: string) {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      ErrorHandler.handle(error, 'プロフィール取得', false);
      return null;
    }
    
    return data;
  } catch (error) {
    ErrorHandler.handle(error, 'プロフィール取得', false);
    return null;
  }
}

/**
 * ユーザープロフィールを更新
 * @param userId ユーザーID
 * @param updates 更新するフィールド
 * @returns 更新成功時true、失敗時false
 */
export async function updateUserProfile(
  userId: string,
  updates: Record<string, unknown>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('user_id', userId);
    
    if (error) {
      ErrorHandler.handle(error, 'プロフィール更新', false);
      return false;
    }
    
    return true;
  } catch (error) {
    ErrorHandler.handle(error, 'プロフィール更新', false);
    return false;
  }
}

/**
 * ユーザープロフィールの特定フィールドを取得
 * @param userId ユーザーID
 * @param fields 取得するフィールド（カンマ区切り）
 * @returns プロフィールデータ、存在しない場合はnull
 */
export async function getUserProfileFields(
  userId: string,
  fields: string
) {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select(fields)
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      ErrorHandler.handle(error, 'プロフィール取得', false);
      return null;
    }
    
    return data;
  } catch (error) {
    ErrorHandler.handle(error, 'プロフィール取得', false);
    return null;
  }
}

