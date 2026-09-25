import AsyncStorage from '@react-native-async-storage/async-storage';
import { userScopedKey } from '@/lib/storageKeys';
import logger from '@/lib/logger';

export type OnboardingSnapshot = {
  tutorial_completed: boolean;
  selected_instrument_id: string | null;
};

const SNAPSHOT_BASE = 'onboardingSnapshot';

function snapshotKey(userId: string): string {
  return userScopedKey(SNAPSHOT_BASE, userId);
}

/** 前回成功時のオンボーディング状態を復元（再ログインでチュートリアル誤表示を防ぐ） */
export async function readOnboardingSnapshot(
  userId: string
): Promise<OnboardingSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(snapshotKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<OnboardingSnapshot>;
    if (typeof parsed.tutorial_completed !== 'boolean') return null;
    return {
      tutorial_completed: parsed.tutorial_completed,
      selected_instrument_id:
        typeof parsed.selected_instrument_id === 'string'
          ? parsed.selected_instrument_id
          : null,
    };
  } catch (error) {
    logger.debug('onboardingSnapshot 読み込み失敗（無視）:', error);
    return null;
  }
}

/** プロフィール確定・ローカルパッチ後に永続化 */
export async function writeOnboardingSnapshot(
  userId: string,
  snapshot: OnboardingSnapshot
): Promise<void> {
  try {
    await AsyncStorage.setItem(snapshotKey(userId), JSON.stringify(snapshot));
  } catch (error) {
    logger.debug('onboardingSnapshot 書き込み失敗（無視）:', error);
  }
}
