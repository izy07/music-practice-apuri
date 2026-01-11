import type { ExpoConfig } from 'expo/config';

// Minimal, env-driven config to set EAS projectId and keep current app.json values.
const config: ExpoConfig = {
  name: '楽器練習アプリ',
  slug: 'music-practice',
  scheme: 'music-practice',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.musicpractice.app',
    displayName: '楽器練習アプリ', // 日本語のアプリ名（ホーム画面に表示される名前）
    icon: './assets/images/icon.png', // アイコン画像
    infoPlist: {
      // 年齢制限: 4+（教育的な目的の音楽練習アプリのため）
      // 録音機能はユーザー自身の練習記録を保存・再生するための教育的な目的のみで使用
      // 実際の設定はApp Store Connectで行う必要がありますが、ここでも明示
      // CFBundleDisplayNameはdisplayNameで自動設定されます
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/images/icon.png', // PNG形式を使用（jimp-compactがWebPをサポートしていないため）
      backgroundColor: '#FFFFFF', // 白背景
    },
    package: 'com.musicpractice.app',
    label: '楽器練習アプリ', // 日本語のアプリ名（ホーム画面に表示される名前）
    // 年齢制限: 4+（教育的な目的の音楽練習アプリのため）
    // 録音機能はユーザー自身の練習記録を保存・再生するための教育的な目的のみで使用
    // 実際の設定はGoogle Play Consoleで行う必要がありますが、ここでも明示
  },
  web: {
    bundler: 'metro', // WebプラットフォームでもMetroを使用（Webpackとの競合を避ける）
    output: 'static', // 静的エクスポート用（GitHub Pagesデプロイに必要）
    favicon: './assets/images/favicon.png', // PNG形式を使用（jimp-compactがWebPをサポートしていないため）
    icon: './assets/images/icon.png', // PWAマニフェスト用アイコン（GitHubのデフォルトアイコンを防ぐ）
    // GitHub Pages用のベースパス設定
    baseUrl: process.env.EXPO_PUBLIC_WEB_BASE || '/',
    // 出力ディレクトリを明示的に指定（Expo Routerのデフォルトはweb-build）
    // 注意: expo exportコマンドの--output-dirオプションが動作しない場合のフォールバック
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
        icon: './assets/images/icon.png', // PNG形式を使用（jimp-compactがWebPをサポートしていないため）
        color: '#1976D2',
        sounds: [],
        mode: 'production',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  updates: {
    url: 'https://u.expo.dev/fe3ac800-458f-47ac-a51f-264b5a49c45f',
  },
  runtimeVersion: {
    policy: 'appVersion',
  },
  extra: {
    eas: {
      projectId: 'fe3ac800-458f-47ac-a51f-264b5a49c45f',
    },
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


