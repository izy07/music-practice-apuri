/**
 * 認証ユーティリティ関数
 * データ保存処理前に認証セッションを確認・リフレッシュする
 */
import { supabase } from './supabase';
import logger from './logger';

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
    
    // セッションが期限切れの場合
    logger.warn('セッションが期限切れです');
    return false;
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

