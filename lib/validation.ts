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
 * 組織型ガード
 */
export function isOrganization(input: unknown): input is { id: string; name: string } {
  return isObject(input) && isString(input.id) && isString(input.name);
}

/**
 * 組織配列型ガード
 */
export function isOrganizationArray(input: unknown): input is Array<{ id: string; name: string }> {
  return Array.isArray(input) && input.every(isOrganization);
}

/**
 * 練習スケジュール型ガード
 */
export function isSchedule(input: unknown): input is { id: string; organization_id: string; title: string; practice_date: string } {
  return (
    isObject(input) &&
    isString(input.id) &&
    isString(input.organization_id) &&
    isString(input.title) &&
    isString(input.practice_date)
  );
}

/**
 * 練習スケジュール配列型ガード
 */
export function isScheduleArray(input: unknown): input is Array<{ id: string; organization_id: string; title: string; practice_date: string }> {
  return Array.isArray(input) && input.every(isSchedule);
}

/**
 * タスク型ガード
 */
export function isTask(input: unknown): input is { id: string; title: string; status: string } {
  return isObject(input) && isString(input.id) && isString(input.title) && isString(input.status);
}

/**
 * タスク配列型ガード
 */
export function isTaskArray(input: unknown): input is Array<{ id: string; title: string; status: string }> {
  return Array.isArray(input) && input.every(isTask);
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
 * 数値型ガード
 */
export function isNumber(input: unknown): input is number {
  return typeof input === 'number' && !isNaN(input);
}

/**
 * 真偽値型ガード
 */
export function isBoolean(input: unknown): input is boolean {
  return typeof input === 'boolean';
}

/**
 * 配列型ガード
 */
export function isArray(input: unknown): input is unknown[] {
  return Array.isArray(input);
}


