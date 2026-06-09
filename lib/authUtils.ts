/**
 * 認証ユーティリティ関数
 * データ保存処理前に認証セッションを確認・リフレッシュする
 */
import { supabase } from './supabase';
import logger from './logger';
import type { Session } from '@supabase/supabase-js';

const AUTH_STORAGE_KEY = 'music-practice-auth';

export function isNetworkAuthError(error: { message?: string } | null | undefined): boolean {
  if (!error?.message) return false;
  const message = error.message;
  return (
    message.includes('Failed to fetch') ||
    message.includes('NetworkError') ||
    message.includes('ERR_INTERNET_DISCONNECTED') ||
    message.includes('internet disconnected') ||
    message === 'NETWORK_ERROR' ||
    message.includes('ERR_NAME_NOT_RESOLVED')
  );
}

export function isInvalidRefreshTokenError(error: { message?: string } | null | undefined): boolean {
  if (!error?.message) return false;
  const message = error.message;
  return (
    message.includes('Invalid Refresh Token') ||
    message.includes('Refresh Token Not Found') ||
    message.includes('refresh_token_not_found')
  );
}

/**
 * localStorage/AsyncStorageに保存されたセッションを読み取る（ネットワーク不要）
 */
export function readPersistedAuthSession(): Session | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const session = parsed?.currentSession ?? parsed?.session ?? null;
    if (session?.refresh_token && session?.user) {
      return session as Session;
    }
    return null;
  } catch (error) {
    logger.debug('永続化セッションの読み取りに失敗:', error);
    return null;
  }
}

/**
 * リフレッシュトークンでセッションを復元する（Instagram等と同様の永続ログイン）
 */
export async function refreshPersistedSession(): Promise<Session | null> {
  try {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (currentSession?.user) {
      const now = Math.floor(Date.now() / 1000);
      if (!currentSession.expires_at || currentSession.expires_at > now) {
        return currentSession;
      }
    }

    const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshedSession?.user) {
      logger.debug('永続セッションのリフレッシュに成功');
      return refreshedSession;
    }

    if (refreshError && !isInvalidRefreshTokenError(refreshError)) {
      const persisted = readPersistedAuthSession();
      if (persisted?.refresh_token) {
        const { data: { session: restoredSession }, error: restoreError } = await supabase.auth.setSession({
          access_token: persisted.access_token,
          refresh_token: persisted.refresh_token,
        });
        if (restoredSession?.user) {
          logger.debug('永続化ストレージからセッションを復元');
          return restoredSession;
        }
        if (restoreError) {
          logger.warn('永続化ストレージからのセッション復元に失敗:', restoreError.message);
        }
      }
    }

    if (refreshError && isInvalidRefreshTokenError(refreshError)) {
      logger.warn('リフレッシュトークンが無効です');
    }
    return null;
  } catch (error) {
    logger.error('refreshPersistedSessionでエラー:', error);
    return readPersistedAuthSession();
  }
}

/**
 * 認証セッションを確認し、必要に応じてリフレッシュする
 * @returns セッションが有効な場合true、無効な場合false
 */
export async function ensureValidSession(): Promise<boolean> {
  try {
    // 現在のセッションを取得
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      logger.warn('セッション取得エラー:', sessionError);
      return false;
    }
    
    if (!session) {
      logger.debug('セッションが存在しません');
      return false;
    }
    
    // セッションの有効期限を確認
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = session.expires_at || 0;
    const timeUntilExpiry = expiresAt - now;
    
    // セッションが5分以内に期限切れになる場合はリフレッシュ
    if (timeUntilExpiry < 300) {
      logger.debug('セッションが間もなく期限切れのため、リフレッシュします', {
        timeUntilExpiry,
        expiresAt,
        now
      });
      
      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        logger.error('セッションリフレッシュエラー:', refreshError);
        // リフレッシュトークンが無効な場合はfalseを返す
        if (
          refreshError.message?.includes('Invalid Refresh Token') ||
          refreshError.message?.includes('Refresh Token Not Found') ||
          refreshError.message?.includes('refresh_token_not_found')
        ) {
          return false;
        }
        // その他のエラーは、既存のセッションを使用（期限切れでない限り）
        return timeUntilExpiry > 0;
      }
      
      if (refreshedSession) {
        logger.debug('セッションリフレッシュ成功');
        return true;
      }
    }
    
    // セッションが有効な場合
    if (timeUntilExpiry > 0) {
      return true;
    }
    
    // セッションが期限切れの場合もリフレッシュを試行
    logger.debug('セッションが期限切れのため、リフレッシュを試行します');
    const refreshed = await refreshPersistedSession();
    return !!refreshed?.user;
  } catch (error) {
    logger.error('ensureValidSessionでエラー:', error);
    return false;
  }
}

/**
 * 現在のユーザーを取得（セッション確認付き）
 * @returns ユーザーオブジェクト、またはnull
 */
export async function getCurrentUserWithSessionCheck(): Promise<{ id: string; email?: string } | null> {
  try {
    // セッションを確認
    const hasValidSession = await ensureValidSession();
    if (!hasValidSession) {
      logger.warn('有効なセッションがありません');
      return null;
    }
    
    // ユーザーを取得
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      logger.error('ユーザー取得エラー:', userError);
      return null;
    }
    
    if (!user) {
      logger.warn('ユーザーが取得できませんでした');
      return null;
    }
    
    return user;
  } catch (error) {
    logger.error('getCurrentUserWithSessionCheckでエラー:', error);
    return null;
  }
}

