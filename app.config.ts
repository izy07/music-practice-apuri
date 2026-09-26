import type { ExpoConfig } from 'expo/config';
import fs from 'fs';
import path from 'path';

// app.config 評価時点では Expo の .env 読み込みが未完了なことがあるため、先に読み込む
function loadEnvFilesForConfig() {
  for (const envFile of ['.env.local', '.env']) {
    const envPath = path.join(__dirname, envFile);
    if (!fs.existsSync(envPath)) continue;

    for (const rawLine of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;

      const eq = line.indexOf('=');
      if (eq <= 0) continue;

      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}

loadEnvFilesForConfig();

const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim();
const supabaseAnonKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();

const argv = process.argv;
const isExpoStart = argv.some((arg) => arg === 'start' || arg.endsWith('/start'));
const isExpoExport = argv.some((arg) => arg === 'export' || arg.endsWith('/export'));
const isEasBuild = process.env.EAS_BUILD === 'true';
const isTest = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;

// EXPO_PUBLIC_* はビルド時にバンドルへ焼き込まれる。未設定のまま export すると実行時クラッシュの原因になる。
const mustHaveSupabaseEnv =
  !isTest &&
  !isExpoStart &&
  (isExpoExport || isEasBuild || process.env.NODE_ENV === 'production');

if (mustHaveSupabaseEnv && (!supabaseUrl || !supabaseAnonKey)) {
  throw new Error(
    'EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY が未設定です。\n' +
      'ローカルは .env を用意し、CI/EAS では Secrets に登録してから再ビルドしてください。'
  );
}

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
      NSMicrophoneUsageDescription:
        '演奏の録音およびチューナー機能で音程を検出するためにマイクを使用します。',
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
    versionCode: 1, // Google Play Consoleで必要なビルド番号（初回リリース）
    versionName: '1.0.0', // ユーザーに表示されるバージョン番号
    // 必要な権限のみ明示。録音はアプリ内ストレージへ保存するため外部ストレージ権限は不要
    // カメラ権限は含めない → expo-cameraが使用時のみ動的に要求（オプション機能）
    permissions: ['RECORD_AUDIO', 'MODIFY_AUDIO_SETTINGS'],
    // 旧 API: 依存ライブラリの誤宣言を最終マニフェストから除外（アプリは scoped storage のみ使用）
    blockedPermissions: [
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.READ_MEDIA_IMAGES',
      'android.permission.READ_MEDIA_VIDEO',
      'android.permission.READ_MEDIA_AUDIO',
      // 本番ビルドでは開発用権限も除外（React Native開発者メニュー用）
      ...(isEasBuild || process.env.NODE_ENV === 'production' ? [
        'android.permission.SYSTEM_ALERT_WINDOW',
      ] : []),
      // 実装されていない機能の権限を除外
      'android.permission.VIBRATE', // バイブレーション制御コードが未実装
      'android.permission.RECEIVE_BOOT_COMPLETED', // 起動時実行コードが未実装
    ],
  },
  web: {
    bundler: 'metro', // WebプラットフォームでもMetroを使用（Webpackとの競合を避ける）
    // output: 'static'を削除（開発環境ではサーバーサイドレンダリングエラーが発生するため）
    // 本番環境での静的エクスポート時のみ設定する
    favicon: './assets/images/favicon.png', // PNG形式を使用（jimp-compactがWebPをサポートしていないため）
    icon: './assets/images/icon.png', // PWAマニフェスト用アイコン（GitHubのデフォルトアイコンを防ぐ）
    // GitHub Pages用のベースパス設定
    baseUrl: process.env.EXPO_PUBLIC_WEB_BASE || '/',
    // jsEngine: 'jsc'を削除（Expo Routerが無視してHermesパラメータを追加するため）
    // Metro設定でHermesを無効化する
  },
  plugins: [
    'expo-router', 
    'expo-font', 
    'expo-dev-client',
    'expo-asset',
    'expo-audio',
    'react-native-audio-api',
    'expo-web-browser',
    // Google Play パッケージ所有権確認用（adi-registration.properties を native assets へ）
    './plugins/withAdiRegistration',
    // expo-file-system 等のレガシー外部ストレージ宣言を最終マニフェストから除去
    './plugins/withStripLegacyStoragePermissions',
    // AdMob (Google Mobile Ads) - Android/iOS App ID はネイティブに必須
    [
      'react-native-google-mobile-ads',
      {
        androidAppId: 'ca-app-pub-4701955364298598~7135719486',
        // iOS 本番 App ID は EAS Secret / .env の EXPO_PUBLIC_ADMOB_IOS_APP_ID で注入する
        // 未設定時は Google テスト ID（ストア提出前に必ず本番 ID を入れること）
        iosAppId:
          process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID ||
          'ca-app-pub-3940256099942544~1458002511',
        delayAppMeasurementInit: true,
        optimizeInitialization: true,
        optimizeAdLoading: true,
      },
    ],
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
    // 本番キーはリポジトリに直書きしない。.env / EAS Secrets / GitHub Actions Secrets から注入する
    supabaseUrl,
    supabaseAnonKey,
    // Play / App Store の Data safety・審査用。公開ページの URL を必ず設定する
    // 現状 GitHub Pages（private リポ）は 404。docs/public/privacy-policy.html を公開ホストへ上げて URL を入れる
    privacyPolicyUrl: process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL || '',
    // Web環境用のリダイレクトURI
    // GitHub Pagesデプロイ時は自動的にGitHub PagesのURLを使用
    webRedirectUrl: process.env.EXPO_PUBLIC_WEB_REDIRECT_URL || 
      (process.env.EXPO_PUBLIC_WEB_BASE && process.env.EXPO_PUBLIC_WEB_BASE !== '/' 
        ? `https://izy07.github.io${process.env.EXPO_PUBLIC_WEB_BASE}/auth/callback`
        : 'http://localhost:8081/auth/callback'),
  },
};

export default config;


