/**
 * シンプルな認証サービス
 * 
 * Supabaseの標準的な認証フローを使用します。
 */

import { supabase } from './supabase';
import { signInWithRetry, getAuthErrorMessage } from './authHelpers';
import logger from './logger';
import { signUpNew } from './signUpNew';

export interface AuthResult {
  success: boolean;
  error?: string;
  data?: any;
}

export interface UserProfileResult {
  profile: {
    id?: string;
    user_id: string;
    display_name?: string;
    tutorial_completed?: boolean;
    onboarding_completed?: boolean;
    created_at?: string;
    updated_at?: string;
  } | null;
  error?: string;
}

/**
 * 新規登録
 * Supabaseの標準的なレスポンスをそのまま返す
 */
export async function signUp(
  email: string,
  password: string,
  displayName?: string
): Promise<AuthResult> {
  try {
    logger.info('[AuthService] signUp開始:', { email });
    
    // タイムアウト機能を削除
    const result = await signUpNew(email, password, displayName);
    logger.debug('[AuthService] signUp完了:', { success: result.success });
    
    if (!result.success) {
      logger.error('[AuthService] signUp失敗:', { error: result.error });
      return {
        success: false,
        error: result.error,
      };
    }

    logger.info('[AuthService] signUp成功:', { userId: result.userId, email: result.email });

    // Supabaseの標準的なレスポンスをそのまま返す
    // セッション管理はSupabaseクライアントに完全に任せる
    return {
      success: true,
      data: {
        userId: result.userId,
        email: result.email,
      },
    };
  } catch (error: any) {
    logger.error('[AuthService] signUp例外:', { error: error.message || error });
    const errorMessage = getAuthErrorMessage(error) || error.message || '新規登録に失敗しました';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * ログイン
 */
export async function signIn(
  email: string,
  password: string
): Promise<AuthResult> {
  try {
    logger.info('[AuthService] signIn開始:', { email });
    
    // タイムアウト機能を削除
    const result = await signInWithRetry(email, password);
    
    if (!result.success) {
      logger.error('[AuthService] signIn失敗:', { error: result.error });
    } else {
      logger.info('[AuthService] signIn成功');
    }
    
    return result;
  } catch (error: any) {
    logger.error('[AuthService] signIn例外:', { error: error.message || error });
    const errorMessage = getAuthErrorMessage(error) || error.message || 'ログインに失敗しました';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * ログアウト
 */
export async function signOut(): Promise<AuthResult> {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return {
        success: false,
        error: getAuthErrorMessage(error) || error.message || 'ログアウトに失敗しました',
      };
    }

    return {
      success: true,
    };
  } catch (error: any) {
    return {
      success: false,
      error: getAuthErrorMessage(error) || error.message || 'ログアウトに失敗しました',
    };
  }
}

/**
 * セッションを取得
 */
export async function getSession(): Promise<{ session: any; error?: string }> {
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      return {
        session: null,
        error: error.message,
      };
    }

    return {
      session: data.session,
    };
  } catch (error: any) {
    return {
      session: null,
      error: error.message || 'セッションの取得に失敗しました',
    };
  }
}

/**
 * 現在のユーザーを取得
 */
export async function getCurrentUser(): Promise<{ user: any; error?: string }> {
  try {
    const { data, error } = await supabase.auth.getUser();
    
    if (error) {
      return {
        user: null,
        error: error.message,
      };
    }

    return {
      user: data.user,
    };
  } catch (error: any) {
    return {
      user: null,
      error: error.message || 'ユーザー情報の取得に失敗しました',
    };
  }
}

/**
 * ユーザープロフィールを取得
 * プロフィールはデータベーストリガーで自動作成されることを前提とする
 */
export async function getUserProfile(userId: string): Promise<UserProfileResult> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, user_id, display_name, tutorial_completed, onboarding_completed, created_at, updated_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      // プロフィールが存在しない場合は正常な状態（トリガーで作成される）
      return {
        profile: null,
      };
    }

    return {
      profile: data || null,
    };
  } catch (error: any) {
    // 例外が発生した場合も、プロフィールが存在しないものとして扱う
    return {
      profile: null,
    };
  }
}
