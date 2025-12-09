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
import { checkDatabaseSchema } from '@/lib/databaseSchemaChecker'; // データベーススキーマチェック
import { initializeGoalRepository } from '@/repositories/goalRepository'; // 目標リポジトリの初期化

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

// Web環境でのReact Native Webの警告を早期に抑制
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  // React Native WebのwarnOnce関数をオーバーライド
  try {
    // @ts-ignore - React Native Webの内部モジュール
    const ReactNativeWebIndex = require('react-native-web/dist/index');
    if (ReactNativeWebIndex && ReactNativeWebIndex.warnOnce) {
      const originalWarnOnce = ReactNativeWebIndex.warnOnce;
      ReactNativeWebIndex.warnOnce = (key: string, message: string) => {
        // pointerEventsの警告を抑制
        if (message && message.includes('pointerEvents')) {
          return;
        }
        originalWarnOnce(key, message);
      };
    }
  } catch (e) {
    // モジュールが見つからない場合は無視（環境によって異なる可能性がある）
  }
  
  // グローバルなwarnOnce関数をオーバーライド（より確実な方法）
  if (typeof (window as any).__REACT_NATIVE_WEB_WARN_ONCE__ === 'undefined') {
    (window as any).__REACT_NATIVE_WEB_WARN_ONCE__ = new Map();
    const originalWarnOnce = (window as any).__REACT_NATIVE_WEB_WARN_ONCE__;
    
    // console.warnを早期にオーバーライド
    const originalConsoleWarn = console.warn;
    console.warn = (...args: unknown[]) => {
      const message = args[0]?.toString() || '';
      const fullMessage = args.map(arg => String(arg)).join(' ');
      
      // pointerEventsの警告を完全に抑制
      if (
        message.includes('props.pointerEvents is deprecated') ||
        message.includes('Use style.pointerEvents') ||
        fullMessage.includes('props.pointerEvents is deprecated') ||
        fullMessage.includes('Use style.pointerEvents') ||
        fullMessage.includes('pointerEvents') && fullMessage.includes('deprecated')
      ) {
        return;
      }
      
      originalConsoleWarn.apply(console, args);
    };
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
  const segmentsRef = useRef(segments); // segmentsをrefで保持（Web環境での強制遷移を防ぐため）
  
  // segmentsが変更されたらrefを更新
  React.useEffect(() => {
    segmentsRef.current = segments;
  }, [segments]);

  // データベーススキーマの整合性をチェック（認証完了後、一度だけ実行）
  React.useEffect(() => {
    if (isAuthenticated && isInitialized && !isLoading) {
      checkDatabaseSchema().then((result) => {
        if (result.errors.length > 0) {
          logger.error('データベーススキーマに問題があります:', result.errors);
          
          // attendance_recordsテーブルが存在しない場合は特別なメッセージを表示
          if (!result.attendanceRecordsTableExists) {
            logger.error('❌ attendance_recordsテーブルが存在しません。');
            console.error('========================================');
            console.error('❌ attendance_recordsテーブルが存在しません');
            console.error('解決方法: Supabaseダッシュボードでマイグレーションを実行してください');
            console.error('');
            console.error('【推奨】最初からテーブルを作成する場合:');
            console.error('  マイグレーションファイル: 20251209000000_create_practice_schedules_and_tasks.sql');
            console.error('  （practice_schedules、tasks、attendance_recordsを一緒に作成）');
            console.error('');
            console.error('【既存環境用】attendance_recordsのみ作成する場合:');
            console.error('  マイグレーションファイル: 20251209000002_ensure_attendance_records_table_final.sql');
            console.error('========================================');
          }
          
          // エラーハンドラーでユーザーに通知（既にnotificationServiceで処理される）
        } else {
          logger.debug('データベーススキーマのチェックが完了しました。すべてのテーブルとカラムが存在します。');
        }
      }).catch((error: unknown) => {
        logger.error('データベーススキーマのチェック中にエラーが発生しました:', error);
      });
      
      // 目標リポジトリのカラム存在確認を初期化（一度だけ実行）
      // 強制再チェックを有効にして、localStorageのフラグを無視してDBクエリを実行
      initializeGoalRepository(true).catch((error: unknown) => {
        logger.error('目標リポジトリの初期化中にエラーが発生しました:', error);
      });
    }
  }, [isAuthenticated, isInitialized, isLoading]);

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
        const originalInfo = console.info;
        
        // console.warnの抑制
        console.warn = (...args: unknown[]) => {
          const message = args[0]?.toString() || '';
          const fullMessage = args.map(arg => String(arg)).join(' ');
          // pointerEventsの警告を無視（より広範囲にマッチ）
          if (message.includes('props.pointerEvents is deprecated') ||
              message.includes('pointerEvents') ||
              fullMessage.includes('props.pointerEvents is deprecated') ||
              fullMessage.includes('Use style.pointerEvents')) {
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
          // React DevToolsのダウンロード案内を抑制
          if (fullMessage.includes('Download the React DevTools') ||
              fullMessage.includes('react.dev/link/react-devtools')) {
            return;
          }
          originalWarn.apply(console, args);
        };
        
        // console.errorの抑制（aria-hidden警告がerrorとして表示される場合がある）
        console.error = (...args: unknown[]) => {
          const message = args[0]?.toString() || '';
          const fullMessage = args.map(arg => String(arg)).join(' ');
          
          // aria-hidden警告を無視
          if (message.includes('Blocked aria-hidden') || 
              message.includes('aria-hidden') || 
              message.includes('descendant retained focus') ||
              message.includes('assistive technology') ||
              message.includes('The focus must not be hidden') ||
              message.includes('WAI-ARIA')) {
            return;
          }
          
          // RPC関数の404エラーを抑制（フォールバック方法で処理されるため）
          if (fullMessage.includes('/rpc/check_column_exists') && 
              (fullMessage.includes('404') || fullMessage.includes('Not Found'))) {
            // RPC関数が存在しない場合の404エラーは、フォールバック方法で処理されるため無視
            return;
          }
          
          // representative_songsテーブルの404エラーを抑制（フォールバックデータを使用するため）
          if ((fullMessage.includes('representative_songs') || fullMessage.includes('representative-songs')) && 
              (fullMessage.includes('404') || fullMessage.includes('Not Found') || fullMessage.includes('PGRST205'))) {
            // テーブルが存在しない場合の404エラーは、フォールバックデータを使用するため無視
            return;
          }
          
          // ネットワークエラーを抑制（オフライン時は正常な動作）
          if (fullMessage.includes('Failed to fetch') ||
              fullMessage.includes('ERR_INTERNET_DISCONNECTED') ||
              fullMessage.includes('internet disconnected') ||
              fullMessage.includes('NetworkError') ||
              fullMessage.includes('TypeError: Failed to fetch')) {
            // ネットワークエラーは表示しない（オフライン時は正常な動作）
            return;
          }
          originalError.apply(console, args);
        };
        
        // console.logの抑制（開発時の情報メッセージを抑制）
        console.log = (...args: unknown[]) => {
          const message = args[0]?.toString() || '';
          const fullMessage = args.map(arg => String(arg)).join(' ');
          // aria-hidden警告を無視
          if (message.includes('Blocked aria-hidden') || 
              message.includes('aria-hidden') || 
              message.includes('descendant retained focus') ||
              message.includes('assistive technology') ||
              message.includes('The focus must not be hidden') ||
              message.includes('WAI-ARIA')) {
            return;
          }
          // React/Expo開発時の標準メッセージを抑制
          if (fullMessage.includes('Running application') ||
              fullMessage.includes('with appParams') ||
              fullMessage.includes('Development-level warnings') ||
              fullMessage.includes('Performance optimizations') ||
              fullMessage.includes('Development-level warnings: ON') ||
              fullMessage.includes('Performance optimizations: OFF')) {
            return;
          }
          originalLog.apply(console, args);
        };
        
        // console.infoの抑制（React DevToolsなどの情報メッセージを抑制）
        console.info = (...args: unknown[]) => {
          const message = args[0]?.toString() || '';
          const fullMessage = args.map(arg => String(arg)).join(' ');
          // React DevToolsのダウンロード案内を抑制
          if (fullMessage.includes('Download the React DevTools') ||
              fullMessage.includes('react.dev/link/react-devtools') ||
              fullMessage.includes('React DevTools')) {
            return;
          }
          // Expo/React開発時の標準メッセージを抑制
          if (fullMessage.includes('Running application') ||
              fullMessage.includes('with appParams') ||
              fullMessage.includes('Development-level warnings') ||
              fullMessage.includes('Performance optimizations')) {
            return;
          }
          originalInfo.apply(console, args);
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
  // ナビゲーション関数（シンプル化）
  const navigateWithDelay = (path: RoutePath, delay: number = 0): void => {
    setTimeout(() => {
      try {
        logger.debug('ナビゲーション実行:', path);
        router.replace(path as any);
        logger.debug('ナビゲーション完了:', path);
      } catch (error) {
        logger.error('ナビゲーションエラー:', error);
        ErrorHandler.handle(error, 'ナビゲーション', false);
      }
    }, delay);
  };

  // checkUserProgressAndNavigate関数は削除（シンプル化のため不要）
  // 認証チェックはuseEffect内で直接実行される

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
     * 【統一された認証保護ロジック】
     * - 未認証 → ログイン画面
     * - 認証済み + 楽器未選択 → チュートリアル or 楽器選択画面
     * - 認証済み + 楽器選択済み → メイン画面
     */
    // 初期化中は何もしない（リロード時も現在の画面を維持）
    if (isLoading || !isInitialized) {
      logger.debug('認証初期化中 - 画面遷移を待機中', { isLoading, isInitialized });
      return;
    }

    // 現在のセグメントを取得（Web環境ではrefから取得して強制遷移を防ぐ）
    const currentSegments = Platform.OS === 'web' ? segmentsRef.current : segments;
    const firstSegment = currentSegments[0];
    const isInAuthGroup = firstSegment === 'auth';
    const isInTabsGroup = firstSegment === '(tabs)';
    const isInOrgGroup = firstSegment === 'organization-dashboard' || firstSegment === 'organization-settings';
    const currentTab = isInTabsGroup && currentSegments.length > 1 ? currentSegments[1] : null;
    const isAtRoot = currentSegments.length === 0;
    
    logger.debug('画面遷移チェック', {
      isAuthenticated,
      isInitialized,
      isLoading,
      currentSegments,
      hasInstrumentSelected: hasInstrumentSelected(),
      needsTutorial: needsTutorial(),
    });
    
    // 利用規約・プライバシーポリシー画面は許可
    if (firstSegment === 'terms-of-service' || firstSegment === 'privacy-policy') {
      return;
    }

    // Web環境: リロード時に現在の画面を維持する処理
    // ただし、認証状態の初期化が完了している場合のみ（キャッシュされた認証状態を信頼しない）
    if (Platform.OS === 'web') {
      // 認証状態の初期化が完了していない場合は、画面遷移を待つ
      if (!isInitialized || isLoading) {
        logger.debug('認証状態の初期化中 - 画面遷移を待機', { isInitialized, isLoading });
        return;
      }
      
      // 認証済みで適切な画面にいる場合は、リロード時も現在の画面を維持
      // ただし、認証状態の初期化が完了している場合のみ
      if (isAuthenticated && (isInTabsGroup || isInOrgGroup) && hasInstrumentSelected()) {
        logger.debug('認証済み・楽器選択済み - 現在の画面を維持', { segments: currentSegments });
        return;
      }
      
      // 未認証で認証画面にいる場合は、現在の画面を維持（リロード時の一瞬の遷移を防ぐ）
      if (!isAuthenticated && isInAuthGroup) {
        logger.debug('未認証・認証画面 - 現在の画面を維持', { segments: currentSegments });
        return;
      }
    }
    
    // 未認証ユーザー → ログイン画面にリダイレクト
    if (!isAuthenticated) {
      // ルートパス（/）にアクセスした場合も、ログイン画面にリダイレクト
      if (isAtRoot || !isInAuthGroup) {
        logger.debug('未認証ユーザー - ログイン画面にリダイレクト', { isAtRoot, isInAuthGroup });
        router.replace('/auth/login');
      }
      return;
    }

    // 認証済みユーザー
    // 楽器未選択の場合の処理
    if (!hasInstrumentSelected()) {
      // チュートリアル画面または楽器選択画面にいる場合は許可（遷移をブロックしない）
      if (currentTab === 'tutorial' || currentTab === 'instrument-selection') {
        return; // 遷移を許可
      }
      
      if (needsTutorial()) {
        // チュートリアルが必要な場合（新規登録直後など）
        logger.debug('新規登録直後のため、チュートリアル画面にリダイレクト');
        router.replace('/(tabs)/tutorial');
        return;
      }
      // チュートリアル完了後は楽器選択画面にリダイレクト
      logger.debug('楽器未選択のため、楽器選択画面にリダイレクト');
      router.replace('/(tabs)/instrument-selection');
      return;
    }

    // 認証済み + 楽器選択済み
    // Web環境: 既に適切な画面にいる場合は維持（リロード時も現在の画面を保持）
    if (Platform.OS === 'web' && (isInTabsGroup || isInOrgGroup)) {
      return;
    }
    
    // ルートパスまたは認証画面にいる場合はメイン画面に遷移
    if (isAtRoot || isInAuthGroup) {
      router.replace('/(tabs)/');
      return;
    }
  }, [isAuthenticated, isLoading, isInitialized, hasInstrumentSelected, needsTutorial, router, segments]);

  // checkUserProgressAndNavigate関数は削除（シンプル化のため不要）

  // 新規登録画面用のuseEffectは削除（シンプル化のため不要）
  // 認証状態が更新されると、メインのuseEffectが自動的に実行される

  // フレームワーク準備中または認証状態読み込み中はローディング画面を表示
  // Web環境では、完全に初期化を待たずに即座にコンテンツを表示
  // 読み込みが完了しない問題を根本的に解決するため、Web環境では常にコンテンツを表示
  // ネイティブ環境でも、読み込み中でもコンテンツを表示（リロード時も現在の画面を維持）
  // 重要: 読み込み中でもコンテンツを表示（リロード時も現在の画面を維持）
  // LoadingSkeletonは表示しない（リロード時も現在の画面を維持）

  // メインの画面構成を定義
  return (
    <Stack 
      screenOptions={{ 
        headerShown: false, // ヘッダーを非表示（カスタムヘッダーを使用）
        // 背景色は各画面で設定されるため、ここでは設定しない（テーマ色を維持）
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