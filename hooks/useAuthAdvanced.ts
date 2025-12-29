/**
 * 新しい認証フック - 徹底的に設計し直した認証システム
 * 
 * 要件:
 * - 未認証ユーザー → 新規登録画面
 * - 認証済み + 楽器選択済み → メイン画面
 * - 認証済み + 楽器未選択 → チュートリアル画面
 * - ログイン失敗（未登録） → 新規登録画面への誘導
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { createRateLimiter } from '@/lib/authSecurity';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import { TIMEOUT } from '@/lib/constants';
import { getBasePath } from '@/lib/navigationUtils';

// Web環境での最後のアクティビティ時刻を保存するキー（useIdleTimeoutと同じキー）
const LAST_ACTIVITY_KEY = 'music-practice-last-activity';

// 認証ユーザーの型定義
export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  created_at: string;
  last_sign_in_at?: string;
  selected_instrument_id?: string | null; // 楽器選択状態
  tutorial_completed?: boolean;
  onboarding_completed?: boolean;
}

// 認証状態の型定義
export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
}

// 認証フォームデータの型定義
export interface AuthFormData {
  email: string;
  password: string;
  confirmPassword?: string;
  name?: string;
}

// 認証フックの戻り値の型定義
export interface AuthHookReturn extends AuthState {
  // 認証アクション
  signIn: (formData: AuthFormData) => Promise<boolean>;
  signUp: (formData: AuthFormData) => Promise<boolean>;
  signInWithGoogle: () => Promise<boolean>; // 一時的に無効化
  signOut: () => Promise<void>;
  clearSession: () => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
  
  // ユーティリティ
  clearError: () => void;
  fetchUserProfile: () => Promise<AuthUser | null>;
  
  // 状態チェック
  hasInstrumentSelected: () => boolean;
  needsTutorial: () => boolean;
  canAccessMainApp: () => boolean;
}

// グローバル認証状態（複数コンポーネント間での状態共有）
let globalAuthState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isInitialized: false,
  error: null,
};

// 認証状態更新のリスナー
const authStateListeners = new Set<(state: AuthState) => void>();

// グローバルなonAuthStateChangeリスナー（1つだけ登録）
let globalAuthStateChangeSubscription: { unsubscribe: () => void } | null = null;
let globalHandleAuthenticatedUserRef: ((user: any) => Promise<AuthUser | null>) | null = null;

// グローバルな処理中のPromise管理（重複実行を防ぐ）
const globalProcessingPromises = new Map<string, Promise<AuthUser | null>>();

// ログイン処理中のフラグ（ログインボタンを押した時は、updateAuthStateのブロックを無効化する）
let isLoginInProgress = false;

// 現在の画面がログイン画面または新規登録画面かどうかを確認するヘルパー関数
const isInLoginOrSignupScreen = (): boolean => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    // Web環境: window.location.pathnameを使用
    const currentPath = window.location.pathname || '';
    return currentPath.includes('/auth/login') || 
           currentPath.includes('/login') ||
           currentPath.includes('/auth/signup') || 
           currentPath.includes('/signup');
  }
  // React Native環境: segmentsをグローバルに保持する必要があるが、
  // 現時点ではWeb環境でのみチェックする（React Native環境では常にfalse）
  // 将来的にsegmentsをグローバルに保持する場合は、ここでチェックする
  return false;
};

// 認証状態を更新し、リスナーに通知（状態が実際に変更された場合のみ）
const updateAuthState = (newState: Partial<AuthState>) => {
  // 状態が実際に変更されたかチェック（不要な再レンダリングを防ぐ）
  let hasChanged = false;
  
  // 空のオブジェクトが渡された場合はスキップ
  if (!newState || Object.keys(newState).length === 0) {
    return;
  }
  
  // 根本的な修正: ログイン画面または新規登録画面にいる場合は、
  // isAuthenticated: trueへの更新をブロックする
  // ただし、ログインボタンを押した時（isLoginInProgress === true）は、ブロックを無効化する
  // これにより、ログイン画面で入力中に突然チュートリアル画面に遷移する問題を防ぎつつ、
  // ログインボタンを押した時は正常に認証状態を更新できる
  if (newState.isAuthenticated === true && isInLoginOrSignupScreen() && !isLoginInProgress) {
    logger.debug('[updateAuthState] ログイン画面または新規登録画面にいるため、isAuthenticated: trueへの更新をブロックします', {
      currentPath: Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.pathname : 'N/A',
      isLoginInProgress
    });
    // isAuthenticated: trueへの更新をブロック（他の状態更新は許可）
    const { isAuthenticated, ...restState } = newState;
    if (Object.keys(restState).length === 0) {
      // isAuthenticated以外に更新する状態がない場合は、完全にスキップ
      return;
    }
    // isAuthenticated以外の状態のみ更新
    newState = restState;
  }
  
  for (const key in newState) {
    const typedKey = key as keyof AuthState;
    const oldValue = globalAuthState[typedKey];
    const newValue = newState[typedKey];
    
    // 同じ参照の場合はスキップ
    if (oldValue === newValue) continue;
    
    // ユーザーオブジェクトの場合は、重要なフィールドのみチェック（パフォーマンス向上）
    if (typedKey === 'user') {
      const oldUser = oldValue as AuthUser | null;
      const newUser = newValue as AuthUser | null;
      // 両方null/undefinedの場合は変更なし
      if (!oldUser && !newUser) continue;
      // 片方がnull/undefinedの場合は変更あり
      if (!oldUser || !newUser) {
        hasChanged = true;
        break;
      }
      // 重要なフィールドのみチェック
      if (
        oldUser.id !== newUser.id ||
        oldUser.selected_instrument_id !== newUser.selected_instrument_id ||
        oldUser.tutorial_completed !== newUser.tutorial_completed ||
        oldUser.email !== newUser.email
      ) {
        hasChanged = true;
        break;
      }
    } else {
      // プリミティブ値の比較（null/undefinedも含む）
      if (oldValue !== newValue) {
        hasChanged = true;
        break;
      }
    }
  }
  
  // 状態が変更されていない場合はスキップ
  if (!hasChanged) {
    return;
  }
  
  globalAuthState = { ...globalAuthState, ...newState };
  authStateListeners.forEach(listener => listener(globalAuthState));
};

// 認証フックのメイン関数
export const useAuthAdvanced = (): AuthHookReturn => {
  const router = useRouter();
  const segments = useSegments();
  
  // レート制限インスタンス
  const rateLimiter = useRef(createRateLimiter()).current;
  
  // signOut関数の参照を保持（useEffectで使用するため）
  const signOutRef = useRef<(() => Promise<void>) | null>(null);
  
  // 新規登録画面の場合はユーザー取得を停止（Hooksの順序を保持）
  const authChild = segments.length > 1 ? (segments as readonly string[])[1] : undefined;
  const isSignupScreen = authChild === 'signup';
  
  // ローカル状態（グローバル状態のコピー）
  const [authState, setAuthState] = useState<AuthState>(globalAuthState);
  
  // 認証状態の初期化
  const initializeAuth = useCallback(async () => {
    try {
      // 新規登録画面の場合はユーザー取得をスキップ（Hooksの順序を保持）
      if (isSignupScreen) {
        updateAuthState({
          isAuthenticated: false,
          isLoading: false,
          isInitialized: true,
          error: null,
        });
        return;
      }
      
      // Supabaseから現在のセッションを取得（優先）
      // ネットワークエラー時のリトライロジックを追加
      let sessionData: any = null;
      let sessionError: any = null;
      const maxRetries = 3;
      let retryCount = 0;
      
      while (retryCount < maxRetries) {
        try {
          const result = await supabase.auth.getSession();
          sessionData = result.data;
          sessionError = result.error;
          
          // ネットワークエラーでない場合、または成功した場合はループを抜ける
          const isNetworkError = sessionError && (
            sessionError.message?.includes('Failed to fetch') || 
            sessionError.message?.includes('NetworkError') ||
            sessionError.message?.includes('ERR_INTERNET_DISCONNECTED') ||
            sessionError.message?.includes('internet disconnected') ||
            sessionError.message === 'NETWORK_ERROR'
          );
          
          if (!sessionError || !isNetworkError) {
            break;
          }
          
          // ネットワークエラーの場合、リトライ
          if (isNetworkError) {
            retryCount++;
            if (retryCount < maxRetries) {
              // 開発環境でのみログを出力
              if (__DEV__) {
                logger.debug(`[useAuthAdvanced] ネットワークエラー - リトライ ${retryCount}/${maxRetries}`);
              }
              // 指数バックオフで待機（1秒、2秒、3秒）
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
              continue;
            }
            // リトライ上限に達した場合は、ループを抜ける（エラーとして扱わない）
            break;
          }
        } catch (error) {
          // 予期しないエラーの場合
          const isNetworkError = error instanceof Error && (
            error.message.includes('Failed to fetch') || 
            error.message.includes('NetworkError') ||
            error.message.includes('ERR_INTERNET_DISCONNECTED') ||
            error.message.includes('internet disconnected') ||
            error.message === 'NETWORK_ERROR'
          );
          
          if (isNetworkError) {
            retryCount++;
            if (retryCount < maxRetries) {
              // 開発環境でのみログを出力
              if (__DEV__) {
                logger.debug(`[useAuthAdvanced] ネットワークエラー（例外） - リトライ ${retryCount}/${maxRetries}`);
              }
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
              continue;
            }
            // リトライ上限に達した場合は、ネットワークエラーとして処理（エラーを投げない）
            // オフライン時は正常な動作として扱う
            break;
          }
          // ネットワークエラーでない場合はそのままエラーを投げる
          throw error;
        }
      }
      
      if (sessionError) {
        // ネットワークエラーと認証エラーを区別
        const isNetworkError = 
          sessionError.message?.includes('Failed to fetch') || 
          sessionError.message?.includes('NetworkError') ||
          sessionError.message?.includes('ERR_INTERNET_DISCONNECTED') ||
          sessionError.message?.includes('internet disconnected') ||
          sessionError.message === 'NETWORK_ERROR';
        
        // ネットワークエラーの場合は、エラーを表示せずに未認証状態として処理
        // オフライン時は正常な動作として扱う
        if (isNetworkError) {
          // 開発環境でのみログを出力（本番環境では表示しない）
          if (__DEV__) {
            logger.debug(`[useAuthAdvanced] ネットワークエラー - オフライン状態として処理`, {
              retryCount,
            });
          }
          
          // ネットワークエラーの場合は、エラーメッセージを設定せずに未認証状態として処理
          // これにより、オフライン時でもアプリが正常に動作する
          updateAuthState({
            isAuthenticated: false,
            isLoading: false,
            isInitialized: true,
            error: null, // ネットワークエラーはエラーとして扱わない
          });
          return;
        }
        
        // ネットワークエラー以外の認証エラーの場合
        const errorMessage = sessionError.message;
        
        logger.error(`[useAuthAdvanced] セッション取得エラー`, {
          isNetworkError,
          error: sessionError.message,
          retryCount,
        });
        
        updateAuthState({
          isAuthenticated: false,
          isLoading: false,
          isInitialized: true,
          error: errorMessage,
        });
        return;
      }
      
      if (sessionData.session?.user) {
        // セッションの有効期限を確認
        const session = sessionData.session;
        const now = Math.floor(Date.now() / 1000);
        
        // セッションが期限切れの場合は強制的にログアウト
        if (session.expires_at && session.expires_at < now) {
          logger.debug('[useAuthAdvanced] セッションが期限切れ - 強制ログアウト', {
            expires_at: session.expires_at,
            now,
            diff: now - session.expires_at,
          });
          
          // 期限切れセッションをクリア
          await supabase.auth.signOut();
          
          // Web環境では最後のアクティビティ時刻も削除
          if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
            try {
              window.localStorage.removeItem(LAST_ACTIVITY_KEY);
            } catch (error) {
              // エラーは無視
            }
          }
          
          // 未認証状態として処理
          updateAuthState({
            isAuthenticated: false,
            isLoading: false,
            isInitialized: true,
            error: null,
          });
          return;
        }
        
        // 最後のアクティビティ時刻をチェック（1時間以上経過している場合は自動ログアウト）
        const IDLE_TIMEOUT_MS = TIMEOUT.IDLE_MS; // 1時間
        let shouldLogoutDueToIdle = false;
        
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
          // Web環境: localStorageから読み込む
          try {
            const savedLastActivity = window.localStorage.getItem(LAST_ACTIVITY_KEY);
            if (savedLastActivity) {
              const savedTime = parseInt(savedLastActivity, 10);
              if (!isNaN(savedTime)) {
                const timeSinceLastActivity = Date.now() - savedTime;
                
                if (timeSinceLastActivity >= IDLE_TIMEOUT_MS) {
                  shouldLogoutDueToIdle = true;
                  logger.info('[useAuthAdvanced] 最後のアクティビティから1時間以上経過 - 自動ログアウト', {
                    timeSinceLastActivity,
                    savedTime,
                    now: Date.now(),
                  });
                }
              }
            }
          } catch (error) {
            // localStorageの読み込みエラーは無視（セッションは有効なので続行）
            logger.debug('[useAuthAdvanced] 最後のアクティビティ時刻のチェックに失敗（続行）:', error);
          }
        } else if (Platform.OS !== 'web') {
          // React Native環境: AsyncStorageから読み込む
          try {
            const savedLastActivity = await AsyncStorage.getItem(LAST_ACTIVITY_KEY);
            if (savedLastActivity) {
              const savedTime = parseInt(savedLastActivity, 10);
              if (!isNaN(savedTime)) {
                const timeSinceLastActivity = Date.now() - savedTime;
                
                if (timeSinceLastActivity >= IDLE_TIMEOUT_MS) {
                  shouldLogoutDueToIdle = true;
                  logger.info('[useAuthAdvanced] 最後のアクティビティから1時間以上経過 - 自動ログアウト', {
                    timeSinceLastActivity,
                    savedTime,
                    now: Date.now(),
                  });
                }
              }
            }
          } catch (error) {
            // AsyncStorageの読み込みエラーは無視（セッションは有効なので続行）
            logger.debug('[useAuthAdvanced] 最後のアクティビティ時刻のチェックに失敗（続行）:', error);
          }
        }
        
        // アイドルタイムアウトの場合は自動ログアウト（ログイン画面に遷移）
        if (shouldLogoutDueToIdle) {
          logger.info('[useAuthAdvanced] アイドルタイムアウト: 1時間以上操作がなかったため自動ログアウトします');
          
          // セッションをクリア
          await supabase.auth.signOut();
          
          // 最後のアクティビティ時刻を削除
          if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
            try {
              window.localStorage.removeItem(LAST_ACTIVITY_KEY);
            } catch (error) {
              // エラーは無視
            }
          } else if (Platform.OS !== 'web') {
            try {
              await AsyncStorage.removeItem(LAST_ACTIVITY_KEY);
            } catch (error) {
              // エラーは無視
            }
          }
          
          // 未認証状態として処理（_layout.tsxでログイン画面にリダイレクトされる）
          updateAuthState({
            isAuthenticated: false,
            user: null,
            isLoading: false,
            isInitialized: true,
            error: null,
          });
          return;
        }
        
        // セッションが有効な場合、handleAuthenticatedUserを呼び出して認証状態を更新
        // ただし、ログイン画面にいる場合は、ユーザーがログインボタンを押すまで待機する
        // これにより、ログイン画面で入力中に突然チュートリアル画面に遷移する問題を防ぐ
        if (sessionData.session?.user) {
          // 現在の画面を確認（ログイン画面または新規登録画面の場合はスキップ）
          // segmentsを使用してログイン画面かどうかを確認
          const isInAuthGroup = segments.length > 0 && segments[0] === 'auth';
          const authChild = segments.length > 1 ? segments[1] : undefined;
          const isInLoginScreen = isInAuthGroup && authChild === 'login';
          const isInSignupScreen = isInAuthGroup && authChild === 'signup';
          
          if (isInLoginScreen || isInSignupScreen) {
            // ログイン画面または新規登録画面にいる場合は、handleAuthenticatedUserを呼ばない
            // ユーザーがログインボタンを押した時に、SIGNED_INイベントで処理される
            logger.debug('[useAuthAdvanced] ログイン画面または新規登録画面にいるため、handleAuthenticatedUserをスキップします', {
              segments,
              isInLoginScreen,
              isInSignupScreen
            });
            updateAuthState({
              isLoading: false,
              isInitialized: true,
              error: null,
            });
            return;
          }
          
          // handleAuthenticatedUserRef.currentを使用（useEffectで設定される）
          // まだ設定されていない場合は、認証状態のみ更新
          const handleAuth = handleAuthenticatedUserRef.current;
          if (handleAuth) {
            await handleAuth(sessionData.session.user);
          } else {
            // handleAuthenticatedUserがまだ初期化されていない場合は、認証状態のみ更新
            // 後でonAuthStateChangeのSIGNED_INイベントで処理されることを期待する
            // ただし、INITIAL_SESSIONでは処理しないため、セッションが有効な場合は認証状態を更新する
            updateAuthState({
              isLoading: false,
              isInitialized: true,
              error: null,
            });
            // handleAuthenticatedUserが初期化されたら、再度呼び出す
            // これはuseEffectで処理される
          }
        } else {
          // セッションがない場合は未認証状態として処理
          updateAuthState({
            isLoading: false,
            isInitialized: true,
            error: null,
          });
        }
        return;
      }
      
      // セッションがない場合は未認証状態として処理
      // ローカルストレージからの復元は行わない（セキュリティ上の理由）
      updateAuthState({
        isAuthenticated: false,
        isLoading: false,
        isInitialized: true,
        error: null,
      });
      
    } catch (error) {
      updateAuthState({
        isAuthenticated: false,
        isLoading: false,
        isInitialized: true,
        error: error instanceof Error ? error.message : '認証初期化に失敗しました',
      });
    }
  }, [isSignupScreen]);

  // 認証状態リスナーの登録
  useEffect(() => {
    const listener = (newState: AuthState) => {
      setAuthState(newState);
    };
    
    authStateListeners.add(listener);
    setAuthState(globalAuthState); // 初期状態を設定
    
    return () => {
      authStateListeners.delete(listener);
    };
  }, []);

  // 初期化処理
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    
    // 読み込み中表示を防ぐため、即座に初期化を完了（非ブロッキング）
    // Web環境では、初期化が完了しない場合に備えてタイムアウトを設定
    // ただし、タイムアウトを長めに設定して、認証状態の確認を確実に行う
    if (typeof window !== 'undefined') {
      timeoutId = setTimeout(() => {
        if (globalAuthState.isLoading) {
          // タイムアウト警告は開発環境のみ表示（本番環境では警告を出さない）
          if (__DEV__) {
            logger.debug('[useAuthAdvanced] 認証初期化がタイムアウトしました。強制的に初期化を完了します。');
          }
          updateAuthState({
            ...globalAuthState,
            isLoading: false,
            isInitialized: true,
          });
        }
      }, 3000); // 1000ms → 3000msに延長（認証状態の確認を確実に行う）
    }
    
    // 初期化を非ブロッキングで実行
    initializeAuth();
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [initializeAuth]);

  // サイレントリフレッシュ（失効前に更新）
  useEffect(() => {
    let timer: any;
    const setup = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const exp = data.session?.expires_at; // seconds
        if (!exp) return;
        const nowSec = Math.floor(Date.now() / 1000);
        const diffMs = (exp - nowSec - TIMEOUT.SESSION_REFRESH_BUFFER_SEC) * 1000;
        if (diffMs > 0) {
          timer = setTimeout(async () => {
            try {
              const { error } = await supabase.auth.refreshSession();
              if (error) {
                // リフレッシュトークンが無効な場合
                if (
                  error.message?.includes('Invalid Refresh Token') ||
                  error.message?.includes('Refresh Token Not Found') ||
                  error.message?.includes('refresh_token_not_found')
                ) {
                  logger.warn('リフレッシュトークンが無効です。セッションをクリアします。', error);
                  // セッションをクリアしてログイン画面にリダイレクト
                  if (signOutRef.current) {
                    await signOutRef.current();
                  } else {
                    await supabase.auth.signOut();
                  }
                  if (typeof router !== 'undefined') {
                    router.replace('/auth/login');
                  }
                } else {
                  // その他のエラーはログに記録
                  logger.debug('セッションリフレッシュエラー:', error);
                }
              }
            } catch (e: any) {
              // 予期しないエラーの場合
              if (
                e?.message?.includes('Invalid Refresh Token') ||
                e?.message?.includes('Refresh Token Not Found') ||
                e?.message?.includes('refresh_token_not_found')
              ) {
                logger.warn('リフレッシュトークンが無効です。セッションをクリアします。', e);
                if (signOutRef.current) {
                  await signOutRef.current();
                } else {
                  await supabase.auth.signOut();
                }
                if (typeof router !== 'undefined') {
                  router.replace('/auth/login');
                }
              } else {
                logger.debug('セッションリフレッシュ例外:', e);
              }
            }
          }, diffMs);
        }
      } catch {}
    };
    setup();
    const onVisible = () => {
      // 復帰時にセッションを軽く更新
      supabase.auth.getSession().then((res: any) => {
        const exp = res.data.session?.expires_at;
        const nowSec = Math.floor(Date.now() / 1000);
        if (exp && exp - nowSec < TIMEOUT.SESSION_EXPIRY_WARNING_SEC) {
          supabase.auth.refreshSession().catch(async (error: any) => {
            // リフレッシュトークンが無効な場合
            if (
              error?.message?.includes('Invalid Refresh Token') ||
              error?.message?.includes('Refresh Token Not Found') ||
              error?.message?.includes('refresh_token_not_found')
            ) {
              logger.warn('リフレッシュトークンが無効です。セッションをクリアします。', error);
              if (signOutRef.current) {
                await signOutRef.current();
              } else {
                await supabase.auth.signOut();
              }
              if (typeof router !== 'undefined') {
                router.replace('/auth/login');
              }
            }
          });
        }
      });
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisible);
    }
    return () => {
      if (timer) clearTimeout(timer);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisible);
      }
    };
  }, [router]);

  // handleAuthenticatedUserの参照を保持（onAuthStateChangeのuseEffectで使用）
  const handleAuthenticatedUserRef = useRef<((user: any) => Promise<AuthUser | null>) | null>(null);
  
  // 内部用の認証済みユーザー処理
  const handleAuthenticatedUser = useCallback(async (user: any): Promise<AuthUser | null> => {
    const userId = user.id;
    
    // 既に処理中の場合は、そのPromiseを返す（同じユーザーIDに対する処理を共有）
    // ただし、タイムアウトしている可能性があるため、一定時間（12秒）以内に完了しない場合は新しい処理を開始
    const existingPromise = globalProcessingPromises.get(userId);
    if (existingPromise) {
      logger.debug('handleAuthenticatedUser: 既に処理中のため、既存のPromiseを待機します', { userId, email: user.email });
      try {
        // タイムアウトチェック付きで待機（12秒以内に完了しない場合は新しい処理を開始）
        // プロフィール取得のタイムアウト（10秒）より長く設定して、正常な処理を優先
        const timeoutPromise = new Promise<null>((resolve) => {
          setTimeout(() => resolve(null), 12000);
        });
        const result = await Promise.race([existingPromise, timeoutPromise]);
        if (result) {
          return result;
        }
        // タイムアウトした場合は、既存のPromiseを削除して新しい処理を開始
        logger.warn('既存のhandleAuthenticatedUserがタイムアウトしました。新しい処理を開始します。', { userId });
        globalProcessingPromises.delete(userId);
      } catch (error) {
        // 既存のPromiseでエラーが発生した場合は、新しい処理を開始
        logger.warn('既存のhandleAuthenticatedUserでエラーが発生しました。新しい処理を開始します。', { userId, error });
        globalProcessingPromises.delete(userId);
      }
    }
    
    // 新しいPromiseを作成（IIFEパターンで即座に実行開始）
    const processPromise = (async () => {
      try {
        logger.debug('handleAuthenticatedUser開始:', { userId, email: user.email });
      
      // ユーザープロフィールを取得（最小限のカラムのみで取得してパフォーマンスを最適化）
      // タイムアウトを10秒に短縮して、ログイン処理を高速化
      // ネットワークが遅い場合でも、タイムアウト後はフォールバック処理でログインを完了できる
      let profile: any = null;
      let profileError: any = null;
      
      // profilePromiseをtryブロックの外で定義（タイムアウト後のバックグラウンド処理で使用するため）
      const profilePromise = supabase
        .from('user_profiles')
        .select('id, user_id, display_name, selected_instrument_id')
        .eq('user_id', userId)
        .maybeSingle();
      
      try {
        // Promise.raceを使用してタイムアウトを実装
        // 注意: SupabaseクエリはAbortControllerを直接サポートしていないため、
        // タイムアウトが発火してもクエリ自体は継続しますが、少なくともタイムアウトを検出できます
        const timeoutPromise = new Promise<{ data: null; error: { code: string; message: string } }>((resolve) => {
          setTimeout(() => {
            resolve({
              data: null,
              error: {
                code: 'TIMEOUT',
                message: 'プロフィール取得がタイムアウトしました',
              },
            });
          }, 10000); // 10秒でタイムアウト（ログイン処理を高速化）
        });
        
        const result = await Promise.race([profilePromise, timeoutPromise]);
        profile = result.data;
        profileError = result.error;
      } catch (error: any) {
        // Promise.raceでエラーが発生した場合（通常は発生しないはず）
        logger.error('プロフィール取得で予期しないエラーが発生しました:', error);
        profileError = { 
          code: error?.code || 'UNKNOWN_ERROR', 
          message: error?.message || 'プロフィール取得でエラーが発生しました',
          status: error?.status,
        };
      }
      
      if (profileError) {
        logger.warn('プロフィール取得エラー:', { error: profileError, code: profileError.code });
        
        // 認証エラーの場合は認証状態をクリア（_layout.tsxのロジックで自動的にログイン画面にリダイレクト）
        if (profileError.code === '401' || profileError.code === 'PGRST301' || profileError.message?.includes('JWT') || profileError.message?.includes('expired')) {
          logger.warn('ユーザー取得エラー: 認証が無効です。認証状態をクリアします。', { error: profileError });
          // 認証状態をクリア（_layout.tsxが自動的にログイン画面にリダイレクト）
          await supabase.auth.signOut();
          updateAuthState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            isInitialized: true,
            error: null,
          });
          // ルーティングは_layout.tsxの既存ロジックに任せる（直接リダイレクトしない）
          return null;
        }
        
        // タイムアウトエラーの場合は、セッションをクリアせず、デフォルト値で処理を続行
        // ネットワークが遅い場合でも、ログインは成功している可能性があるため
        // タイムアウト時には、すぐにフォールバックユーザーを作成して認証状態を更新し、
        // その後バックグラウンドでプロフィール取得を試みる
        if (profileError.code === 'TIMEOUT') {
          logger.warn('プロフィール取得がタイムアウトしました。フォールバックユーザーを作成して認証状態を更新します。', { userId });
          
          // user_instrument_profilesから最新の楽器を確認（短いタイムアウト付きで同期的に実行）
          // これにより、チュートリアル画面への誤った遷移を防ぐ
          let fallbackInstrumentId: string | null = null;
          try {
            const instrumentQueryPromise = supabase
              .from('user_instrument_profiles')
              .select('instrument_id, updated_at, created_at')
              .eq('user_id', userId)
              .order('updated_at', { ascending: false })
              .limit(1);
            
            // 3秒でタイムアウト（プロフィール取得より短く設定）
            const instrumentTimeoutPromise = new Promise<{ data: null; error: { code: string; message: string } }>((resolve) => {
              setTimeout(() => {
                resolve({
                  data: null,
                  error: {
                    code: 'TIMEOUT',
                    message: '楽器取得がタイムアウトしました',
                  },
                });
              }, 3000);
            });
            
            const instrumentResult = await Promise.race([instrumentQueryPromise, instrumentTimeoutPromise]);
            
            if (instrumentResult.data && !instrumentResult.error && Array.isArray(instrumentResult.data) && instrumentResult.data.length > 0) {
              fallbackInstrumentId = instrumentResult.data[0].instrument_id;
              logger.debug('user_instrument_profilesから最新の楽器を取得しました（タイムアウト時）:', { instrumentId: fallbackInstrumentId });
            } else if (instrumentResult.error && instrumentResult.error.code === 'TIMEOUT') {
              logger.debug('楽器取得がタイムアウトしました。selected_instrument_idはnullのまま続行します。');
            } else {
              logger.debug('楽器取得でエラーが発生しました（続行）:', instrumentResult.error);
            }
          } catch (instrumentProfileError) {
            logger.debug('user_instrument_profilesからの楽器取得エラー（続行）:', instrumentProfileError);
          }
          
          // すぐにフォールバックユーザーを作成して認証状態を更新
          const fallbackName = user?.user_metadata?.display_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'ユーザー';
          const fallbackUser: AuthUser = {
            id: userId,
            email: user.email || '',
            name: fallbackName,
            avatar_url: user?.user_metadata?.avatar_url,
            created_at: user.created_at || new Date().toISOString(),
            last_sign_in_at: user.last_sign_in_at,
            selected_instrument_id: fallbackInstrumentId,
            tutorial_completed: false,
            onboarding_completed: false,
          };
          
          updateAuthState({
            user: fallbackUser,
            isAuthenticated: true,
            isLoading: false,
            isInitialized: true,
            error: null,
          });
          
          logger.debug('タイムアウト時フォールバックユーザーを作成しました:', { 
            userId: fallbackUser.id, 
            email: fallbackUser.email,
            selected_instrument_id: fallbackUser.selected_instrument_id
          });
          
          // タイムアウト後も、バックグラウンドでプロフィール取得を試みる（非同期）
          profilePromise.then((result) => {
            if (result.data && !result.error) {
              logger.debug('タイムアウト後のプロフィール取得に成功しました。認証状態を更新します。', { userId });
              // プロフィールが取得できた場合は、認証状態を更新
              const profileName = result.data.display_name || user?.user_metadata?.display_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'ユーザー';
              
              // user_instrument_profilesから最新の楽器を確認
              let selectedInstrumentId = result.data.selected_instrument_id || null;
              if (!selectedInstrumentId) {
                (async () => {
                  try {
                    const { data: instrumentProfiles, error: instrumentProfilesError } = await supabase
                      .from('user_instrument_profiles')
                      .select('instrument_id, updated_at, created_at')
                      .eq('user_id', userId)
                      .order('updated_at', { ascending: false })
                      .limit(1);
                    
                    if (!instrumentProfilesError && instrumentProfiles && instrumentProfiles.length > 0) {
                      selectedInstrumentId = instrumentProfiles[0].instrument_id;
                    }
                  } catch (error) {
                    logger.debug('user_instrument_profilesからの楽器取得エラー（無視）:', error);
                  }
                })();
              }
              
              const authUser: AuthUser = {
                id: userId,
                email: user.email || '',
                name: profileName,
                avatar_url: (result.data as any).avatar_url || user?.user_metadata?.avatar_url,
                created_at: user.created_at || new Date().toISOString(),
                last_sign_in_at: user.last_sign_in_at,
                selected_instrument_id: selectedInstrumentId,
                tutorial_completed: (result.data as any).tutorial_completed ?? false,
                onboarding_completed: (result.data as any).onboarding_completed ?? false,
              };
              updateAuthState({
                user: authUser,
                isAuthenticated: true,
                isLoading: false,
                isInitialized: true,
                error: null,
              });
            }
          }).catch((error) => {
            logger.debug('タイムアウト後のプロフィール取得エラー（無視）:', error);
          });
          
          // フォールバックユーザーを返して処理を完了
          return fallbackUser;
        }
        // 400エラー（カラムが存在しない）の場合は、カラムが存在しないものとして処理
        if (profileError.status === 400 || profileError.code === 'PGRST116' || profileError.code === 'PGRST205') {
          // カラムが存在しないエラーの場合は、デフォルト値を使用して処理を続行
          if (profileError.message?.includes('column') || profileError.message?.includes('does not exist') || profileError.message?.includes('tutorial_completed') || profileError.message?.includes('onboarding_completed')) {
            logger.warn('user_profilesテーブルにtutorial_completedまたはonboarding_completedカラムが存在しません。デフォルト値を使用します。', { error: profileError });
            // プロフィールが存在しないものとして処理を続行（新規作成を試みる）
          }
        }
        // PGRST116エラー（プロフィールが存在しない）の場合は新規作成を試みる
        const isProfileNotFound = profileError.code === 'PGRST116' || 
                                   profileError.code === 'PGRST205' ||
                                   (profileError.status === 400 && (
                                     profileError.message?.includes('No rows found') ||
                                     profileError.message?.includes('does not exist') ||
                                     profileError.message?.includes('not found')
                                   ));
        
        if (isProfileNotFound) {
          logger.debug('プロフィールが存在しないため作成を試みます', { userId });
          const displayName = user?.user_metadata?.display_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'ユーザー';
          
          // upsertを使用して確実に作成（既に存在する場合は更新）
          const { data: newProfile, error: createError } = await supabase
            .from('user_profiles')
            .upsert(
              {
                user_id: userId,
                display_name: displayName,
              },
              { onConflict: 'user_id' }
            )
            .select('id, user_id, display_name, selected_instrument_id')
            .single();
          
          if (createError) {
            // 既にプロフィールが存在する場合は成功として扱う（競合エラー）
            if (createError.code === '23505' || createError.status === 409 || (createError.message?.includes('duplicate key') || createError.message?.includes('already exists'))) {
              logger.debug('プロフィールは既に存在します（競合エラー） - 再度取得を試みます', { userId });
              // 再度取得を試みる
              const { data: retryProfile, error: retryError } = await supabase
                .from('user_profiles')
                .select('id, user_id, display_name, selected_instrument_id')
                .eq('user_id', userId)
                .maybeSingle();
              
              if (retryError || !retryProfile) {
                ErrorHandler.handle(retryError || new Error('プロフィールの取得に失敗しました'), 'プロフィール取得', false);
                // user_instrument_profilesから最新の楽器を確認
                let fallbackInstrumentId: string | null = null;
                try {
                  const { data: instrumentProfiles, error: instrumentProfilesError } = await supabase
                    .from('user_instrument_profiles')
                    .select('instrument_id, updated_at, created_at')
                    .eq('user_id', userId)
                    .order('updated_at', { ascending: false })
                    .limit(1);
                  
                  if (!instrumentProfilesError && instrumentProfiles && instrumentProfiles.length > 0) {
                    fallbackInstrumentId = instrumentProfiles[0].instrument_id;
                    logger.debug('user_instrument_profilesから最新の楽器を取得しました:', { instrumentId: fallbackInstrumentId });
                  }
                } catch (instrumentProfileError) {
                  logger.debug('user_instrument_profilesからの楽器取得エラー（続行）:', instrumentProfileError);
                }
                
                // プロフィール取得に失敗した場合は基本情報のみで処理
                const fallbackName = user?.user_metadata?.display_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'ユーザー';
                const authUser: AuthUser = {
                  id: userId,
                  email: user?.email || '',
                  name: fallbackName,
                  avatar_url: user?.user_metadata?.avatar_url,
                  created_at: user?.created_at || new Date().toISOString(),
                  last_sign_in_at: user?.last_sign_in_at,
                  selected_instrument_id: fallbackInstrumentId,
                  tutorial_completed: false,
                  onboarding_completed: false,
                };
                
                updateAuthState({
                  user: authUser,
                  isAuthenticated: true,
                  isLoading: false,
                  isInitialized: true,
                  error: null,
                });
                return authUser;
              }
              
              // 取得したプロフィールを使用
              const authUser: AuthUser = {
                id: userId,
                email: user?.email || '',
                name: retryProfile.display_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'ユーザー',
                avatar_url: (retryProfile as any).avatar_url || user?.user_metadata?.avatar_url,
                created_at: user?.created_at || new Date().toISOString(),
                last_sign_in_at: user?.last_sign_in_at,
                selected_instrument_id: retryProfile.selected_instrument_id || null,
                tutorial_completed: (retryProfile as any).tutorial_completed ?? false,
                onboarding_completed: (retryProfile as any).onboarding_completed ?? false,
              };
              
              updateAuthState({
                user: authUser,
                isAuthenticated: true,
                isLoading: false,
                isInitialized: true,
                error: null,
              });
              return authUser;
            }
            
            ErrorHandler.handle(createError, 'プロフィール作成', false);
            // user_instrument_profilesから最新の楽器を確認
            let fallbackInstrumentId: string | null = null;
            try {
              const { data: instrumentProfiles, error: instrumentProfilesError } = await supabase
                .from('user_instrument_profiles')
                .select('instrument_id, updated_at, created_at')
                .eq('user_id', userId)
                .order('updated_at', { ascending: false })
                .limit(1);
              
              if (!instrumentProfilesError && instrumentProfiles && instrumentProfiles.length > 0) {
                fallbackInstrumentId = instrumentProfiles[0].instrument_id;
                logger.debug('user_instrument_profilesから最新の楽器を取得しました:', { instrumentId: fallbackInstrumentId });
              }
            } catch (instrumentProfileError) {
              logger.debug('user_instrument_profilesからの楽器取得エラー（続行）:', instrumentProfileError);
            }
            
            // プロフィール作成に失敗した場合は基本情報のみで処理
            const fallbackName = user?.user_metadata?.display_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'ユーザー';
            const authUser: AuthUser = {
              id: userId,
              email: user?.email || '',
              name: fallbackName,
              avatar_url: user?.user_metadata?.avatar_url,
              created_at: user?.created_at || new Date().toISOString(),
              last_sign_in_at: user?.last_sign_in_at,
              selected_instrument_id: fallbackInstrumentId,
              tutorial_completed: false,
              onboarding_completed: false,
            };
            
            updateAuthState({
              user: authUser,
              isAuthenticated: true,
              isLoading: false,
              isInitialized: true,
              error: null,
            });
            return authUser;
          }
          
          // 新規作成されたプロフィールを使用
          if (newProfile) {
            const authUser: AuthUser = {
                id: userId,
              email: user.email || '',
              name: newProfile.display_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'ユーザー',
              avatar_url: (newProfile as any).avatar_url || user?.user_metadata?.avatar_url,
              created_at: user.created_at,
              last_sign_in_at: user.last_sign_in_at,
              selected_instrument_id: newProfile.selected_instrument_id || null,
              tutorial_completed: (newProfile as any).tutorial_completed ?? false,
              onboarding_completed: (newProfile as any).onboarding_completed ?? false,
            };
            
            updateAuthState({
              user: authUser,
              isAuthenticated: true,
              isLoading: false,
              isInitialized: true,
              error: null,
            });
            return authUser;
          }
        } else {
          // その他のエラーの場合でも、ログインは成功しているのでフォールバックユーザーを返す
          ErrorHandler.handle(profileError, 'プロフィール取得', false);
          logger.warn('プロフィール取得でエラーが発生しましたが、ログインは成功しているためフォールバックユーザーを使用します', { error: profileError });
          
          // user_instrument_profilesから最新の楽器を確認
          try {
            const { data: instrumentProfiles, error: instrumentProfilesError } = await supabase
              .from('user_instrument_profiles')
              .select('instrument_id, updated_at, created_at')
              .eq('user_id', userId)
              .order('updated_at', { ascending: false })
              .limit(1);
            
            if (!instrumentProfilesError && instrumentProfiles && instrumentProfiles.length > 0) {
              const latestInstrumentId = instrumentProfiles[0].instrument_id;
              logger.debug('user_instrument_profilesから最新の楽器を取得しました:', { instrumentId: latestInstrumentId });
              
              // フォールバックユーザーを作成（最新の楽器を使用）
              const fallbackName = user.user_metadata?.display_name || user.user_metadata?.name || user.email?.split('@')[0] || 'ユーザー';
              const authUser: AuthUser = {
                id: userId,
                email: user?.email || '',
                name: fallbackName,
                avatar_url: user.user_metadata?.avatar_url,
                created_at: user.created_at,
                last_sign_in_at: user.last_sign_in_at,
                selected_instrument_id: latestInstrumentId,
                tutorial_completed: false,
                onboarding_completed: false,
              };
              
              updateAuthState({
                user: authUser,
                isAuthenticated: true,
                isLoading: false,
                isInitialized: true,
                error: null,
              });
              
              logger.debug('フォールバックユーザーを作成しました（楽器選択済み）:', { 
                userId: authUser.id, 
                email: authUser.email,
                selected_instrument_id: authUser.selected_instrument_id
              });
              return authUser;
            }
          } catch (instrumentProfileError) {
            logger.debug('user_instrument_profilesからの楽器取得エラー（続行）:', instrumentProfileError);
          }
          
          // フォールバックユーザーを作成して処理を続行（下のフォールバック処理に到達）
        }
      }
      
      // プロフィールが存在する場合
      if (profile) {
        // プロフィール情報をAuthUser形式に変換
        const profileName = profile.display_name || user?.user_metadata?.display_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'ユーザー';
        let selectedInstrumentId = profile.selected_instrument_id || null;
        
        // selected_instrument_idがnullの場合、user_instrument_profilesから最新の楽器を確認
        if (!selectedInstrumentId) {
          try {
            const { data: instrumentProfiles, error: instrumentProfilesError } = await supabase
              .from('user_instrument_profiles')
              .select('instrument_id, updated_at, created_at')
              .eq('user_id', userId)
              .order('updated_at', { ascending: false })
              .limit(1);
            
            if (!instrumentProfilesError && instrumentProfiles && instrumentProfiles.length > 0) {
              selectedInstrumentId = instrumentProfiles[0].instrument_id;
              logger.debug('user_instrument_profilesから最新の楽器を取得しました（プロフィールのselected_instrument_idがnullの場合）:', { instrumentId: selectedInstrumentId });
            }
          } catch (instrumentProfileError) {
            logger.debug('user_instrument_profilesからの楽器取得エラー（続行）:', instrumentProfileError);
          }
        }
        
        const authUser: AuthUser = {
                id: userId,
          email: user.email || '',
          name: profileName,
          avatar_url: (profile as any).avatar_url,
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at,
          selected_instrument_id: selectedInstrumentId,
          tutorial_completed: (profile as any).tutorial_completed ?? false,
          onboarding_completed: (profile as any).onboarding_completed ?? false,
        };
        
        logger.debug('ユーザー情報取得完了:', {
          email: authUser.email,
          hasInstrument: !!authUser.selected_instrument_id,
          tutorialCompleted: authUser.tutorial_completed,
        });
        
        updateAuthState({
          user: authUser,
          isAuthenticated: true,
          isLoading: false,
          isInitialized: true,
          error: null,
        });
        
        logger.debug('認証状態更新完了:', {
          hasInstrument: !!authUser.selected_instrument_id,
          tutorialCompleted: authUser.tutorial_completed,
          userId: authUser.id
        });
        
        return authUser;
      }
      
      // プロフィールが存在しない場合（エラーでもPGRST116でもない場合）
      // user_instrument_profilesから最新の楽器を確認
      let fallbackInstrumentId: string | null = null;
      try {
        const { data: instrumentProfiles, error: instrumentProfilesError } = await supabase
          .from('user_instrument_profiles')
          .select('instrument_id, updated_at, created_at')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false })
          .limit(1);
        
        if (!instrumentProfilesError && instrumentProfiles && instrumentProfiles.length > 0) {
          fallbackInstrumentId = instrumentProfiles[0].instrument_id;
          logger.debug('user_instrument_profilesから最新の楽器を取得しました:', { instrumentId: fallbackInstrumentId });
        }
      } catch (instrumentProfileError) {
        logger.debug('user_instrument_profilesからの楽器取得エラー（続行）:', instrumentProfileError);
      }
      
      const fallbackName = user.user_metadata?.display_name || user.user_metadata?.name || user.email?.split('@')[0] || 'ユーザー';
      const authUser: AuthUser = {
                id: userId,
        email: user.email || '',
        name: fallbackName,
        avatar_url: user.user_metadata?.avatar_url,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        selected_instrument_id: fallbackInstrumentId,
        tutorial_completed: false,
        onboarding_completed: false,
      };
      
      updateAuthState({
        user: authUser,
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true,
        error: null,
      });
      
      logger.debug('フォールバックユーザーを作成しました:', { 
        userId: authUser.id, 
        email: authUser.email,
        selected_instrument_id: authUser.selected_instrument_id
      });
      
      return authUser;
      } catch (error) {
        logger.error('handleAuthenticatedUserでエラーが発生しました。フォールバックユーザーを作成します:', error);
        ErrorHandler.handle(error, '認証済みユーザー処理', false);
        
        // エラーが発生しても、認証は成功しているのでフォールバックユーザーを作成
        if (!user || !userId) {
          logger.error('userオブジェクトが無効です。nullを返します。');
          return null;
        }
        
        // user_instrument_profilesから最新の楽器を確認
        let fallbackInstrumentId: string | null = null;
        try {
          const { data: instrumentProfiles, error: instrumentProfilesError } = await supabase
            .from('user_instrument_profiles')
            .select('instrument_id, updated_at, created_at')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false })
            .limit(1);
          
          if (!instrumentProfilesError && instrumentProfiles && instrumentProfiles.length > 0) {
            fallbackInstrumentId = instrumentProfiles[0].instrument_id;
            logger.debug('user_instrument_profilesから最新の楽器を取得しました:', { instrumentId: fallbackInstrumentId });
          }
        } catch (instrumentProfileError) {
          logger.debug('user_instrument_profilesからの楽器取得エラー（続行）:', instrumentProfileError);
        }
        
        const fallbackName = user?.user_metadata?.display_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'ユーザー';
        const fallbackUser: AuthUser = {
          id: userId,
          email: user?.email || '',
          name: fallbackName,
          avatar_url: user?.user_metadata?.avatar_url,
          created_at: user?.created_at || new Date().toISOString(),
          last_sign_in_at: user?.last_sign_in_at,
          selected_instrument_id: fallbackInstrumentId,
          tutorial_completed: false,
          onboarding_completed: false,
        };
        
        updateAuthState({
          user: fallbackUser,
          isAuthenticated: true,
          isLoading: false,
          isInitialized: true,
          error: null,
        });
        
        logger.debug('フォールバックユーザーを作成しました:', { 
          userId: fallbackUser.id, 
          email: fallbackUser.email,
          selected_instrument_id: fallbackUser.selected_instrument_id
        });
        return fallbackUser;
      }
    })();
    
    // Promiseを保存（処理が完了したら削除される）
    globalProcessingPromises.set(userId, processPromise);
    
    try {
      const result = await processPromise;
      return result;
    } finally {
      // 処理完了後にPromiseを削除（必ず実行される）
      globalProcessingPromises.delete(userId);
    }
  }, []);

  // handleAuthenticatedUserの参照を更新（グローバルとローカルの両方）
  // セッション再処理のフラグ（1回だけ実行するため）
  const sessionCheckDoneRef = useRef(false);
  
  useEffect(() => {
    handleAuthenticatedUserRef.current = handleAuthenticatedUser;
    globalHandleAuthenticatedUserRef = handleAuthenticatedUser;
    
    // handleAuthenticatedUserが初期化されたら、セッションが有効な場合は再度呼び出す
    // これにより、initializeAuthでhandleAuthenticatedUserがまだ初期化されていなかった場合でも、
    // 後で処理される
    // ただし、1回だけ実行する（複数回実行を防ぐ）
    // また、ログイン画面にいる場合はスキップ（ユーザーがログインボタンを押すまで待機）
    if (!sessionCheckDoneRef.current) {
      sessionCheckDoneRef.current = true;
      const checkAndProcessSession = async () => {
        try {
          // 現在の画面を確認（ログイン画面または新規登録画面の場合はスキップ）
          const isInAuthGroup = segments.length > 0 && segments[0] === 'auth';
          const authChild = segments.length > 1 ? segments[1] : undefined;
          const isInLoginScreen = isInAuthGroup && authChild === 'login';
          const isInSignupScreen = isInAuthGroup && authChild === 'signup';
          
          if (isInLoginScreen || isInSignupScreen) {
            logger.debug('handleAuthenticatedUser初期化後、ログイン画面または新規登録画面にいるため、セッション再処理をスキップします', {
              segments,
              isInLoginScreen,
              isInSignupScreen
            });
            return;
          }
          
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user && !globalAuthState.isAuthenticated) {
            // セッションが有効で、まだ認証状態が更新されていない場合は、handleAuthenticatedUserを呼ぶ
            // ただし、既に処理中の場合はスキップ
            const userId = session.user.id;
            if (!globalProcessingPromises.has(userId)) {
              logger.debug('handleAuthenticatedUser初期化後、セッションを再処理します', { userId });
              await handleAuthenticatedUser(session.user);
            } else {
              logger.debug('handleAuthenticatedUser初期化後、セッション再処理をスキップ（既に処理中）', { userId });
            }
          }
        } catch (error) {
          // エラーは無視（セッション取得に失敗した場合は、後でonAuthStateChangeで処理される）
          logger.debug('セッション再処理エラー（無視）:', error);
        }
      };
      
      checkAndProcessSession();
    }
    // segmentsを依存配列から削除: sessionCheckDoneRefで1回だけ実行するため、segmentsの変更を監視する必要はない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleAuthenticatedUser]);

  // 認証状態変更の監視（onAuthStateChangeを使用）
  // グローバルに1つだけリスナーを登録（複数のコンポーネントでuseAuthAdvancedが使用されても1つだけ）
  useEffect(() => {
    // 既にリスナーが登録されている場合はスキップ
    if (globalAuthStateChangeSubscription) {
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // SIGNED_INイベントのみを処理（INITIAL_SESSIONはinitializeAuthで処理）
        // これにより、ログイン時の処理と初期化時の処理を分離できる
        if (event === 'SIGNED_IN' && session?.user) {
          // ログイン画面または新規登録画面にいる場合は、handleAuthenticatedUserをスキップ
          // ただし、ログインボタンを押した時（isLoginInProgress === true）は、認証状態を更新する
          // これにより、ログイン画面で入力中に突然チュートリアル画面に遷移する問題を防ぎつつ、
          // ログインボタンを押した時は正常にログインできる
          let isInLoginScreen = false;
          let isInSignupScreen = false;
          
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            // Web環境: window.location.pathnameを使用
            const currentPath = window.location.pathname || '';
            isInLoginScreen = currentPath.includes('/auth/login') || currentPath.includes('/login');
            isInSignupScreen = currentPath.includes('/auth/signup') || currentPath.includes('/signup');
          } else {
            // React Native環境: segmentsを使用（グローバルに保持されているsegmentsを参照）
            // 注意: segmentsはuseSegments()で取得されるため、ここでは直接参照できない
            // そのため、Web環境でのみチェックし、React Native環境では常にfalseとする
            // または、segmentsをグローバルに保持する必要がある
            // 現時点では、Web環境でのみチェックする
            isInLoginScreen = false;
            isInSignupScreen = false;
          }
          
          // ログインボタンを押した時は、ログイン画面にいても認証状態を更新する
          if ((isInLoginScreen || isInSignupScreen) && !isLoginInProgress) {
            logger.debug('[useAuthAdvanced] onAuthStateChange: ログイン画面または新規登録画面にいるため、handleAuthenticatedUserをスキップします', {
              event,
              isInLoginScreen,
              isInSignupScreen,
              userId: session.user.id,
              isLoginInProgress
            });
            return;
          }
          
          // ログインボタンを押した時は、ログイン画面にいても認証状態を更新する
          if (isLoginInProgress) {
            logger.debug('[useAuthAdvanced] onAuthStateChange: ログイン処理中なので、handleAuthenticatedUserを実行します', {
              event,
              userId: session.user.id,
              isLoginInProgress
            });
          }
          
          const userId = session.user.id;
          
          // 重複実行を防ぐ：既に処理中の場合はスキップ
          // ただし、前回の処理がタイムアウトした場合は、新しい処理を開始できるようにする
          const existingPromise = globalProcessingPromises.get(userId);
          if (existingPromise) {
            // 既存の処理がタイムアウトしている可能性があるため、12秒待機してから再試行
            logger.debug('onAuthStateChange: 既に処理中のため、タイムアウトチェックを実行します', { userId, email: session.user.email, event });
            try {
              const timeoutPromise = new Promise<null>((resolve) => {
                setTimeout(() => resolve(null), 12000);
              });
              const result = await Promise.race([existingPromise, timeoutPromise]);
              if (result) {
                // 既存の処理が完了した場合は、その結果を使用
                logger.debug('onAuthStateChange: 既存の処理が完了しました', { userId });
                return;
              }
              // タイムアウトした場合は、既存のPromiseを削除して新しい処理を開始
              logger.warn('onAuthStateChange: 既存の処理がタイムアウトしたため、新しい処理を開始します', { userId });
              globalProcessingPromises.delete(userId);
            } catch (error) {
              // 既存のPromiseでエラーが発生した場合は、新しい処理を開始
              logger.warn('onAuthStateChange: 既存の処理でエラーが発生したため、新しい処理を開始します', { userId, error });
              globalProcessingPromises.delete(userId);
            }
          }
          
          // セッションが確立されたときに認証状態を更新
          // globalHandleAuthenticatedUserRefを使用して、常に最新の関数を呼び出す
          if (globalHandleAuthenticatedUserRef) {
            await globalHandleAuthenticatedUserRef(session.user);
            // ログイン処理が完了したので、フラグをリセット
            isLoginInProgress = false;
            logger.debug('[onAuthStateChange] ログイン処理フラグをリセットしました');
          }
        } else if (event === 'SIGNED_OUT') {
          // ログアウト時に認証状態をクリア
          // 処理中のPromiseもクリア
          globalProcessingPromises.clear();
          updateAuthState({
            isAuthenticated: false,
            user: null,
            isLoading: false,
            isInitialized: true,
            error: null,
          });
        }
        // INITIAL_SESSION, TOKEN_REFRESHEDなどの他のイベントはスキップ
        // INITIAL_SESSIONはinitializeAuthで処理されるため、ここでは処理しない
      }
    );

    globalAuthStateChangeSubscription = subscription;

    // クリーンアップは不要（グローバルリスナーはアプリ終了まで保持）
    // ただし、開発時にHMRでリロードされる場合はクリーンアップが必要
    return () => {
      // クリーンアップはしない（グローバルリスナーを保持）
    };
  }, []); // 依存配列を空にして、リスナーの重複登録を防ぐ

  // 楽器テーマ関連のローカル保存をクリア（ユーザー切り替え時用）
  const clearInstrumentThemeLocal = useCallback(async () => {
    try {
      // 従来のキーを削除
      await Promise.all([
        AsyncStorage.removeItem('selectedInstrument'),
        AsyncStorage.removeItem('customTheme'),
        AsyncStorage.removeItem('isCustomTheme'),
        AsyncStorage.removeItem('practiceSettings'),
      ]);
      
      // ユーザーID別のキーもすべて削除（新規登録時に以前のユーザーの設定が残らないように）
      try {
        const allKeys = await AsyncStorage.getAllKeys();
        const themeKeys = allKeys.filter(key => 
          key.includes('selectedInstrument') ||
          key.includes('customTheme') ||
          key.includes('isCustomTheme') ||
          key.includes('practiceSettings')
        );
        
        if (themeKeys.length > 0) {
          await AsyncStorage.multiRemove(themeKeys);
          logger.debug('外観設定のキーを削除しました:', themeKeys);
        }
      } catch (error) {
        logger.warn('ユーザーID別キーの削除エラー（無視）:', error);
      }
      
      // WebのlocalStorage/sessionStorageに重複保存している可能性にも対応
      if (typeof window !== 'undefined') {
        try {
          // 従来のキーを削除
          localStorage.removeItem('selectedInstrument');
          localStorage.removeItem('customTheme');
          localStorage.removeItem('isCustomTheme');
          localStorage.removeItem('practiceSettings');
          
          // ユーザーID別のキーもすべて削除
          const localStorageKeys = Object.keys(localStorage);
          const themeLocalKeys = localStorageKeys.filter(key => 
            key.includes('selectedInstrument') ||
            key.includes('customTheme') ||
            key.includes('isCustomTheme') ||
            key.includes('practiceSettings')
          );
          
          themeLocalKeys.forEach(key => {
            try {
              localStorage.removeItem(key);
            } catch (e) {
              // 個別のエラーは無視
            }
          });
          
          if (themeLocalKeys.length > 0) {
            logger.debug('Web localStorageの外観設定キーを削除しました:', themeLocalKeys);
          }
        } catch (error) {
          logger.warn('Web localStorageの削除エラー（無視）:', error);
        }
      }
    } catch (error) {
      logger.warn('外観設定クリアエラー（無視）:', error);
    }
  }, []);

  // 認証済みユーザーの処理（外部から呼び出し可能）
  const fetchUserProfile = useCallback(async (): Promise<AuthUser | null> => {
    try {
      // 現在のユーザーを取得
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        ErrorHandler.handle(userError || new Error('ユーザーが取得できませんでした'), 'ユーザー取得', false);
        return null;
      }
      
      return await handleAuthenticatedUser(user);
    } catch (error) {
      ErrorHandler.handle(error, 'fetchUserProfile', false);
      return null;
    }
  }, [handleAuthenticatedUser]);

  // 認証状態をローカルストレージに保存（セキュア化）
  const saveAuthState = useCallback((state: AuthState) => {
    if (typeof window !== 'undefined' && state.isInitialized) {
      try {
        // セキュアな認証状態のみを保存（機密情報は除外）
        const stateToSave = {
          isAuthenticated: state.isAuthenticated,
          // ユーザー情報は最小限（IDのみ）
          userId: state.user?.id || null,
          // パスワードやトークンは保存しない
        };
        
        // セッションストレージを使用（より安全）
        sessionStorage.setItem('authState', JSON.stringify(stateToSave));
      } catch (error) {
        // エラーは静かに処理
      }
    }
  }, []);

  // 認証状態が変更された時にローカルストレージに保存
  useEffect(() => {
    if (authState.isInitialized) {
      saveAuthState(authState);
    }
  }, [authState, saveAuthState]);

  // ログイン処理
  const signIn = useCallback(async (formData: AuthFormData): Promise<boolean> => {
    try {
      logger.debug('ログイン処理開始:', formData.email);
      
      // ログイン処理開始: updateAuthStateのブロックを一時的に無効化
      isLoginInProgress = true;
      
      // レート制限チェック
      const emailKey = `login:${formData.email.trim().toLowerCase()}`;
      if (rateLimiter.isBlocked(emailKey)) {
        const remainingTime = rateLimiter.getBlockTimeRemaining(emailKey);
        const minutes = Math.ceil(remainingTime / (1000 * 60));
        updateAuthState({ 
          isLoading: false, 
          error: `ログイン試行回数が上限に達しました。${minutes}分後に再試行してください。` 
        });
        isLoginInProgress = false; // エラー時もフラグをリセット
        return false;
      }
      
      updateAuthState({ isLoading: true, error: null });
      
      logger.debug('supabase.auth.signInWithPassword呼び出し前', { email: formData.email.trim().toLowerCase() });
      
      // 根本的な解決: Promise.raceを使わず、タイムアウト後もloginPromiseの完了を待つ
      // タイムアウトは警告のみとし、実際のログイン処理の完了を待つ
      const timeoutMs = 30000;
      let timeoutId: NodeJS.Timeout | null = null;
      let loginCompleted = false;
      
      // タイムアウト警告（ログイン処理は継続）
      timeoutId = setTimeout(() => {
        if (!loginCompleted) {
          logger.warn('ログイン処理が時間がかかっています（タイムアウト時間:', timeoutMs, 'ms）。処理は継続します。');
        }
      }, timeoutMs);
      
      let data: any;
      let error: any;
      
      try {
        logger.debug('supabase.auth.signInWithPassword呼び出し開始');
        const result = await supabase.auth.signInWithPassword({
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
        });
        
        loginCompleted = true;
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        
        data = result.data;
        error = result.error;
        
        logger.debug('supabase.auth.signInWithPassword完了', { 
          hasData: !!data, 
          hasError: !!error,
          errorCode: error?.code
        });
      } catch (loginError: any) {
        loginCompleted = true;
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        
        error = loginError;
        logger.error('supabase.auth.signInWithPassword例外:', loginError);
      }
      
      logger.debug('supabase.auth.signInWithPassword完了', { 
        hasData: !!data, 
        hasError: !!error, 
        errorCode: error?.code,
        errorMessage: error?.message 
      });
      
      if (error) {
        // ネットワークエラー（503）の場合、onAuthStateChangeに任せる
        const isNetworkError = 
          error.status === 503 ||
          (error as any).name === 'AuthRetryableFetchError' ||
          (error as any).message?.includes('Failed to fetch');
        
        if (isNetworkError) {
          logger.warn('ネットワークエラーが発生しました。onAuthStateChangeで認証状態が更新されることを期待します。');
          // ネットワークエラーの場合も、onAuthStateChangeで処理されることを期待
          updateAuthState({ isLoading: false, error: null });
          // ネットワークエラーの場合、onAuthStateChangeで認証状態が更新されるまでフラグを保持
          // ただし、タイムアウトを設定して、一定時間後にフラグをリセット
          setTimeout(() => {
            isLoginInProgress = false;
          }, 5000); // 5秒後にフラグをリセット
          return true; // ネットワークエラーでもtrueを返して、onAuthStateChangeに任せる
        }
        
        // その他のエラー
        ErrorHandler.handle(error, 'ログイン', false);
        
        // ログイン失敗時はレート制限に記録
        rateLimiter.recordAttempt(emailKey);
        
        updateAuthState({ 
          isLoading: false, 
          error: getAuthErrorMessage(error) 
        });
        isLoginInProgress = false; // エラー時もフラグをリセット
        return false;
      }
      
      if (data.user) {
        logger.debug('ログイン成功:', { email: data.user.email, userId: data.user.id });
        
        // ログイン成功時はレート制限をリセット
        try {
          rateLimiter.reset(emailKey);
        } catch (resetError) {
          logger.warn('レート制限リセットでエラーが発生しましたが、ログインは成功しています:', resetError);
        }
        
        // 根本的な解決: signIn関数内ではhandleAuthenticatedUserを呼び出さない
        // onAuthStateChangeのSIGNED_INイベントで自動的にhandleAuthenticatedUserが呼ばれるため、
        // ここではisLoadingのみ更新して、onAuthStateChangeで認証状態が更新されるまで待つ
        try {
          updateAuthState({ isLoading: false, error: null });
        } catch (updateError) {
          logger.warn('認証状態更新でエラーが発生しましたが、ログインは成功しています:', updateError);
        }
        
        // ログイン成功時、onAuthStateChangeで認証状態が更新されるまでフラグを保持
        // ただし、タイムアウトを設定して、一定時間後にフラグをリセット（安全装置）
        try {
          setTimeout(() => {
            isLoginInProgress = false;
            logger.debug('[signIn] ログイン処理フラグをリセットしました（タイムアウト）');
          }, 10000); // 10秒後にフラグをリセット
        } catch (timeoutError) {
          logger.warn('タイムアウト設定でエラーが発生しましたが、ログインは成功しています:', timeoutError);
        }
        
        logger.debug('ログイン処理完了 - onAuthStateChangeで認証状態が更新されます');
        return true;
      }
      
      logger.warn('ログイン成功したがユーザー情報が取得できませんでした');
      updateAuthState({ isLoading: false, error: 'ログインに失敗しました' });
      isLoginInProgress = false; // エラー時もフラグをリセット
      return false;
      
    } catch (error) {
      ErrorHandler.handle(error, 'ログイン処理', false);
      updateAuthState({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'ログインに失敗しました' 
      });
      isLoginInProgress = false; // エラー時もフラグをリセット
      return false;
    }
  }, [handleAuthenticatedUser]);

  // 新規登録処理（認証状態を維持）
  const signUp = useCallback(async (formData: AuthFormData): Promise<boolean> => {
    try {
      logger.debug('新規登録処理開始:', formData.email);
      
      // 新規登録前に既存のセッションをクリア
      try {
        await supabase.auth.signOut();
        logger.debug('既存セッションをクリアしました');
      } catch (clearError) {
        logger.debug('セッションクリア（既にクリア済み）:', clearError);
      }
      
      // 認証状態をリセット
      updateAuthState({ 
        isLoading: true, 
        error: null,
        isAuthenticated: false,
        user: null
      });

      const { data, error } = await supabase.auth.signUp({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        options: {
          data: {
            name: formData.name || formData.email.split('@')[0],
          }
        }
      });

      if (error) {
        ErrorHandler.handle(error, '新規登録', false);
        updateAuthState({ isLoading: false, error: getAuthErrorMessage(error) });
        return false;
      }

      // 新規登録成功時はonAuthStateChangeで認証状態を更新
      if (data.user) {
        logger.debug('新規登録成功:', data.user.email);
        logger.debug('新規登録成功 - onAuthStateChangeで認証状態が更新されます');
        // 新規登録成功後はonAuthStateChangeのSIGNED_INイベントでhandleAuthenticatedUserが呼ばれるため、
        // ここでは直接呼び出さない（重複実行を防ぐ）
        // 外観設定のクリアはログアウト時に行う
        
        return true;
      }

      updateAuthState({ isLoading: false, error: '新規登録に失敗しました' });
      return false;
    } catch (error) {
      ErrorHandler.handle(error, '新規登録処理', false);
      updateAuthState({ isLoading: false, error: error instanceof Error ? error.message : '新規登録に失敗しました' });
      return false;
    }
  }, [handleAuthenticatedUser, clearInstrumentThemeLocal]);

  // Googleログイン処理（一時的に削除 - 後で再実装予定）
  // TODO: Google OAuth認証を再実装する際は、この関数を復元してください
  const signInWithGoogle = useCallback(async (): Promise<boolean> => {
    logger.warn('Googleログイン機能は一時的に無効化されています');
    Alert.alert('機能無効', 'Googleログイン機能は一時的に無効化されています。メール/パスワード認証をご利用ください。');
    return false;
  }, []);

  // ログアウト処理
  const signOut = useCallback(async (): Promise<void> => {
    try {
      logger.info('ログアウト処理開始');
      updateAuthState({ isLoading: true });
      
      // 1. Supabase認証のサインアウト
      await supabase.auth.signOut();
      
      // 2. 楽器/テーマのローカル保存をクリア
      await clearInstrumentThemeLocal();
      
      // 3. OfflineStorageのデータをクリア（練習記録、目標、録音など）
      try {
        const offlineStorageModule = await import('@/lib/offlineStorage');
        if (offlineStorageModule.OfflineStorage && typeof offlineStorageModule.OfflineStorage.clearLocalData === 'function') {
          await offlineStorageModule.OfflineStorage.clearLocalData();
        }
      } catch (error) {
        logger.error('OfflineStorageクリアエラー:', error);
      }
      
      // 4. localStorage/sessionStorageのユーザー固有データをクリア
      if (typeof window !== 'undefined') {
        const userSpecificKeys = [
          'authState',
          'home_calendar_view_date',
          'calendar_view_date',
          'timer_auto_save',
          'timer_sound',
          'timer_sound_type',
          'autoSaveTimer',
        ];
        
        userSpecificKeys.forEach(key => {
          try {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
          } catch (e) {
            // 個別のエラーは無視して続行
          }
        });
        
        // Supabaseのセッションキー（sb-*）をクリア
        try {
          Object.keys(localStorage)
            .filter(key => key.startsWith('sb-'))
            .forEach(key => localStorage.removeItem(key));
        } catch (e) {
          // エラーは無視して続行
        }
      }
      
      // 5. AsyncStorageのユーザー固有データをクリア
      try {
        const allKeys = await AsyncStorage.getAllKeys();
        const userDataKeys = allKeys.filter(key => 
          key.startsWith('practice_') ||
          key.startsWith('goal_') ||
          key.startsWith('recording_') ||
          key.includes('user_') ||
          key === 'home_calendar_view_date' ||
          key === 'calendar_view_date' ||
          key.startsWith('timer_') ||
          key.includes('selectedInstrument') ||
          key.includes('customTheme') ||
          key.includes('practiceSettings') ||
          key.includes('user_practice_level')
        );
        
        if (userDataKeys.length > 0) {
          await AsyncStorage.multiRemove(userDataKeys);
        }
      } catch (error) {
        logger.error('AsyncStorageクリアエラー:', error);
      }
      
      // 6. 認証状態をリセット
      updateAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
      
      logger.info('ログアウト完了 - すべてのユーザーデータをクリアしました');
      
    } catch (error) {
      ErrorHandler.handle(error, 'ログアウト処理', false);
      updateAuthState({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'ログアウトに失敗しました' 
      });
    }
  }, [clearInstrumentThemeLocal]);
  
  // signOut関数の参照を更新（useEffectで使用するため）
  useEffect(() => {
    signOutRef.current = signOut;
  }, [signOut]);

  // セッションクリア処理（新規登録用）
  const clearSession = useCallback(async (): Promise<void> => {
    try {
      logger.debug('セッションクリア処理開始');
      updateAuthState({ isLoading: true });
      
      await supabase.auth.signOut();
      // 楽器/テーマのローカル保存もクリア
      await clearInstrumentThemeLocal();
      
      // セッションストレージをクリア
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('authState');
        localStorage.removeItem('authState'); // 既存のlocalStorageもクリア
      }
      
      updateAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
      
      logger.debug('セッションクリア完了');
      
    } catch (error) {
      ErrorHandler.handle(error, 'セッションクリア処理', false);
      updateAuthState({ 
        isLoading: false, 
        error: 'セッションクリアに失敗しました' 
      });
    }
  }, [clearInstrumentThemeLocal]);

  // パスワードリセット処理
  const resetPassword = useCallback(async (email: string): Promise<boolean> => {
    try {
      logger.debug('パスワードリセット処理開始:', email);
      
      // レート制限チェック
      const emailKey = `reset:${email.trim().toLowerCase()}`;
      if (rateLimiter.isBlocked(emailKey)) {
        const remainingTime = rateLimiter.getBlockTimeRemaining(emailKey);
        const minutes = Math.ceil(remainingTime / (1000 * 60));
        updateAuthState({ 
          isLoading: false,
          error: `パスワードリセットの試行回数が上限に達しました。${minutes}分後に再試行してください。`
        });
        return false;
      }

      // レート制限記録
      if (!rateLimiter.recordAttempt(emailKey)) {
        updateAuthState({ 
          isLoading: false,
          error: 'パスワードリセットの試行回数が上限に達しました。しばらく時間をおいてから再試行してください。'
        });
        return false;
      }

      updateAuthState({ isLoading: true, error: null });

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}${getBasePath()}/auth/reset-password` : '',
      });

      if (error) {
        ErrorHandler.handle(error, 'パスワードリセット', false);
        updateAuthState({ 
          isLoading: false, 
          error: getAuthErrorMessage(error) 
        });
        return false;
      }

      logger.debug('パスワードリセットメール送信成功');
      updateAuthState({ 
        isLoading: false, 
        error: null 
      });
      
      return true;
    } catch (error) {
      ErrorHandler.handle(error, 'パスワードリセット処理', false);
      updateAuthState({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'パスワードリセットに失敗しました' 
      });
      return false;
    }
  }, []);

  // エラーメッセージのクリア
  const clearError = useCallback(() => {
    updateAuthState({ error: null });
  }, []);

  // 楽器選択状態のチェック
  const hasInstrumentSelected = useCallback((): boolean => {
    return !!(authState.user?.selected_instrument_id);
  }, [authState.user]);

  // チュートリアル必要状態のチェック（新規登録ユーザーも含む）
  // 楽器が選択されている、またはチュートリアルが完了している場合はチュートリアルをスキップ
  const needsTutorial = useCallback((): boolean => {
    if (!authState.isAuthenticated) {
      return false;
    }
    // チュートリアルが既に完了している場合は、チュートリアルをスキップ
    if (authState.user?.tutorial_completed === true) {
      return false;
    }
    // 楽器が選択されている場合は、既存ユーザーとみなしてチュートリアルをスキップ
    if (hasInstrumentSelected()) {
      return false;
    }
    // 楽器が選択されていない場合はチュートリアルが必要
    return true;
  }, [authState.isAuthenticated, authState.user?.tutorial_completed, hasInstrumentSelected]);

  // メインアプリアクセス可能状態のチェック
  const canAccessMainApp = useCallback((): boolean => {
    return authState.isAuthenticated && hasInstrumentSelected();
  }, [authState.isAuthenticated, hasInstrumentSelected]);

  return {
    ...authState,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    clearSession,
    resetPassword,
    clearError,
    hasInstrumentSelected,
    needsTutorial,
    canAccessMainApp,
    fetchUserProfile,
  };
};

// 認証エラーメッセージの取得
const getAuthErrorMessage = (error: unknown): string => {
  if (!error) return '認証エラーが発生しました';
  
  // エラーオブジェクトの型ガード
  const isErrorObject = (err: unknown): err is { code?: string | number; status?: number; message?: string } => {
    return typeof err === 'object' && err !== null;
  };
  
  const errorObj = isErrorObject(error) ? error : null;
  const errorCode = errorObj?.code ?? errorObj?.status;
  const errorMessage = errorObj?.message ?? (typeof error === 'string' ? error : String(error));
  
  // 根本的に厳密な判定：エラーコードを優先
  // エラーコードが明確な場合のみ「登録済み」と判定
  if (errorCode === 'user_already_exists' || errorCode === 'user_already_registered') {
    return 'このメールアドレスは既に登録されています';
  }
  
  // メッセージベースの判定（Supabaseの既定文言、誤判定を防ぐ）
  const message = errorMessage.toLowerCase();
  if (message.includes('user not found') || message.includes('user does not exist')) {
    return 'このユーザーは登録されていません';
  }
  if (message.includes('invalid login credentials')) {
    return 'メールアドレスまたはパスワードが正しくありません';
  }
  
  // エラーメッセージの文字列マッチング（完全一致パターンのみ、誤判定を防ぐ）
  // 広すぎる判定（例: 'already exists'だけ）は削除
  const hasExactAlreadyRegisteredMessage = 
    message === 'user already registered' ||
    message === 'email address is already registered' ||
    message === 'user already exists' ||
    message === 'email address is already in use' ||
    (message.includes('user already registered') && !message.includes('not') && !message.includes('cannot'));
  
  // エラーコードが存在する場合のみ、メッセージベースの判定を使用（誤判定を防ぐ）
  if (errorCode && hasExactAlreadyRegisteredMessage) {
    return 'このメールアドレスは既に登録されています';
  }
  
  if (message.includes('email not confirmed')) {
    return 'メールアドレスの確認が完了していません';
  }

  switch (errorCode) {
    case 'user_not_found':
      return 'このユーザーは登録されていません';
    case 'invalid_credentials':
      return 'メールアドレスまたはパスワードが正しくありません';
    case 'user_already_exists':
      return 'このメールアドレスは既に登録されています';
    case 'weak_password':
      return 'パスワードが弱すぎます。より強力なパスワードを設定してください';
    case 'email_not_confirmed':
      return 'メールアドレスの確認が完了していません';
    case 'too_many_requests':
      return 'リクエストが多すぎます。しばらく時間をおいてから再度お試しください';
    case 400:
      // 多くの場合「Invalid login credentials」なので上で処理済み
      return 'リクエストが無効です';
    case 401:
      return '認証に失敗しました';
    case 422:
      return '入力データが無効です';
    case 429:
      return 'リクエストが多すぎます。しばらく時間をおいてから再度お試しください';
    case 500:
      return 'サーバーエラーが発生しました';
    case 503:
      return 'サーバーに接続できません。ネットワーク接続を確認してください';
    default:
      // ネットワークエラーのチェック（メッセージベース）
      if (errorMessage?.includes('Failed to fetch') || errorMessage?.includes('NetworkError') || (error as any).name === 'AuthRetryableFetchError') {
        return 'ネットワーク接続エラーが発生しました。インターネット接続を確認してください';
      }
      return errorMessage || '認証エラーが発生しました';
  }
};