// アプリ全体で使用する共通スタイル定数
export const APP_COLORS = {
  BACKGROUND: '#FEFEFE',
  SURFACE: '#FFFFFF',
  PRIMARY: '#4A5568',
  SECONDARY: '#E2E8F0',
  TEXT: '#2D3748',
  TEXT_SECONDARY: '#718096',
} as const;

// 共通のコンテナスタイル
export const COMMON_STYLES = {
  container: {
    backgroundColor: APP_COLORS.BACKGROUND,
  },
  surface: {
    backgroundColor: APP_COLORS.SURFACE,
  },
} as const;
