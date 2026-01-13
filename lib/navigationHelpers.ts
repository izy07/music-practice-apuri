/**
 * 型安全なナビゲーションヘルパー関数
 * 
 * expo-routerのrouter.push/replaceの型安全性を向上させるためのヘルパー関数
 * as anyの使用を削減し、型安全性を確保します
 */

import type { Router } from 'expo-router';

/**
 * 型安全なルートパス型
 */
export type SafeRoutePath = 
  | `/(tabs)/${string}`
  | `/auth/${string}`
  | `/organization-${string}`
  | `/terms-of-service`
  | `/privacy-policy`
  | `/${string}`;

/**
 * 型安全なrouter.push
 * 
 * @param router Expo Router の router インスタンス
 * @param path 遷移先のパス
 */
export function safePush(router: Router, path: SafeRoutePath): void {
  try {
    router.push(path);
  } catch (error) {
    // 型エラーが発生した場合でも実行時には動作するようにフォールバック
    (router.push as (path: string) => void)(path);
  }
}

/**
 * 型安全なrouter.replace
 * 
 * @param router Expo Router の router インスタンス
 * @param path 遷移先のパス
 */
export function safeReplace(router: Router, path: SafeRoutePath): void {
  try {
    router.replace(path);
  } catch (error) {
    // 型エラーが発生した場合でも実行時には動作するようにフォールバック
    (router.replace as (path: string) => void)(path);
  }
}

/**
 * 文字列パスをSafeRoutePathに変換（型アサーション用）
 * 
 * 注意: この関数は型安全性を保証するものではありません。
 * 実行時にパスが有効であることを確認してください。
 * 
 * @param path 遷移先のパス
 * @returns SafeRoutePath型としてキャストされたパス
 */
export function asSafeRoutePath(path: string): SafeRoutePath {
  return path as SafeRoutePath;
}
