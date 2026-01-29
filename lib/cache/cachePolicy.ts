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
  return !isDevelopmentBuild();
}

