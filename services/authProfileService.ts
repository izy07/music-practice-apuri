/**
 * 認証プロフィール管理サービス
 * 
 * ユーザープロフィールの取得、作成、更新を管理します
 * useAuthAdvanced.tsから分離して、認証ロジックを簡素化
 */

import { supabase } from '@/lib/supabase';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import { AuthUser } from '@/hooks/useAuthAdvanced';

const NEW_SIGNUP_FLAG_KEY = 'music-practice-new-signup-flag';

export interface UserProfile {
  id?: string;
  user_id: string;
  display_name?: string;
  selected_instrument_id?: string | null;
  tutorial_completed?: boolean;
  onboarding_completed?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ProfileFetchResult {
  profile: UserProfile | null;
  error: any | null;
  isTimeout?: boolean;
}

export interface RecentInstrumentResult {
  instrumentId: string | null;
  error: any | null;
}

/**
 * ユーザープロフィールを取得（タイムアウト対応）
 * @param userId ユーザーID
 * @param timeoutMs タイムアウト時間（ミリ秒、デフォルト: 10000ms）
 */
export async function fetchUserProfile(
  userId: string,
  timeoutMs: number = 10000
): Promise<ProfileFetchResult> {
  let timeoutId: NodeJS.Timeout | null = null;
  let isResolved = false;

  try {
    // タイムアウト用のPromise（AbortControllerを使用してクエリをキャンセル）
    const timeoutPromise = new Promise<{ data: null; error: { code: string; message: string } }>((resolve) => {
      timeoutId = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          resolve({
            data: null,
            error: {
              code: 'TIMEOUT',
              message: 'プロフィール取得がタイムアウトしました',
            },
          });
        }
      }, timeoutMs);
    });

    // SupabaseクエリのPromise
    const profilePromise = supabase
      .from('user_profiles')
      .select('id, user_id, display_name, selected_instrument_id, tutorial_completed, onboarding_completed')
      .eq('user_id', userId)
      .maybeSingle();

    // どちらかが先に完了したら結果を返す
    const result = await Promise.race([profilePromise, timeoutPromise]);

    // タイムアウトが発生した場合
    if (result.error?.code === 'TIMEOUT') {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      return {
        profile: null,
        error: result.error,
        isTimeout: true,
      };
    }

    // 正常に完了した場合
    isResolved = true;
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    return {
      profile: result.data || null,
      error: result.error || null,
      isTimeout: false,
    };
  } catch (error: any) {
    isResolved = true;
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    logger.error('プロフィール取得で予期しないエラーが発生しました:', error);
    return {
      profile: null,
      error: {
        code: error?.code || 'UNKNOWN_ERROR',
        message: error?.message || 'プロフィール取得でエラーが発生しました',
        status: error?.status,
      },
      isTimeout: false,
    };
  }
}

/**
 * 最近使用した楽器を取得
 * @param userId ユーザーID
 * @param timeoutMs タイムアウト時間（ミリ秒、デフォルト: 10000ms）
 */
export async function fetchRecentInstrument(
  userId: string,
  timeoutMs: number = 10000
): Promise<RecentInstrumentResult> {
  let timeoutId: NodeJS.Timeout | null = null;
  let isResolved = false;

  try {
    // タイムアウト用のPromise
    const instrumentTimeoutPromise = new Promise<{ data: null; error: { code: string; message: string } }>((resolve) => {
      timeoutId = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          resolve({
            data: null,
            error: {
              code: 'TIMEOUT',
              message: '楽器取得がタイムアウトしました',
            },
          });
        }
      }, timeoutMs);
    });

    // SupabaseクエリのPromise
    const instrumentQueryPromise = supabase
      .from('user_instrument_profiles')
      .select('instrument_id, updated_at, created_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1);

    // どちらかが先に完了したら結果を返す
    const result = await Promise.race([instrumentQueryPromise, instrumentTimeoutPromise]);

    // タイムアウトが発生した場合
    if (result.error?.code === 'TIMEOUT') {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      return {
        instrumentId: null,
        error: result.error,
      };
    }

    // 正常に完了した場合
    isResolved = true;
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    if (result.data && !result.error && Array.isArray(result.data) && result.data.length > 0) {
      return {
        instrumentId: result.data[0].instrument_id,
        error: null,
      };
    }

    return {
      instrumentId: null,
      error: null,
    };
  } catch (error) {
    isResolved = true;
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    logger.debug('user_instrument_profilesからの楽器取得エラー（続行）:', error);
    return {
      instrumentId: null,
      error,
    };
  }
}

/**
 * 新規登録フラグを取得
 */
