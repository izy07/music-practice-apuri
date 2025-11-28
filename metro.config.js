const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

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
config.resolver.sourceExts = [...(config.resolver.sourceExts || []), 'web.js', 'web.jsx', 'web.ts', 'web.tsx'];

// Webプラットフォームでの設定
const isWeb = process.env.EXPO_PLATFORM === 'web' || process.env.EXPO_PUBLIC_PLATFORM === 'web';

if (isWeb) {
  // WebプラットフォームではHermesエンジンを無効化
  config.transformer = {
    ...config.transformer,
    // WebではHermesパーサーを使用しない
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  };

  // Metroサーバーの設定
  config.server = {
    ...config.server,
    // すべてのルートをindex.htmlにリダイレクト（SPA用）
    rewriteRequestUrl: (url) => {
      // 静的ファイル（.js, .css, .png, .bundle など）や内部API（/_）はそのまま返す
      // それ以外のすべてのルート（/auth/signup など）は /index.html にリダイレクト
      if (
        url.includes('.') || 
        url.includes('.bundle') || 
        url.startsWith('/_') || 
        url.startsWith('/api') ||
        url.startsWith('/node_modules')
      ) {
        return url;
      }
      // クエリパラメータがある場合は保持
      const [path, query] = url.split('?');
      return query ? `/index.html?${query}` : '/index.html';
    },
  };
}

module.exports = config;
