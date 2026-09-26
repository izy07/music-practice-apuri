// メインのレイアウトファイル - アプリ全体の構造と認証ルーティングを管理
// Expo Routerのサーバーサイドレンダリングを無効化（開発環境でのエラーを回避）
export const unstable_serverRendering = false;

import React, { useEffect } from 'react';
import { View, LogBox, AppState, Alert, Platform } from 'react-native';
import { Stack } from 'expo-router'; // 画面遷移のスタックナビゲーター
import { useRouter, useRootNavigationState, useGlobalSearchParams } from 'expo-router';
import { useFrameworkReady } from '@/hooks/useFrameworkReady'; // フレームワーク準備状態の管理
import { useAuthAdvanced } from '@/hooks/useAuthAdvanced'; // 認証フック（統一版）
import { LanguageProvider } from '@/components/LanguageContext'; // 多言語対応の管理
import { InstrumentThemeProvider } from '@/components/InstrumentThemeContext'; // 楽器別テーマの管理
import { SubscriptionProvider } from '@/contexts/SubscriptionContext'; // サブスクリプション状態の管理
import { getSupabaseInitError } from '@/lib/supabase';
import logger from '@/lib/logger'; // ロガー
import { setStartupPhase } from '@/lib/startupDiagnostics';
import { StartupFailureScreen } from '@/components/app/StartupFailureScreen';
import { ErrorHandler } from '@/lib/errorHandler'; // エラーハンドラー
import { getBasePath } from '@/lib/navigationUtils';
import { useAppRouteGuard } from '@/hooks/useAppRouteGuard';
import { initializeGoalRepository } from '@/repositories/goalRepository'; // 目標リポジトリの初期化
import audioResourceManager from '@/lib/audioResourceManager'; // オーディオリソース管理
import { isOnline } from '@/lib/offlineStorage'; // ネットワーク状態確認
import { GlobalErrorBoundary } from '@/components/GlobalErrorBoundary'; // グローバルエラーバウンダリー
import FeatureUsageTracker from '@/components/FeatureUsageTracker';
import { hideNativeSplash, startSplashHideWatchdog } from '@/lib/splashControl';
import { RootAppShell } from '@/components/app/RootAppShell';

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

  // Webでは React Native の Alert.alert が動作しないため、confirm/alert に差し替える
  try {
    const originalAlert = Alert.alert.bind(Alert);
    (Alert as any).alert = (
      title: string,
      message?: string,
      buttons?: Array<{ text: string; onPress?: () => void; style?: 'cancel' | 'default' | 'destructive' }>
    ) => {
      const text = [title, message].filter(Boolean).join('\n\n');
      if (typeof window !== 'undefined') {
        if (buttons && buttons.length > 1) {
          const confirmed = window.confirm(text);
          if (confirmed) {
            const actionBtn =
              buttons.find((b) => b.style === 'destructive') ??
              buttons.find((b) => b.style !== 'cancel') ??
              buttons[buttons.length - 1];
            actionBtn?.onPress?.();
          } else {
            buttons.find((b) => b.style === 'cancel')?.onPress?.();
          }
        } else {
          window.alert(text);
          buttons?.[0]?.onPress?.();
        }
        return;
      }
      originalAlert(title, message, buttons as any);
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
  const globalParams = useGlobalSearchParams<{ from?: string }>();
  const rootNavigationState = useRootNavigationState();
  const isRouterReady = !!rootNavigationState?.key;
  
  // 認証フックを常に実行（Hooksの順序を保持）
  const { 
    isAuthenticated, 
    isLoading, 
    isInitialized,
    hasInstrumentSelected,
    getOnboardingRoute,
  } = useAuthAdvanced();

  useAppRouteGuard({
    isReady,
    isRouterReady,
    isLoading,
    isInitialized,
    isAuthenticated,
    hasInstrumentSelected,
    getOnboardingRoute,
    tutorialFromSettings: globalParams.from === 'settings',
  });

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

  // ネットワーク状態の監視（オフライン時もログイン状態を維持するため、ログイン画面へは遷移しない）
  React.useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleOffline = () => {
        if (!isOnline()) {
          logger.debug('オフラインになりました - ログイン状態は維持します');
        }
      };

      const handleOnline = () => {
        logger.debug('ネットワーク接続が復旧しました');
      };

      window.addEventListener('offline', handleOffline);
      window.addEventListener('online', handleOnline);
      return () => {
        window.removeEventListener('offline', handleOffline);
        window.removeEventListener('online', handleOnline);
      };
    }
  }, []);


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

  useEffect(() => {
    setStartupPhase('layout-mount');
    hideNativeSplash('layout-content-mount');
    startSplashHideWatchdog(1500);
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    hideNativeSplash('layout-ready');
  }, [isRouterReady, isInitialized]);

  // 起動 UI は app/index.tsx（BootScreen）のみ。
  const defaultBackgroundColor = '#E3F2FD';

  return (
    <View style={{ flex: 1, backgroundColor: defaultBackgroundColor }}>
    <FeatureUsageTracker />
    <Stack 
      screenOptions={{ 
        headerShown: false, // ヘッダーを非表示（カスタムヘッダーを使用）
        contentStyle: { backgroundColor: defaultBackgroundColor }, // デフォルト背景色を設定（黒い画面を防ぐ）
      }}
    >
      {/* 起動エントリ（ルート `/` — 白画面防止。Stack は常に描画したまま） */}
      <Stack.Screen name="index" options={{ headerShown: false }} />

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
    </View>
  );
}

// アプリのルートレイアウト - 全体的なプロバイダーとコンテキストを設定
export default function RootLayout() {
  const router = useRouter();
  const supabaseError = getSupabaseInitError();

  useEffect(() => {
    hideNativeSplash('root-layout-mount');
    startSplashHideWatchdog(1500);
  }, []);

  useEffect(() => {
    if (supabaseError) {
      hideNativeSplash('supabase-config-error');
    }
  }, [supabaseError]);

  if (supabaseError) {
    return (
      <RootAppShell>
        <StartupFailureScreen
          message="データベース接続の設定に問題があります。"
          detail={supabaseError.message}
        />
      </RootAppShell>
    );
  }

  return (
    <RootAppShell>
      <GlobalErrorBoundary router={router}>
        <LanguageProvider>
          <InstrumentThemeProvider>
            <SubscriptionProvider>
              <RootLayoutContent />
              {StatusBar && <StatusBar style="dark" />}
            </SubscriptionProvider>
          </InstrumentThemeProvider>
        </LanguageProvider>
      </GlobalErrorBoundary>
    </RootAppShell>
  );
}