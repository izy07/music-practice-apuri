import { router } from 'expo-router';
import logger from './logger';
import { ErrorHandler } from './errorHandler';

/**
 * 安全な戻る処理
 * 常に前の画面に戻る。ナビゲーションスタックに戻る画面がない場合のみフォールバック画面に遷移
 * この関数を使用することで、どの画面からでも確実に前の画面に戻ることができます
 * 
 * @param fallbackRoute - 戻る画面がない場合のフォールバックルート
 * @param forceFallback - trueの場合、常にフォールバックルートに遷移（router.back()を使わない）
 */
export const safeGoBack = (fallbackRoute: string = '/(tabs)/settings', forceFallback: boolean = false) => {
  try {
    // forceFallbackがtrueの場合、またはタブナビゲーション内で確実に戻りたい場合は、常にフォールバックルートに遷移
    if (forceFallback) {
      router.push(fallbackRoute as any);
      return;
    }
    
    // canGoBack()がtrueの場合は、確実に前の画面に戻る
    if (router.canGoBack()) {
      router.back();
      return;
    }
    
    // 戻る画面がない場合のみフォールバック画面に遷移
    router.push(fallbackRoute as any);
  } catch (error) {
    ErrorHandler.handle(error, 'Navigation safeGoBack', false);
    // エラーが発生した場合も、フォールバックルートに遷移
    router.push(fallbackRoute as any);
  }
};

/**
 * 特定の画面に安全に遷移
 * エラーが発生した場合はフォールバック画面に遷移
 */
export const safeNavigate = (route: string, fallbackRoute: string = '/(tabs)/index') => {
  try {
    router.push(route);
  } catch (error) {
    ErrorHandler.handle(error, 'Navigation safeNavigate', false);
    router.push(fallbackRoute);
  }
};

/**
 * 画面を置き換える（履歴に追加しない）
 */
export const safeReplace = (route: string, fallbackRoute: string = '/(tabs)/index') => {
  try {
    router.replace(route);
  } catch (error) {
    ErrorHandler.handle(error, 'Navigation safeReplace', false);
    router.push(fallbackRoute);
  }
};
