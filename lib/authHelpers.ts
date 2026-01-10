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
 * エラーの種類を表す型
 */
export type AuthErrorType = 'network' | 'authentication' | 'validation' | 'rate_limit' | 'email_not_confirmed' | 'unknown';

/**
 * エラーの詳細情報
 */
export interface AuthErrorInfo {
  type: AuthErrorType;
  message: string;
  code?: string;
  userFriendlyMessage: string;
}

/**
 * エラーの種類を判定
 */
export function getAuthErrorType(error: unknown): AuthErrorType {
  if (!error) return 'unknown';
  
  const authError = error as SupabaseAuthError;
  const errorCode = authError.code || authError.status;
  const errorMessage = (authError.message || String(error)).toLowerCase();
  
  // ネットワークエラー
  if (
    errorMessage.includes('network') ||
    errorMessage.includes('fetch') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('failed to fetch') ||
    errorMessage.includes('networkerror') ||
    errorCode === 'NETWORK_ERROR' ||
    errorCode === 'ECONNREFUSED' ||
    errorCode === 'ETIMEDOUT'
  ) {
    return 'network';
  }
  
  // レート制限エラー
  if (
    errorCode === 'too_many_requests' ||
    errorCode === 'email_rate_limit_exceeded' ||
    errorMessage.includes('rate limit') ||
    errorMessage.includes('too many requests')
  ) {
    return 'rate_limit';
  }
  
  // メール未確認エラー
  if (
    errorCode === 'email_not_confirmed' ||
    errorMessage.includes('email not confirmed') ||
    errorMessage.includes('email verification')
  ) {
    return 'email_not_confirmed';
  }
  
  // 認証エラー（メールアドレス・パスワードの間違いなど）
  if (
    errorCode === 'invalid_credentials' ||
    errorCode === 'invalid_grant' ||
    errorCode === 'user_not_found' ||
    errorMessage.includes('invalid credentials') ||
    errorMessage.includes('invalid login') ||
    errorMessage.includes('user not found') ||
    errorMessage.includes('wrong password') ||
    errorMessage.includes('incorrect password') ||
    errorMessage.includes('authentication failed')
  ) {
    return 'authentication';
  }
  
  // バリデーションエラー
  if (
    errorCode === 'validation_error' ||
    errorMessage.includes('validation') ||
    errorMessage.includes('invalid email') ||
    errorMessage.includes('invalid password')
  ) {
    return 'validation';
  }
  
  return 'unknown';
}

/**
 * エラーの詳細情報を取得
 */
