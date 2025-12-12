/**
 * アプリケーション全体で使用される定数
 * マジックナンバーを定数化し、コードの可読性と保守性を向上
 */

/**
 * タイムアウト関連の定数
 */
export const TIMEOUT = {
  /** アイドルタイムアウト（1時間） */
  IDLE_MS: 60 * 60 * 1000,
  /** ナビゲーション遅延（ミリ秒） */
  NAVIGATION_DELAY_MS: 100,
  /** ナビゲーション再遷移防止時間（ミリ秒） */
  NAVIGATION_COOLDOWN_MS: 300,
  /** 接続テストタイムアウト（ミリ秒） */
  CONNECTION_TEST_MS: 3000,
  /** セッションリフレッシュ前の余裕時間（秒） */
  SESSION_REFRESH_BUFFER_SEC: 60,
  /** セッション期限切れ警告時間（秒） */
  SESSION_EXPIRY_WARNING_SEC: 120,
} as const;

/**
 * エラー処理関連の定数
 */
export const ERROR = {
  /** 最大エラー表示回数 */
  MAX_DISPLAY_COUNT: 5,
  /** エラーメッセージのデフォルト */
  DEFAULT_MESSAGE: '処理中にエラーが発生しました。時間をおいて再度お試しください。',
} as const;

/**
 * UI関連の定数
 */
export const UI = {
  /** チャートの最大ラベル数 */
  MAX_CHART_LABELS: 10,
  /** チャートの高さ */
  CHART_HEIGHT: 260,
  /** チャートのラベル領域の高さ */
  CHART_LABEL_AREA: 26,
  /** チャートの棒の間隔 */
  CHART_BAR_GAP: 8,
  /** チャートの高さスケール */
  CHART_HEIGHT_SCALE: 0.75,
  /** 最小バーの幅 */
  MIN_BAR_WIDTH: 6,
  /** 最小バーの高さ */
  MIN_BAR_HEIGHT: 2,
} as const;

/**
 * データ取得関連の定数
 */
export const DATA = {
  /** 練習記録の最大取得件数 */
  MAX_PRACTICE_RECORDS: 100, // ページネーション対応: メモリ使用量削減のため100件に制限
  /** ページネーションのデフォルト件数 */
  DEFAULT_PAGE_SIZE: 20,
} as const;

/**
 * 認証関連の定数
 */
export const AUTH = {
  /** レート制限の試行回数 */
  RATE_LIMIT_ATTEMPTS: 5,
  /** レート制限のブロック時間（ミリ秒） */
  RATE_LIMIT_BLOCK_MS: 15 * 60 * 1000, // 15分
} as const;

/**
 * 統計関連の定数
 */
export const STATISTICS = {
  /** 週の日数 */
  DAYS_IN_WEEK: 7,
  /** 月の区分数 */
  MONTHLY_BINS: 5,
  /** 年の月数 */
  MONTHS_IN_YEAR: 12,
} as const;

/**
 * 録音関連の定数
 */
export const RECORDING = {
  /** 最大録音時間（秒） */
  MAX_RECORDING_TIME_SEC: 60,
} as const;


