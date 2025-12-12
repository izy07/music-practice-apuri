/**
 * 型ガード関数
 * 型安全性を向上させるためのユーティリティ関数
 */

/**
 * 文字列型ガード
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * 数値型ガード（NaN、Infinityを除外）
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * 正の数値型ガード
 */
export function isPositiveNumber(value: unknown): value is number {
  return isNumber(value) && value > 0;
}

/**
 * 非負の数値型ガード
 */
export function isNonNegativeNumber(value: unknown): value is number {
  return isNumber(value) && value >= 0;
}

/**
 * 日付文字列型ガード（YYYY-MM-DD形式）
 */
export function isDateString(value: unknown): value is string {
  if (!isString(value)) return false;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(value)) return false;
  const date = new Date(value);
  return !isNaN(date.getTime());
}

/**
 * UUID型ガード
 */
export function isUUID(value: unknown): value is string {
  if (!isString(value)) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Supabaseエラー型ガード
 */
export function isSupabaseError(error: unknown): error is { code?: string; message?: string; details?: string; hint?: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    ('code' in error || 'message' in error)
  );
}

/**
 * 配列型ガード
 */
export function isArray<T>(value: unknown, itemGuard?: (item: unknown) => item is T): value is T[] {
  if (!Array.isArray(value)) return false;
  if (itemGuard) {
    return value.every(item => itemGuard(item));
  }
  return true;
}

/**
 * 空でない文字列型ガード
 */
export function isNonEmptyString(value: unknown): value is string {
  return isString(value) && value.trim().length > 0;
}
