const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

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

// favicon.icoリクエストを処理するカスタムミドルウェアを追加
// enhanceMiddlewareは既存のミドルウェアをラップする関数
const originalEnhanceMiddleware = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, server) => {
  // 既存のenhanceMiddlewareがあれば実行
  const enhancedMiddleware = originalEnhanceMiddleware 
    ? originalEnhanceMiddleware(middleware, server)
    : middleware;
  
  // favicon.icoリクエストを根本的に解決: 常に204 No Contentを返す
  // これにより、500エラーを完全に回避し、ブラウザのfaviconリクエストを静かに処理する
  return (req, res, next) => {
    const url = req.url || '';
    
    // favicon.icoリクエストを最優先で処理（enhancedMiddlewareより先に）
    if (url === '/favicon.ico' || url.startsWith('/favicon')) {
      // すべての処理をスキップして、即座に204を返す（根本的な解決）
      // これにより、ファイルシステムアクセスやエラーの可能性を完全に排除
      try {
        if (!res.headersSent) {
          res.writeHead(204, {
            'Content-Type': 'text/plain',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          });
          res.end();
        }
      } catch (e) {
        // レスポンス送信エラーは完全に無視（エラーを発生させない）
      }
      return; // ここで確実に処理を終了
    }
    
    // favicon.ico以外のリクエストは通常のミドルウェアに渡す
    return enhancedMiddleware(req, res, next);
  };
};

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
  
  // /favicon.icoリクエストはenhanceMiddlewareで処理されるため、ここではスキップ
  // （rewriteRequestUrlで処理すると、Metroがファイルを提供できないため500エラーになる）
  
  // /assets/パスを処理（開発環境でのアセット提供）
  if (url.startsWith('/assets/')) {
    // assetsディレクトリのファイルを直接提供
    const assetPath = path.join(__dirname, url);
    if (fs.existsSync(assetPath)) {
      return url;
    }
    // 存在しない場合は/_expo/static/配下を試す（開発環境）
    if (isWeb) {
      const expoPath = url.replace('/assets/', '/_expo/static/assets/');
      return expoPath;
    }
    return url;
  }
  
  if (
    hasFileExtension || 
    url.startsWith('/_') || 
    url.startsWith('/api') ||
    url.startsWith('/static')
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
