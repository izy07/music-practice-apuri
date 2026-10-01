/**
 * 軽量ランタイムバリデーター（zod代替）
 * 型安全性を保証するための型ガード関数を提供
 */

export type Validator<T> = (input: unknown) => input is T;

/**
 * 文字列型ガード
 */
export function isString(input: unknown): input is string {
  return typeof input === 'string';
}

/**
 * nullまたはundefinedまたは文字列型ガード
 */
export function isNullableString(input: unknown): input is string | null | undefined {
  return input == null || typeof input === 'string';
}

/**
 * オブジェクト型ガード（基本的なチェック）
 */
function isObject(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null && !Array.isArray(input);
}

/**
 * アサーション関数（条件がfalseの場合にエラーをスロー）
 */
export function assert<T>(cond: boolean, message: string): asserts cond {
  if (!cond) {
    throw new Error(message);
  }
}

/**
 * 非nullアサーション
 */
export function assertDefined<T>(value: T | null | undefined, message: string): T {
  if (value == null) {
    throw new Error(message);
  }
  return value;
}

/**
 * 文字列の非空チェック
 */
export function isNonEmptyString(input: unknown): input is string {
  return isString(input) && input.trim().length > 0;
}

export function assertNonEmptyString(input: unknown, message: string): string {
  assert(isNonEmptyString(input), message);
  return input;
}

export function isNumber(input: unknown): input is number {
  return typeof input === 'number' && !Number.isNaN(input);
}

export function isBoolean(input: unknown): input is boolean {
  return typeof input === 'boolean';
}

export function isArray(input: unknown): input is unknown[] {
  return Array.isArray(input);
}
