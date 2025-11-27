import { useState, useEffect, useRef } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { supabase, clearSupabaseSessionLocal } from '@/lib/supabase';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';

// グローバルな認証状態管理（シングルトンパターン）
interface AuthUser {
  id: string;
  email?: string;
  [key: string]: unknown;
}

type GlobalAuthState = {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  errorCount: number;
  isErrorLimitReached: boolean;
  hasInitialized: boolean;
  listeners: Set<() => void>;
};

// グローバルウィンドウ拡張の型定義
interface WindowWithAuthState extends Window {
  __redirectCount?: number;
  __isRedirectLoopDetected?: boolean;
  __emergencyStop?: boolean;
}

let globalAuthState: GlobalAuthState = {
  isAuthenticated: false,
  isLoading: true,
  user: null,
  errorCount: 0,
  isErrorLimitReached: false,
  hasInitialized: false,
  listeners: new Set<() => void>()
};

// グローバル状態を更新し、リスナーに通知
const updateGlobalAuthState = (updates: Partial<typeof globalAuthState>) => {
  Object.assign(globalAuthState, updates);
  globalAuthState.listeners.forEach(listener => listener());
};

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(globalAuthState.isAuthenticated);
  const [isLoading, setIsLoading] = useState(globalAuthState.isLoading);
  const [user, setUser] = useState<AuthUser | null>(globalAuthState.user);
  const router = useRouter();
  const segments = useSegments();
  
  // エラー制限機能
  const [errorCount, setErrorCount] = useState<number>(globalAuthState.errorCount);
  const [isErrorLimitReached, setIsErrorLimitReached] = useState<boolean>(globalAuthState.isErrorLimitReached);
  const MAX_ERRORS = 100;
  const hasNavigatedRef = useRef<boolean>(false);
  
  // グローバル状態のリスナーを登録（一度だけ）
  useEffect(() => {
    const listener = () => {
      setIsAuthenticated(globalAuthState.isAuthenticated);
      setIsLoading(globalAuthState.isLoading);
      setUser(globalAuthState.user);
      setErrorCount(globalAuthState.errorCount);
      setIsErrorLimitReached(globalAuthState.isErrorLimitReached);
    };
    
    // 既にリスナーが登録されている場合はスキップ
    if (!globalAuthState.listeners.has(listener)) {
      globalAuthState.listeners.add(listener);
    }
    
    return () => {
      globalAuthState.listeners.delete(listener);
    };
  }, []);
  
  // 無限ループ検出機能（グローバル管理）
  const MAX_REDIRECTS = 5; // 5回のリダイレクトでループと判定
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // グローバルなリダイレクトカウンター（複数のuseAuthフック間で共有）
  // 型安全な方法でwindowオブジェクトにアクセス
  const getWindow = (): WindowWithAuthState | undefined => {
    if (typeof window !== 'undefined') {
      return window as WindowWithAuthState;
    }
    return undefined;
  };

  // 初期化（一度だけ実行）
  const win = getWindow();
  if (win) {
    if (win.__redirectCount === undefined) {
      win.__redirectCount = 0;
    }
    if (win.__isRedirectLoopDetected === undefined) {
      win.__isRedirectLoopDetected = false;
    }
    if (win.__emergencyStop === undefined) {
      win.__emergencyStop = false;
    }
    
    // デバッグ用：グローバル状態をコンソールに表示（緊急停止時とリダイレクト時のみ）
    if (!win.__emergencyStop && win.__redirectCount > 0 && process.env.EXPO_PUBLIC_DEBUG_LOGS === 'true') {
      logger.debug('グローバル状態:', {
        redirectCount: win.__redirectCount,
        isLoopDetected: win.__isRedirectLoopDetected,
        emergencyStop: win.__emergencyStop
      });
    }
  }

  // リダイレクトループ検出関数
  const checkRedirectLoop = (): boolean => {
    const win = getWindow();
    if (!win) return false;
    
    const globalCount = win.__redirectCount ?? 0;
    if (globalCount >= MAX_REDIRECTS) {
      logger.error('無限ループ検出！リダイレクトを停止します');
      win.__isRedirectLoopDetected = true;
      win.__emergencyStop = true;
      
      // ユーザーに通知
      if (typeof window !== 'undefined' && window.alert) {
        window.alert('無限ループが検出されました。ページをリロードしてください。');
      }
      
      return true;
    }
    return false;
  };

  // リダイレクトカウンターをリセット
  const resetRedirectCount = (): void => {
    const win = getWindow();
    if (win) {
      win.__redirectCount = 0;
      win.__isRedirectLoopDetected = false;
      win.__emergencyStop = false;
    }
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current);
      redirectTimeoutRef.current = null;
    }
  };

  // リダイレクトカウンターを増加
  const incrementRedirectCount = (): void => {
    const win = getWindow();
    if (!win) return;
    
    const newCount = (win.__redirectCount ?? 0) + 1;
    win.__redirectCount = newCount;
    
    // デバッグモード時のみログ出力
    if (process.env.EXPO_PUBLIC_DEBUG_LOGS === 'true') {
      logger.debug(`リダイレクト回数: ${newCount}/${MAX_REDIRECTS}`);
    }
    
    // 即座にループ検出チェック
    if (newCount >= MAX_REDIRECTS) {
      logger.error('緊急停止！リダイレクト回数が上限に達しました');
      win.__isRedirectLoopDetected = true;
      win.__emergencyStop = true;
      
      // ユーザーに通知
      if (typeof window !== 'undefined' && window.alert) {
        window.alert('無限ループが検出されました。ページをリロードしてください。');
      }
      
      // すべてのリダイレクトを停止
      return false;
    }
    
    // タイムアウトを設定（5秒後にリセット）
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current);
    }
    redirectTimeoutRef.current = setTimeout(() => {
      if (process.env.EXPO_PUBLIC_DEBUG_LOGS === 'true') {
        logger.debug('リダイレクトカウンターをリセット');
      }
      const resetWin = getWindow();
      if (resetWin) {
        resetWin.__redirectCount = 0;
      }
    }, 5000);
    
    return true;
  };

  // 認証後に適切な画面へ遷移する関数
  const navigateAfterAuth = async () => {
    if (hasNavigatedRef.current) {
      logger.debug('navigateAfterAuth: 既に遷移済み', new Date().toISOString());
      return;
    }
    
    // 無限ループ検出
    if (checkRedirectLoop()) {
      logger.debug('navigateAfterAuth: 無限ループ検出のため停止');
      return;
    }
    
    // グローバルなループ検出フラグをチェック
    const checkWin = getWindow();
    if (checkWin && (checkWin.__isRedirectLoopDetected || checkWin.__emergencyStop)) {
      logger.debug('navigateAfterAuth: グローバルループ検出フラグまたは緊急停止により停止');
      return;
    }
    
    logger.debug('navigateAfterAuth: 開始', new Date().toISOString());
    
    const safeReplace = (path: string) => {
      setTimeout(() => {
        const replaceWin = getWindow();
        if (replaceWin && !replaceWin.__emergencyStop) {
          router.replace(path);
        }
      }, 0);
    };
    
    // リダイレクトカウンターを増加（失敗時は即座に停止）
    if (!incrementRedirectCount()) {
      logger.debug('navigateAfterAuth: リダイレクトカウンター増加失敗、停止');
      return;
    }
    
    // 即座にフラグを設定して重複実行を防ぐ
    hasNavigatedRef.current = true;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

              if (!user) {
          logger.debug('navigateAfterAuth: ユーザーなし、ログイン画面へ');
          safeReplace('/auth/login');
          return;
        }

      // 現在の画面がチュートリアル/楽器選択/基礎練なら干渉しない
      const group = segments[0] as string | undefined;
      const child = group === '(tabs)' ? segments[1] as string | undefined : undefined;
      if (group === '(tabs)' && (child === 'tutorial' || child === 'instrument-selection' || child === 'basic-practice')) {
        logger.debug('navigateAfterAuth: チュートリアル/楽器選択/基礎練中のため自動遷移をスキップ');
        return;
      }

      // 既にユーザーが任意のタブへ遷移している場合は干渉しない（index 以外であればスキップ）
      if (group === '(tabs)' && child && child !== 'index') {
        logger.debug('navigateAfterAuth: ユーザーによる画面遷移を検知。自動遷移をスキップ');
        return;
      }

      logger.debug('navigateAfterAuth: ユーザー確認済み、プロフィール確認を開始');

      // プロフィール確認を安全に実行
      try {
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('selected_instrument_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profileError) {
          ErrorHandler.handle(profileError, 'プロフィール取得', false);
          const message = (profileError as { message?: string })?.message || '';
          const code = (profileError as { code?: string })?.code || '';
          const details = (profileError as { details?: string })?.details || '';
          const isTableMissing =
            code === 'PGRST205' ||
            message.includes('Could not find the table') ||
            details?.includes('Could not find the table');

          // テーブル未作成や404の場合は、チュートリアル/サインアップへ飛ばさずメインへフォールバック
          if (isTableMissing) {
            logger.warn('user_profiles テーブル未作成のためメイン画面へフォールバックします');
            safeReplace('/(tabs)/');
            resetRedirectCount();
            return;
          }

          // それ以外の取得エラー時は安全側でサインアップへ
          safeReplace('/auth/signup');
          return;
        }

        if (!profile || !profile.selected_instrument_id) {
          logger.debug('navigateAfterAuth: 楽器未選択、チュートリアル画面へ');
          safeReplace('/(tabs)/tutorial');
        } else {
          logger.debug('navigateAfterAuth: 楽器選択済み、カレンダー画面へ');
          safeReplace('/(tabs)/');
        }
        
        // 成功時はリダイレクトカウンターをリセット
        resetRedirectCount();
        
      } catch (profileCheckError) {
        ErrorHandler.handle(profileCheckError, 'プロフィール確認', false);
        // エラー時は新規会員登録画面へ
        safeReplace('/auth/signup');
      }
      
    } catch (error) {
      ErrorHandler.handle(error, 'navigateAfterAuth', false);
      // エラー時も安全側で新規会員登録画面へ
      safeReplace('/auth/signup');
    }
  };

  useEffect(() => {
    // 既に初期化済みの場合は何もしない
    if (globalAuthState.hasInitialized) {
      return;
    }
    
    // 緊急停止フラグをチェック
    const emergencyWin = getWindow();
    if (emergencyWin?.__emergencyStop) {
      logger.debug('緊急停止フラグが設定されているため、認証チェックをスキップ');
      return;
    }
    
    const checkAuth = async () => {
      if (checkErrorLimit()) {
        updateGlobalAuthState({ isLoading: false });
        return;
      }

      try {
        updateGlobalAuthState({ isLoading: true });
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          const msg = (error as any)?.message || '';
          if (msg.includes('User from sub claim in JWT does not exist') || msg.includes('403')) {
            await clearSupabaseSessionLocal();
          }
          incrementErrorCount();
          updateGlobalAuthState({ isAuthenticated: false, user: null });
          // エラー時はログイン画面へ
          if (!hasNavigatedRef.current) {
            hasNavigatedRef.current = true;
            const errorWin = getWindow();
            if (incrementRedirectCount() && errorWin && !errorWin.__emergencyStop) {
              router.replace('/auth/login');
            }
          }
        } else if (session?.user) {
          updateGlobalAuthState({ isAuthenticated: true, user: session.user });
          
          // 認証済みユーザーの適切な画面への遷移（初回のみ）
          if (!hasNavigatedRef.current) {
            // 少し遅延してから遷移を実行（認証状態の確実な更新を待つ）
            setTimeout(() => {
              navigateAfterAuth();
            }, 100);
          }
        } else {
          updateGlobalAuthState({ isAuthenticated: false, user: null });
          // セッションなしの場合はログイン画面へ
          if (!hasNavigatedRef.current) {
            hasNavigatedRef.current = true;
            if (incrementRedirectCount() && !(window as any).__emergencyStop) {
              router.replace('/auth/login');
            }
          }
        }
      } catch (error) {
        incrementErrorCount();
        updateGlobalAuthState({ isAuthenticated: false, user: null });
          // エラー時はログイン画面へ
          if (!hasNavigatedRef.current) {
            hasNavigatedRef.current = true;
            const errorWin = getWindow();
            if (incrementRedirectCount() && errorWin && !errorWin.__emergencyStop) {
              router.replace('/auth/login');
            }
          }
      } finally {
        updateGlobalAuthState({ isLoading: false, hasInitialized: true });
      }
    };

    checkAuth();

    // 認証状態の変更を監視（最小限）
    const subscription = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (checkErrorLimit()) return;

        try {
          if (event === 'SIGNED_OUT') {
            // ここでは遷移しない。RootLayout 側で未認証ルーティングを一括制御
            updateGlobalAuthState({ isAuthenticated: false, user: null });
            hasNavigatedRef.current = false;
            resetRedirectCount();
          } else if (event === 'SIGNED_IN' && session) {
            updateGlobalAuthState({ isAuthenticated: true, user: session.user });
            // Googleログイン後の遷移を確実に実行
            if (!hasNavigatedRef.current) {
              setTimeout(() => {
                navigateAfterAuth();
              }, 300);
            }
          } else if (event === 'TOKEN_REFRESHED' && session) {
            updateGlobalAuthState({ isAuthenticated: true, user: session.user });
          } else if (event === 'USER_UPDATED' && session) {
            updateGlobalAuthState({ isAuthenticated: true, user: session.user });
          }
          // その他のイベントは無視
        } catch (error) {
          ErrorHandler.handle(error, 'Auth state change', false);
          incrementErrorCount();
        }
      }
    );

    return () => subscription.data.subscription.unsubscribe();
  }, []);

  // エラー制限チェック関数
  const checkErrorLimit = () => {
    if (globalAuthState.errorCount >= MAX_ERRORS) {
      updateGlobalAuthState({ isErrorLimitReached: true });
      logger.error(`エラー制限に達しました（${MAX_ERRORS}回）。処理を停止します。`);
      return true;
    }
    return false;
  };

  // エラーカウント増加関数
  const incrementErrorCount = () => {
    const newCount = globalAuthState.errorCount + 1;
    if (newCount >= MAX_ERRORS) {
      updateGlobalAuthState({ errorCount: newCount, isErrorLimitReached: true });
      logger.error(`エラー制限に達しました（${MAX_ERRORS}回）。処理を停止します。`);
    } else {
      updateGlobalAuthState({ errorCount: newCount });
    }
  };

  const requireAuth = () => {
    if (checkErrorLimit()) return false;
    if (isLoading) return false;
    
    // Note: Avoid navigating here because this function may be called during render.
    // Navigation is handled in the effect above and via navigateAfterAuth.
    if (!isAuthenticated) return false;
    return true;
  };

  const logout = async () => {
    if (checkErrorLimit()) return;

    try {
      logger.debug('ログアウト処理開始...');
      
      setIsAuthenticated(false);
      setUser(null);
      hasNavigatedRef.current = false;
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        ErrorHandler.handle(error, 'Logout', false);
        incrementErrorCount();
        throw error;
      }
      
      router.replace('/auth/login');
    } catch (error) {
      ErrorHandler.handle(error, 'Logout failed', false);
      incrementErrorCount();
      setIsAuthenticated(false);
      setUser(null);
      hasNavigatedRef.current = false;
      router.replace('/auth/login');
      throw error;
    }
  };

  return {
    isAuthenticated,
    isLoading,
    user,
    requireAuth,
    logout,
    errorCount,
    isErrorLimitReached,
    resetErrorCount: () => setErrorCount(0),
    navigateAfterAuth,
    redirectCount: getWindow()?.__redirectCount ?? 0,
    isRedirectLoopDetected: getWindow()?.__isRedirectLoopDetected ?? false,
    resetRedirectCount,
  };
};
