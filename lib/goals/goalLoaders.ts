/**
 * 目標データの読み込み処理を分割
 * 機能を変えずに、大きな関数を小さな関数に分割
 */
import { Goal, GoalFromDB } from '@/lib/tabs/goals/types';
import { goalRepository } from '@/repositories/goalRepository';
import { OfflineStorage } from '@/lib/offlineStorage';
import { getGoalsFromCache } from '@/lib/goals/goalCache';
import { isOnline } from '@/lib/offlineStorage';
import { FREE_PLAN_LIMITS } from '@/lib/subscriptionLimits';
import logger from '@/lib/logger';

/**
 * オフライン時のキャッシュから目標を読み込む
 */
export async function loadGoalsFromCache(
  userId: string,
  instrumentId: string | null,
  entitlement: { isEntitled?: boolean }
): Promise<Goal[] | null> {
  if (isOnline()) {
    return null; // オンライン時はキャッシュを使用しない
  }

  try {
    const cachedGoals = await getGoalsFromCache(userId, instrumentId);
    if (cachedGoals) {
      let goalsWithShowOnCalendar = cachedGoals.map((g: GoalFromDB) => ({
        ...g,
        show_on_calendar: g.show_on_calendar ?? false,
        instrument_id: g.instrument_id ?? null,
      }));

      // フリープランの場合、最新の4個だけを表示
      if (!entitlement?.isEntitled) {
        const limit = FREE_PLAN_LIMITS.GOALS_COUNT_PER_INSTRUMENT;
        const sortedGoals = [...goalsWithShowOnCalendar].sort((a, b) => {
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          return dateB - dateA; // 降順（新しい順）
        });
        goalsWithShowOnCalendar = sortedGoals.slice(0, limit);
      }

      logger.debug('目標データをキャッシュから読み込みました（オフライン）');
      return goalsWithShowOnCalendar;
    }
  } catch (cacheError) {
    logger.debug('キャッシュ読み込みエラー（無視）:', cacheError);
  }
  return null;
}

/**
 * データベースから目標を読み込む
 */
export async function loadGoalsFromDB(
  userId: string,
  instrumentId: string | null
): Promise<GoalFromDB[]> {
  const dbFetchStartTime = performance.now();
  logger.debug('[goals.tsx] loadGoals開始:', {
    userId,
    instrumentId,
    timestamp: new Date().toISOString()
  });

  const goalsData = await goalRepository.getGoals(userId, instrumentId);
  const dbFetchEndTime = performance.now();
  logger.debug('[goals.tsx] データベース取得完了:', {
    duration: `${(dbFetchEndTime - dbFetchStartTime).toFixed(2)}ms`,
    goalsCount: goalsData.length
  });

  return goalsData;
}

/**
 * 目標データを楽器IDでフィルタリング
 */
export function filterGoalsByInstrument(
  goalsData: GoalFromDB[],
  instrumentId: string | null
): GoalFromDB[] {
  return goalsData.filter((g: GoalFromDB) => {
    const goalInstrumentId = g.instrument_id;
    // instrument_idフィールドが存在しない場合（カラムが存在しない場合）はすべて表示
    if (goalInstrumentId === undefined) {
      return true;
    }
    if (instrumentId) {
      // 楽器が選択されている場合: その楽器の目標のみ表示（instrument_idがnullの目標は除外）
      return goalInstrumentId === instrumentId;
    } else {
      // 楽器が選択されていない場合: instrument_idがnullの目標のみ表示
      return !goalInstrumentId || goalInstrumentId === null;
    }
  });
}

/**
 * GoalFromDBをGoal型にマッピング
 */
export function mapGoalsFromDB(goalsData: GoalFromDB[], userId: string): Goal[] {
  return goalsData.map((g: GoalFromDB): Goal => ({
    ...g,
    show_on_calendar: g.show_on_calendar ?? false,
    instrument_id: g.instrument_id ?? null,
    user_id: g.user_id || userId,
  }));
}

/**
 * オフラインで保存された目標を追加
 */
export async function addOfflineGoals(
  allGoals: Goal[],
  userId: string,
  instrumentId: string | null
): Promise<Goal[]> {
  try {
    const offlineGoals = await OfflineStorage.getGoals() as unknown as Array<{
      id: string;
      user_id: string;
      title: string;
      description?: string;
      target_date?: string;
      goal_type: 'personal_short' | 'personal_long' | 'group';
      instrument_id?: string | null;
      is_synced: boolean;
      [key: string]: any;
    }>;

    const unsyncedGoals = offlineGoals.filter((g) => !g.is_synced);

    if (unsyncedGoals.length > 0) {
      const offlineGoalsMapped: Goal[] = unsyncedGoals
        .filter((g) => {
          // 楽器IDでフィルタリング
          if (instrumentId) {
            return g.instrument_id === instrumentId;
          } else {
            return !g.instrument_id || g.instrument_id === null;
          }
        })
        .map((g) => ({
          id: g.id,
          title: g.title,
          description: g.description,
          target_date: g.target_date,
          progress_percentage: 0,
          goal_type: g.goal_type as 'personal_short' | 'personal_long',
          is_active: true,
          is_completed: false,
          show_on_calendar: false,
          instrument_id: g.instrument_id || null,
          user_id: g.user_id,
        }));

      return [...allGoals, ...offlineGoalsMapped];
    }
  } catch (error) {
    logger.debug('オフライン目標の読み込みエラー（無視）:', error);
  }
  return allGoals;
}

/**
 * フリープランの場合、最新の4個だけを表示
 */
export function applyFreePlanLimit(
  goals: Goal[],
  entitlement: { isEntitled?: boolean }
): Goal[] {
  if (entitlement?.isEntitled) {
    return goals;
  }

  const limit = FREE_PLAN_LIMITS.GOALS_COUNT_PER_INSTRUMENT;
  const sortedGoals = [...goals].sort((a, b) => {
    const dateA = new Date(a.created_at || 0).getTime();
    const dateB = new Date(b.created_at || 0).getTime();
    return dateB - dateA; // 降順（新しい順）
  });
  return sortedGoals.slice(0, limit);
}
