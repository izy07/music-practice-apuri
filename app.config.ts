import type { ExpoConfig } from 'expo/config';

// Minimal, env-driven config to set EAS projectId and keep current app.json values.
const config: ExpoConfig = {
  name: 'bolt-expo-nativewind',
  slug: 'bolt-expo-nativewind',
  scheme: 'music-practice',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.musicpractice.app',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/images/icon.png',
      backgroundColor: '#FFFFFF',
    },
    package: 'com.musicpractice.app',
  },
  web: {
    bundler: 'metro',
    // output: 'static', // 開発環境では削除（本番ビルド時のみ使用）
    favicon: './assets/images/favicon.png',
    // Expo RouterのWebルーティングを有効化
    build: {
      babel: {
        include: ['expo-router'],
      },
    },
    // GitHub Pages用のベースパス設定（環境変数で制御可能）
    ...(process.env.EXPO_PUBLIC_WEB_BASE && {
      base: process.env.EXPO_PUBLIC_WEB_BASE,
    }),
  },
  plugins: [
    'expo-router', 
    'expo-font', 
    'expo-dev-client',
    'expo-asset',
    'expo-audio',
    'expo-web-browser'
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    // EAS 初期化時に自動で挿入されるため、明示指定をいったん外す
    // eas: { projectId: '...' },
    // Supabase設定は環境変数から取得（ハードコードされた値は削除）
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    // Web環境用のリダイレクトURI
    webRedirectUrl: process.env.EXPO_PUBLIC_WEB_REDIRECT_URL || 'http://localhost:8081/auth/callback',
  },
};

export default config;


