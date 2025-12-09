const { getDefaultConfig } = require('expo/metro-config');

// Webプラットフォームを検出
const isWeb = 
  process.env.EXPO_PLATFORM === 'web' || 
  process.env.EXPO_PUBLIC_PLATFORM === 'web' ||
  process.env.PLATFORM === 'web' ||
  (process.argv && process.argv.includes('--web'));

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
config.resolver.sourceExts = [...(config.resolver.sourceExts || []), 'web.js', 'web.jsx', 'web.ts', 'web.tsx'];

// Metroサーバーの設定（URL書き換えは常に有効化）
if (!config.server) {
  config.server = {};
}

// 既存のrewriteRequestUrlを保持しつつ、新しい関数を追加
const originalRewriteRequestUrl = config.server.rewriteRequestUrl;

config.server.rewriteRequestUrl = (url) => {
  // バンドルリクエスト（.bundle、/node_modules/、entry.bundle）からHermesパラメータを削除
  const isBundleRequest = url.includes('.bundle') || url.includes('/node_modules/') || url.includes('entry.bundle');
  
  if (isBundleRequest) {
    // Hermesパラメータが含まれているかチェック
    if (url.includes('transform.engine=hermes') || url.includes('unstable_transformProfile=hermes-stable')) {
      // 文字列操作で確実にHermesパラメータを削除
      let cleanedUrl = url;
      
      // transform.engine=hermes を削除
      cleanedUrl = cleanedUrl.replace(/[?&]transform\.engine=hermes(&|$)/g, (match, suffix) => {
        return suffix === '&' ? '&' : '';
      });
      cleanedUrl = cleanedUrl.replace(/transform\.engine=hermes&/, '');
      
      // unstable_transformProfile=hermes-stable を削除
      cleanedUrl = cleanedUrl.replace(/[?&]unstable_transformProfile=hermes-stable(&|$)/g, (match, suffix) => {
        return suffix === '&' ? '&' : '';
      });
      cleanedUrl = cleanedUrl.replace(/unstable_transformProfile=hermes-stable&/, '');
      
      // 末尾の&や?を削除
      cleanedUrl = cleanedUrl.replace(/[?&]$/, '');
      cleanedUrl = cleanedUrl.replace(/\?&/, '?');
      
      // 既存のrewriteRequestUrlがあれば実行（Metroのデフォルト処理）
      if (originalRewriteRequestUrl) {
        return originalRewriteRequestUrl(cleanedUrl);
      }
      return cleanedUrl;
    }
    // 既存のrewriteRequestUrlがあれば実行（Metroのデフォルト処理）
    if (originalRewriteRequestUrl) {
      return originalRewriteRequestUrl(url);
    }
    return url;
  }
  
  // バンドルリクエスト以外は、既存のrewriteRequestUrlを実行（Expo Routerのデフォルト処理）
  // これにより、Expo Routerのデフォルトのルーティング動作が維持される
  if (originalRewriteRequestUrl) {
    return originalRewriteRequestUrl(url);
  }
  
  // originalRewriteRequestUrlが存在しない場合（Expo Routerのデフォルト動作）
  // 静的ファイル（拡張子付き）や内部API（/_）はそのまま返す
  const hasFileExtension = /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|json|map|html|bundle)$/i.test(url);
  
  if (
    hasFileExtension || 
    url.startsWith('/_') || 
    url.startsWith('/api') ||
    url.startsWith('/static') ||
    url.startsWith('/assets')
  ) {
    return url;
  }
  
  // それ以外のすべてのルート（/auth/login など）は /index.html にリダイレクト
  // Expo Routerのクライアントサイドルーティングを有効化
  const [path, query] = url.split('?');
  return query ? `/index.html?${query}` : '/index.html';
};

// WebプラットフォームではHermesエンジンを無効化
if (isWeb) {
  if (!config.transformer) {
    config.transformer = {};
  }
  config.transformer.unstable_allowRequireContext = true;
  
  // Hermesパーサーを無効化し、Babelパーサーを強制使用
  if (!config.transformer.babelTransformerPath) {
    try {
      config.transformer.babelTransformerPath = require.resolve('metro-react-native-babel-transformer');
    } catch (e) {
      // エラーが発生した場合は無視
    }
  }
  
  // Webプラットフォーム用のTransformer設定
  config.transformer = {
    ...config.transformer,
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  };
}

module.exports = config;
