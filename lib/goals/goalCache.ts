/**
 * 目標データのキャッシュ処理を統一管理
 * 機能を変えずに、重複コードを削減
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { shouldUsePersistentCache } from '@/lib/cache/cachePolicy';
import { GoalFromDB } from '@/lib/tabs/goals/types';
import logger from '@/lib/logger';

/**
 * キャッシュキーを生成
 */
export function getGoalCacheKey(userId: string, instrumentId: string | null): string {
  return `goals_cache_${userId}_${instrumentId || 'all'}`;
}

/**
 * 達成済み目標のキャッシュキーを生成
 */
export function getCompletedGoalCacheKey(userId: string, instrumentId: string | null): string {
  return `completed_goals_cache_${userId}_${instrumentId || 'all'}`;
}

/**
 * カレンダー画面の目標キャッシュキーのパターンを取得
 */
export function getCalendarGoalCacheKeyPattern(userId: string): string {
  return `short_term_goals_cache_${userId}_`;
}

/**
 * 目標データをキャッシュから取得
 */
export async function getGoalsFromCache(
  userId: string,
  instrumentId: string | null
): Promise<GoalFromDB[] | null> {
  if (!shouldUsePersistentCache()) {
    return null;
  }

  try {
    const cacheKey = getGoalCacheKey(userId, instrumentId);
    const cachedData = await AsyncStorage.getItem(cacheKey);
    if (cachedData) {
      const parsed = JSON.parse(cachedData);
      return parsed.map((g: GoalFromDB) => ({
        ...g,
        show_on_calendar: g.show_on_calendar ?? false,
      }));
    }
  } catch (error) {
    logger.debug('キャッシュ取得エラー（無視）:', error);
  }
  return null;
}

/**
 * 目標データをキャッシュに保存
 */
export async function saveGoalsToCache(
  userId: string,
  instrumentId: string | null,
  goals: GoalFromDB[]
): Promise<void> {
  if (!shouldUsePersistentCache()) {
    return;
  }

  try {
    const cacheKey = getGoalCacheKey(userId, instrumentId);
    await AsyncStorage.setItem(cacheKey, JSON.stringify(goals));
    logger.debug('目標データをキャッシュに保存しました');
  } catch (error) {
    logger.debug('キャッシュ保存エラー（無視）:', error);
  }
}

/**
 * 目標データのキャッシュをクリア
 */
export async function clearGoalCache(userId: string, instrumentId: string | null): Promise<void> {
  try {
    const cacheKey = getGoalCacheKey(userId, instrumentId);
    await AsyncStorage.removeItem(cacheKey);
    
    // カレンダー画面の目標キャッシュもクリア
    const cacheKeyPattern = getCalendarGoalCacheKeyPattern(userId);
    const allKeys = await AsyncStorage.getAllKeys();
    const goalCacheKeys = allKeys.filter(key => key.startsWith(cacheKeyPattern));
    if (goalCacheKeys.length > 0) {
      await AsyncStorage.multiRemove(goalCacheKeys);
      logger.debug('カレンダー画面の目標キャッシュをクリアしました');
    }
  } catch (error) {
    logger.debug('キャッシュクリアエラー（無視）:', error);
  }
}

/**
 * 達成済み目標データをキャッシュから取得
 */
export async function getCompletedGoalsFromCache(
  userId: string,
  instrumentId: string | null
): Promise<GoalFromDB[] | null> {
  if (!shouldUsePersistentCache()) {
    return null;
  }

  try {
    const cacheKey = getCompletedGoalCacheKey(userId, instrumentId);
    const cachedData = await AsyncStorage.getItem(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData);
    }
  } catch (error) {
    logger.debug('達成済み目標キャッシュ取得エラー（無視）:', error);
  }
  return null;
}

/**
 * 達成済み目標データをキャッシュに保存
 */
export async function saveCompletedGoalsToCache(
  userId: string,
  instrumentId: string | null,
  goals: GoalFromDB[]
): Promise<void> {
  if (!shouldUsePersistentCache()) {
    return;
  }

  try {
    const cacheKey = getCompletedGoalCacheKey(userId, instrumentId);
    await AsyncStorage.setItem(cacheKey, JSON.stringify(goals));
    logger.debug('達成済み目標データをキャッシュに保存しました');
  } catch (error) {
    logger.debug('達成済み目標キャッシュ保存エラー（無視）:', error);
  }
}
