/**
 * 楽器 ID のローカル読み込み（InstrumentThemeContext と同じ優先順位・レガシーキー移行）
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, userScopedKey } from '@/lib/storageKeys';

/** ユーザー単位キー → 未移行の従来キー の順で楽器 ID を返す */
export async function readStoredInstrumentId(userId: string): Promise<string | null> {
  const scopedKey = userScopedKey(STORAGE_KEYS.selectedInstrument, userId);
  const scoped = await AsyncStorage.getItem(scopedKey);
  if (scoped && scoped.trim() !== '') {
    return scoped;
  }

  const legacy = await AsyncStorage.getItem(STORAGE_KEYS.selectedInstrument);
  if (!legacy || legacy.trim() === '') {
    return null;
  }

  // 次回以降はユーザー単位キーへ（InstrumentThemeContext と同じ移行）
  try {
    await AsyncStorage.setItem(scopedKey, legacy);
    await AsyncStorage.removeItem(STORAGE_KEYS.selectedInstrument);
  } catch {
    // 読み取りだけ成功していればルーティングは続行
  }

  return legacy;
}
