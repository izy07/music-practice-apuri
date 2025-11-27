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
  
  /**
   * エラーを処理し、必要に応じてユーザーに表示
   * @param error - エラーオブジェクト
   * @param context - エラーが発生したコンテキスト
   * @param showToUser - ユーザーにエラーを表示するかどうか
   */
  static handle(error: AppError, context: string = '', showToUser: boolean = true): void {
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
