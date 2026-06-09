/**
 * ナビゲーション関連のユーティリティ関数
 */

import { useRouter } from 'expo-router';
import { useAuthAdvanced } from '@/hooks/useAuthAdvanced';
import logger from '@/lib/logger';

/**
 * 認証状態に基づいて適切な画面に遷移する（統一関数）
 * 
 * この関数は、ログイン成功後や認証状態変更時に適切な画面に遷移するための
 * 統一的なロジックを提供します。
 * 
 * 遷移ルール:
 * 1. 楽器選択済み → メインカレンダー画面
 * 2. チュートリアル未完了（新規登録直後） → チュートリアル画面
 * 3. その他 → 楽器選択画面
 * 
 * @param router Expo Router の router インスタンス
 * @param options オプション
 * @param options.user 認証ユーザー情報（オプション、指定しない場合は useAuthAdvanced から取得）
 * @param options.hasInstrumentSelected 楽器選択状態（オプション、指定しない場合は useAuthAdvanced から取得）
 * @param options.needsTutorial チュートリアル必要状態（オプション、指定しない場合は useAuthAdvanced から取得）
 * @param options.canAccessMainApp メインアプリアクセス可能状態（オプション、指定しない場合は useAuthAdvanced から取得）
 */
export const navigateToAppropriateScreen = (
  router: ReturnType<typeof useRouter>,
  options?: {
    user?: { selected_instrument_id?: string | null; tutorial_completed?: boolean } | null;
    hasInstrumentSelected?: () => boolean;
    needsTutorial?: () => boolean;
    canAccessMainApp?: () => boolean;
  }
): void => {
  try {
    logger.debug('[navigateToAppropriateScreen] 画面遷移判定開始', {
      hasUser: !!options?.user,
      selectedInstrumentId: options?.user?.selected_instrument_id,
      tutorialCompleted: options?.user?.tutorial_completed,
    });
    
    // オプションが指定されていない場合は、useAuthAdvanced から取得
    // 注意: この関数は hook の外で呼ばれる可能性があるため、
    // オプションで渡された値を使用することを推奨
    const hasSelectedInstrument = options?.user?.selected_instrument_id != null && options.user.selected_instrument_id !== '';
    const canAccess = options?.canAccessMainApp?.() ?? false;
    
    logger.debug('[navigateToAppropriateScreen] 判定結果', {
      hasSelectedInstrument,
      canAccess,
    });
    
    // タイムアウト時のフォールバックユーザーの判定
    const isTimeoutFallback = options?.user && !options.user.selected_instrument_id && options.user.tutorial_completed === true;
    
    if (hasSelectedInstrument || canAccess || isTimeoutFallback) {
      logger.debug('[navigateToAppropriateScreen] カレンダー画面に遷移（最後に使用していた楽器のメイン画面）', { 
        isTimeoutFallback,
        hasSelectedInstrument,
        selectedInstrumentId: options?.user?.selected_instrument_id
      });
      router.push('/(tabs)/index');
    } else {
      // 楽器未選択の場合は必ずチュートリアルから開始
      logger.debug('[navigateToAppropriateScreen] チュートリアル画面に遷移');
      router.push('/(tabs)/tutorial');
    }
  } catch (error) {
    logger.error('[navigateToAppropriateScreen] 画面遷移エラー:', error);
    // エラー時は安全にカレンダー画面に遷移
    try {
      router.push('/(tabs)/index');
    } catch (fallbackError) {
      logger.error('[navigateToAppropriateScreen] フォールバック画面遷移も失敗:', fallbackError);
    }
  }
};

/**
 * 安全に前の画面に戻る（統一関数）
 * 
 * @param router Expo Router の router インスタンス
 * @param fallbackPath フォールバックパス（戻れない場合の遷移先）
 * @param forceReplace 強制的に replace を使用するか（デフォルト: false）
 */
