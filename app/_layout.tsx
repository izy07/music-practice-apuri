// メインのレイアウトファイル - アプリ全体の構造と認証ルーティングを管理
import React, { useRef, useEffect } from 'react';
import { View, LogBox } from 'react-native';
import { Stack } from 'expo-router'; // 画面遷移のスタックナビゲーター
import { Platform } from 'react-native';
import { useRouter, useSegments } from 'expo-router'; // ルーティング関連のフック
import { useFrameworkReady } from '@/hooks/useFrameworkReady'; // フレームワーク準備状態の管理
import { useAuthAdvanced } from '@/hooks/useAuthAdvanced'; // 認証フック（統一版）
import { useIdleTimeout } from '@/hooks/useIdleTimeout'; // アイドルタイムアウト機能
import { LanguageProvider } from '@/components/LanguageContext'; // 多言語対応の管理
import { InstrumentThemeProvider } from '@/components/InstrumentThemeContext'; // 楽器別テーマの管理
import LoadingSkeleton from '@/components/LoadingSkeleton'; // ローディング表示コンポーネント
import { supabase } from '@/lib/supabase'; // Supabaseクライアント
import { RoutePath } from '@/types/common'; // ルートパス型
import { TIMEOUT } from '@/lib/constants'; // タイムアウト定数
import logger from '@/lib/logger'; // ロガー
import { ErrorHandler } from '@/lib/errorHandler'; // エラーハンドラー
import { getBasePath, navigateWithBasePath } from '@/lib/navigationUtils'; // ベースパス取得関数とナビゲーション関数

// Web環境ではexpo-status-barをインポートしない
type StatusBarComponent = React.ComponentType<{ style: 'dark' | 'light' | 'auto' }>;
let StatusBar: StatusBarComponent | null = null;
if (Platform.OS !== 'web') {
  try {
    StatusBar = require('expo-status-bar').StatusBar as StatusBarComponent;
  } catch (error) {
    logger.warn('expo-status-bar not available:', error);
  }
}

