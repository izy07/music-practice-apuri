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

// Web環境でHermesパラメータを削除
if (!config.server) {
  config.server = {};
}

// Hermesパラメータを削除するヘルパー関数
const removeHermesParams = (url) => {
  if (!url) return url;
  let cleaned = url;
  
  // Hermesパラメータを確実に削除
  // transform.engine=hermesを削除
  cleaned = cleaned.replace(/[?&]transform\.engine=hermes(&|$)/g, (match, suffix) => suffix === '&' ? '&' : '');
  cleaned = cleaned.replace(/transform\.engine=hermes&/, '');
  cleaned = cleaned.replace(/transform\.engine=hermes/, '');
  // unstable_transformProfile=hermes-stableを削除
  cleaned = cleaned.replace(/[?&]unstable_transformProfile=hermes-stable(&|$)/g, (match, suffix) => suffix === '&' ? '&' : '');
  cleaned = cleaned.replace(/unstable_transformProfile=hermes-stable&/, '');
  cleaned = cleaned.replace(/unstable_transformProfile=hermes-stable/, '');
  
  // 余分な&や?を整理
  cleaned = cleaned.replace(/[?&]+$/, '').replace(/\?&/, '?').replace(/&+/g, '&').replace(/^&/, '').replace(/\?$/, '');
  
  return cleaned;
};

// rewriteRequestUrl: すべてのWebバンドルリクエストからHermesパラメータを削除
const originalRewriteRequestUrl = config.server.rewriteRequestUrl;
config.server.rewriteRequestUrl = (url) => {
  if (!url) return url;
  
  // WebプラットフォームのバンドルリクエストからHermesパラメータを削除
  if (url.includes('platform=web')) {
    const cleaned = removeHermesParams(url);
    if (cleaned !== url) {
      console.log('[Metro Config] rewriteRequestUrl: URL変更', url.substring(0, 150), '->', cleaned.substring(0, 150));
      return originalRewriteRequestUrl ? originalRewriteRequestUrl(cleaned) : cleaned;
    }
  }
  
  return originalRewriteRequestUrl ? originalRewriteRequestUrl(url) : url;
};

// enhanceMiddleware: すべてのWebバンドルリクエストからHermesパラメータを削除
const originalEnhanceMiddleware = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, server) => {
  const enhanced = originalEnhanceMiddleware ? originalEnhanceMiddleware(middleware, server) : middleware;
  return (req, res, next) => {
    const url = req.url || req.originalUrl || '';
    
    // WebプラットフォームのバンドルリクエストからHermesパラメータを削除
    if (url.includes('platform=web')) {
      const cleaned = removeHermesParams(url);
      if (cleaned !== url) {
        console.log('[Metro Middleware] URL変更:', url.substring(0, 150), '->', cleaned.substring(0, 150));
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
