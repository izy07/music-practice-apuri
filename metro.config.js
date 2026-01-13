const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// デフォルト設定を取得
const config = getDefaultConfig(__dirname, {
  isCSSEnabled: true,
});

// パス解決の設定
config.resolver.alias = {
  '@': './',
  '@components': './components',
  '@lib': './lib',
  '@hooks': './hooks',
  '@stores': './stores',
  '@types': './types',
};

// Expo RouterのWebサポートを有効化
config.resolver.sourceExts = ['web.tsx', 'web.ts', 'web.jsx', 'web.js', ...(config.resolver.sourceExts || [])];

// Web環境でHermesパラメータを削除（最小限の処理）
if (!config.server) {
  config.server = {};
}

// Hermesパラメータを削除するヘルパー関数
const removeHermesParams = (url) => {
  if (!url) return url;
  let cleaned = url;
  while (cleaned.includes('transform.engine=hermes') || cleaned.includes('unstable_transformProfile=hermes-stable')) {
    cleaned = cleaned.replace(/[?&]transform\.engine=hermes(&|$)/g, (match, suffix) => suffix === '&' ? '&' : '');
    cleaned = cleaned.replace(/transform\.engine=hermes&/, '');
    cleaned = cleaned.replace(/transform\.engine=hermes/, '');
    cleaned = cleaned.replace(/[?&]unstable_transformProfile=hermes-stable(&|$)/g, (match, suffix) => suffix === '&' ? '&' : '');
    cleaned = cleaned.replace(/unstable_transformProfile=hermes-stable&/, '');
    cleaned = cleaned.replace(/unstable_transformProfile=hermes-stable/, '');
  }
  cleaned = cleaned.replace(/[?&]$/, '').replace(/\?&/, '?').replace(/&+/g, '&').replace(/^&/, '').replace(/\?$/, '');
  return cleaned;
};

// rewriteRequestUrl: entry.bundleからHermesパラメータを削除
const originalRewriteRequestUrl = config.server.rewriteRequestUrl;
config.server.rewriteRequestUrl = (url) => {
  if (url && url.includes('entry.bundle')) {
    const cleaned = removeHermesParams(url);
    if (cleaned !== url) {
      return originalRewriteRequestUrl ? originalRewriteRequestUrl(cleaned) : cleaned;
    }
  }
  return originalRewriteRequestUrl ? originalRewriteRequestUrl(url) : url;
};

// enhanceMiddleware: entry.bundleからHermesパラメータを削除
const originalEnhanceMiddleware = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, server) => {
  const enhanced = originalEnhanceMiddleware ? originalEnhanceMiddleware(middleware, server) : middleware;
  return (req, res, next) => {
    const url = req.url || '';
    if (url.includes('entry.bundle')) {
      const cleaned = removeHermesParams(url);
      if (cleaned !== url) {
        console.log('[Metro] entry.bundle URL変更:', url, '->', cleaned);
        req.url = cleaned;
        req.originalUrl = cleaned;
      }
    }
    return enhanced(req, res, next);
  };
};

// getTransformOptions: Web環境でHermesを無効化
if (!config.transformer) {
  config.transformer = {};
}
const originalGetTransformOptions = config.transformer.getTransformOptions;
config.transformer.getTransformOptions = async (entryPoints, options, getDependenciesOf) => {
  const originalOptions = originalGetTransformOptions
    ? await originalGetTransformOptions(entryPoints, options, getDependenciesOf)
    : {};
  
  // Web環境またはentry.bundleの場合はHermesを無効化
  const isWebPlatform = (options && options.platform === 'web') || 
    (entryPoints && entryPoints.some((ep) => ep.includes('expo-router/entry')));
  
  if (isWebPlatform) {
    return {
      ...originalOptions,
      unstable_transformProfile: 'default',
      engine: 'jsc',
    };
  }
  return originalOptions;
};

module.exports = config;
