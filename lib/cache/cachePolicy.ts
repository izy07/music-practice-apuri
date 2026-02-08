/**
 * キャッシュ方針（開発/本番で挙動を切り替える）
 *
 * 目的:
 * - 開発中は「古いキャッシュが残って挙動がブレる」問題を避けるため、
 *   永続キャッシュ（AsyncStorage等）を基本的に無効化する。
 */
export function isDevelopmentBuild(): boolean {
  // React Native / Expo では __DEV__ が提供される
  // Web 等の環境差も考慮してフォールバックする
  const devFlag = typeof __DEV__ !== 'undefined' ? __DEV__ : false;
  return Boolean(devFlag) || process.env.NODE_ENV === 'development';
}

/**
 * 永続キャッシュ（AsyncStorageなど）を使って良いか
 */
export function shouldUsePersistentCache(): boolean {
  // ユーザー要望: 開発中でもキャッシュを復活させたいケースがあるため、
  // 既定は「有効」にする。無効化したい場合は env で明示的に指定する。
  //
  // Expo: EXPO_PUBLIC_* はアプリ側へ公開される想定
  // - EXPO_PUBLIC_DISABLE_PERSISTENT_CACHE=1 で無効化
  const disableFlag =
    process.env.EXPO_PUBLIC_DISABLE_PERSISTENT_CACHE === '1' ||
    process.env.EXPO_PUBLIC_DISABLE_PERSISTENT_CACHE === 'true';

  if (disableFlag) return false;
  return true;
}