export function getAuthErrorInfo(error: unknown): AuthErrorInfo {
  // エラーが文字列の場合は、エラーメッセージから種別を判定
  if (typeof error === 'string') {
    const errorLower = error.toLowerCase();
    let type: AuthErrorType = 'unknown';
    
    if (errorLower.includes('ネットワーク') || errorLower.includes('接続') || errorLower.includes('fetch') || errorLower.includes('connection')) {
      type = 'network';
    } else if (errorLower.includes('メールアドレス') || errorLower.includes('パスワード') || errorLower.includes('認証') || errorLower.includes('credentials') || errorLower.includes('invalid')) {
      type = 'authentication';
    } else if (errorLower.includes('リクエスト') || errorLower.includes('上限') || errorLower.includes('rate limit')) {
      type = 'rate_limit';
    } else if (errorLower.includes('メール') && errorLower.includes('確認')) {
      type = 'email_not_confirmed';
    }
    
    return {
      type,
      message: error,
      userFriendlyMessage: error,
    };
  }
  
  const type = getAuthErrorType(error);
  const message = getAuthErrorMessage(error);
  const authError = error as SupabaseAuthError;
  const errorCode = authError.code || authError.status;
  
  // ユーザーフレンドリーなメッセージ
  let userFriendlyMessage = message;
  
  switch (type) {
    case 'network':
      userFriendlyMessage = 'ネットワークエラーが発生しました。\n\nインターネット接続を確認してから、もう一度お試しください。';
      break;
    case 'authentication':
      userFriendlyMessage = 'メールアドレスまたはパスワードが正しくありません。\n\n入力内容を確認してから、もう一度お試しください。';
      break;
    case 'rate_limit':
      userFriendlyMessage = 'リクエストが多すぎます。\n\nしばらく待ってから、もう一度お試しください。';
      break;
    case 'email_not_confirmed':
      userFriendlyMessage = 'メールアドレスの確認が必要です。\n\n登録時に送信されたメールを確認してください。';
      break;
    case 'validation':
      userFriendlyMessage = '入力内容に問題があります。\n\nメールアドレスとパスワードの形式を確認してください。';
      break;
    default:
      userFriendlyMessage = message || 'ログインに失敗しました。\n\nもう一度お試しください。';
  }
  
  return {
    type,
    message,
    code: errorCode,
    userFriendlyMessage,
  };
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
    case 'user_not_found':
      return 'このユーザーは登録されていません';
    case 'invalid_credentials':
    case 'invalid_grant':
      return 'メールアドレスまたはパスワードが正しくありません';
    case 'too_many_requests':
      return 'リクエストが多すぎます。しばらく待ってから再試行してください';
    case 'email_rate_limit_exceeded':
      return 'メール送信の上限に達しました。しばらく待ってから再試行してください';
    default:
      // エラーメッセージから日本語メッセージを抽出（根本的に厳密な判定）
      const lowerMessage = errorMessage.toLowerCase();
      
      // エラーコードが明確な場合のみ「登録済み」と判定
      if (errorCode === 'user_already_exists' || errorCode === 'user_already_registered') {
        return 'このメールアドレスは既に登録されています';
      }
      
      // エラーメッセージの文字列マッチング（完全一致パターンのみ、誤判定を防ぐ）
      if (lowerMessage.includes('user not found') || lowerMessage.includes('user does not exist')) {
        return 'このユーザーは登録されていません';
      }
      
      // 広すぎる判定を削除：'already exists'だけでは誤判定の可能性がある
      // 完全一致または特定のパターンのみをチェック
      const hasExactAlreadyRegisteredMessage = 
        lowerMessage === 'user already registered' ||
        lowerMessage === 'email address is already registered' ||
        lowerMessage === 'user already exists' ||
        (lowerMessage.includes('user already registered') && !lowerMessage.includes('not') && !lowerMessage.includes('cannot'));
      
      // エラーコードが存在する場合のみ、メッセージベースの判定を使用（誤判定を防ぐ）
      if (errorCode && hasExactAlreadyRegisteredMessage) {
        return 'このメールアドレスは既に登録されています';
      }
      
      if (errorMessage.includes('Password') && !lowerMessage.includes('already')) {
        return 'パスワードが正しくありません';
      }
      if (errorMessage.includes('Email') && !lowerMessage.includes('already')) {
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
): Promise<{ success: boolean; error?: string; errorInfo?: AuthErrorInfo }> {
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
          const errorInfo = getAuthErrorInfo(error);
          return {
            success: false,
            error: errorInfo.userFriendlyMessage,
            errorInfo,
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
  
  const errorInfo = lastError ? getAuthErrorInfo(lastError) : getAuthErrorInfo({ code: 'unknown', message: 'ログインに失敗しました' });
  return {
    success: false,
    error: errorInfo.userFriendlyMessage,
    errorInfo,
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
    
    // プロフィール作成（基本カラムのみ - tutorial_completedとonboarding_completedはカラムが存在しない場合があるため含めない）
    const { data, error } = await supabase
      .from('user_profiles')
      .insert({
        user_id: userId,
        display_name: displayName,
        practice_level: 'beginner',
        total_practice_minutes: 0,
      })
      .select('id, user_id, display_name, selected_instrument_id, practice_level, total_practice_minutes, created_at, updated_at')
      .single();
    
    if (error) {
      // 既にプロフィールが存在する場合は成功として扱う
      if (error.code === '23505') { // unique_violation
        logger.debug('[createUserProfile] プロフィールは既に存在します:', { userId });
        return { success: true };
      }
      
      // カラムが存在しない場合のエラーを明確に報告
      if (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist')) {
        logger.error('[createUserProfile] データベーススキーマエラー: 必要なカラムが存在しません。マイグレーションを実行してください。', { error: error.message });
        return {
          success: false,
          error: 'データベーススキーマが不完全です。管理者に連絡するか、マイグレーションを実行してください。',
        };
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
    
    // カラムが存在しない場合のエラーを明確に報告
    if (errorMessage.includes('column') || errorMessage.includes('does not exist')) {
      logger.error('[createUserProfile] データベーススキーマエラー: 必要なカラムが存在しません。マイグレーションを実行してください。', { error: errorMessage });
      return {
        success: false,
        error: 'データベーススキーマが不完全です。管理者に連絡するか、マイグレーションを実行してください。',
      };
    }
    
    logger.error('[createUserProfile] プロフィール作成例外:', { error: errorMessage });
    return {
      success: false,
      error: errorMessage || 'プロフィールの作成に失敗しました',
    };
  }
}