export const safeGoBack = (
  router: ReturnType<typeof useRouter>,
  fallbackPath: string = '/(tabs)/index',
  forceReplace: boolean = false
): void => {
  try {
    if (forceReplace) {
      router.replace(fallbackPath as any);
    } else {
      // router.back() が利用可能な場合は使用
      if (typeof router.back === 'function') {
        router.back();
      } else {
        router.replace(fallbackPath as any);
      }
    }
  } catch (error) {
    logger.error('戻る操作エラー:', error);
    // エラー時はフォールバックパスに遷移
    try {
      router.replace(fallbackPath as any);
    } catch (fallbackError) {
      logger.error('フォールバック遷移も失敗:', fallbackError);
    }
  }
};

/**
 * ベースパスを取得（GitHub Pages対応）
 */
export const getBasePath = (): string => {
  if (typeof window === 'undefined') {
    return '';
  }
  
  // 環境変数からベースパスを取得
  const envBasePath = process.env.EXPO_PUBLIC_BASE_PATH;
  if (envBasePath) {
    return envBasePath;
  }
  
  // GitHub Pages の場合、パスから推測
  const pathname = window.location.pathname;
  if (pathname.includes('/music-practice-apuri/')) {
    return '/music-practice-apuri';
  }
  
  return '';
};

/**
 * ベースパスを考慮したナビゲーション
 */
export const navigateWithBasePath = (router: ReturnType<typeof useRouter>, path: string): void => {
  const basePath = getBasePath();
  const fullPath = basePath ? `${basePath}${path}` : path;
  router.push(fullPath as any);
};

/**
 * カレンダー画面（メイン画面）に遷移（統一関数）
 * 
 * すべてのカレンダー画面への遷移をこの関数で統一することで、
 * エラーハンドリングとログを一元管理します。
 * 
 * @param router Expo Router の router インスタンス
 * @param reason 遷移理由（ログ用、オプション）
 * @param usePush pushを使用するか（デフォルト: false、replaceを使用）
 */
export const navigateToCalendarScreen = (
  router: ReturnType<typeof useRouter>,
  reason?: string,
  usePush: boolean = false
): void => {
  try {
    const calendarPath = '/(tabs)/index';
    
    if (usePush) {
      router.push(calendarPath as any);
    } else {
      router.replace(calendarPath as any);
    }
    
    // ログは必要最小限（エラーのみ、理由がある場合のみdebug）
    if (reason) {
      logger.debug(`[navigateToCalendarScreen] ${reason}`);
    }
  } catch (error) {
    logger.error('[navigateToCalendarScreen] カレンダー画面への遷移エラー:', error);
    // エラー時はpushで再試行
    try {
      router.push('/(tabs)/index' as any);
    } catch (fallbackError) {
      logger.error('[navigateToCalendarScreen] フォールバック遷移も失敗:', fallbackError);
    }
  }
};

/**
 * ログイン画面にリダイレクト（統一関数）
 * 
 * すべてのログイン画面へのリダイレクトをこの関数で統一することで、
 * エラーハンドリングとログを一元管理します。
 * 
 * @param router Expo Router の router インスタンス
 * @param reason リダイレクト理由（ログ用、オプション）
 * @param usePush pushを使用するか（デフォルト: false、replaceを使用）
 */
export const redirectToLogin = (
  router: ReturnType<typeof useRouter>,
  reason?: string,
  usePush: boolean = false
): void => {
  try {
    const loginPath = '/auth/login';
    
    if (usePush) {
      router.push(loginPath as any);
    } else {
      router.replace(loginPath as any);
    }
    
    // ログは必要最小限（エラーのみ、理由がある場合のみdebug）
    if (reason) {
      logger.debug(`[redirectToLogin] ${reason}`);
    }
  } catch (error) {
    logger.error('[redirectToLogin] ログイン画面への遷移エラー:', error);
    // エラー時は再試行しない（無限ループを防ぐ）
  }
};
