module.exports = {
  preset: 'jest-expo',
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
    // 重要なユーティリティ関数とリポジトリ、サービス
    'lib/dateUtils.ts',
    'lib/authSecurity.ts',
    'lib/offlineStorage.ts',
    'lib/database.ts',
    'repositories/**/*.ts',
    'services/**/*.ts',
    'components/**/*.tsx',
    'hooks/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/__tests__/**',
  ],
  // CI環境ではカバレッジ閾値を無効化（GitHub Actionsでは常に無効化）
  coverageThreshold: (process.env.CI || process.env.GITHUB_ACTIONS) ? {} : {
    // グローバルな閾値（重要なファイルの平均） - 40%目標
    global: {
      statements: 35,
      branches: 25,
      functions: 40,
      lines: 38,
    },
    // 重要なファイルには高いカバレッジを要求
    './lib/dateUtils.ts': {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
    './lib/authSecurity.ts': {
      statements: 25,
      branches: 23,
      functions: 30,
      lines: 28,
    },
    './lib/offlineStorage.ts': {
      statements: 34,
      branches: 22,
      functions: 39,
      lines: 32,
    },
    './lib/database.ts': {
      statements: 26,
      branches: 15,
      functions: 30,
      lines: 29,
    },
  },
  testEnvironment: 'node',
  globals: {
    __DEV__: true,
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
};

