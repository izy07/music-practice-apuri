import logger from './logger';
import { Alert } from 'react-native';
import { ErrorMessages, showUserFriendlyError } from './errorMessages';
import { ERROR } from './constants';

/**
 * エラー型の定義
 */
export type AppError = Error | { message?: string; code?: string; [key: string]: unknown } | string | unknown;

/**
 * ユーザーフレンドリーなエラーメッセージを取得
 */
export function getUserFriendlyMessage(error: AppError): string {
  const message = (error instanceof Error 
    ? error.message 
    : typeof error === 'object' && error !== null && 'message' in error
    ? String(error.message)
    : String(error || '')
  ).toLowerCase();
  
  if (message.includes('invalid refresh token') || message.includes('session expired')) {
    return 'セッションが期限切れです。再ログインしてください。';
  }
  if (message.includes('network') || message.includes('fetch')) {
    return 'ネットワークに問題が発生しました。接続を確認してください。';
  }
  return ERROR.DEFAULT_MESSAGE;
}

/**
 * エラーをログに記録
 */
export function handleError(error: AppError, context?: string): void {
  logger.error('Error:', context || 'Unknown context', error);
}

/**
 * 統一されたエラーハンドラー
 * アプリケーション全体で一貫したエラー処理を提供
 */
export class ErrorHandler {
  private static errorCount = 0;
  private static readonly MAX_ERRORS = ERROR.MAX_DISPLAY_COUNT;
  private static networkErrorCount = 0;
  private static readonly MAX_NETWORK_ERRORS = 3; // ネットワークエラーは3回まで表示
  private static lastNetworkErrorTime = 0;
  private static readonly NETWORK_ERROR_THROTTLE_MS = 5000; // 5秒間は同じネットワークエラーを表示しない
  
  /**
   * ネットワークエラーかどうかを判定
   */
  private static isNetworkError(error: AppError): boolean {
    const message = (error instanceof Error 
      ? error.message 
      : typeof error === 'object' && error !== null && 'message' in error
      ? String(error.message)
      : String(error || '')
    ).toLowerCase();
    
    return (
      message.includes('failed to fetch') ||
      message.includes('networkerror') ||
      message.includes('network error') ||
      message.includes('err_internet_disconnected') ||
      message.includes('internet disconnected') ||
      message.includes('network request failed')
    );
  }
  
  /**
   * エラーを処理し、必要に応じてユーザーに表示
   * @param error - エラーオブジェクト
   * @param context - エラーが発生したコンテキスト
   * @param showToUser - ユーザーにエラーを表示するかどうか
   */
  static handle(error: AppError, context: string = '', showToUser: boolean = true): void {
    const isNetwork = this.isNetworkError(error);
    const now = Date.now();
    
    // ネットワークエラーの場合、スロットリング処理
    if (isNetwork) {
      // 5秒以内に同じネットワークエラーが発生した場合はログのみ（表示しない）
      if (now - this.lastNetworkErrorTime < this.NETWORK_ERROR_THROTTLE_MS) {
        // ログも抑制（開発環境でのみ表示）
        if (__DEV__) {
          logger.debug(`[ErrorHandler] ネットワークエラー（スロットリング）: ${context}`);
        }
        return;
      }
      
      this.networkErrorCount++;
      this.lastNetworkErrorTime = now;
      
      // ネットワークエラーは3回まで表示
      if (this.networkErrorCount > this.MAX_NETWORK_ERRORS) {
        // ログも抑制（開発環境でのみ表示）
        if (__DEV__) {
          logger.debug(`[ErrorHandler] ネットワークエラー（表示上限）: ${context}`);
        }
        return;
      }
      
      // ネットワークエラーはログのみ（開発環境でのみ）
      if (__DEV__) {
        logger.debug(`[ErrorHandler] ネットワークエラー: ${context}`, error);
      }
      
      // ネットワークエラーはユーザーに表示しない（オフライン時は正常な動作）
      return;
    }
    
    // ネットワークエラー以外のエラーは通常通り処理
    logger.error(`[ErrorHandler] ${context || 'Unknown context'}`, error);
    
    this.errorCount++;
    
    if (showToUser && this.errorCount <= this.MAX_ERRORS) {
      showUserFriendlyError(error, context);
    } else if (this.errorCount > this.MAX_ERRORS) {
      Alert.alert(
        'エラーが多発しています',
        'エラーが続いているため、アプリを再起動することをお勧めします。',
        [{ text: '了解' }]
      );
    }
  }
  
  /**
   * エラーカウントをリセット
   */
  static resetErrorCount(): void {
    this.errorCount = 0;
  }
  
  /**
   * 現在のエラーカウントを取得
   */
  static getErrorCount(): number {
    return this.errorCount;
  }
  
  /**
   * エラー制限に達しているかどうかを確認
   */
  static isErrorLimitReached(): boolean {
    return this.errorCount > this.MAX_ERRORS;
  }
}
