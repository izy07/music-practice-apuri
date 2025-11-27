/**
 * サービスレイヤーの基底クラス
 * 
 * ビジネスロジックをUIから分離するための抽象化レイヤー
 * 単一責任の原則（SRP）に従い、各サービスは特定のドメインに責任を持つ
 */

import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';

const SERVICE_CONTEXT = 'baseService';

/**
 * サービス結果型
 */
export type ServiceResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
};

/**
 * サービスエラー
 */
export class ServiceError extends Error {
  constructor(
    message: string,
    public code: string = 'SERVICE_ERROR',
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

/**
 * サービス操作を安全に実行
 */
export async function safeServiceExecute<T>(
  operation: () => Promise<T>,
  context: string,
  errorCode: string = 'SERVICE_ERROR'
): Promise<ServiceResult<T>> {
  try {
    const data = await operation();
    return {
      success: true,
      data,
    };
  } catch (error) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : String(error);
    
    // エラーオブジェクトからcodeを取得（Supabaseエラーの場合）
    const errorCodeFromError = (error as any)?.code || errorCode;
    
    logger.error(`[${SERVICE_CONTEXT}] ${context}:error`, { error });
    ErrorHandler.handle(error, context);
    
    return {
      success: false,
      error: errorMessage,
      code: errorCodeFromError,
    };
  }
}

/**
 * バリデーション結果
 */
export type ValidationResult = {
  isValid: boolean;
  errors: string[];
};

/**
 * バリデーション関数の型
 */
export type Validator<T> = (data: T) => ValidationResult;

/**
 * 複数のバリデーターを組み合わせる
 */
export function combineValidators<T>(
  ...validators: Validator<T>[]
): Validator<T> {
  return (data: T) => {
    const errors: string[] = [];
    
    for (const validator of validators) {
      const result = validator(data);
      if (!result.isValid) {
        errors.push(...result.errors);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  };
}

