// Jest セットアップファイル（モック設定）
// setupFilesAfterEnvで実行される

// @testing-library/react-native/extend-expect のインポート
try {
  require('@testing-library/react-native/extend-expect');
} catch (error) {
  // モジュールが見つからない場合は無視
  if (error.code !== 'MODULE_NOT_FOUND') {
    console.warn('Failed to load @testing-library/react-native/extend-expect:', error.message);
  }
}

// グローバルモック設定
// consoleを直接置き換えるのではなく、各メソッドをモック化
if (typeof global !== 'undefined' && global.console) {
  global.console.log = jest.fn();
  global.console.debug = jest.fn();
  global.console.info = jest.fn();
  global.console.warn = jest.fn();
  global.console.error = jest.fn();
}

// AsyncStorage のモック
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  clear: jest.fn(() => Promise.resolve()),
}));

// Supabase のモック
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
      maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  },
}));

// Expo Router のモック
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  })),
  useLocalSearchParams: jest.fn(() => ({})),
  useFocusEffect: jest.fn((callback) => {
    callback();
  }),
}));

// React Navigation のモック
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn((callback) => {
    callback();
  }),
}));

// Dimensions のモック
jest.mock('react-native/Libraries/Utilities/Dimensions', () => ({
  get: jest.fn(() => ({ width: 375, height: 667 })),
}));