export async function getNewSignupFlag(): Promise<boolean> {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem(NEW_SIGNUP_FLAG_KEY) === 'true';
    } else {
      const flag = await AsyncStorage.getItem(NEW_SIGNUP_FLAG_KEY);
      return flag === 'true';
    }
  } catch (error) {
    logger.warn('新規登録フラグの取得に失敗しました:', error);
    return false;
  }
}

/**
 * 新規登録フラグを設定
 */
export async function setNewSignupFlag(): Promise<void> {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(NEW_SIGNUP_FLAG_KEY, 'true');
      logger.debug('新規登録フラグを設定しました');
    } else {
      await AsyncStorage.setItem(NEW_SIGNUP_FLAG_KEY, 'true');
      logger.debug('新規登録フラグを設定しました（AsyncStorage）');
    }
  } catch (error) {
    logger.warn('新規登録フラグの設定に失敗しました:', error);
  }
}

/**
 * 新規登録フラグを削除
 */
export async function clearNewSignupFlag(): Promise<void> {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(NEW_SIGNUP_FLAG_KEY);
      logger.debug('新規登録フラグを削除しました');
    } else {
      await AsyncStorage.removeItem(NEW_SIGNUP_FLAG_KEY);
      logger.debug('新規登録フラグを削除しました（AsyncStorage）');
    }
  } catch (error) {
    logger.warn('新規登録フラグの削除に失敗しました:', error);
  }
}

/**
 * 既存ユーザーかどうかを判定
 * @param user Supabase User オブジェクト
 * @param recentInstrumentId 最近使用した楽器ID（オプション）
 */
export function isExistingUser(
  user: any,
  recentInstrumentId: string | null = null
): boolean {
  const userCreatedAt = user.created_at ? new Date(user.created_at) : null;
  const lastSignInAt = user.last_sign_in_at ? new Date(user.last_sign_in_at) : null;
  const now = new Date();
  const hoursSinceCreation = userCreatedAt
    ? (now.getTime() - userCreatedAt.getTime()) / (1000 * 60 * 60)
    : Infinity;

  // 1. 最近使用した楽器がある場合は既存ユーザー
  if (recentInstrumentId !== null) {
    return true;
  }

  // 2. last_sign_in_atが存在し、created_atと異なる場合（以前にログインしたことがある）
  const isExistingUserBySignIn = lastSignInAt && userCreatedAt &&
    lastSignInAt.getTime() > userCreatedAt.getTime() + (1000 * 60); // 作成から1分以上経過後にログイン

  if (isExistingUserBySignIn) {
    return true;
  }

  // 3. 24時間以上前に作成されたユーザーは既存ユーザー
  if (hoursSinceCreation > 24) {
    return true;
  }

  return false;
}

/**
 * フォールバックユーザーを作成（プロフィール取得失敗時）
 * @param user Supabase User オブジェクト
 * @param recentInstrumentId 最近使用した楽器ID（オプション）
 * @param isNewSignup 新規登録フラグ（オプション）
 */
export function createFallbackUser(
  user: any,
  recentInstrumentId: string | null = null,
  isNewSignup: boolean = false
): AuthUser {
  const fallbackName = user?.user_metadata?.display_name || 
    user?.user_metadata?.name || 
    user?.email?.split('@')[0] || 
    'ユーザー';

  const isExisting = isExistingUser(user, recentInstrumentId);
  const fallbackTutorialCompleted = !isNewSignup || isExisting || (recentInstrumentId !== null);

  return {
    id: user.id,
    email: user.email || '',
    name: fallbackName,
    avatar_url: user?.user_metadata?.avatar_url,
    created_at: user.created_at || new Date().toISOString(),
    last_sign_in_at: user.last_sign_in_at,
    selected_instrument_id: recentInstrumentId,
    tutorial_completed: fallbackTutorialCompleted,
    onboarding_completed: false,
  };
}

/**
 * Supabase UserからAuthUserに変換
 * @param user Supabase User オブジェクト
 * @param profile ユーザープロフィール（オプション）
 */
export function convertToAuthUser(
  user: any,
  profile: UserProfile | null = null
): AuthUser {
  const profileName = profile?.display_name ||
    user?.user_metadata?.display_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'ユーザー';

  return {
    id: user.id,
    email: user.email || '',
    name: profileName,
    avatar_url: profile?.avatar_url || user?.user_metadata?.avatar_url,
    created_at: user.created_at || new Date().toISOString(),
    last_sign_in_at: user.last_sign_in_at,
    selected_instrument_id: profile?.selected_instrument_id || null,
    tutorial_completed: profile?.tutorial_completed ?? false,
    onboarding_completed: profile?.onboarding_completed ?? false,
  };
}
