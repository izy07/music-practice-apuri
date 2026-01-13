/**
 * エラーハンドリングの共通ヘルパー関数
 * 
 * アプリケーション全体で一貫したエラーハンドリングを提供するための共通関数
 * 重複コードを削減し、エラーハンドリングのパターンを統一します
 */

import { Alert } from 'react-native';
import logger from './logger';
import { ErrorHandler } from './errorHandler';

/**
 * エラーの型定義
 */
export interface ErrorWithCode {
  code?: string;
  message?: string;
  details?: unknown;
  hint?: string;
}

/**
 * エラーがErrorWithCode型かどうかを判定する型ガード
 */
export function isErrorWithCode(error: unknown): error is ErrorWithCode {
  return (
    typeof error === 'object' &&
    error !== null &&
    ('code' in error || 'message' in error)
  );
}

/**
 * エラーからメッセージを安全に取得
 * 
 * @param error エラーオブジェクト
 * @returns エラーメッセージ
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (isErrorWithCode(error)) {
    return error.message || 'エラーが発生しました';
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'エラーが発生しました';
}

/**
 * エラーからコードを安全に取得
 * 
 * @param error エラーオブジェクト
 * @returns エラーコード（存在する場合）
 */
export function getErrorCode(error: unknown): string | undefined {
  if (isErrorWithCode(error)) {
    return error.code;
  }
  return undefined;
}

/**
 * エラーハンドリングの統一関数
 * 
 * エラーのログ記録、ユーザーへの通知、ErrorHandlerへの委譲を一括で処理します
 * 
 * @param error エラーオブジェクト
 * @param context エラーが発生したコンテキスト
 * @param showToUser ユーザーにエラーを表示するかどうか（デフォルト: false）
 * @param customMessage カスタムエラーメッセージ（オプション）
 */
export function handleError(
  error: unknown,
  context: string,
  showToUser: boolean = false,
  customMessage?: string
): void {
  const errorMessage = customMessage || getErrorMessage(error);
  const errorCode = getErrorCode(error);

  // ログ記録
  logger.error(`[${context}] エラーが発生しました`, {
    error,
    errorMessage,
    errorCode,
  });

  // ErrorHandlerに委譲
  ErrorHandler.handle(error, context, showToUser);

  // ユーザーへの通知（必要に応じて）
  if (showToUser && customMessage) {
    Alert.alert('エラー', customMessage);
  }
}

/**
 * 非同期処理を安全に実行するヘルパー関数
 * 
 * @param operation 実行する非同期処理
 * @param context コンテキスト名
 * @param showToUser エラー時にユーザーに表示するかどうか
 * @returns 実行結果
 */
export async function safeAsyncExecute<T>(
  operation: () => Promise<T>,
  context: string,
  showToUser: boolean = false
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    handleError(error, context, showToUser);
    return null;
  }
}

/**
 * Supabaseエラーの型定義
 */
export interface SupabaseError {
  code: string;
  message: string;
  details?: string;
  hint?: string;
}

/**
 * エラーがSupabaseエラーかどうかを判定する型ガード
 */
export function isSupabaseError(error: unknown): error is SupabaseError {
  return (
    isErrorWithCode(error) &&
    typeof error.code === 'string' &&
    typeof error.message === 'string'
  );
}
