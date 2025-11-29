/**
 * リポジトリパターンの基底実装
 * 
 * 共通のエラーハンドリングと型安全性を提供
 */

import { RepositoryResult } from './interfaces';
import logger from '@/lib/logger';

// RepositoryResultを再エクスポート（他のリポジトリから使用できるように）
export type { RepositoryResult } from './interfaces';

const REPOSITORY_CONTEXT = 'baseRepository';

/**
 * リポジトリエラー
 */
export class RepositoryError extends Error {
  constructor(
    message: string,
    public code?: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'RepositoryError';
  }
}

/**
 * リポジトリ操作の結果を作成
 */
export function createResult<T>(
  data: T | null,
  error: Error | null
): RepositoryResult<T> {
  return { data, error };
}

/**
 * エラーを標準化されたRepositoryErrorに変換
 */
export function normalizeError(error: unknown, context: string): RepositoryError {
  if (error instanceof RepositoryError) {
    return error;
  }

  if (error instanceof Error) {
    // AppErrorから変換
    const code = (error as { code?: string }).code || 'UNKNOWN_ERROR';
    return new RepositoryError(
      error.message,
      code,
      error
    );
  }

  return new RepositoryError(
    `Unknown error in ${context}`,
    'UNKNOWN_ERROR',
    error
  );
}

/**
 * リポジトリ操作を安全に実行
 * 
 * エラーハンドリングを統一し、型安全性を保証
 */
export async function safeExecute<T>(
  operation: () => Promise<T>,
  context: string
): Promise<RepositoryResult<T>> {
  try {
    const data = await operation();
    return createResult(data, null);
  } catch (error) {
    const normalizedError = normalizeError(error, context);
    logger.error(`[${REPOSITORY_CONTEXT}] ${context}:error`, { error: normalizedError });
    return createResult<T>(null, normalizedError);
  }
}

/**
 * Supabaseエラーの種類を判定
 */
export function isSupabaseColumnError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  
  const code = (error as any).code;
  const message = error.message?.toLowerCase() || '';
  
  return (
    code === '42703' || // カラム不存在エラー
    code === '400' ||
    code === 'PGRST204' ||
    message.includes('column') ||
    message.includes('could not find')
  );
}

/**
 * Supabaseテーブル不存在エラーを判定
 */
export function isSupabaseTableNotFoundError(error: unknown): boolean {
  if (!error) return false;
  
  const errorObj = error as any;
  const code = errorObj?.code;
  const status = errorObj?.status || errorObj?.statusCode;
  const message = errorObj?.message || String(error);
  
  // エラーオブジェクト全体を文字列化して検索
  let errorString = '';
  try {
    errorString = JSON.stringify(errorObj).toLowerCase();
  } catch {
    errorString = `${code || ''} ${status || ''} ${message || ''}`.toLowerCase();
  }
  
  return (
    code === 'PGRST116' || 
    code === 'PGRST205' ||
    status === 404 ||
    status === '404' ||
    Number(status) === 404 ||
    message?.toLowerCase().includes('404') ||
    message?.toLowerCase().includes('not found') ||
    message?.toLowerCase().includes('does not exist') ||
    errorString.includes('404') ||
    errorString.includes('not found') ||
    errorString.includes('pgrst116') ||
    errorString.includes('pgrst205')
  );
}

