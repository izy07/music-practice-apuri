const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const path = require('path');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // パスエイリアスとモジュール解決の設定
  config.resolve.alias = {
    ...config.resolve.alias,
    'react-native$': 'react-native-web',
    '@': path.resolve(__dirname, '.'),
    '@/components': path.resolve(__dirname, 'components'),
    '@/hooks': path.resolve(__dirname, 'hooks'),
    '@/lib': path.resolve(__dirname, 'lib'),
    '@/app': path.resolve(__dirname, 'app'),
  };

  config.resolve.fallback = {
    ...config.resolve.fallback,
    crypto: require.resolve('crypto-browserify'),
    stream: require.resolve('stream-browserify'),
    buffer: require.resolve('buffer'),
    vm: false,
    fs: false,
    path: false,
    os: false,
  };

  // require.contextの解決を改善
  config.resolve.modules = [
    path.resolve(__dirname, 'node_modules'),
    path.resolve(__dirname, 'app'),
    path.resolve(__dirname, 'components'),
    path.resolve(__dirname, 'hooks'),
    path.resolve(__dirname, 'lib'),
    'node_modules',
  ];

  // Expo Router用の環境変数設定
  config.plugins = config.plugins || [];
  config.plugins.push(
    new (require('webpack')).DefinePlugin({
      'process.env.EXPO_ROUTER_APP_ROOT': JSON.stringify('./app'),
      'process.env.EXPO_ROUTER_IMPORT_MODE': JSON.stringify('sync'),
    })
  );

  // Expo RouterのWebサポートを改善
  config.resolve.extensions = [
    '.web.js',
    '.web.jsx',
    '.web.ts',
    '.web.tsx',
    '.js',
    '.jsx',
    '.ts',
    '.tsx',
    '.json',
  ];

  return config;
};