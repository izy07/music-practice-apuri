const { getDefaultConfig } = require('expo/metro-config');

// Webプラットフォームを検出
const isWeb = process.env.EXPO_PLATFORM === 'web' || process.env.EXPO_PUBLIC_PLATFORM === 'web';

// WebプラットフォームではHermesを無効化
const config = getDefaultConfig(__dirname, {
  // WebプラットフォームではHermesを使用しない
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
config.resolver.sourceExts = [...(config.resolver.sourceExts || []), 'web.js', 'web.jsx', 'web.ts', 'web.tsx'];

if (isWeb) {
  // WebプラットフォームではHermesエンジンを無効化
  config.transformer = {
    ...config.transformer,
    // WebではHermesパーサーを使用しない（Babelパーサーを使用）
    babelTransformerPath: require.resolve('metro-react-native-babel-transformer'),
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
    // リクエストURLを書き換えてHermesパラメータを削除
    rewriteRequestUrl: (url) => {
      // バンドルリクエストからHermesパラメータを削除
      if (url.includes('.bundle') || url.includes('/node_modules/') || url.includes('entry.bundle')) {
        try {
          const urlObj = new URL(url, 'http://localhost');
          // Hermes関連のパラメータを削除
          urlObj.searchParams.delete('transform.engine');
          urlObj.searchParams.delete('unstable_transformProfile');
          // パスとクエリを再構築
          const newUrl = urlObj.pathname + (urlObj.search ? urlObj.search : '');
          return newUrl;
        } catch (error) {
          // URL解析に失敗した場合は、文字列操作で処理
          try {
            const [path, query] = url.split('?');
            if (query) {
              const params = new URLSearchParams(query);
              params.delete('transform.engine');
              params.delete('unstable_transformProfile');
              const newQuery = params.toString();
              return newQuery ? `${path}?${newQuery}` : path;
            }
            return path;
          } catch (fallbackError) {
            // エラーが発生した場合は元のURLを返す
            console.warn('Metro rewriteRequestUrl error:', error, fallbackError);
            return url;
          }
        }
      }
      
      // 静的ファイル（.js, .css, .png など）や内部API（/_）はそのまま返す
      if (
        url.includes('.') || 
        url.startsWith('/_') || 
        url.startsWith('/api')
      ) {
        return url;
      }
      
      // それ以外のすべてのルート（/auth/signup など）は /index.html にリダイレクト
      const [path, query] = url.split('?');
      return query ? `/index.html?${query}` : '/index.html';
    },
  };
}

module.exports = config;