// メインコンテンツコンポーネント - 認証状態に基づく画面遷移を制御
function RootLayoutContent() {
  // フレームワークの準備状態を取得（アプリ起動時の初期化完了を待つ）
  const { isReady } = useFrameworkReady();
  
  // ルーティング関連のフック
  const router = useRouter(); // 画面遷移を実行するためのルーター
  const segments = useSegments() as readonly string[]; // 現在のURLパスを配列で取得
  
  // 認証フックを常に実行（Hooksの順序を保持）
  const { 
    isAuthenticated, 
    isLoading, 
    isInitialized,
    hasInstrumentSelected,
    needsTutorial,
    canAccessMainApp,
    signOut 
  } = useAuthAdvanced();

  // アイドルタイムアウト機能（1時間操作なしで自動ログアウト）
  // useAuthAdvancedのsignOutはPromise<void>を返すため、そのまま使用可能
  const handleSignOut = React.useCallback(async (): Promise<void> => {
    await signOut();
  }, [signOut]);
  
  useIdleTimeout({
    isAuthenticated,
    onLogout: handleSignOut,
    timeoutMs: TIMEOUT.IDLE_MS,
    enabled: isAuthenticated && !isLoading && isInitialized, // 認証済みで初期化完了時のみ有効
  });
  
  // すべてのuseRefを条件分岐の前に配置（Hooksの順序を保持）
  const navigatingRef = useRef(false); // 重複遷移防止
  const lastPathRef = useRef<string | null>(null);
  const signupProcessingRef = useRef(false); // 新規登録処理中フラグ

  // React Native Web特有の警告を抑制（開発時のノイズを減らす）
  React.useEffect(() => {
    // LogBoxはReact Native環境でのみ有効（Web環境では無効）
    if (Platform.OS !== 'web') {
      LogBox.ignoreLogs([
        'Unexpected text node',
        // pointerEventsの警告は、Expo RouterのBottomTabBarが内部でAnimatedコンポーネントを使用しているため、
        // 直接修正は困難。警告を抑制する。
        'props.pointerEvents is deprecated. Use style.pointerEvents',
        // aria-hidden警告は、モーダルやオーバーレイでフォーカス管理が適切に行われている場合でも
        // 発生する可能性があるため、開発環境でのみ抑制する。
        'Blocked aria-hidden',
      ]);
    } else {
      // Web環境では、コンソールの警告を抑制（開発環境のみ）
      if (__DEV__ && typeof window !== 'undefined' && typeof console !== 'undefined') {
        const originalWarn = console.warn;
        const originalError = console.error;
        const originalLog = console.log;
        
        // console.warnの抑制
        console.warn = (...args: unknown[]) => {
          const message = args[0]?.toString() || '';
          // pointerEventsの警告を無視
          if (message.includes('props.pointerEvents is deprecated')) {
            return;
          }
          // aria-hidden警告を無視（より広範囲にマッチ）
          if (message.includes('Blocked aria-hidden') || 
              message.includes('aria-hidden') || 
              message.includes('descendant retained focus') ||
              message.includes('assistive technology') ||
              message.includes('The focus must not be hidden') ||
              message.includes('WAI-ARIA')) {
            return;
          }
          originalWarn.apply(console, args);
        };
        
        // console.errorの抑制（aria-hidden警告がerrorとして表示される場合がある）
        console.error = (...args: unknown[]) => {
          const message = args[0]?.toString() || '';
          // aria-hidden警告を無視
          if (message.includes('Blocked aria-hidden') || 
              message.includes('aria-hidden') || 
              message.includes('descendant retained focus') ||
              message.includes('assistive technology') ||
              message.includes('The focus must not be hidden') ||
              message.includes('WAI-ARIA')) {
            return;
          }
          originalError.apply(console, args);
        };
        
        // console.logの抑制（aria-hidden警告がlogとして表示される場合がある）
        console.log = (...args: unknown[]) => {
          const message = args[0]?.toString() || '';
          // aria-hidden警告を無視
          if (message.includes('Blocked aria-hidden') || 
              message.includes('aria-hidden') || 
              message.includes('descendant retained focus') ||
              message.includes('assistive technology') ||
              message.includes('The focus must not be hidden') ||
              message.includes('WAI-ARIA')) {
            return;
          }
          originalLog.apply(console, args);
        };
        
        // エラーイベントリスナーでaria-hidden警告を抑制
        if (typeof window.addEventListener === 'function') {
          window.addEventListener('error', (event: Event) => {
            const errorEvent = event as ErrorEvent;
            const message = errorEvent.message || '';
            if (message.includes('Blocked aria-hidden') || 
                message.includes('aria-hidden') || 
                message.includes('descendant retained focus') ||
                message.includes('assistive technology') ||
                message.includes('The focus must not be hidden') ||
                message.includes('WAI-ARIA')) {
              event.preventDefault();
              event.stopPropagation();
              event.stopImmediatePropagation();
            }
          }, true); // capture phaseで実行
        }
      }
    }
  }, []);

  // GitHub Pages用: 404.htmlからリダイレクトされた際に元のパスを復元
  React.useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && isReady) {
      // 環境変数からベースパスを取得（getBasePath関数を使用）
      const basePath = getBasePath();
      const currentPath = window.location.pathname;
      
      // ベースパスを除去した実際のパスを取得
      const pathWithoutBase = currentPath.startsWith(basePath) 
        ? currentPath.replace(basePath, '') || '/' 
        : currentPath;
      
      // クエリパラメータから元のパスを取得
      const urlParams = new URLSearchParams(window.location.search);
      const redirectPath = urlParams.get('_redirect');
      
      // sessionStorageからも取得（フォールバック）
      const originalPath = sessionStorage.getItem('expo-router-original-path');
      const storedRedirectPath = sessionStorage.getItem('expo-router-redirect-path');
      
      // リダイレクトフラグをクリア
      sessionStorage.removeItem('github-pages-redirecting');
      
      // ルートパス（/music-practice-apuri/ または /music-practice-apuri/index.html）にアクセスした場合
      if (pathWithoutBase === '/' || pathWithoutBase === '/index.html' || currentPath === basePath || currentPath === basePath + '/') {
        // リダイレクトパスがない場合は、認証状態に応じて適切な画面に遷移
        if (!redirectPath && !storedRedirectPath && !originalPath) {
          // 認証状態を確認してから遷移（認証フローで処理される）
          return;
        }
      }
      
      if (redirectPath) {
        // クエリパラメータから元のパスを復元
        logger.debug('404.htmlからリダイレクトされたパスを復元（クエリ）:', redirectPath);
        
        // リダイレクトパスを正規化（先頭のスラッシュを確保）
        const normalizedRedirectPath = redirectPath.startsWith('/') ? redirectPath : '/' + redirectPath;
        
        // クエリパラメータを削除
        urlParams.delete('_redirect');
        const newSearch = urlParams.toString();
        const newPath = basePath + normalizedRedirectPath;
        const newUrl = newPath + (newSearch ? '?' + newSearch : '') + window.location.hash;
        
        // URLを更新
        window.history.replaceState({}, '', newUrl);
        
        // 元のパスに遷移（Expo Routerが処理）
        router.replace(normalizedRedirectPath as any);
      } else if (storedRedirectPath) {
        // sessionStorageからリダイレクトパスを復元
        logger.debug('404.htmlからリダイレクトされたパスを復元（sessionStorage）:', storedRedirectPath);
        sessionStorage.removeItem('expo-router-redirect-path');
        
        // リダイレクトパスを正規化
        const normalizedRedirectPath = storedRedirectPath.startsWith('/') ? storedRedirectPath : '/' + storedRedirectPath;
        const newPath = basePath + normalizedRedirectPath;
        
        window.history.replaceState({}, '', newPath + window.location.search + window.location.hash);
        router.replace(normalizedRedirectPath as any);
      } else if (originalPath) {
        // sessionStorageから元のパスを復元（フォールバック）
        if (currentPath.includes('/index.html') && originalPath !== currentPath) {
          logger.debug('404.htmlからリダイレクトされたパスを復元（sessionStorage originalPath）:', originalPath);
          sessionStorage.removeItem('expo-router-original-path');
          const pathWithoutBaseFromOriginal = originalPath.replace(basePath, '') || '/';
          window.history.replaceState({}, '', originalPath + window.location.search + window.location.hash);
          router.replace(pathWithoutBaseFromOriginal as any);
        }
      } else if (pathWithoutBase !== '/' && pathWithoutBase !== '/index.html') {
        // ベースパス以外のパスにアクセスした場合、Expo Routerに正しいパスを伝える
        // ただし、既に正しいパスにいる場合は何もしない
        const segments = pathWithoutBase.split('/').filter(Boolean);
        if (segments.length > 0) {
          // パスが存在する場合は、そのままExpo Routerに任せる
          // 何もしない（Expo Routerが自動的に処理する）
        }
      }
    }
  }, [router, isReady]);

  /**
   * 【ナビゲーション関数】安全な画面遷移を実行
   * - Expo Routerの「navigate before mounting」エラーを回避
   * - 遷移失敗時のフォールバック処理を含む
   * - チュートリアル画面への遷移時は特別なフォールバック処理
   */
  const navigateWithDelay = (path: RoutePath, delay: number = TIMEOUT.NAVIGATION_DELAY_MS): void => {
    logger.debug('ナビゲーション予約:', path, `遅延: ${delay}ms`);
    setTimeout(() => {
      try {
        if (navigatingRef.current && lastPathRef.current === path) {
          logger.debug('直近と同一の遷移をスキップ:', path);
          return;
        }
        navigatingRef.current = true;
        lastPathRef.current = path;
        logger.debug('ナビゲーション実行:', path);
        router.replace(path as any); // Expo Routerによる画面遷移（型安全性のためanyを使用）
        logger.debug('ナビゲーション完了:', path);
        // 短時間の再遷移を抑止
        setTimeout(() => {
          navigatingRef.current = false;
        }, TIMEOUT.NAVIGATION_COOLDOWN_MS);
      } catch (error) {
        ErrorHandler.handle(error, 'ナビゲーション', false);
        // フォールバック: 直接URLを変更（特にチュートリアル画面の場合）
        if (typeof window !== 'undefined' && typeof path === 'string' && path.includes('tutorial')) {
          logger.debug('フォールバック: window.location を使用');
          navigateWithBasePath('/(tabs)/tutorial');
        }
      }
    }, delay);
  };

  /**
   * 【ユーザー進捗状況チェック】ユーザーの初期設定進捗を確認して適切な画面に遷移
   * - オンボーディング完了済みの場合はメイン画面に遷移
   * - 楽器選択済みだがチュートリアル未完了の場合はチュートリアル画面に遷移
   * - 楽器未選択の場合は楽器選択画面に遷移
   * - エラー時はチュートリアル画面にフォールバック
   */
  const checkUserProgressAndNavigate = async () => {
    try {
      // まず、セッションが確立されていることを確認（最大5回までリトライ）
      let sessionEstablished = false;
      let user: any = null;
      
      for (let i = 0; i < 5; i++) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session?.user) {
          sessionEstablished = true;
          user = sessionData.session.user;
          logger.debug(`✅ セッション確認成功 (試行 ${i + 1})`, { userId: user.id });
          break;
        }
        
        if (i < 4) {
          logger.debug(`⏳ セッション確認中 (試行 ${i + 1}/5)...`);
          await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
        }
      }
      
      if (!sessionEstablished || !user) {
        logger.warn('⚠️ セッションが確立されていません - 認証が完了するまで待機します');
        // セッションが確立されていない場合は遷移しない
        return;
      }

      // プロフィールが確実に存在することを確認（最大5回までリトライ）
      let profile: any = null;
      
      for (let i = 0; i < 5; i++) {
        const { data: baseProfile, error: baseError } = await supabase
          .from('user_profiles')
          .select('id, user_id, display_name, selected_instrument_id, created_at, updated_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (baseError) {
          // 400エラー（カラムが存在しない）の場合は無視して続行
          if (baseError.status === 400 || baseError.code === 'PGRST116' || baseError.code === 'PGRST205' || baseError.message?.includes('column') || baseError.message?.includes('does not exist') || baseError.message?.includes('tutorial_completed') || baseError.message?.includes('onboarding_completed')) {
            logger.warn('user_profilesテーブルの一部カラムが存在しません。デフォルト値を使用します。', { error: baseError });
            // エラーを無視して続行（プロフィールが存在しないものとして処理）
          } else {
            ErrorHandler.handle(baseError, 'プロフィール取得', false);
          }
        } else {
          profile = baseProfile;
        }
        
        if (profile) {
          logger.debug(`✅ プロフィール確認成功 (試行 ${i + 1})`, { profileId: profile.id });
          break;
        }
        
        if (i < 4) {
          logger.debug(`⏳ プロフィール確認中 (試行 ${i + 1}/5)...`);
          await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
        }
      }

      // プロフィールが存在しない場合は新規作成（基本カラムのみ）
      if (!profile) {
        logger.debug('プロフィールが存在しないため、作成します');
        const { data: newProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: user.id,
            display_name: user.user_metadata?.name || user.user_metadata?.display_name || user.email?.split('@')[0] || 'ユーザー',
            practice_level: 'beginner',
            total_practice_minutes: 0,
          })
          .select('id, user_id, display_name, selected_instrument_id, created_at, updated_at')
          .single();
        
        if (createError) {
          // 既にプロフィールが存在する場合は成功として扱う（競合エラー）
          if (createError.code === '23505') {
            logger.debug('プロフィールは既に存在します（競合エラー） - 再度取得を試みます');
            // 再度取得を試みる
            const { data: retryProfile } = await supabase
              .from('user_profiles')
              .select('id, user_id, display_name, selected_instrument_id, created_at, updated_at')
              .eq('user_id', user.id)
              .maybeSingle();
            profile = retryProfile;
          } else {
            ErrorHandler.handle(createError, 'プロフィール作成', false);
            logger.error('❌ プロフィール作成に失敗しました - 認証が完了するまで待機します');
            return;
          }
        } else {
          profile = newProfile;
          logger.debug('✅ プロフィール作成成功', { profileId: profile?.id });
        }
      }

      // プロフィールが確実に存在することを確認
      if (!profile) {
        logger.warn('⚠️ プロフィールが作成されていません - 認証が完了するまで待機します');
        return;
      }

      // プロフィールにデフォルト値を設定
      profile = {
        ...profile,
        tutorial_completed: false,
        onboarding_completed: false,
      };

      logger.debug('✅ 認証とプロフィール確認完了 - 画面遷移を実行します', { 
        userId: user.id, 
        profileId: profile.id 
      });

      // 進捗状況に基づく画面遷移
      // 楽器が選択されている場合は、tutorial_completedに関係なくメイン画面に遷移
      // （楽器選択画面でtutorial_completedを更新しているため）
      const onboardingCompleted = (profile as any)?.onboarding_completed ?? false;
      
      if (onboardingCompleted) {
        logger.debug('✅ オンボーディング完了 - メイン画面に遷移');
        // 即座に遷移を実行（遅延なし）
        try {
          router.replace('/(tabs)/' as any);
        } catch (error) {
          logger.error('❌ メイン画面への遷移エラー:', error);
          navigateWithDelay('/(tabs)/', 100);
        }
      } else if (profile?.selected_instrument_id) {
        // 楽器が選択されている場合はメイン画面に遷移
        // tutorial_completedは楽器選択時に更新されるため、ここではチェックしない
        logger.debug('✅ 楽器選択済み - メイン画面に遷移');
        // 即座に遷移を実行（遅延なし）
        try {
          router.replace('/(tabs)/' as any);
        } catch (error) {
          logger.error('❌ メイン画面への遷移エラー:', error);
          navigateWithDelay('/(tabs)/', 100);
        }
      } else {
        // 楽器が選択されていない場合は楽器選択画面に遷移
        logger.debug('🎓 楽器未選択 - 楽器選択画面に遷移');
        navigateWithDelay('/(tabs)/instrument-selection');
      }
    } catch (error) {
      ErrorHandler.handle(error, 'ユーザー進捗状況チェック', false);
      logger.error('❌ 認証確認中にエラーが発生しました - 認証が完了するまで待機します', error);
      // エラー時は遷移しない（認証が完了するまで待機）
    }
  };

  /**
   * 【メイン】新しい認証フローに基づく画面遷移ロジック
   * 
   * 要件:
   * - 未認証ユーザー → 新規登録画面
   * - 認証済み + 楽器選択済み → メイン画面
   * - 認証済み + 楽器未選択 → チュートリアル画面
   */
  useEffect(() => {
    /**
     * 【パス解析】現在のURLパスを解析して認証関連画面かどうかを判定
     * - segments[0] === 'auth': 認証関連画面（/auth/login, /auth/signup, /auth/callback）
     * - authChild: 認証画面の具体的な種類（login, signup, callback）
     */
    // フレームワークが準備できていない、または認証状態を読み込み中は何もしない
    // Web環境では、isReadyを待たずに処理を開始（タイムアウト処理で対応済み）
    if (Platform.OS !== 'web' && (!isReady || isLoading || !isInitialized)) {
      return;
    }
    // Web環境では、isLoadingだけをチェック（isReadyはタイムアウトで処理済み）
    // ただし、isInitializedは必要（認証状態が初期化されていないと遷移できない）
    if (Platform.OS === 'web' && (isLoading || !isInitialized)) {
      return;
    }
    
    // パス解析（早期リターンの後で実行）
    const inAuthGroup = segments[0] === 'auth';
    const authChild = inAuthGroup && segments.length > 1 ? (segments[1] as string | undefined) : undefined;
    const isSignupScreen = authChild === 'signup';

    // 認証状態チェック（デバッグ用ログは非表示）
    
    // ルートパス（segmentsが空）にいる場合の処理
    const isAtRoot = segments.length === 0;
    
    // 未認証ユーザーの場合：ログイン画面に遷移（利用規約・プライバシーポリシーは除外）
    if (!isAuthenticated) {
      // 利用規約・プライバシーポリシー画面は許可
      if (segments[0] === 'terms-of-service' || segments[0] === 'privacy-policy') {
        return;
      }
      
      // 新規登録画面の場合は、認証フックを完全に無効化（画面遷移をスキップ）
      // 新規登録処理中や成功直後は、認証状態が更新されるまで待つ必要がある
      // Web環境ではsessionStorageで新規登録処理中かどうかを確認
      const isSignupProcessing = Platform.OS === 'web' && typeof window !== 'undefined' 
        ? sessionStorage.getItem('signup-processing') === 'true'
        : signupProcessingRef.current;
      
      if (isSignupScreen || isSignupProcessing) {
        // 新規登録画面では認証チェックを完全にスキップ
        // signup.tsxで新規登録成功後に適切な画面に遷移するため、ここでは何もしない
        logger.debug('新規登録画面または新規登録処理中 - 認証チェックをスキップ', {
          isSignupScreen,
          isSignupProcessing,
        });
        return;
      }
      
      // チュートリアル画面にいる場合は、新規登録直後の可能性があるため、認証チェックをスキップ
      // signup.tsxでuser状態が更新されるまで待機しているため、ここでは一時的に許可
      const isInTutorial = segments[0] === '(tabs)' && segments.length > 1 && segments[1] === 'tutorial';
      const isSignupJustCompleted = Platform.OS === 'web' && typeof window !== 'undefined' 
        ? sessionStorage.getItem('signup-just-completed') === 'true'
        : false;
      
      // 新規登録直後フラグがある場合、または新規登録処理中フラグがある場合は認証チェックをスキップ
      if (isSignupJustCompleted || isSignupProcessing) {
        if (isInTutorial) {
          logger.debug('チュートリアル画面 - 新規登録直後または処理中のため認証チェックを完全にスキップ', {
            isInTutorial,
            isSignupJustCompleted,
            isSignupProcessing,
          });
          return;
        } else {
          // 新規登録直後フラグがあるが、チュートリアル画面にいない場合は、チュートリアル画面に遷移
          logger.debug('新規登録直後または処理中フラグあり - チュートリアル画面に遷移', {
            isSignupJustCompleted,
            isSignupProcessing,
          });
          navigateWithDelay('/(tabs)/tutorial', 0);
          return;
        }
      }
      
      // チュートリアル画面にいるが、新規登録直後フラグがない場合は通常の認証チェックを実行
      // （ただし、認証状態が更新されるまでの間は一時的に許可）
      if (isInTutorial) {
        logger.debug('チュートリアル画面 - 新規登録直後の可能性があるため認証チェックをスキップ');
        return;
      }
      
      // ルートパスまたは認証画面以外にいる場合は、ログイン画面に遷移
      if (isAtRoot || !inAuthGroup) {
        navigateWithDelay('/auth/login');
        return;
      }
      // その他の認証画面にいる場合は何もしない
      return;
    }

    // 認証済みユーザーの場合：楽器選択状態に基づいて遷移
    // ルートパスにいる場合は、適切な画面に遷移
    // ログイン直後はauthState.userが更新される前でも、checkUserProgressAndNavigate()でプロフィールから直接判定できる
    if (isAtRoot) {
      // 認証済みユーザーがルートパスにいる場合、checkUserProgressAndNavigate()で処理
      // これにより、authState.userが更新される前でも正しい画面に遷移できる
      checkUserProgressAndNavigate();
      return;
    }
    if (isAuthenticated) {
      // 認証画面にいる場合は適切な画面に遷移
      // ただし、ログイン直後はcheckUserProgressAndNavigate()が実行されるため、ここではスキップ
      if (inAuthGroup && (authChild === 'login' || authChild === 'signup' || authChild === 'callback')) {
        // checkUserProgressAndNavigate()で処理されるため、ここでは何もしない
        return;
      }
      
      // その他の認証画面（reset-passwordなど）の場合
      if (inAuthGroup) {
        if (canAccessMainApp()) {
          navigateWithDelay('/(tabs)/');
        } else if (needsTutorial()) {
          navigateWithDelay('/(tabs)/tutorial');
        } else {
          navigateWithDelay('/(tabs)/');
        }
        return;
      }
      
      // メインアプリ内にいる場合は楽器選択状態をチェック
      if (canAccessMainApp()) {
        // 楽器選択済みユーザーはメインアプリ内で自由に移動可能
        return;
      } else if (needsTutorial()) {
        // 楽器未選択ユーザーはチュートリアル画面に強制遷移
        // ただし、楽器選択画面にいる場合は遷移しない
        const isInInstrumentSelection = segments[0] === '(tabs)' && segments.length > 1 && (segments[1] as string) === 'instrument-selection';
        if (isInInstrumentSelection) {
          return;
        }
        navigateWithDelay('/(tabs)/tutorial');
        return;
      }
    }

    /**
     * 【認証成功後の強制遷移】認証が成功した場合の強制画面遷移
     * - 認証成功後、認証画面にいる場合は強制的に適切な画面に遷移
     * - 認証状態の更新タイミングの問題を回避
     * - checkUserProgressAndNavigate()でプロフィールから直接楽器IDを取得するため、こちらを優先
     */
    if (isAuthenticated && inAuthGroup && (authChild === 'login' || authChild === 'signup' || authChild === 'callback')) {
      logger.debug('✅ 認証成功検出 - 画面遷移を実行します', {
        authChild,
        hasInstrument: hasInstrumentSelected(),
        canAccessMain: canAccessMainApp(),
      });
      // 即座に画面遷移を実行（checkUserProgressAndNavigate()でプロフィールから直接判定）
      // これにより、authState.userが更新される前でも正しい画面に遷移できる
      checkUserProgressAndNavigate();
      return;
    }

    /**
     * 【ルートアクセス対応】認証済みユーザーのルートアクセス処理
     * - 完全なルートパス（http://localhost:8081/）にアクセスした場合のみ
     * - 楽器選択状況に応じて適切な画面に遷移
     * - (tabs)内の画面（楽器選択、チュートリアル等）は完全に除外
     * 
     * 注意: isAtRootは上記329行目で既に宣言されているため、ここでは使用のみ
     */
    if (isAuthenticated && isAtRoot) {
      // ユーザー進捗状況をチェック
      checkUserProgressAndNavigate();
      return;
    }

    /**
     * 【アプリ内画面への遷移許可】
     * - 楽器選択画面やその他のアプリ内画面にいる場合は遷移を許可
     * - チュートリアル完了後のユーザーフローを保護
     * - メイン画面（/(tabs)/）も含めて保護
     */
    const isInTabsGroup = segments[0] === '(tabs)';
    const currentTabScreen = isInTabsGroup && segments.length > 1 ? (segments[1] as string | undefined) : undefined;
    
    if (isAuthenticated && isInTabsGroup) {
      // (tabs)グループ内のすべての画面（メイン画面含む）では強制遷移しない
      // ただし、楽器未選択ユーザーが楽器選択画面以外にいる場合はチュートリアル画面に遷移
      const isInInstrumentSelection = currentTabScreen === 'instrument-selection';
      const isInTutorial = currentTabScreen === 'tutorial';
      
      if (needsTutorial() && !isInInstrumentSelection && !isInTutorial) {
        navigateWithDelay('/(tabs)/tutorial');
        return;
      }
      return; // アプリ内画面では何もしない
    }

    /**
     * 【デバッグ】認証済みユーザーの詳細状態ログ
     * - 上記の条件に該当しない認証済みユーザーの状態を詳細に記録
     * - 想定外の画面遷移パターンの調査に使用
     */
    // 認証済みユーザーの詳細状態ログ（デバッグ時に有効化）
    if (false && isAuthenticated) {
      logger.debug('認証済みユーザーの詳細状態:', {
        isAuthenticated,
        inAuthGroup,
        authChild,
        segments,
        segmentsLength: segments.length,
        isInTabsGroup,
        currentTabScreen
      });
    }
  }, [isReady, isLoading, isAuthenticated, isInitialized, segments, router, hasInstrumentSelected, needsTutorial, canAccessMainApp]);

  // 新規登録画面でセッションが確立された場合の処理（別のuseEffectで処理）
  useEffect(() => {
    const inAuthGroup = segments[0] === 'auth';
    const authChild = inAuthGroup && segments.length > 1 ? (segments[1] as string | undefined) : undefined;
    const isSignupScreen = authChild === 'signup';
    
    // 新規登録画面にいる場合のみ実行
    if (!isSignupScreen || !isReady || isLoading || !isInitialized) {
      return;
    }

    // 新規登録画面では、セッションが存在する場合は認証済みとして扱う
    // これにより、新規登録直後のリダイレクトを防ぐ
    let mounted = true;
    
    const checkSession = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (mounted && sessionData.session?.user) {
          logger.debug('新規登録画面でセッション検出 - 認証状態を更新して画面遷移', {
            userId: sessionData.session.user.id,
            email: sessionData.session.user.email,
          });
          // セッションが存在する場合は、認証状態を更新してから適切な画面に遷移
          await checkUserProgressAndNavigate();
        }
      } catch (error) {
        // エラーは無視（認証チェックは継続）
        if (mounted) {
          logger.debug('新規登録画面でのセッション確認エラー（無視）:', error);
        }
      }
    };

    // 少し遅延してからセッションを確認（新規登録処理が完了するまで待つ）
    const timer = setTimeout(() => {
      checkSession();
    }, 500);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [segments, isReady, isLoading, isInitialized]);

  // フレームワーク準備中または認証状態読み込み中はローディング画面を表示
  // Web環境では、isReadyがfalseのままになる可能性があるため、タイムアウトを追加
  const [showContent, setShowContent] = React.useState(Platform.OS === 'web');
  
  React.useEffect(() => {
    // Web環境では、isReadyがfalseのままでも一定時間後にコンテンツを表示
    if (Platform.OS === 'web') {
      // Web環境では即座に表示を試みる
      if (isReady) {
        setShowContent(true);
      } else {
        // isReadyがfalseの場合は、短いタイムアウト後に表示
        const timer = setTimeout(() => {
          setShowContent(true);
        }, 500); // 0.5秒後に強制的にコンテンツを表示
        return () => clearTimeout(timer);
      }
    } else {
      setShowContent(isReady);
    }
  }, [isReady]);
  
  // Web環境では、isLoadingが長く続く場合でもコンテンツを表示
  if (Platform.OS === 'web') {
    if (!showContent) {
      return <LoadingSkeleton />;
    }
    // Web環境では、isLoadingがtrueでもコンテンツを表示（認証状態は後で更新される）
  } else {
    if (!showContent || isLoading) {
      return <LoadingSkeleton />;
    }
  }

  // メインの画面構成を定義
  return (
    <Stack 
      screenOptions={{ 
        headerShown: false, // ヘッダーを非表示（カスタムヘッダーを使用）
        contentStyle: { backgroundColor: '#FFFFFF' } // 全画面の背景色を白色に設定
      }}
    >
      {/* 認証関連の画面 - app/auth/_layout.tsx で子ルートを管理 */}
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      
      {/* メインアプリの画面（タブナビゲーション） */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      
      {/* 組織関連の画面 */}
      <Stack.Screen name="organization-dashboard" options={{ headerShown: false }} />
      
      {/* その他の画面 */}
      <Stack.Screen name="attendance" options={{ headerShown: false }} />
      <Stack.Screen name="tasks" options={{ headerShown: false }} />
      <Stack.Screen name="calendar" options={{ headerShown: false }} />
      <Stack.Screen name="add-goal" options={{ headerShown: false }} />
      <Stack.Screen name="representative-songs" options={{ headerShown: false }} />
      
      {/* 利用規約・プライバシーポリシー */}
      <Stack.Screen name="terms-of-service" options={{ headerShown: false }} />
      <Stack.Screen name="privacy-policy" options={{ headerShown: false }} />
      
      {/* エラー画面 */}
      <Stack.Screen name="+not-found" options={{ headerShown: false }} />
    </Stack>
  );
}

// アプリのルートレイアウト - 全体的なプロバイダーとコンテキストを設定
export default function RootLayout() {
  return (
    // 多言語対応を管理するプロバイダー
    <LanguageProvider>
      {/* 楽器別テーマを管理するプロバイダー */}
      <InstrumentThemeProvider>
        {/* メインコンテンツ */}
        <RootLayoutContent />
        {/* ステータスバーの設定（ダークテーマ） */}
        {StatusBar && <StatusBar style="dark" />}
      </InstrumentThemeProvider>
    </LanguageProvider>
  );
}