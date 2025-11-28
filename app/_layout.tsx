// メインのレイアウトファイル - アプリ全体の構造と認証ルーティングを管理
import React, { useRef, useEffect } from 'react';
import { View, LogBox } from 'react-native';
import { Stack } from 'expo-router'; // 画面遷移のスタックナビゲーター
import { Platform } from 'react-native';
import { useRouter, useSegments } from 'expo-router'; // ルーティング関連のフック
import { useFrameworkReady } from '@/hooks/useFrameworkReady'; // フレームワーク準備状態の管理
import { useAuthSimple } from '@/hooks/useAuthSimple'; // シンプルな認証フック
import { useIdleTimeout } from '@/hooks/useIdleTimeout'; // アイドルタイムアウト機能
import { LanguageProvider } from '@/components/LanguageContext'; // 多言語対応の管理
import { InstrumentThemeProvider } from '@/components/InstrumentThemeContext'; // 楽器別テーマの管理
import LoadingSkeleton from '@/components/LoadingSkeleton'; // ローディング表示コンポーネント
import { supabase } from '@/lib/supabase'; // Supabaseクライアント
import { RoutePath } from '@/types/common'; // ルートパス型
import { TIMEOUT } from '@/lib/constants'; // タイムアウト定数
import logger from '@/lib/logger'; // ロガー
import { ErrorHandler } from '@/lib/errorHandler'; // エラーハンドラー

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
  } = useAuthSimple();

  // アイドルタイムアウト機能（1時間操作なしで自動ログアウト）
  // useIdleTimeoutはPromise<void>を期待するが、useAuthSimpleのsignOutはPromise<boolean>を返すためラッパーを作成
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
  
  // 新規登録画面の場合は認証フックを完全に無効化（Hooksの順序を保持）
  const authChild = segments.length > 1 ? (segments[1] as string | undefined) : undefined;
  const isSignupScreen = authChild === 'signup';

  // React Native Web特有の警告を抑制（開発時のノイズを減らす）
  React.useEffect(() => {
    LogBox.ignoreLogs(['Unexpected text node']);
  }, []);

  // GitHub Pages用: 404.htmlからリダイレクトされた際に元のパスを復元
  React.useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && isReady) {
      const basePath = '/music-practice-apuri';
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
          const { navigateWithBasePath } = require('@/lib/navigationUtils');
          navigateWithBasePath('/tutorial');
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
      
      // ユーザー情報を取得
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigateWithDelay('/(tabs)/tutorial');
        return;
      }

      // ユーザープロフィールの詳細情報を取得
      // tutorial_completedとonboarding_completedカラムを含めて取得
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('id, user_id, display_name, selected_instrument_id, tutorial_completed, onboarding_completed, created_at, updated_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        // カラムが存在しないエラーの場合は無視して続行
        if (error.code === 'PGRST116' || error.message?.includes('column') || error.message?.includes('does not exist')) {
          logger.warn('user_profilesテーブルの一部カラムが存在しません。デフォルト値を使用します。', { error });
        } else {
          ErrorHandler.handle(error, 'プロフィール取得', false);
        }
        
        // プロフィールが存在しない場合は新規作成
        const { data: newProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: user.id,
            display_name: user.user_metadata?.name || user.email?.split('@')[0] || 'ユーザー',
          })
          .select()
          .single();
        
        if (createError) {
          ErrorHandler.handle(createError, 'プロフィール作成', false);
          navigateWithDelay('/(tabs)/tutorial');
          return;
        }
        
        // 新規作成されたプロフィールを使用
        navigateWithDelay('/(tabs)/instrument-selection');
        return;
      }

      // プロフィールが存在しない場合
      if (!profile) {
        const { data: newProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: user.id,
            display_name: user.user_metadata?.name || user.email?.split('@')[0] || 'ユーザー',
            practice_level: 'beginner',
            total_practice_minutes: 0,
          })
          .select()
          .single();
        
        if (createError) {
          ErrorHandler.handle(createError, 'プロフィール作成', false);
          navigateWithDelay('/(tabs)/tutorial');
          return;
        }
        
        // 新規作成されたプロフィールを使用
        navigateWithDelay('/(tabs)/instrument-selection');
        return;
      }

      // 進捗状況に基づく画面遷移
      // tutorial_completedとonboarding_completedはオプショナル（カラムが存在しない場合がある）
      const tutorialCompleted = (profile as any)?.tutorial_completed ?? false;
      const onboardingCompleted = (profile as any)?.onboarding_completed ?? false;
      
      if (onboardingCompleted) {
        navigateWithDelay('/(tabs)/');
      } else if (profile?.selected_instrument_id && !tutorialCompleted) {
        navigateWithDelay('/(tabs)/tutorial');
      } else if (profile?.selected_instrument_id) {
        navigateWithDelay('/(tabs)/');
      } else {
        navigateWithDelay('/(tabs)/instrument-selection');
      }
    } catch (error) {
      ErrorHandler.handle(error, 'ユーザー進捗状況チェック', false);
      logger.debug('エラー時はチュートリアル画面にフォールバック');
      navigateWithDelay('/(tabs)/tutorial');
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
    // 新規登録画面の場合は認証フックを無効化（画面遷移をスキップ）
    if (isSignupScreen) {
      return;
    }
    /**
     * 【パス解析】現在のURLパスを解析して認証関連画面かどうかを判定
     * - segments[0] === 'auth': 認証関連画面（/auth/login, /auth/signup, /auth/callback）
     * - authChild: 認証画面の具体的な種類（login, signup, callback）
     */
    const inAuthGroup = segments[0] === 'auth';
    const authChild = inAuthGroup && segments.length > 1 ? (segments[1] as string | undefined) : undefined;

    // 認証状態チェック（デバッグ用ログは非表示）


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
    
    // ルートパス（segmentsが空）にいる場合の処理
    const isAtRoot = segments.length === 0;
    
    // 未認証ユーザーの場合：ログイン画面に遷移（利用規約・プライバシーポリシーは除外）
    if (!isAuthenticated) {
      // 利用規約・プライバシーポリシー画面は許可
      if (segments[0] === 'terms-of-service' || segments[0] === 'privacy-policy') {
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
    if (isAtRoot) {
      // 認証済みユーザーがルートパスにいる場合、適切な画面に遷移
      if (!hasInstrumentSelected()) {
        // 楽器未選択の場合はチュートリアル画面へ
        navigateWithDelay('/(tabs)/tutorial');
        return;
      } else if (needsTutorial()) {
        // チュートリアル未完了の場合はチュートリアル画面へ
        navigateWithDelay('/(tabs)/tutorial');
        return;
      } else {
        // それ以外の場合はメイン画面（カレンダー）へ
        navigateWithDelay('/(tabs)');
        return;
      }
    }
    if (isAuthenticated) {
      // 認証画面にいる場合は適切な画面に遷移
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
     */
    if (isAuthenticated && inAuthGroup && (authChild === 'login' || authChild === 'signup' || authChild === 'callback')) {
      // 即座に画面遷移を実行（遅延を削除）
      checkUserProgressAndNavigate();
      return;
    }

    /**
     * 【ルートアクセス対応】認証済みユーザーのルートアクセス処理
     * - 完全なルートパス（http://localhost:8081/）にアクセスした場合のみ
     * - 楽器選択状況に応じて適切な画面に遷移
     * - (tabs)内の画面（楽器選択、チュートリアル等）は完全に除外
     * 
     * 注意: isAtRootは上記321行目で既に宣言されているため、ここでは使用のみ
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
  }, [isReady, isLoading, isAuthenticated, isInitialized, segments, router, hasInstrumentSelected, needsTutorial, canAccessMainApp, isSignupScreen]);

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