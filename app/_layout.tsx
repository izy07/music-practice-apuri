// メインのレイアウトファイル - アプリ全体の構造と認証ルーティングを管理
// Expo Routerのサーバーサイドレンダリングを無効化（開発環境でのエラーを回避）
export const unstable_serverRendering = false;

import React, { useRef, useEffect } from 'react';
import { View, LogBox, AppState, Alert, Platform } from 'react-native';
import { Stack } from 'expo-router'; // 画面遷移のスタックナビゲーター
import { useRouter, useSegments, useRootNavigationState } from 'expo-router'; // ルーティング関連のフック
import { useFrameworkReady } from '@/hooks/useFrameworkReady'; // フレームワーク準備状態の管理
import { useAuthAdvanced } from '@/hooks/useAuthAdvanced'; // 認証フック（統一版）
import { LanguageProvider } from '@/components/LanguageContext'; // 多言語対応の管理
import { InstrumentThemeProvider } from '@/components/InstrumentThemeContext'; // 楽器別テーマの管理
import { SubscriptionProvider } from '@/contexts/SubscriptionContext'; // サブスクリプション状態の管理
import LoadingSkeleton from '@/components/LoadingSkeleton'; // ローディング表示コンポーネント
import { supabase } from '@/lib/supabase'; // Supabaseクライアント
import { RoutePath } from '@/types/common'; // ルートパス型
import { TIMEOUT } from '@/lib/constants'; // タイムアウト定数
import logger from '@/lib/logger'; // ロガー
import { ErrorHandler } from '@/lib/errorHandler'; // エラーハンドラー
import { getBasePath, navigateWithBasePath, redirectToLogin } from '@/lib/navigationUtils'; // ベースパス取得関数とナビゲーション関数
import { checkDatabaseSchema } from '@/lib/databaseSchemaChecker'; // データベーススキーマチェック
import { initializeGoalRepository } from '@/repositories/goalRepository'; // 目標リポジトリの初期化
import audioResourceManager from '@/lib/audioResourceManager'; // オーディオリソース管理
import { isOnline } from '@/lib/offlineStorage'; // ネットワーク状態確認
import Constants from 'expo-constants'; // 設定値取得用
import { GlobalErrorBoundary } from '@/components/GlobalErrorBoundary'; // グローバルエラーバウンダリー

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
      
      // shadow*スタイルの非推奨警告を抑制
      if (
        message.includes('shadow*') ||
        message.includes('shadowColor') ||
        message.includes('shadowOffset') ||
        message.includes('shadowOpacity') ||
        message.includes('shadowRadius') ||
        message.includes('Use "boxShadow"') ||
        fullMessage.includes('shadow*') ||
        fullMessage.includes('Use "boxShadow"')
      ) {
        return;
      }
      
      originalConsoleWarn.apply(console, args);
    };
  }

  // Webでは React Native の Alert.alert が動作しないため、window.alert に差し替える
  try {
    const originalAlert = Alert.alert.bind(Alert);
    (Alert as any).alert = (title: string, message?: string, buttons?: Array<{ text: string; onPress?: () => void; style?: 'cancel' | 'default' | 'destructive' }>) => {
      const text = [title, message].filter(Boolean).join('\n\n');
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(text);
        const defaultBtn = buttons?.find((b: any) => b.style !== 'cancel' && b.style !== 'destructive');
        if (defaultBtn?.onPress) setTimeout(defaultBtn.onPress, 0);
      } else {
        originalAlert(title, message, buttons as any);
      }
    };
  } catch (_e) {
    // 差し替えに失敗した場合はそのまま
  }
}

