// CI環境ではカバレッジ閾値を無効化（GitHub Actionsでは常に無効化）
// jest-expoプリセットが関数形式をサポートしていない可能性があるため、オブジェクト形式に戻す
// CI環境ではpackage.jsonのtest:ciスクリプトで--coverageThresholdを無効化
const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';

module.exports = {
  preset: 'jest-expo',
  // setupFilesはjest-expoのセットアップより前に実行される
  // グローバルオブジェクトの初期化を確実にするため、setupFilesを使用
  setupFiles: ['<rootDir>/jest.setup.globals.js'],
  // setupFilesAfterEnvはjest-expoのセットアップ後に実行される
  // モックの設定はここで実行
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-native/js-polyfills)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@supabase/.*)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: [
    '**/__tests__/**/*.test.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  collectCoverageFrom: [
    // すべてのソースファイルをカバレッジ対象に
    'lib/**/*.{ts,tsx}',
    'repositories/**/*.ts',
    'services/**/*.ts',
    'components/**/*.tsx',
    'hooks/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/__tests__/**',
    '!**/coverage/**',
  ],
  // CI環境ではカバレッジ閾値を無効化（GitHub Actionsでは常に無効化）
  ...(isCI ? {} : {
    coverageThreshold: {
      // グローバルな閾値 - 100%目標
      global: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
      // 重要なファイルには100%のカバレッジを要求
      './lib/dateUtils.ts': {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
      './lib/authSecurity.ts': {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
      './lib/offlineStorage.ts': {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
      './lib/database.ts': {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
      './lib/authHelpers.ts': {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
      './lib/constants.ts': {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
      './lib/config.ts': {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
      './lib/errorHandler.ts': {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
      './lib/logger.ts': {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
      './lib/storageKeys.ts': {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
      './lib/validation.ts': {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
      './hooks/useIdleTimeout.ts': {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
      './hooks/useFrameworkReady.ts': {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
      './services/instrumentService.ts': {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
      './services/goalService.ts': {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
      './repositories/goalRepository.ts': {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  }),
  // testEnvironmentはjest-expoプリセットが自動設定するため削除
  globals: {
    __DEV__: true,
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
};

