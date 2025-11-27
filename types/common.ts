/**
 * 共通型定義
 * 
 * アプリケーション全体で使用される共通の型定義を集約
 * 型安全性の向上とコードの一貫性を保証
 */

/**
 * 結果型（Either型パターン）
 */
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * 非同期結果型
 */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

/**
 * ID型（型安全性向上のため）
 */
export type ID = string;

/**
 * タイムスタンプ型
 */
export type Timestamp = string;

/**
 * 日付型（YYYY-MM-DD形式）
 */
export type DateString = string;

/**
 * ページネーション型
 */
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * ソートパラメータ
 */
export interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * フィルタパラメータ
 */
export interface FilterParams {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in';
  value: any;
}

/**
 * クエリパラメータ
 */
export interface QueryParams {
  filters?: FilterParams[];
  sort?: SortParams;
  pagination?: PaginationParams;
}

/**
 * エラーレスポンス
 */
export interface ErrorResponse {
  message: string;
  code: string;
  details?: Record<string, any>;
}

/**
 * 成功レスポンス
 */
export interface SuccessResponse<T> {
  success: true;
  data: T;
}

/**
 * APIレスポンス型
 */
export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

/**
 * 楽器情報型
 */
export interface Instrument {
  id: ID;
  name: string;
  name_en: string;
  color_primary: string;
  color_secondary: string;
  color_accent: string;
  starting_note?: string | null;
  tuning_notes?: string[] | null;
}

/**
 * ユーザー基本情報型
 */
export interface User {
  id: ID;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
}

/**
 * 楽器レベル型
 */
export type PracticeLevel = 'beginner' | 'intermediate' | 'advanced';

/**
 * 目標タイプ型
 */
export type GoalType = 'personal_short' | 'personal_long' | 'group';

/**
 * 入力方法型
 */
export type InputMethod = 'manual' | 'preset' | 'voice' | 'timer';

/**
 * 難易度レベル型
 */
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert' | null;

/**
 * ルートパス型（ナビゲーション用）
 */
export type RoutePath = 
  | `/(tabs)/${string}`
  | `/auth/${string}`
  | `/organization-${string}`
  | `/terms-of-service`
  | `/privacy-policy`
  | string;

/**
 * エラー結果型
 */
export type ErrorResult<T> = {
  success: false;
  error: string;
  code?: string;
  data?: T;
};

/**
 * 成功結果型
 */
export type SuccessResult<T> = {
  success: true;
  data: T;
};

/**
 * 結果型（エラー処理用）
 */
export type Result<T> = SuccessResult<T> | ErrorResult<T>;

/**
 * Nullable型（null許容型）
 */
export type Nullable<T> = T | null;

/**
 * Maybe型（Optional型）
 */
export type Maybe<T> = T | null | undefined;

/**
 * 非同期結果型
 */
export type AsyncResult<T> = Promise<Result<T>>;

