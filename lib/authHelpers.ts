/**
 * 認証ヘルパー関数
 * 認証関連の共通処理を提供
 */

import { supabase } from './supabase';
import logger from './logger';

/**
 * Supabase認証エラーの型定義
 */
interface SupabaseAuthError {
  code?: string;
  status?: string;
  message?: string;
}

/**
 * エラーメッセージを取得
 */
export function getAuthErrorMessage(error: unknown): string {
  if (!error) return '認証エラーが発生しました';
  
  // エラーオブジェクトの型チェック
  const authError = error as SupabaseAuthError;
  const errorCode = authError.code || authError.status;
  const errorMessage = authError.message || String(error);
  
  // エラーコードに基づくメッセージ
  switch (errorCode) {
    case 'signup_disabled':
      return '新規登録は現在無効になっています';
    case 'email_not_confirmed':
      return 'メールアドレスの確認が必要です';
    case 'invalid_credentials':
    case 'invalid_grant':
      return 'メールアドレスまたはパスワードが正しくありません';
    case 'too_many_requests':
      return 'リクエストが多すぎます。しばらく待ってから再試行してください';
    case 'email_rate_limit_exceeded':
      return 'メール送信の上限に達しました。しばらく待ってから再試行してください';
    default:
      // エラーメッセージから日本語メッセージを抽出
      if (errorMessage.includes('User already registered') || errorMessage.includes('already exists')) {
        return 'このメールアドレスは既に登録されています';
      }
      if (errorMessage.includes('Password')) {
        return 'パスワードが正しくありません';
      }
      if (errorMessage.includes('Email')) {
        return 'メールアドレスが正しくありません';
      }
      return errorMessage || '認証エラーが発生しました';
  }
}

/**
 * リトライ機能付きログイン
 */
export async function signInWithRetry(
  email: string,
  password: string,
  maxRetries: number = 3
): Promise<{ success: boolean; error?: string }> {
  let lastError: unknown = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.debug('[signInWithRetry] ログイン試行:', { attempt, email });
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password,
      });
      
      if (error) {
        lastError = error;
        logger.warn('[signInWithRetry] ログインエラー:', { attempt, error: error.message });
        
        // リトライ不可なエラーの場合は即座に終了
        if (error.code === 'invalid_credentials' || error.code === 'email_not_confirmed') {
          return {
            success: false,
            error: getAuthErrorMessage(error),
          };
        }
        
        // 最後の試行でない場合は少し待ってからリトライ
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }
      }
      
      if (data?.user) {
        logger.info('[signInWithRetry] ログイン成功:', { attempt, email });
        return { success: true };
      }
      
      return {
        success: false,
        error: 'ログインに失敗しました',
      };
    } catch (error: unknown) {
      lastError = error;
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[signInWithRetry] ログイン例外:', { attempt, error: errorMessage });
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        continue;
      }
    }
  }
  
  return {
    success: false,
    error: getAuthErrorMessage(lastError) || 'ログインに失敗しました',
  };
}

/**
 * ユーザープロフィールを作成
 */
export async function createUserProfile(
  userId: string,
  displayName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    logger.debug('[createUserProfile] プロフィール作成開始:', { userId, displayName });
    
    const { data, error } = await supabase
      .from('user_profiles')
      .insert({
        user_id: userId,
        display_name: displayName,
        practice_level: 'beginner',
        total_practice_minutes: 0,
      })
      .select()
      .single();
    
    if (error) {
      // 既にプロフィールが存在する場合は成功として扱う
      if (error.code === '23505') { // unique_violation
        logger.debug('[createUserProfile] プロフィールは既に存在します:', { userId });
        return { success: true };
      }
      
      logger.error('[createUserProfile] プロフィール作成エラー:', { error: error.message });
      return {
        success: false,
        error: error.message || 'プロフィールの作成に失敗しました',
      };
    }
    
    logger.info('[createUserProfile] プロフィール作成成功:', { userId, profileId: data?.id });
    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('[createUserProfile] プロフィール作成例外:', { error: errorMessage });
    return {
      success: false,
      error: errorMessage || 'プロフィールの作成に失敗しました',
    };
  }
}
