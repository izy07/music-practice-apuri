/**
 * ネイティブスプラッシュが白いまま被さって「真っ白」に見えるのを防ぐ
 */
import * as SplashScreen from 'expo-splash-screen';
import { Platform } from 'react-native';

let watchdogStarted = false;

export function hideNativeSplash(reason: string): void {
  if (Platform.OS === 'web') return;
  SplashScreen.hideAsync().catch(() => {
    // 既に非表示などは無視
  });
}

/** 認証/ナビ待ちで hide 条件が満たされない場合の保険 */
export function startSplashHideWatchdog(timeoutMs = 2000): void {
  if (Platform.OS === 'web' || watchdogStarted) return;
  watchdogStarted = true;
  setTimeout(() => hideNativeSplash(`watchdog:${timeoutMs}ms`), timeoutMs);
}
