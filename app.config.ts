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
      foregroundImage: './assets/images/icon.webp', // WebP形式に最適化（44.1%削減）
      backgroundColor: '#FFFFFF',
    },
    package: 'com.musicpractice.app',
  },
  web: {
    bundler: 'metro', // WebプラットフォームでもMetroを使用（Webpackとの競合を避ける）
    output: 'static', // 静的エクスポート用（GitHub Pagesデプロイに必要）
    favicon: './assets/images/favicon.webp', // WebP形式に最適化（6.8%削減）
    // GitHub Pages用のベースパス設定
    baseUrl: process.env.EXPO_PUBLIC_WEB_BASE || '/',
  },
  plugins: [
    'expo-router', 
    'expo-font', 
    'expo-dev-client',
    'expo-asset',
    'expo-audio',
    'expo-web-browser',
    [
      'expo-notifications',
      {
        icon: './assets/images/icon.webp', // WebP形式に最適化
        color: '#1976D2',
        sounds: [],
        mode: 'production',
      },
    ],
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
    // GitHub Pagesデプロイ時は自動的にGitHub PagesのURLを使用
    webRedirectUrl: process.env.EXPO_PUBLIC_WEB_REDIRECT_URL || 
      (process.env.EXPO_PUBLIC_WEB_BASE && process.env.EXPO_PUBLIC_WEB_BASE !== '/' 
        ? `https://izy07.github.io${process.env.EXPO_PUBLIC_WEB_BASE}/auth/callback`
        : 'http://localhost:8081/auth/callback'),
  },
};

export default config;


