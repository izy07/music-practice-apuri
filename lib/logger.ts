/**
 * 環境対応ロガー
 * 本番環境ではerrorレベルのみ出力、開発環境では全レベル出力
 * Usage: logger.debug('message', data)
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

/**
 * 現在のログレベルを取得
 * React Native環境とNode.js環境の両方に対応
 */
const getCurrentLogLevel = (): LogLevel => {
  // 明示的にLOG_LEVELが設定されている場合
  if (typeof process !== 'undefined' && process.env.LOG_LEVEL) {
    const level = process.env.LOG_LEVEL as LogLevel;
    if (['debug', 'info', 'warn', 'error'].includes(level)) {
      return level;
    }
  }

  // 本番環境の判定
  const isProduction = 
    (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') ||
    (typeof __DEV__ !== 'undefined' && !__DEV__);

  // 本番環境ではerrorレベルのみ出力（テスターに詳細情報を見せないため）
  return isProduction ? 'error' : 'debug';
};

const currentLevel = LEVEL_ORDER[getCurrentLogLevel()];

/**
 * ログメッセージをフォーマット
 * 配列やオブジェクトをJSON文字列に変換して、React Native WebのLogBoxでのエラーを防ぐ
 */
const format = (level: LogLevel, args: unknown[]): unknown[] => {
  const time = new Date().toISOString();
  const formattedArgs = args.map(arg => {
    // undefined や null の場合は安全に処理
    if (arg === undefined || arg === null) {
      return String(arg);
    }
    // オブジェクトや配列の場合はJSON文字列に変換（LogBoxでのレンダリングエラーを防ぐ）
    if (typeof arg === 'object') {
      try {
        const jsonStr = JSON.stringify(arg, null, 2);
        // 空のオブジェクトや配列の場合も文字列として返す
        return jsonStr || '{}';
      } catch (e) {
        // JSON.stringifyが失敗した場合はそのまま返す
        return String(arg);
      }
    }
    // その他の型（文字列、数値、真偽値など）はそのまま返す
    return arg;
  });
  return [`[${time}]`, `[${level.toUpperCase()}]`, ...formattedArgs];
};

/**
 * ログを出力するかどうかを判定
 */
const shouldLog = (level: LogLevel): boolean => {
  return currentLevel <= LEVEL_ORDER[level];
};

export const logger = {
  debug: (...args: unknown[]): void => {
    if (shouldLog('debug')) {
      // eslint-disable-next-line no-console
      console.debug(...format('debug', args));
    }
  },
  info: (...args: unknown[]): void => {
    if (shouldLog('info')) {
      // eslint-disable-next-line no-console
      console.info(...format('info', args));
    }
  },
  warn: (...args: unknown[]): void => {
    if (shouldLog('warn')) {
      // eslint-disable-next-line no-console
      console.warn(...format('warn', args));
    }
  },
  error: (...args: unknown[]): void => {
    if (shouldLog('error')) {
      // eslint-disable-next-line no-console
      console.error(...format('error', args));
    }
  },
};

export default logger;