// メインコンテンツコンポーネント - 認証状態に基づく画面遷移を制御
function RootLayoutContent() {
  // フレームワークの準備状態を取得（アプリ起動時の初期化完了を待つ）
  const { isReady } = useFrameworkReady();
  
  // ルーティング関連のフック
  const router = useRouter(); // 画面遷移を実行するためのルーター
  const segments = useSegments() as readonly string[]; // 現在のURLパスを配列で取得
  const rootNavigationState = useRootNavigationState();
  const isRouterReady = !!rootNavigationState?.key;
  
  // 認証フックを常に実行（Hooksの順序を保持）
  const { 
    isAuthenticated, 
    isLoading, 
    isInitialized,
    hasInstrumentSelected,
    needsTutorial,
    canAccessMainApp,
    signOut,
    user
  } = useAuthAdvanced();

  // segmentsをrefで保持（Web環境での強制遷移を防ぐため）
  const segmentsRef = useRef(segments);

  // segmentsが変更されたらrefを更新（重複を削除）
  React.useEffect(() => {
    segmentsRef.current = segments;
  }, [segments]);

  // アプリのライフサイクル管理：バックグラウンド移行時にオーディオリソースを解放
  React.useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        audioResourceManager.forceReleaseAll();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // ネットワーク切断検出：ネットワークが切断されたらログイン画面にリダイレクト（統合版）
  // Web環境ではnavigator.onLineを使用、ネイティブ環境では将来的にNetInfoを統合可能
  React.useEffect(() => {
    // Web環境でのオフライン検出
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleOffline = () => {
        if (!isOnline()) {
          const currentSegments = segmentsRef.current;
          const isInAuthGroup = currentSegments[0] === 'auth';
          
          // ログイン画面にいない場合のみリダイレクト
          if (!isInAuthGroup && isReady && isRouterReady && isInitialized) {
            redirectToLogin(router, 'ネットワーク切断を検出');
          }
        }
      };

      const handleOnline = () => {
        // オンライン復帰時の処理（必要に応じて実装）
        logger.debug('ネットワーク接続が復旧しました');
      };

      // 初回チェック
      handleOffline();

      // ネットワーク状態の変化を監視
      window.addEventListener('offline', handleOffline);
      window.addEventListener('online', handleOnline);
      return () => {
        window.removeEventListener('offline', handleOffline);
        window.removeEventListener('online', handleOnline);
      };
    }
    
    // ネイティブ環境でのオフライン検出（将来的にNetInfoを統合可能）
    // TODO: ネイティブ環境でのオフライン検出を実装する場合は、@react-native-community/netinfoを使用
    // 現時点では、ネイティブ環境ではオフライン検出を行わない（Web環境のみ対応）
  }, [isReady, isInitialized, router, segments]);


  // データベーススキーマの整合性をチェック（認証完了後、一度だけ実行）
  // 初期スキーマに含まれているテーブル/カラムは毎回チェックする必要がないため、チェック処理は削除
  React.useEffect(() => {
    if (isAuthenticated && isInitialized && !isLoading) {
      // 目標リポジトリのカラム存在確認を初期化（一度だけ実行）
      // 強制再チェックを無効にして、キャッシュを活用（効率化）
      initializeGoalRepository(false).catch((error: unknown) => {
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
          if ((fullMessage.includes('representative_songs') || 
               fullMessage.includes('representative-songs') ||
               fullMessage.includes('/rest/v1/representative_songs')) && 
              (fullMessage.includes('404') || 
               fullMessage.includes('Not Found') || 
               fullMessage.includes('PGRST205') ||
               fullMessage.includes('Not Found)'))) {
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
            const errorString = errorEvent.error?.toString() || '';
            const filename = errorEvent.filename || '';
            const fullErrorString = `${message} ${errorString} ${filename}`;
            
            // aria-hidden警告を抑制
            if (message.includes('Blocked aria-hidden') || 
                message.includes('aria-hidden') || 
                message.includes('descendant retained focus') ||
                message.includes('assistive technology') ||
                message.includes('The focus must not be hidden') ||
                message.includes('WAI-ARIA') ||
                errorString.includes('aria-hidden') ||
                errorString.includes('Blocked aria-hidden')) {
              event.preventDefault();
              event.stopPropagation();
              event.stopImmediatePropagation();
              return;
            }
            
            // representative_songsテーブルの404エラーを抑制
            if ((fullErrorString.includes('representative_songs') || 
                 fullErrorString.includes('representative-songs') ||
                 fullErrorString.includes('/rest/v1/representative_songs')) && 
                (fullErrorString.includes('404') || 
                 fullErrorString.includes('Not Found') || 
                 fullErrorString.includes('PGRST205'))) {
              event.preventDefault();
              event.stopPropagation();
              event.stopImmediatePropagation();
              return;
            }
          }, true); // capture phaseで実行
        }
        
        // Metro接続切断警告を抑制（開発環境のみ）
        if (process.env.NODE_ENV === 'development') {
          const originalWarn = console.warn;
          console.warn = (...args: unknown[]) => {
            const message = args[0]?.toString() || '';
            const fullMessage = args.map(arg => String(arg)).join(' ');
            // Metro接続切断警告を無視
            if (message.includes('Disconnected from Metro') ||
                message.includes('Metro') ||
                fullMessage.includes('Disconnected from Metro') ||
                fullMessage.includes('HMR') ||
                fullMessage.includes('Hot Module Replacement') ||
                fullMessage.includes('reconnect')) {
              return;
            }
            originalWarn.apply(console, args);
          };
        }
      }
    }
  }, []);

  // GitHub Pages用: 404.htmlからリダイレクトされた際に元のパスを復元
  React.useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && isReady && isRouterReady) {
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
      const originalPath = sessionStorage.getItem('_original_path');
      const storedRedirectPath = sessionStorage.getItem('expo-router-redirect-path');
      
      // リダイレクトフラグをクリア
      sessionStorage.removeItem('_404_redirected');
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
        try {
          router.replace(normalizedRedirectPath as any);
        } catch (e) {
          logger.warn('Root Layout未準備のため遷移をスキップ（後で自動復旧します）', e);
        }
      } else if (storedRedirectPath) {
        // sessionStorageからリダイレクトパスを復元
        logger.debug('404.htmlからリダイレクトされたパスを復元（sessionStorage）:', storedRedirectPath);
        sessionStorage.removeItem('expo-router-redirect-path');
        
        // リダイレクトパスを正規化
        const normalizedRedirectPath = storedRedirectPath.startsWith('/') ? storedRedirectPath : '/' + storedRedirectPath;
        const newPath = basePath + normalizedRedirectPath;
        
        window.history.replaceState({}, '', newPath + window.location.search + window.location.hash);
        try {
          router.replace(normalizedRedirectPath as any);
        } catch (e) {
          logger.warn('Root Layout未準備のため遷移をスキップ（後で自動復旧します）', e);
        }
      } else if (originalPath) {
        // sessionStorageから元のパスを復元（フォールバック）
        if (currentPath.includes('/index.html') && originalPath !== currentPath) {
          logger.debug('404.htmlからリダイレクトされたパスを復元（sessionStorage originalPath）:', originalPath);
          sessionStorage.removeItem('expo-router-original-path');
          const pathWithoutBaseFromOriginal = originalPath.replace(basePath, '') || '/';
          window.history.replaceState({}, '', originalPath + window.location.search + window.location.hash);
          try {
            router.replace(pathWithoutBaseFromOriginal as any);
          } catch (e) {
            logger.warn('Root Layout未準備のため遷移をスキップ（後で自動復旧します）', e);
          }
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
  }, [router, isReady, isRouterReady]);

  /**
   * 【ナビゲーション関数】安全な画面遷移を実行
   * - Expo Routerの「navigate before mounting」エラーを回避
   * - 遷移失敗時のフォールバック処理を含む
   * - チュートリアル画面への遷移時は特別なフォールバック処理
   */
  // ナビゲーション関数（シンプル化）
  const navigateWithDelay = (path: RoutePath, delay: number = 0): void => {
    // フレームワークが準備完了するまで待機
    if (!isReady || !isRouterReady) {
      logger.debug('フレームワーク準備中 - ナビゲーションを待機中', { path, isReady });
      // 準備完了後に再試行
      setTimeout(() => navigateWithDelay(path, 0), 100);
      return;
    }
    
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
    // Expo RouterのRoot Navigationが準備できるまで待機（navigate before mounting を回避）
    if (!isRouterReady) {
      return;
    }

    // 現在のセグメントを取得（Web環境ではrefから取得して強制遷移を防ぐ）
    const currentSegments = Platform.OS === 'web' ? segmentsRef.current : segments;
    
    // フレームワークが準備完了するまで待機（Root Layoutのマウントを待つ）
    // ただし、Web環境ではURLから画面を判断して即座に表示（Optimistic UI）
    if (!isReady) {
      // Web環境: 有効な画面にいる場合は、isReadyを待たずに画面を維持
      if (Platform.OS === 'web') {
        const firstSegment = currentSegments[0];
        const isInTabsGroup = firstSegment === '(tabs)';
        const isInAuthGroup = firstSegment === 'auth';
        
        // 有効なアプリ画面にいる場合は、画面を維持（デフォルト画面を表示しない）
        if (isInTabsGroup || isInAuthGroup) {
          logger.debug('フレームワーク準備中・有効な画面 - 画面を維持', { isReady, currentSegments });
          return;
        }
      }
      
      logger.debug('フレームワーク準備中 - 画面遷移を待機中', { isReady });
      return;
    }
    
    /**
     * 【統一された認証保護ロジック】
     * - 未認証 → ログイン画面
     * - 認証済み + 楽器未選択 → チュートリアル or 楽器選択画面
     * - 認証済み + 楽器選択済み → メイン画面
     */
    const firstSegment = currentSegments[0];
    const isInAuthGroup = firstSegment === 'auth';
    const isInTabsGroup = firstSegment === '(tabs)';
    const isInOrgGroup = firstSegment === 'organization-dashboard' || firstSegment === 'organization-settings';
    const isNotFoundScreen = firstSegment === '+not-found';
    const currentTab = isInTabsGroup && currentSegments.length > 1 ? currentSegments[1] : null;
    const isAtRoot = currentSegments.length === 0;
    
    // 認証画面（ログイン/新規登録）にいる場合は完全にスキップ
    // 各画面のuseEffectで画面遷移を処理するため、ここでは何もしない
    if (isInAuthGroup) {
      const authChild = segments.length > 1 ? segments[1] : undefined;
      if (authChild === 'login' || authChild === 'signup') {
        logger.debug('認証画面（ログイン/新規登録）にいるため、処理をスキップ', { authChild });
        return; // 完全にスキップ
      }
    }
    
    // 利用規約・プライバシーポリシー画面は許可（認証チェックをスキップ）
    if (firstSegment === 'terms-of-service' || firstSegment === 'privacy-policy') {
      return;
    }
    
    // Web環境: 認証状態の初期化中でも、URLから画面を判断して表示（Optimistic UI）
    if (Platform.OS === 'web' && (isLoading || !isInitialized)) {
      // 認証画面にいる場合でも、認証済みの場合は画面遷移を実行
      if (isInAuthGroup && isAuthenticated) {
        logger.debug('認証初期化中・認証画面・認証済み - 画面遷移を実行', { isLoading, isInitialized, isAuthenticated });
        // 認証済みの場合は、初期化完了を待たずに画面遷移を実行（チュートリアル画面など）
        // 下記の認証済みユーザーの処理に進む
      } else if (isInAuthGroup) {
        logger.debug('認証初期化中・認証画面 - 画面遷移を待機中', { isLoading, isInitialized });
        return;
      }
      
      // 有効なアプリ画面（タブグループ、組織管理画面など）にいる場合は、認証確認を待たずに画面を維持
      // これにより、リロード時にデフォルト画面やログイン画面が表示されない
      if (isInTabsGroup || isInOrgGroup) {
        logger.debug('認証初期化中・有効な画面 - 画面を維持（Optimistic UI）', { currentSegments, isLoading, isInitialized });
        return; // 画面遷移をブロックしない（現在の画面を維持）
      }
      
      // 利用規約・プライバシーポリシー画面も維持
      if (firstSegment === 'terms-of-service' || firstSegment === 'privacy-policy') {
        return;
      }
      
      // ルートパスのみログイン画面にリダイレクト（初回アクセス時）
      if (isAtRoot) {
        redirectToLogin(router, '認証初期化中・ルートパス');
        return;
      }
      
      // その他の画面（存在する画面）も維持
      logger.debug('認証初期化中・その他の画面 - 画面を維持', { currentSegments, isLoading, isInitialized });
      return;
    }
    
    // ネイティブ環境: 初期化中は待機
    if (isLoading || !isInitialized) {
      logger.debug('認証初期化中 - 画面遷移を待機中', { isLoading, isInitialized });
      return;
    }

    logger.debug('画面遷移チェック', {
      isAuthenticated,
      isInitialized,
      isLoading,
      currentSegments,
      hasInstrumentSelected: hasInstrumentSelected(),
      needsTutorial: needsTutorial(),
    });

    // Web環境: 認証確認完了後の処理
    // バックグラウンドで認証確認が完了した後、未認証の場合はログイン画面にリダイレクト
    if (Platform.OS === 'web') {
      // 認証済みで適切な画面にいる場合は、リロード時も現在の画面を維持
      if (isAuthenticated && (isInTabsGroup || isInOrgGroup) && hasInstrumentSelected()) {
        logger.debug('認証済み・楽器選択済み - 現在の画面を維持', { segments: currentSegments });
        return;
      }
      
      // 認証画面（ログイン/新規登録）は既にスキップされているため、ここでは処理しない
      
      // 未認証でアプリ画面にいる場合は、ログイン画面にリダイレクト
      // ただし、認証確認が完了した後（isInitialized && !isLoading）のみ
      if (!isAuthenticated && (isInTabsGroup || isInOrgGroup) && isInitialized && !isLoading) {
        redirectToLogin(router, '未認証・アプリ画面');
        return;
      }
    }
    
    // 未認証ユーザー → ログイン画面にリダイレクト
    // 認証画面（ログイン/新規登録）は既にスキップされているため、ここでは処理しない
    if (!isAuthenticated) {
      // ルートパス（/）またはその他の画面にアクセスした場合は、ログイン画面にリダイレクト
      redirectToLogin(router, '未認証ユーザー');
      return;
    }

    // 認証済みユーザー
    // 認証画面（ログイン/新規登録）は既にスキップされているため、ここでは処理しない
    // その他の認証画面（callback、reset-passwordなど）は後続処理で対応
    
    // 楽器未選択の場合の処理
    // 重要: ネットワークエラー時や初期化中は楽器選択画面に遷移しない
    // これにより、エラー時に誤って楽器選択画面が表示されることを防ぐ
    const instrumentSelected = hasInstrumentSelected();
    if (!instrumentSelected) {
      // チュートリアル画面にいる場合は許可（遷移をブロックしない）
      if (currentTab === 'tutorial') {
        return;
      }
      
      // 楽器選択画面にいる場合は許可（遷移をブロックしない）
      if (currentTab === 'instrument-selection') {
        return;
      }
      
      // 既に適切な画面（タブグループ内）にいる場合は、エラー時でも画面を維持
      // これにより、ネットワークエラー時に誤って楽器選択画面に遷移することを防ぐ
      // 特に、カレンダー画面やその他のメイン画面にいる場合は、エラー時でも画面を維持
      if (isInTabsGroup && currentTab && currentTab !== 'tutorial' && currentTab !== 'instrument-selection') {
        logger.debug('楽器未選択だが、既に適切な画面にいるため画面を維持（エラー時の誤遷移を防止）', { 
          currentTab, 
          isAuthenticated,
          isInitialized,
          isLoading,
          userSelectedInstrument: user?.selected_instrument_id
        });
        return;
      }
      
      // チュートリアルが必要な場合はチュートリアル画面に遷移
      if (needsTutorial()) {
        logger.debug('新規登録直後のため、チュートリアル画面にリダイレクト');
        router.replace('/(tabs)/tutorial');
        return;
      }
      
      // その他の場合は楽器選択画面に遷移
      // ただし、ルートパスや認証画面からの遷移のみ（既存画面からの誤遷移を防ぐ）
      // また、初期化中やローディング中は遷移しない（エラー時の誤遷移を防ぐ）
      if ((isAtRoot || isInAuthGroup) && isInitialized && !isLoading) {
        logger.debug('楽器未選択のため、楽器選択画面にリダイレクト', { 
          isAtRoot, 
          isInAuthGroup,
          isInitialized,
          isLoading
        });
        router.replace('/(tabs)/instrument-selection');
        return;
      }
      
      // その他の場合は画面を維持（エラー時の誤遷移を防止）
      logger.debug('楽器未選択だが、既存画面からの遷移または初期化中のため画面を維持（エラー時の誤遷移を防止）', { 
        currentSegments,
        isInitialized,
        isLoading,
        isAuthenticated
      });
      return;
    }

    // 認証済み + 楽器選択済み
    // チュートリアル画面にいる場合はカレンダー画面に遷移
    if (currentTab === 'tutorial' && hasInstrumentSelected()) {
      logger.debug('楽器選択済みのため、チュートリアル画面からカレンダー画面にリダイレクト');
      router.replace('/(tabs)/index');
      return;
    }
    
    // Web環境: 既に適切な画面にいる場合は維持
    if (Platform.OS === 'web' && (isInTabsGroup || isInOrgGroup)) {
      return;
    }
    
    // ルートパスの場合はカレンダー画面に遷移
    if (isAtRoot) {
      router.replace('/(tabs)/index');
      return;
    }
    
    // その他の認証画面（callback、reset-passwordなど）の処理
    if (isInAuthGroup) {
      if (!hasInstrumentSelected()) {
        router.replace('/(tabs)/instrument-selection');
      } else {
        router.replace('/(tabs)/index');
      }
      return;
    }
  }, [isReady, isRouterReady, isAuthenticated, isLoading, isInitialized, hasInstrumentSelected, needsTutorial, router, segments]);

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
  // デフォルトテーマの背景色を取得（黒い画面を防ぐため）
  const defaultBackgroundColor = '#FFFFFF'; // defaultThemeのbackground色
  
  return (
    <Stack 
      screenOptions={{ 
        headerShown: false, // ヘッダーを非表示（カスタムヘッダーを使用）
        contentStyle: { backgroundColor: defaultBackgroundColor }, // デフォルト背景色を設定（黒い画面を防ぐ）
      }}
    >
      {/* 認証関連の画面 - app/auth/_layout.tsx で子ルートを管理 */}
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      
      {/* メインアプリの画面（タブナビゲーション） */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      
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
  const router = useRouter();
  
  return (
    // グローバルエラーバウンダリー（アプリ全体のエラーをキャッチ）
    <GlobalErrorBoundary router={router}>
      {/* 多言語対応を管理するプロバイダー */}
      <LanguageProvider>
        {/* 楽器別テーマを管理するプロバイダー */}
        <InstrumentThemeProvider>
          {/* サブスクリプション状態を管理するプロバイダー */}
          <SubscriptionProvider>
            {/* メインコンテンツ */}
            <RootLayoutContent />
            {/* ステータスバーの設定（ダークテーマ） */}
            {StatusBar && <StatusBar style="dark" />}
          </SubscriptionProvider>
        </InstrumentThemeProvider>
      </LanguageProvider>
    </GlobalErrorBoundary>
  );
}