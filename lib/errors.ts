/**
 * 統一されたエラー型定義
 * アプリケーション全体で一貫したエラー処理を提供
 */

/**
 * エラーコードの定義
 */
export enum ErrorCode {
  // 一般的なエラー
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  
  // 認証エラー
  AUTH_ERROR = 'AUTH_ERROR',
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  
  // データベースエラー
  DATABASE_ERROR = 'DATABASE_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  
  // サービスエラー
  SERVICE_ERROR = 'SERVICE_ERROR',
  REPOSITORY_ERROR = 'REPOSITORY_ERROR',
  
  // ビジネスロジックエラー
  INVALID_OPERATION = 'INVALID_OPERATION',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
}

/**
 * 統一されたアプリケーションエラー
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: ErrorCode = ErrorCode.UNKNOWN_ERROR,
    public originalError?: unknown,
    public context?: string
  ) {
    super(message);
    this.name = 'AppError';
    
    // スタックトレースを保持
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * エラーが特定のコードかどうかを判定
   */
  is(code: ErrorCode): boolean {
    return this.code === code;
  }

  /**
   * エラーをJSON形式に変換
   */
  toJSON(): {
    name: string;
    message: string;
    code: ErrorCode;
    context?: string;
  } {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
    };
  }
}

/**
 * 認証エラー
 */
export class AuthError extends AppError {
  constructor(message: string, originalError?: unknown, context?: string) {
    super(message, ErrorCode.AUTH_ERROR, originalError, context);
    this.name = 'AuthError';
  }
}

/**
 * バリデーションエラー
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    public field?: string,
    originalError?: unknown,
    context?: string
  ) {
    super(message, ErrorCode.VALIDATION_ERROR, originalError, context);
    this.name = 'ValidationError';
  }
}

/**
 * データベースエラー
 */
export class DatabaseError extends AppError {
  constructor(message: string, originalError?: unknown, context?: string) {
    super(message, ErrorCode.DATABASE_ERROR, originalError, context);
    this.name = 'DatabaseError';
  }
}

/**
 * 見つからないエラー
 */
export class NotFoundError extends AppError {
  constructor(resource: string, originalError?: unknown, context?: string) {
    super(`${resource} not found`, ErrorCode.NOT_FOUND, originalError, context);
    this.name = 'NotFoundError';
  }
}

/**
 * 権限エラー
 */
export class PermissionError extends AppError {
  constructor(message: string = 'Permission denied', originalError?: unknown, context?: string) {
    super(message, ErrorCode.PERMISSION_DENIED, originalError, context);
    this.name = 'PermissionError';
  }
}

/**
 * エラーをAppErrorに変換
 */
export function toAppError(error: unknown, context?: string): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    // エラーメッセージからエラーコードを推測
    const message = error.message.toLowerCase();
    let code = ErrorCode.UNKNOWN_ERROR;

    if (message.includes('auth') || message.includes('unauthorized')) {
      code = ErrorCode.AUTH_ERROR;
    } else if (message.includes('network') || message.includes('fetch')) {
      code = ErrorCode.NETWORK_ERROR;
    } else if (message.includes('validation') || message.includes('invalid')) {
      code = ErrorCode.VALIDATION_ERROR;
    } else if (message.includes('not found') || message.includes('does not exist')) {
      code = ErrorCode.NOT_FOUND;
    }

    return new AppError(error.message, code, error, context);
  }

  return new AppError(
    String(error),
    ErrorCode.UNKNOWN_ERROR,
    error,
    context
  );
}

