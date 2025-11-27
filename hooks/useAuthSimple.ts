/**
 * シンプルな認証フック
 * 
 * このフックは認証状態の管理のみを行います。
 * 複雑なエラーハンドリングやリトライロジックは含めず、シンプルに実装します。
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import * as authService from '@/lib/authService';
import logger from '@/lib/logger';
import { STORAGE_KEYS, withUser } from '@/lib/storageKeys';
import { storageManager, emitStorageEvent } from '@/lib/storageManager';
import { performanceTracker } from '@/lib/performanceTracker';

const AUTH_HOOK_CONTEXT = 'useAuthSimple';

export interface SimpleAuthUser {
  id: string;
  email: string;
  displayName?: string;
  tutorialCompleted?: boolean;
}

export interface SimpleAuthState {
  user: SimpleAuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
}

export interface SimpleAuthHookReturn extends SimpleAuthState {
  signUp: (email: string, password: string) => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<boolean>;
  hasInstrumentSelected: () => boolean;
  needsTutorial: () => boolean;
  canAccessMainApp: () => boolean;
}

/**
 * シンプルな認証フック
 */
export function useAuthSimple(): SimpleAuthHookReturn {
  const router = useRouter();
  const [authState, setAuthState] = useState<SimpleAuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    isInitialized: false,
  });

  // 楽器選択状態を追跡（ローカルストレージから読み込む）
  const [hasInstrument, setHasInstrument] = useState<boolean>(false);

  /**
   * 認証状態を更新
   */
  const updateAuthState = useCallback((updates: Partial<SimpleAuthState>) => {
    setAuthState(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * ユーザー情報を設定
   */
  const setUser = useCallback((user: SimpleAuthUser | null) => {
    updateAuthState({
      user,
      isAuthenticated: !!user,
      isLoading: false,
      isInitialized: true,
    });
  }, [updateAuthState]);

  /**
   * サインアップ（新規登録）
   */
  const signUp = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      updateAuthState({ isLoading: true });

      const result = await authService.signUp(email, password);

      if (!result.success) {
        updateAuthState({ isLoading: false });
        return false;
      }

      // ユーザー情報を取得
      const { user } = await authService.getCurrentUser();
      if (user) {
        // プロフィール取得を試みる（新規登録直後はプロフィールが存在しない可能性があるため、エラーは無視）
        // getUserProfileはエラーを返さないように修正されているため、エラーチェックは不要
        const profileResult = await authService.getUserProfile(user.id);
        setUser({
          id: user.id,
          email: user.email || email,
          displayName: profileResult.profile?.display_name || email.split('@')[0],
          tutorialCompleted: profileResult.profile?.tutorial_completed ?? false,
        });
      } else {
        updateAuthState({ isLoading: false });
      }

      return true;
    } catch (error: any) {
      logger.error(`[${AUTH_HOOK_CONTEXT}] signUp:exception`, { error });
      updateAuthState({ isLoading: false });
      return false;
    }
  }, [updateAuthState, setUser]);

  /**
   * サインイン（ログイン）
   */
  const signIn = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      updateAuthState({ isLoading: true });

      const result = await authService.signIn(email, password);

      if (!result.success) {
        updateAuthState({ isLoading: false });
        return false;
      }

      // ユーザー情報を取得（タイムアウト付き、エラー時も続行）
      try {
        const getUserPromise = authService.getCurrentUser();
        const timeoutPromise = new Promise<{ user: null; error: string }>((resolve) => {
          setTimeout(() => {
            resolve({ user: null, error: 'タイムアウト' });
          }, 8000); // 8秒でタイムアウト
        });
        
        const { user } = await Promise.race([getUserPromise, timeoutPromise]);
        
        if (user) {
          // プロフィール取得は非ブロッキングで実行（エラー時も続行）
          // プロフィール取得に失敗してもログインは成功として扱う
          authService.getUserProfile(user.id).then((profileResult) => {
            setUser({
              id: user.id,
              email: user.email || email,
              displayName: profileResult.profile?.display_name || email.split('@')[0],
              tutorialCompleted: profileResult.profile?.tutorial_completed ?? false,
            });
          }).catch((profileError) => {
            // プロフィール取得に失敗しても、ユーザー情報は設定する
            logger.debug(`[${AUTH_HOOK_CONTEXT}] signIn:profile-error`, { error: profileError });
            setUser({
              id: user.id,
              email: user.email || email,
              displayName: email.split('@')[0],
              tutorialCompleted: false,
            });
          });
          
          // プロフィール取得を待たずに、まずユーザー情報を設定（ログインをブロックしない）
          setUser({
            id: user.id,
            email: user.email || email,
            displayName: email.split('@')[0],
            tutorialCompleted: false,
          });
        } else {
          // ユーザー取得に失敗した場合でも、認証は成功している可能性がある
          // 認証状態の監視に任せる
          logger.debug(`[${AUTH_HOOK_CONTEXT}] signIn:getUser-timeout-or-error`);
          updateAuthState({ isLoading: false });
        }
      } catch (getUserError) {
        // ユーザー取得エラーでも、認証は成功している可能性がある
        // 認証状態の監視に任せる
        logger.debug(`[${AUTH_HOOK_CONTEXT}] signIn:getUser-error`, { error: getUserError });
        updateAuthState({ isLoading: false });
      }

      return true;
    } catch (error: any) {
      logger.error(`[${AUTH_HOOK_CONTEXT}] signIn:exception`, { error });
      updateAuthState({ isLoading: false });
      return false;
    }
  }, [updateAuthState, setUser]);

  /**
   * サインアウト（ログアウト）
   */
  const signOut = useCallback(async (): Promise<boolean> => {
    try {
      updateAuthState({ isLoading: true });

      const result = await authService.signOut();

      if (!result.success) {
        updateAuthState({ isLoading: false });
        return false;
      }

      setUser(null);
      return true;
    } catch (error: any) {
      logger.error(`[${AUTH_HOOK_CONTEXT}] signOut:exception`, { error });
      updateAuthState({ isLoading: false });
      return false;
    }
  }, [updateAuthState, setUser]);

  /**
   * 認証状態を初期化
   */
  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout | null = null;
    let subscription: { unsubscribe: () => void } | null = null;

    const initializeAuth = async () => {
      try {
        logger.debug(`[${AUTH_HOOK_CONTEXT}] initializeAuth:start`);

        // タイムアウトを設定（5秒で強制的に初期化を完了）
        timeoutId = setTimeout(() => {
          if (mounted) {
            logger.debug(`[${AUTH_HOOK_CONTEXT}] initializeAuth:timeout`);
            updateAuthState({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              isInitialized: true,
            });
            performanceTracker.markAuthInitialized();
          }
        }, 5000);

        // 一般的なアプリのパターン：まずlocalStorageからセッションを確認（高速）
        let session = null;
        
        // localStorageから直接セッションを読み込む（一般的なアプリのパターン）
        if (typeof window !== 'undefined') {
          try {
            const storageKey = 'music-practice-auth';
            const sessionString = window.localStorage.getItem(storageKey);
            if (sessionString) {
              const sessionData = JSON.parse(sessionString);
              const currentSession = sessionData?.currentSession;
              if (currentSession?.access_token && currentSession?.user) {
                // localStorageにセッションがある場合は、それを認証済みとして扱う
                logger.debug(`[${AUTH_HOOK_CONTEXT}] localStorageからセッションを検出`);
                session = currentSession;
              }
            }
          } catch (localStorageError) {
            logger.warn(`[${AUTH_HOOK_CONTEXT}] localStorageからのセッション読み込みエラー（続行）:`, localStorageError);
          }
        }
        
        // localStorageにセッションがない場合のみ、Supabaseから取得を試行（タイムアウト付き）
        if (!session) {
          try {
            const sessionPromise = authService.getSession();
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Session timeout')), 2000)
            );
            
            const result = await Promise.race([sessionPromise, timeoutPromise]);
            session = (result as any).session;
          } catch (timeoutError) {
            // タイムアウト時は未認証として処理（localStorageにもセッションがない場合）
            logger.debug(`[${AUTH_HOOK_CONTEXT}] getSessionタイムアウト（localStorageにもセッションなし）`);
            if (timeoutId) clearTimeout(timeoutId);
            if (mounted) {
              updateAuthState({
                user: null,
                isAuthenticated: false,
                isLoading: false,
                isInitialized: true,
              });
              performanceTracker.markAuthInitialized();
            }
            return;
          }
        }
        
        if (!session) {
          if (timeoutId) clearTimeout(timeoutId);
          if (mounted) {
            updateAuthState({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              isInitialized: true,
            });
          }
          return;
        }

        // ユーザー情報を取得（タイムアウト付き）
        // localStorageからセッションを取得した場合は、そのユーザー情報を使用
        let user, userError;
        
        if (session?.user) {
          // localStorageから取得したセッションにユーザー情報が含まれている場合は、それを使用
          user = session.user;
          userError = null;
          logger.debug(`[${AUTH_HOOK_CONTEXT}] localStorageのセッションからユーザー情報を取得`);
        } else {
          // セッションにユーザー情報がない場合のみ、Supabaseから取得を試行
          const userPromise = authService.getCurrentUser();
          const userTimeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('User timeout')), 2000)
          );
          
          try {
            const result = await Promise.race([userPromise, userTimeoutPromise]);
            user = (result as any).user;
            userError = (result as any).error;
          } catch (timeoutError) {
            // タイムアウト時は未認証として処理
            if (timeoutId) clearTimeout(timeoutId);
            if (mounted) {
              updateAuthState({
                user: null,
                isAuthenticated: false,
                isLoading: false,
                isInitialized: true,
              });
              performanceTracker.markAuthInitialized();
            }
            return;
          }
        }
        
        if (userError && userError.includes('Forbidden')) {
          // 403エラーはセッションが無効
          logger.debug(`[${AUTH_HOOK_CONTEXT}] initializeAuth:forbidden`);
          if (timeoutId) clearTimeout(timeoutId);
          await authService.signOut();
          if (mounted) {
            updateAuthState({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              isInitialized: true,
            });
          }
          return;
        }

        if (!user) {
          if (timeoutId) clearTimeout(timeoutId);
          if (mounted) {
            updateAuthState({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              isInitialized: true,
            });
          }
          return;
        }

        // プロフィールを取得（タイムアウト付き、オプショナル）
        try {
          const profilePromise = authService.getUserProfile(user.id);
          const profileTimeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Profile timeout')), 2000)
          );
          
          let profileResult;
          try {
            profileResult = await Promise.race([profilePromise, profileTimeoutPromise]);
          } catch (profileTimeoutError) {
            // プロフィール取得がタイムアウトしても続行（デフォルト値を使用）
            profileResult = { profile: null };
          }
          
          if (timeoutId) clearTimeout(timeoutId);
          if (mounted) {
            setUser({
              id: user.id,
              email: user.email || '',
              displayName: (profileResult as any).profile?.display_name || user.email?.split('@')[0],
              tutorialCompleted: (profileResult as any).profile?.tutorial_completed ?? false,
            });
            // 認証初期化完了を記録
            performanceTracker.markAuthInitialized();
          }
        } catch (profileError) {
          // プロフィール取得エラーでも続行
          if (timeoutId) clearTimeout(timeoutId);
          if (mounted) {
            setUser({
              id: user.id,
              email: user.email || '',
              displayName: user.email?.split('@')[0],
              tutorialCompleted: false,
            });
            performanceTracker.markAuthInitialized();
          }
        }
      } catch (error: any) {
        logger.error(`[${AUTH_HOOK_CONTEXT}] initializeAuth:exception`, { error });
        if (timeoutId) clearTimeout(timeoutId);
        if (mounted) {
          updateAuthState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            isInitialized: true,
          });
          // 認証初期化完了を記録（エラー時も）
          performanceTracker.markAuthInitialized();
        }
      }
    };

    initializeAuth();

    // 認証状態の変更を監視
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      logger.debug(`[${AUTH_HOOK_CONTEXT}] onAuthStateChange`, { event });

      if (!mounted) return;

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          // プロフィール取得を試みる（新規登録直後はプロフィールが存在しない可能性があるため、エラーは無視）
          // getUserProfileはエラーを返さないように修正されているため、エラーチェックは不要
          const profileResult = await authService.getUserProfile(session.user.id);
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            displayName: profileResult.profile?.display_name || session.user.email?.split('@')[0] || '',
            tutorialCompleted: profileResult.profile?.tutorial_completed ?? false,
          });
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });
    subscription = authSubscription;

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      if (subscription) subscription.unsubscribe();
    };
  }, [updateAuthState, setUser]);

  // 楽器選択状態をストレージマネージャーから読み込む（イベントベース、ポーリング不要）
  useEffect(() => {
    if (!authState.user?.id) {
      setHasInstrument(false);
      return;
    }

    const userId = authState.user.id;
    
    // 複数のキー形式を試す
    const userKey1 = withUser(STORAGE_KEYS.selectedInstrument, userId);
    const userKey2 = `${STORAGE_KEYS.selectedInstrument}:${userId}`;
    const legacyKey = STORAGE_KEYS.selectedInstrument;

    // 初回読み込み（メモリキャッシュ優先）
    const checkInstrumentSelection = () => {
      let instrumentId: string | null = null;
      
      // ストレージマネージャーから読み込み（メモリキャッシュ優先）
      instrumentId = storageManager.get(userKey1) || 
                     storageManager.get(userKey2) || 
                     storageManager.get(legacyKey);
      
      // グローバルキャッシュもチェック（後方互換性）
      if (!instrumentId && (globalThis as any).__last_selected_instrument_id) {
        instrumentId = (globalThis as any).__last_selected_instrument_id;
      }
      
      const hasInstrumentValue = !!instrumentId && instrumentId.trim() !== '';
      setHasInstrument(hasInstrumentValue);
    };

    // 初回チェック（即座に）
    checkInstrumentSelection();

    // ストレージから非同期で読み込んでメモリキャッシュに保存
    storageManager.hydrateMultiple([userKey1, userKey2, legacyKey]).then(() => {
      checkInstrumentSelection();
    });

    // ストレージ変更を監視（イベントベース、ポーリング不要）
    const unsubscribe1 = storageManager.subscribe(userKey1, () => {
      checkInstrumentSelection();
    });
    const unsubscribe2 = storageManager.subscribe(userKey2, () => {
      checkInstrumentSelection();
    });
    const unsubscribe3 = storageManager.subscribe(legacyKey, () => {
      checkInstrumentSelection();
    });

    // グローバルイベントも監視（Web環境）
    const handleStorageEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.key === userKey1 || 
          customEvent.detail?.key === userKey2 || 
          customEvent.detail?.key === legacyKey) {
        checkInstrumentSelection();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storageChange', handleStorageEvent);
    }

    return () => {
      unsubscribe1();
      unsubscribe2();
      unsubscribe3();
      if (typeof window !== 'undefined') {
        window.removeEventListener('storageChange', handleStorageEvent);
      }
    };
  }, [authState.user?.id, authState.isAuthenticated]);

  // 楽器選択状態のチェック
  const hasInstrumentSelected = useCallback((): boolean => {
    return hasInstrument;
  }, [hasInstrument]);

  // チュートリアル必要状態のチェック
  // 既存ユーザー（楽器選択済み、またはtutorial_completedがtrue）の場合はチュートリアルをスキップ
  const needsTutorial = useCallback((): boolean => {
    if (!authState.isAuthenticated) {
      return false;
    }
    // チュートリアルが既に完了している場合は、チュートリアルをスキップ
    if (authState.user?.tutorialCompleted === true) {
      return false;
    }
    // 楽器が選択されている場合は、既存ユーザーとみなしてチュートリアルをスキップ
    if (hasInstrumentSelected()) {
      return false;
    }
    // 楽器が選択されていない場合はチュートリアルが必要
    return true;
  }, [authState.isAuthenticated, authState.user?.tutorialCompleted, hasInstrumentSelected]);

  // メインアプリアクセス可能状態のチェック
  const canAccessMainApp = useCallback((): boolean => {
    return authState.isAuthenticated && hasInstrumentSelected();
  }, [authState.isAuthenticated, hasInstrumentSelected]);

  return {
    ...authState,
    signUp,
    signIn,
    signOut,
    hasInstrumentSelected,
    needsTutorial,
    canAccessMainApp,
  };
}

