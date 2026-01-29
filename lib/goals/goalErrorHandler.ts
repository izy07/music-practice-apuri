/**
 * 目標関連のエラーハンドリングを統一管理
 * 機能を変えずに、エラーハンドリングの重複コードを削減
 */
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';

/**
 * エラーの詳細情報を抽出（型安全）
 */
export function extractErrorDetails(error: unknown): Record<string, unknown> {
  let errorDetails: Record<string, unknown> = {};
  
  if (error instanceof Error) {
    errorDetails = {
      name: error.name,
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 5).join('\n'), // スタックトレースの最初の5行のみ
    };
  } else if (typeof error === 'object' && error !== null) {
    // 型ガード: errorがオブジェクトの場合、プロパティを安全に取得
    const err = error as Record<string, unknown>;
    errorDetails = {
      code: err.code ?? undefined,
      message: err.message ?? undefined,
      details: err.details ?? undefined,
      hint: err.hint ?? undefined,
      status: err.status ?? undefined,
      statusCode: err.statusCode ?? undefined,
      originalError: err.originalError ? String(err.originalError) : undefined,
      errorType: err.constructor?.name ?? typeof error,
      errorString: String(error),
    };
  } else {
    errorDetails = {
      error: String(error),
      errorType: typeof error,
    };
  }
  
  // 空でないプロパティのみを含む
  return Object.fromEntries(
    Object.entries(errorDetails).filter(([_, value]) => value !== undefined && value !== null)
  );
}

/**
 * 目標関連のエラーをログに記録
 */
export function logGoalError(error: unknown, context: string): void {
  const errorDetails = extractErrorDetails(error);
  logger.error(
    `Error ${context}:`,
    Object.keys(errorDetails).length > 0 
      ? errorDetails 
      : { error: 'Unknown error', rawError: String(error) }
  );
}

/**
 * 目標関連のエラーを処理（ErrorHandlerを使用）
 */
export function handleGoalError(error: unknown, context: string, showToUser: boolean = false): void {
  if (error instanceof Error) {
    ErrorHandler.handle(error, context, showToUser);
  } else {
    // Error型でない場合は、Errorオブジェクトに変換
    const errorObj = new Error(String(error));
    ErrorHandler.handle(errorObj, context, showToUser);
  }
}

/**
 * キャッシュエラーを無視（フォールバック処理のため）
 */
export function handleCacheError(error: unknown, context: string = 'キャッシュ処理'): void {
  logger.debug(`${context}エラー（無視）:`, error);
}
