import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatDateKey } from '@/lib/dailySong';

const PREFIX = 'daily_discovery_dismiss';

function key(kind: 'song' | 'past_self', userId: string, dateKey: string): string {
  return `${PREFIX}:${kind}:${userId}:${dateKey}`;
}

export async function isDailyDiscoveryDismissed(
  kind: 'song' | 'past_self',
  userId: string,
  date: Date = new Date()
): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(key(kind, userId, formatDateKey(date)));
    return raw === '1';
  } catch {
    return false;
  }
}

export async function dismissDailyDiscovery(
  kind: 'song' | 'past_self',
  userId: string,
  date: Date = new Date()
): Promise<void> {
  try {
    await AsyncStorage.setItem(key(kind, userId, formatDateKey(date)), '1');
  } catch {
    // 非致命 — 閉じた状態が永続しないだけ
  }
}
