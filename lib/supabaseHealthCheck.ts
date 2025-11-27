// Supabaseの設定と接続状態を確認するヘルパー
import { supabase } from './supabase';

/**
 * Supabaseの設定と接続状態を確認
 */
export async function checkSupabaseHealth(): Promise<{
  isHealthy: boolean;
  errors: string[];
  config: {
    url: string;
    hasKey: boolean;
    keyLength: number;
  };
  connection: {
    canConnect: boolean;
    error?: string;
  };
  session: {
    hasSession: boolean;
    userId?: string;
    expiresAt?: number;
    isExpired: boolean;
  };
}> {
  const errors: string[] = [];
  const result = {
    isHealthy: true,
    errors,
    config: {
      url: '',
      hasKey: false,
      keyLength: 0,
    },
    connection: {
      canConnect: false,
      error: undefined as string | undefined,
    },
    session: {
      hasSession: false,
      userId: undefined as string | undefined,
      expiresAt: undefined as number | undefined,
      isExpired: false,
    },
  };

  try {
    // 設定の確認
    const { getSupabaseConfig } = await import('./supabase');
    const { url, key } = getSupabaseConfig();
    result.config.url = url;
    result.config.hasKey = !!key;
    result.config.keyLength = key?.length || 0;

    if (!url) {
      errors.push('Supabase URLが設定されていません');
      result.isHealthy = false;
    }

    if (!key) {
      errors.push('Supabase Anon Keyが設定されていません');
      result.isHealthy = false;
    }

    // 接続の確認
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        result.connection.error = error.message;
        errors.push(`接続エラー: ${error.message}`);
        result.isHealthy = false;
      } else {
        result.connection.canConnect = true;
        if (session) {
          result.session.hasSession = true;
          result.session.userId = session.user.id;
          result.session.expiresAt = session.expires_at;
          result.session.isExpired = session.expires_at ? session.expires_at < Math.floor(Date.now() / 1000) : false;
          
          if (result.session.isExpired) {
            errors.push('セッションが期限切れです');
            result.isHealthy = false;
          }
        }
      }
    } catch (connectionError: any) {
      result.connection.error = connectionError?.message || '接続に失敗しました';
      errors.push(`接続エラー: ${result.connection.error}`);
      result.isHealthy = false;
    }
  } catch (error: any) {
    errors.push(`ヘルスチェックエラー: ${error?.message || error}`);
    result.isHealthy = false;
  }

  return result;
}

/**
 * セッションを再構築（期限切れや設定エラーの場合）
 */
export async function rebuildSession(): Promise<{
  success: boolean;
  error?: string;
  session?: any;
}> {
  try {
    // localStorageからセッションを確認
    if (typeof window === 'undefined') {
      return { success: false, error: 'Web環境ではありません' };
    }

    const storageKey = 'music-practice-auth';
    const sessionString = window.localStorage.getItem(storageKey);
    
    if (!sessionString) {
      return { success: false, error: 'セッションが保存されていません' };
    }

    try {
      const sessionData = JSON.parse(sessionString);
      const currentSession = sessionData.currentSession;
      
      if (!currentSession || !currentSession.access_token) {
        return { success: false, error: 'セッションデータが不正です' };
      }

      // セッションを再設定
      const { data: { session }, error } = await supabase.auth.setSession({
        access_token: currentSession.access_token,
        refresh_token: currentSession.refresh_token || '',
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (session) {
        return { success: true, session };
      }

      return { success: false, error: 'セッションが設定されませんでした' };
    } catch (parseError: any) {
      return { success: false, error: `セッションデータの解析に失敗: ${parseError?.message || parseError}` };
    }
  } catch (error: any) {
    return { success: false, error: error?.message || 'セッションの再構築に失敗しました' };
  }
}

