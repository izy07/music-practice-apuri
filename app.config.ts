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
    supabaseUrl: 'https://uteeqkpsezbabdmritkn.supabase.co',
    supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0ZWVxa3BzZXpiYWJkbXJpdGtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNDQyNDUsImV4cCI6MjA3MDcyMDI0NX0.3wITO5E53yW2spDHi99ngaA0SRqnsJbAYzdT7DDa1tM',
    // Web環境用のリダイレクトURI
    webRedirectUrl: process.env.EXPO_PUBLIC_WEB_REDIRECT_URL || 'http://localhost:8081/auth/callback',
  },
};

export default config;


