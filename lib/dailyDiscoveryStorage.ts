import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatDateKey } from '@/lib/dailySong';

const DISMISS_PREFIX = 'daily_discovery_dismiss';
const ENABLED_PREFIX = 'daily_discovery_enabled';
const OPEN_COUNT_PREFIX = 'daily_discovery_open_count';

/** 過去の自分（録音比較）を出す間隔 — N 回に 1 回 */
export const PAST_SELF_SHOW_EVERY_N_OPENS = 8;

function dismissKey(userId: string, dateKey: string): string {
  return `${DISMISS_PREFIX}:${userId}:${dateKey}`;
}

function enabledKey(userId: string): string {
  return `${ENABLED_PREFIX}:${userId}`;
}

function openCountKey(userId: string): string {
  return `${OPEN_COUNT_PREFIX}:${userId}`;
}

/** 今日すでに閉じた（翌日まで非表示） */
export async function isDailyDiscoveryDismissedToday(
  userId: string,
  date: Date = new Date()
): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(dismissKey(userId, formatDateKey(date)));
    return raw === '1';
  } catch {
    return false;
  }
}

/** 今日の通知を閉じる（翌日復活） */
export async function dismissDailyDiscoveryForToday(
  userId: string,
  date: Date = new Date()
): Promise<void> {
  try {
    await AsyncStorage.setItem(dismissKey(userId, formatDateKey(date)), '1');
  } catch {
    // 非致命
  }
}

/** 機能 ON/OFF（デフォルト true） */
export async function isDailyDiscoveryEnabled(userId: string): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(enabledKey(userId));
    if (raw === null) return true;
    return raw === '1';
  } catch {
    return true;
  }
}

export async function setDailyDiscoveryEnabled(
  userId: string,
  enabled: boolean
): Promise<void> {
  try {
    await AsyncStorage.setItem(enabledKey(userId), enabled ? '1' : '0');
  } catch {
    // 非致命
  }
}

/** メインタブ起動のたびに +1（本日の曲モーダル表示の可否とは独立） */
export async function incrementDailyDiscoveryOpenCount(
  userId: string
): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(openCountKey(userId));
    const next = (raw ? parseInt(raw, 10) : 0) + 1;
    const safe = Number.isFinite(next) && next > 0 ? next : 1;
    await AsyncStorage.setItem(openCountKey(userId), String(safe));
    return safe;
  } catch {
    return 1;
  }
}

/** 録音比較を出す起動か（8 回に 1 回） */
export function shouldShowPastSelfComparison(openCount: number): boolean {
  if (openCount <= 0) return false;
  return openCount % PAST_SELF_SHOW_EVERY_N_OPENS === 0;
}

/** @deprecated 統一 dismiss に移行 */
export async function isDailyDiscoveryDismissed(
  kind: 'song' | 'past_self',
  userId: string,
  date: Date = new Date()
): Promise<boolean> {
  void kind;
  return isDailyDiscoveryDismissedToday(userId, date);
}

/** @deprecated */
export async function dismissDailyDiscovery(
  kind: 'song' | 'past_self',
  userId: string,
  date: Date = new Date()
): Promise<void> {
  void kind;
  return dismissDailyDiscoveryForToday(userId, date);
}
