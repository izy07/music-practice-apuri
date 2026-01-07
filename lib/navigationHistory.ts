import logger from './logger';

let previousRoute: string | null = null;
let isFromLearningTools: boolean = false;
let currentRoute: string | null = null; // 現在のルートを記録

/**
 * 元の画面を記録（学習ツールから遷移する際に使用）
 */
export const setPreviousRoute = (route: string) => {
  previousRoute = route;
  isFromLearningTools = true;
};

/**
 * 記録した元の画面を取得
 */
export const getPreviousRoute = (): string | null => {
  return previousRoute;
};

/**
 * 学習ツール経由かどうかを確認
 */
export const isFromLearningToolsNavigation = (): boolean => {
  return isFromLearningTools;
};

/**
 * 記録した元の画面を取得してクリア
 */
export const getAndClearPreviousRoute = (): string | null => {
  const route = previousRoute;
  previousRoute = null;
  isFromLearningTools = false;
  logger.debug('記録した元の画面を取得してクリア:', route);
  return route;
};

/**
 * 履歴をクリア
 */
export const clearPreviousRoute = () => {
  previousRoute = null;
  isFromLearningTools = false;
};

/**
 * 現在のルートを記録（各画面がマウントされた時に呼び出す）
 */
export const setCurrentRoute = (route: string) => {
  currentRoute = route;
  logger.debug('現在のルートを記録:', route);
};

/**
 * 記録された現在のルートを取得
 */
export const getCurrentRouteFromHistory = (): string | null => {
  return currentRoute;
};
