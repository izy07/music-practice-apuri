/**
 * Supabase Auth 用の永続ストレージ（Web: localStorage / Native: AsyncStorage）
 * 未設定だと Native はメモリのみになり、アプリ再起動でログアウト状態になる。
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const SUPABASE_AUTH_STORAGE_KEY = 'music-practice-auth';

export type SupabaseAuthStorage = {
  getItem: (key: string) => Promise<string | null> | string | null;
  setItem: (key: string, value: string) => Promise<void> | void;
  removeItem: (key: string) => Promise<void> | void;
};

export function createSupabaseAuthStorage(): SupabaseAuthStorage | undefined {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || !window.localStorage) {
      return undefined;
    }
    return {
      getItem: (key: string) => window.localStorage.getItem(key),
      setItem: (key: string, value: string) => {
        window.localStorage.setItem(key, value);
      },
      removeItem: (key: string) => {
        window.localStorage.removeItem(key);
      },
    };
  }

  return {
    getItem: (key: string) => AsyncStorage.getItem(key),
    setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
    removeItem: (key: string) => AsyncStorage.removeItem(key),
  };
}
