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
 *
 * - 開発中（__DEV__ または NODE_ENV=development）: 無効（古いキャッシュで表示がずれないようにする）
 * - 本番: 有効
 * - 開発中でもキャッシュを試したい場合は EXPO_PUBLIC_USE_PERSISTENT_CACHE=1 で有効化可能
 */
export function shouldUsePersistentCache(): boolean {
  if (isDevelopmentBuild()) {
    const forceEnable =
      process.env.EXPO_PUBLIC_USE_PERSISTENT_CACHE === '1' ||
      process.env.EXPO_PUBLIC_USE_PERSISTENT_CACHE === 'true';
    return forceEnable;
  }
  return true;
}

/** 楽器ガイドのキャッシュ世代（データ更新時にインクリメントして古いキャッシュを無効化） */
export const INSTRUMENT_GUIDES_CACHE_VERSION = '4';

export const INSTRUMENT_GUIDES_CACHE_KEY = `instrumentGuides_cache_v${INSTRUMENT_GUIDES_CACHE_VERSION}`;

/** Web（GitHub Pages等）はバンドル済み静的データを常に優先し、localStorageキャッシュは使わない */
export function shouldCacheInstrumentGuides(): boolean {
  const isWeb =
    typeof window !== 'undefined' &&
    typeof document !== 'undefined';
  return shouldUsePersistentCache() && !isWeb;
}

