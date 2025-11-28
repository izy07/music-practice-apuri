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
import { supabase } from '@/lib/supabase';
import { createRateLimiter } from '@/lib/authSecurity';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import { TIMEOUT } from '@/lib/constants';

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

// 認証状態を更新し、リスナーに通知
const updateAuthState = (newState: Partial<AuthState>) => {
  globalAuthState = { ...globalAuthState, ...newState };
  authStateListeners.forEach(listener => listener(globalAuthState));
};

// 認証フックのメイン関数
export const useAuthAdvanced = (): AuthHookReturn => {
  const router = useRouter();
  const segments = useSegments();
  
  // レート制限インスタンス
  const rateLimiter = useRef(createRateLimiter()).current;
  
  // 新規登録画面の場合はユーザー取得を停止（Hooksの順序を保持）
  const authChild = segments[1];
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
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        updateAuthState({
          isAuthenticated: false,
          isLoading: false,
          isInitialized: true,
          error: sessionError.message,
        });
        return;
      }
      
      if (sessionData.session?.user) {
        await handleAuthenticatedUser(sessionData.session.user);
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
    initializeAuth();
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
              await supabase.auth.refreshSession();
            } catch (e) {
              // 失敗時は静かに。UI側で必要に応じ通知
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
          supabase.auth.refreshSession().catch(() => {});
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
  }, []);

  // 内部用の認証済みユーザー処理
  const handleAuthenticatedUser = useCallback(async (user: any): Promise<AuthUser | null> => {
    try {
      
      // ユーザープロフィールを取得
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (profileError) {
        ErrorHandler.handle(profileError, 'プロフィール取得', false);
        
        // プロフィールが存在しない場合は新規作成
        const displayName = user.user_metadata?.display_name || user.user_metadata?.name || user.email?.split('@')[0] || 'ユーザー';
        
        const { data: newProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: user.id,
            display_name: displayName,
            practice_level: 'beginner',
            total_practice_minutes: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (createError) {
          ErrorHandler.handle(createError, 'プロフィール作成', false);
          // プロフィール作成に失敗した場合は基本情報のみで処理
          const fallbackName = user.user_metadata?.display_name || user.user_metadata?.name || user.email?.split('@')[0] || 'ユーザー';
          const authUser: AuthUser = {
            id: user.id,
            email: user.email || '',
            name: fallbackName,
            avatar_url: user.user_metadata?.avatar_url,
            created_at: user.created_at,
            last_sign_in_at: user.last_sign_in_at,
            selected_instrument_id: null,
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
        const authUser: AuthUser = {
          id: user.id,
          email: user.email || '',
          name: newProfile.display_name || user.user_metadata?.name || user.email?.split('@')[0] || 'ユーザー',
          avatar_url: newProfile.avatar_url || user.user_metadata?.avatar_url,
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at,
          selected_instrument_id: newProfile.selected_instrument_id || null,
          tutorial_completed: newProfile.tutorial_completed || false,
          onboarding_completed: newProfile.onboarding_completed || false,
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
      
      // プロフィール情報をAuthUser形式に変換
      const profileName = profile.display_name || user.user_metadata?.display_name || user.user_metadata?.name || user.email?.split('@')[0] || 'ユーザー';
      const authUser: AuthUser = {
        id: user.id,
        email: user.email || '',
        name: profileName,
        avatar_url: profile.avatar_url,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        selected_instrument_id: profile.selected_instrument_id || null,
        tutorial_completed: profile.tutorial_completed || false,
        onboarding_completed: profile.onboarding_completed || false,
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
      
      return authUser;
      
    } catch (error) {
      ErrorHandler.handle(error, '認証済みユーザー処理', false);
      updateAuthState({
        isAuthenticated: false,
        isLoading: false,
        isInitialized: true,
        error: error instanceof Error ? error.message : 'ユーザー情報の取得に失敗しました',
      });
      return null;
    }
  }, []);

  // 楽器テーマ関連のローカル保存をクリア（ユーザー切り替え時用）
  const clearInstrumentThemeLocal = useCallback(async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem('selectedInstrument'),
        AsyncStorage.removeItem('customTheme'),
        AsyncStorage.removeItem('isCustomTheme'),
        AsyncStorage.removeItem('practiceSettings'),
      ]);
      // WebのlocalStorage/sessionStorageに重複保存している可能性にも対応
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('selectedInstrument');
          localStorage.removeItem('customTheme');
          localStorage.removeItem('isCustomTheme');
          localStorage.removeItem('practiceSettings');
        } catch {}
      }
    } catch {}
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
      
      // レート制限チェック
      const emailKey = `login:${formData.email.trim().toLowerCase()}`;
      if (rateLimiter.isBlocked(emailKey)) {
        const remainingTime = rateLimiter.getBlockTimeRemaining(emailKey);
        const minutes = Math.ceil(remainingTime / (1000 * 60));
        updateAuthState({ 
          isLoading: false, 
          error: `ログイン試行回数が上限に達しました。${minutes}分後に再試行してください。` 
        });
        return false;
      }
      
      updateAuthState({ isLoading: true, error: null });
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });
      
      if (error) {
        ErrorHandler.handle(error, 'ログイン', false);
        
        // ログイン失敗時はレート制限に記録
        rateLimiter.recordAttempt(emailKey);
        
        updateAuthState({ 
          isLoading: false, 
          error: getAuthErrorMessage(error) 
        });
        return false;
      }
      
      if (data.user) {
        logger.debug('ログイン成功:', data.user.email);
        await handleAuthenticatedUser(data.user);
        return true;
      }
      
      updateAuthState({ isLoading: false, error: 'ログインに失敗しました' });
      return false;
      
    } catch (error) {
      ErrorHandler.handle(error, 'ログイン処理', false);
      updateAuthState({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'ログインに失敗しました' 
      });
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

      // 新規登録成功時は即座に認証状態を更新
      if (data.user) {
        logger.debug('新規登録成功:', data.user.email);
        logger.debug('新規登録成功 - 認証状態を更新');
        // 以前のユーザーのローカルテーマ・楽器設定を完全クリア
        await clearInstrumentThemeLocal();
        // 新規登録成功後は即座に認証状態を更新
        await handleAuthenticatedUser(data.user);
        
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
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/reset-password` : '',
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
  const needsTutorial = useCallback((): boolean => {
    return authState.isAuthenticated && !hasInstrumentSelected();
  }, [authState.isAuthenticated, hasInstrumentSelected]);

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
  
  // メッセージベースの判定（Supabaseの既定文言）
  const message = errorMessage.toLowerCase();
  if (message.includes('invalid login credentials')) {
    return 'メールアドレスまたはパスワードが正しくありません';
  }
  if (message.includes('user already registered') || message.includes('already exists') || message.includes('email address is already in use')) {
    return 'このメールアドレスは既に登録されています';
  }
  if (message.includes('email not confirmed')) {
    return 'メールアドレスの確認が完了していません';
  }

  switch (errorCode) {
    case 'user_not_found':
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
    default:
      return errorMessage || '認証エラーが発生しました';
  }
};