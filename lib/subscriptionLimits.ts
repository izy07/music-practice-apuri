/**
 * サブスクリプション制限チェックユーティリティ
 * 
 * 特徴:
 * - サブスクリプションサービスに直接依存しない
 * - エラーハンドリングを適切に行う
 * - フォールバック機能を提供
 */

import { listRecordingsByMonth } from './database';
import { goalRepository } from '@/repositories/goalRepository';
import { supabase } from './supabase';
import logger from './logger';
import { ErrorHandler } from './errorHandler';

export interface Entitlement {
  isEntitled: boolean;
  isTrial?: boolean;
  isPremiumActive?: boolean;
}

/**
 * Freeプランの制限値（楽器1個あたり）
 */
export const FREE_PLAN_LIMITS = {
  RECORDINGS_PER_MONTH_PER_INSTRUMENT: 3,
  GOALS_COUNT_PER_INSTRUMENT: 2,
  MY_LIBRARY_SONGS_PER_INSTRUMENT: 6, // 各楽器ごとに6個まで（ステータスに関係なく）
  MAX_INSTRUMENTS: 2, // Freeプランで使用可能な楽器の最大数
} as const;

/**
 * 指定された楽器IDで記録が1個でもあるかをチェック
 * 
 * @param userId ユーザーID
 * @param instrumentId チェックする楽器ID
 * @returns 記録があるかどうか
 */
const hasRecordForInstrument = async (userId: string, instrumentId: string | null): Promise<boolean> => {
  if (!instrumentId) {
    return false;
  }

  try {
    // recordings, goals, my_songs, practice_sessions, eventsのいずれかに記録があるかチェック
    const [recordingsResult, goalsResult, mySongsResult, practiceSessionsResult, eventsResult] = await Promise.all([
      supabase
        .from('recordings')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('instrument_id', instrumentId)
        .limit(1),
      supabase
        .from('goals')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('instrument_id', instrumentId)
        .limit(1),
      supabase
        .from('my_songs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('instrument_id', instrumentId)
        .limit(1),
      supabase
        .from('practice_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('instrument_id', instrumentId)
        .limit(1),
      supabase
        .from('events')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('instrument_id', instrumentId)
        .limit(1),
    ]);

    const hasRecord = 
      (recordingsResult.count && recordingsResult.count > 0) ||
      (goalsResult.count && goalsResult.count > 0) ||
      (mySongsResult.count && mySongsResult.count > 0) ||
      (practiceSessionsResult.count && practiceSessionsResult.count > 0) ||
      (eventsResult.count && eventsResult.count > 0);

    return hasRecord;
  } catch (error) {
    logger.error('楽器記録チェック中にエラーが発生しました:', {
      error,
      userId,
      instrumentId
    });
    // エラー時はfalseを返す（安全側に倒す）
    return false;
  }
};

/**
 * ユーザーが使用している楽器の数を取得（記録が1個でもある楽器の数）
 * 
 * @param userId ユーザーID
 * @returns 楽器の数（実際の数、制限なし）
 */
export const getUserInstrumentCount = async (userId: string): Promise<number> => {
  try {
    // すべての楽器IDを取得（重複を排除）
    const [recordingsResult, goalsResult, mySongsResult, practiceSessionsResult, eventsResult] = await Promise.all([
      supabase
        .from('recordings')
        .select('instrument_id')
        .eq('user_id', userId)
        .not('instrument_id', 'is', null),
      supabase
        .from('goals')
        .select('instrument_id')
        .eq('user_id', userId)
        .not('instrument_id', 'is', null),
      supabase
        .from('my_songs')
        .select('instrument_id')
        .eq('user_id', userId)
        .not('instrument_id', 'is', null),
      supabase
        .from('practice_sessions')
        .select('instrument_id')
        .eq('user_id', userId)
        .not('instrument_id', 'is', null),
      supabase
        .from('events')
        .select('instrument_id')
        .eq('user_id', userId)
        .not('instrument_id', 'is', null),
    ]);

    // すべての楽器IDを収集（重複を排除）
    const instrumentIds = new Set<string>();
    
    [recordingsResult.data, goalsResult.data, mySongsResult.data, practiceSessionsResult.data, eventsResult.data].forEach(data => {
      if (data) {
        data.forEach((item: any) => {
          if (item.instrument_id) {
            instrumentIds.add(item.instrument_id);
          }
        });
      }
    });

    const instrumentCount = instrumentIds.size;
    
    logger.debug('楽器数取得（記録ベース）:', {
      userId,
      instrumentCount,
      instrumentIds: Array.from(instrumentIds)
    });

    return instrumentCount || 1; // 楽器データがない場合は1個として扱う
  } catch (error) {
    logger.error('楽器数取得中にエラーが発生しました:', {
      error,
      userId
    });
    ErrorHandler.handle(error, '楽器数取得', false);
    return 1; // エラー時は1個として扱う（フォールバック）
  }
};

/**
 * 指定された楽器IDが既存の楽器データに含まれているかチェック
 * （記録が1個でもある楽器を既存として扱う）
 * 
 * @param userId ユーザーID
 * @param instrumentId チェックする楽器ID
 * @returns 既存の楽器かどうか
 */
export const isExistingInstrument = async (userId: string, instrumentId: string | null | undefined): Promise<boolean> => {
  if (!instrumentId) {
    return true; // 楽器IDがnullの場合は既存として扱う（レガシーデータ対応）
  }

  try {
    const hasRecord = await hasRecordForInstrument(userId, instrumentId);
    
    logger.debug('既存楽器チェック（記録ベース）:', {
      userId,
      instrumentId,
      isExisting: hasRecord
    });

    return hasRecord;
  } catch (error) {
    logger.error('既存楽器チェック中にエラーが発生しました:', {
      error,
      userId,
      instrumentId
    });
    ErrorHandler.handle(error, '既存楽器チェック', false);
    return true; // エラー時は既存として扱う（フォールバック）
  }
};

/**
 * 新しい楽器でデータを保存できるかチェック
 * 
 * @param userId ユーザーID
 * @param instrumentId 保存しようとする楽器ID
 * @param entitlement エンタイトルメント情報
 * @returns 保存可能かどうか
 */
export const canSaveDataForInstrument = async (
  userId: string,
  instrumentId: string | null | undefined,
  entitlement: Entitlement | null | undefined
): Promise<{ canSave: boolean; reason?: string }> => {
  try {
    // Premiumユーザーは無制限
    if (entitlement?.isEntitled) {
      return { canSave: true };
    }

    // 楽器IDがnullの場合は許可（レガシーデータ対応）
    if (!instrumentId) {
      return { canSave: true };
    }

    // 既存の楽器かどうかをチェック
    const isExisting = await isExistingInstrument(userId, instrumentId);
    if (isExisting) {
      return { canSave: true }; // 既存の楽器の場合は保存可能
    }

    // 新しい楽器の場合、楽器数をチェック
    const instrumentCount = await getUserInstrumentCount(userId);
    if (instrumentCount >= FREE_PLAN_LIMITS.MAX_INSTRUMENTS) {
      logger.debug('楽器数制限に達しています:', {
        userId,
        instrumentId,
        instrumentCount,
        maxInstruments: FREE_PLAN_LIMITS.MAX_INSTRUMENTS
      });
      return {
        canSave: false,
        reason: `Freeプランでは楽器を${FREE_PLAN_LIMITS.MAX_INSTRUMENTS}個まで記録できます。新しい楽器でデータを追加するには、プレミアムへアップグレードしてください。`
      };
    }

    return { canSave: true };
  } catch (error) {
    logger.error('楽器データ保存可否チェック中にエラーが発生しました:', {
      error,
      userId,
      instrumentId
    });
    ErrorHandler.handle(error, '楽器データ保存可否チェック', false);
    // エラー時は許可（フォールバック）
    return { canSave: true };
  }
};

/**
 * 指定された日付が今月かどうかをチェック
 * 
 * @param date チェックする日付
 * @returns 今月の日付かどうか
 */
export const isCurrentMonth = (date: Date | string | null | undefined): boolean => {
  if (!date) {
    return true; // 日付が指定されていない場合は現在日時を使用するため、今月として扱う
  }

  const checkDate = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  
  return (
    checkDate.getFullYear() === now.getFullYear() &&
    checkDate.getMonth() === now.getMonth()
  );
};

/**
 * 月間録音回数をチェック
 * 
 * @param userId ユーザーID
 * @param entitlement エンタイトルメント情報
 * @param selectedDate 選択された日付（Freeプランの場合は今月である必要がある）
 * @returns 録音可能かどうか
 */
export const checkMonthlyRecordingLimit = async (
  userId: string,
  entitlement: Entitlement | null | undefined,
  selectedDate?: Date | string | null
): Promise<{ canRecord: boolean; currentCount: number; limit: number; reason?: string }> => {
  try {
    // Premiumユーザーは無制限
    if (entitlement?.isEntitled) {
      return { canRecord: true, currentCount: 0, limit: Infinity };
    }

    // Freeプランの場合、選択された日付が今月であることを確認
    if (selectedDate !== undefined && !isCurrentMonth(selectedDate)) {
      logger.debug('Freeプラン: 選択された日付が今月ではありません', {
        selectedDate,
        userId
      });
      // 楽器数を取得して制限値を計算
      const instrumentCount = await getUserInstrumentCount(userId);
      const limit = FREE_PLAN_LIMITS.RECORDINGS_PER_MONTH_PER_INSTRUMENT * instrumentCount;
      return {
        canRecord: false,
        currentCount: 0,
        limit,
        reason: 'Freeプランでは当月のみ録音可能です'
      };
    }

    // 楽器数を取得して制限値を計算
    const instrumentCount = await getUserInstrumentCount(userId);
    const limit = FREE_PLAN_LIMITS.RECORDINGS_PER_MONTH_PER_INSTRUMENT * instrumentCount;

    // 今月の録音数を取得
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const { data: recordings, error } = await listRecordingsByMonth(userId, year, month);

    if (error) {
      logger.warn('月間録音数の取得に失敗しました。制限チェックをスキップします。', {
        error,
        userId,
        year,
        month
      });
      ErrorHandler.handle(error, '月間録音数取得', false);
      // エラー時は許可（フォールバック）
      return { canRecord: true, currentCount: 0, limit };
    }

    const currentCount = recordings?.length || 0;
    const canRecord = currentCount < limit;

    logger.debug('月間録音制限チェック:', {
      userId,
      instrumentCount,
      currentCount,
      limit,
      canRecord
    });

    return { canRecord, currentCount, limit };
  } catch (error) {
    logger.error('月間録音制限チェック中にエラーが発生しました:', {
      error,
      userId
    });
    ErrorHandler.handle(error, '月間録音制限チェック', false);
    // エラー時は許可（フォールバック）
    const fallbackLimit = FREE_PLAN_LIMITS.RECORDINGS_PER_MONTH_PER_INSTRUMENT;
    return { canRecord: true, currentCount: 0, limit: fallbackLimit };
  }
};

/**
 * 目標設定数をチェック（各楽器ごとに2個まで）
 * 
 * @param userId ユーザーID
 * @param instrumentId 楽器ID（指定された楽器の目標数のみをチェック）
 * @param entitlement エンタイトルメント情報
 * @returns 目標設定可能かどうか
 */
export const checkGoalLimit = async (
  userId: string,
  instrumentId: string | null | undefined,
  entitlement: Entitlement | null | undefined
): Promise<{ canCreate: boolean; currentCount: number; limit: number }> => {
  try {
    // Premiumユーザーは無制限
    if (entitlement?.isEntitled) {
      return { canCreate: true, currentCount: 0, limit: Infinity };
    }

    // 各楽器ごとに2個まで（楽器数を掛け算しない）
    const limit = FREE_PLAN_LIMITS.GOALS_COUNT_PER_INSTRUMENT;

    // 指定された楽器IDの目標数のみを取得（各楽器ごとにチェック）
    const existingCount = await goalRepository.getExistingGoalsCount(userId, instrumentId || null);

    const canCreate = existingCount < limit;

    logger.debug('目標設定制限チェック（各楽器ごと）:', {
      userId,
      instrumentId,
      currentCount: existingCount,
      limit,
      canCreate
    });

    return { canCreate, currentCount: existingCount, limit };
  } catch (error) {
    logger.error('目標設定制限チェック中にエラーが発生しました:', {
      error,
      userId,
      instrumentId
    });
    ErrorHandler.handle(error, '目標設定制限チェック', false);
    // エラー時は許可（フォールバック）
    const fallbackLimit = FREE_PLAN_LIMITS.GOALS_COUNT_PER_INSTRUMENT;
    return { canCreate: true, currentCount: 0, limit: fallbackLimit };
  }
};

/**
 * プレミアム解約時の目標調整（最新順FIFO）
 * 
 * 解約時に目標数を制限数に合わせて調整する
 * - 最新に作成した目標を優先的に保持
 * - 制限を超える古い目標のshow_on_calendarをfalseにする
 * 
 * @param userId ユーザーID
 * @param entitlement エンタイトルメント情報
 * @returns 調整された目標数
 */
/**
 * 使用中の楽器IDリストを取得（記録が1個でもある楽器）
 * 
 * @param userId ユーザーID
 * @returns 使用中の楽器IDの配列
 */
export const getActiveInstrumentIds = async (userId: string): Promise<string[]> => {
  try {
    const instrumentCount = await getUserInstrumentCount(userId);
    if (instrumentCount === 0) {
      return [];
    }

    // すべての楽器IDを取得（重複を排除）
    const [recordingsResult, goalsResult, mySongsResult, practiceSessionsResult, eventsResult] = await Promise.all([
      supabase
        .from('recordings')
        .select('instrument_id')
        .eq('user_id', userId)
        .not('instrument_id', 'is', null),
      supabase
        .from('goals')
        .select('instrument_id')
        .eq('user_id', userId)
        .not('instrument_id', 'is', null),
      supabase
        .from('my_songs')
        .select('instrument_id')
        .eq('user_id', userId)
        .not('instrument_id', 'is', null),
      supabase
        .from('practice_sessions')
        .select('instrument_id')
        .eq('user_id', userId)
        .not('instrument_id', 'is', null),
      supabase
        .from('events')
        .select('instrument_id')
        .eq('user_id', userId)
        .not('instrument_id', 'is', null),
    ]);

    // すべての楽器IDを収集（重複を排除）
    const instrumentIds = new Set<string>();
    
    [recordingsResult.data, goalsResult.data, mySongsResult.data, practiceSessionsResult.data, eventsResult.data].forEach(data => {
      if (data) {
        data.forEach((item: any) => {
          if (item.instrument_id) {
            instrumentIds.add(item.instrument_id);
          }
        });
      }
    });

    const activeInstrumentIds = Array.from(instrumentIds);
    
    logger.debug('使用中楽器ID取得:', {
      userId,
      count: activeInstrumentIds.length,
      instrumentIds: activeInstrumentIds
    });

    return activeInstrumentIds;
  } catch (error) {
    logger.error('使用中楽器ID取得中にエラーが発生しました:', {
      error,
      userId
    });
    ErrorHandler.handle(error, '使用中楽器ID取得', false);
    return [];
  }
};

export const adjustGoalsOnDowngrade = async (
  userId: string,
  entitlement: Entitlement | null | undefined
): Promise<{ adjusted: boolean; totalGoals: number; keptGoals: number }> => {
  try {
    // Premiumユーザーは調整不要
    if (entitlement?.isEntitled) {
      logger.debug('プレミアムユーザーのため、目標調整をスキップします');
      return { adjusted: false, totalGoals: 0, keptGoals: 0 };
    }

    // 各楽器ごとに2個まで（楽器数を掛け算しない）
    const limitPerInstrument = FREE_PLAN_LIMITS.GOALS_COUNT_PER_INSTRUMENT;

    // 全目標を取得（楽器IDでフィルタリングしない）
    const allGoals = await goalRepository.getGoals(userId, undefined);
    
    // 達成済み目標と未達成目標を分離
    const activeGoals = allGoals.filter((g: any) => 
      !g.is_completed && g.progress_percentage < 100
    );
    
    logger.debug('解約時の目標調整開始（各楽器ごとに2個まで）:', {
      userId,
      limitPerInstrument,
      totalGoals: allGoals.length,
      activeGoals: activeGoals.length
    });

    // 楽器IDごとにグループ化
    const goalsByInstrument = new Map<string | null, any[]>();
    
    for (const goal of activeGoals) {
      const instrumentId = goal.instrument_id || null;
      if (!goalsByInstrument.has(instrumentId)) {
        goalsByInstrument.set(instrumentId, []);
      }
      goalsByInstrument.get(instrumentId)!.push(goal);
    }

    // 各楽器ごとに最新2個を保持、それ以外は非表示にする
    const goalsToKeep: any[] = [];
    const goalsToHide: any[] = [];

    for (const [instrumentId, instrumentGoals] of goalsByInstrument) {
      // created_atでソート（最新順）
      const sorted = [...instrumentGoals].sort((a: any, b: any) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA; // 降順（新しい順）
      });

      // 各楽器ごとに最新2個を保持
      const instrumentGoalsToKeep = sorted.slice(0, limitPerInstrument);
      const instrumentGoalsToHide = sorted.slice(limitPerInstrument);

      goalsToKeep.push(...instrumentGoalsToKeep);
      goalsToHide.push(...instrumentGoalsToHide);

      logger.debug(`楽器ごとの目標調整 (instrumentId: ${instrumentId || 'null'}):`, {
        total: sorted.length,
        kept: instrumentGoalsToKeep.length,
        hidden: instrumentGoalsToHide.length
      });
    }

    // 調整不要の場合は早期リターン
    if (goalsToHide.length === 0) {
      logger.debug('目標数が制限以内のため、調整不要です');
      
      // 各楽器ごとに最新の目標のshow_on_calendarをtrueにする
      if (activeGoals.length > 0) {
        await ensureOneGoalPerInstrumentVisible(userId, activeGoals);
      }
      
      return { 
        adjusted: false, 
        totalGoals: activeGoals.length, 
        keptGoals: activeGoals.length 
      };
    }

    logger.debug('目標調整（各楽器ごとに2個まで）:', {
      totalGoals: activeGoals.length,
      keptGoals: goalsToKeep.length,
      hiddenGoals: goalsToHide.length
    });

    // 古い目標のshow_on_calendarをfalseにする
    if (goalsToHide.length > 0) {
      for (const goal of goalsToHide) {
        try {
          await goalRepository.updateShowOnCalendar(
            goal.id,
            false,
            userId,
            goal.instrument_id || null
          );
        } catch (error) {
          logger.error('目標の非表示処理中にエラーが発生しました:', {
            goalId: goal.id,
            error
          });
          // 個別のエラーは無視して続行
        }
      }
    }

    // 保持する目標について、各楽器ごとに最新の目標のshow_on_calendarをtrueにする
    await ensureOneGoalPerInstrumentVisible(userId, goalsToKeep);

    // カレンダー更新イベントを発火
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('calendarGoalUpdated'));
    }

    logger.info('解約時の目標調整が完了しました（各楽器ごとに2個まで）:', {
      totalGoals: activeGoals.length,
      keptGoals: goalsToKeep.length,
      hiddenGoals: goalsToHide.length
    });

    return {
      adjusted: true,
      totalGoals: activeGoals.length,
      keptGoals: goalsToKeep.length
    };
  } catch (error) {
    logger.error('解約時の目標調整中にエラーが発生しました:', {
      error,
      userId
    });
    ErrorHandler.handle(error, 'adjustGoalsOnDowngrade', false);
    // エラー時も処理は続行（フォールバック）
    return { adjusted: false, totalGoals: 0, keptGoals: 0 };
  }
};

/**
 * 各楽器ごとに最新の目標のshow_on_calendarをtrueにする（1つだけ）
 * 
 * @param userId ユーザーID
 * @param goals 目標の配列
 */
async function ensureOneGoalPerInstrumentVisible(
  userId: string,
  goals: any[]
): Promise<void> {
  try {
    // 楽器IDごとにグループ化
    const goalsByInstrument = new Map<string | null, any[]>();
    
    for (const goal of goals) {
      const instrumentId = goal.instrument_id || null;
      if (!goalsByInstrument.has(instrumentId)) {
        goalsByInstrument.set(instrumentId, []);
      }
      goalsByInstrument.get(instrumentId)!.push(goal);
    }

    // 各楽器ごとに最新の目標のshow_on_calendarをtrueにする
    for (const [instrumentId, instrumentGoals] of goalsByInstrument) {
      // created_atでソート（最新順）
      const sorted = [...instrumentGoals].sort((a: any, b: any) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA; // 降順（新しい順）
      });

      // 最新の目標のshow_on_calendarをtrueにする（既にtrueの場合はスキップ）
      const latestGoal = sorted[0];
      if (latestGoal && !latestGoal.show_on_calendar) {
        try {
          await goalRepository.updateShowOnCalendar(
            latestGoal.id,
            true,
            userId,
            instrumentId
          );
        } catch (error) {
          logger.error('目標のカレンダー表示設定中にエラーが発生しました:', {
            goalId: latestGoal.id,
            instrumentId,
            error
          });
          // 個別のエラーは無視して続行
        }
      }
    }
  } catch (error) {
    logger.error('ensureOneGoalPerInstrumentVisible中にエラーが発生しました:', {
      error,
      userId
    });
    // エラーは無視（フォールバック）
  }
}

/**
 * マイライブラリの曲数をチェック（楽器ごとに）
 * 
 * @param userId ユーザーID
 * @param entitlement エンタイトルメント情報
 * @param instrumentId 楽器ID（指定された楽器の曲数のみをカウント）
 * @returns 曲を追加可能かどうか
 */
export const checkMyLibraryLimit = async (
  userId: string,
  entitlement: Entitlement | null | undefined,
  instrumentId?: string | null
): Promise<{ canAdd: boolean; currentCount: number; limit: number }> => {
  try {
    // Premiumユーザーは無制限
    if (entitlement?.isEntitled) {
      return { canAdd: true, currentCount: 0, limit: Infinity };
    }

    // 各楽器ごとに6個まで（楽器数で掛け算しない）
    const limit = FREE_PLAN_LIMITS.MY_LIBRARY_SONGS_PER_INSTRUMENT;

    // 既存の曲数を取得（楽器IDでフィルタリング）
    // instrument_idカラムが存在しない可能性があるため、TypeScript側でフィルタリング
    const { data: allSongs, error: queryError } = await supabase
      .from('my_songs')
      .select('id, instrument_id')
      .eq('user_id', userId);

    if (queryError) {
      // instrument_idカラムが存在しないエラーの場合、カラムなしで再試行
      if (queryError.code === 'PGRST204' || queryError.code === '42703' || 
          (queryError.message && (
            queryError.message.includes('instrument_id') || 
            queryError.message.includes('Could not find') ||
            queryError.message.includes('schema cache')
          ))) {
        logger.warn('[subscriptionLimits] instrument_idカラムが存在しないため、カラムなしで再試行します', {
          errorCode: queryError.code,
          errorMessage: queryError.message
        });
        
        // instrument_idカラムなしで再試行
        const { data: songsWithoutInstrumentId, error: retryError } = await supabase
          .from('my_songs')
          .select('id')
          .eq('user_id', userId);
        
        if (retryError) {
          logger.warn('マイライブラリの曲数取得に失敗しました。制限チェックをスキップします。', {
            error: retryError,
            userId
          });
          ErrorHandler.handle(retryError, 'マイライブラリ曲数取得', false);
          // エラー時は許可（フォールバック）
          return { canAdd: true, currentCount: 0, limit };
        }
        
        // instrument_idカラムが存在しない場合、すべての曲をカウント（楽器ごとの制限は適用できない）
        // ただし、楽器が選択されている場合は制限を適用する（すべての曲をカウント）
        const currentCount = songsWithoutInstrumentId?.length || 0;
        const canAdd = currentCount < limit;
        
        logger.debug('マイライブラリ制限チェック（instrument_idカラムなし）:', {
          userId,
          instrumentId,
          currentCount,
          limit,
          canAdd,
          note: 'instrument_idカラムが存在しないため、楽器ごとの制限は適用できませんが、全体の制限を適用します'
        });
        
        return { canAdd, currentCount, limit };
      }
      
      logger.warn('マイライブラリの曲数取得に失敗しました。制限チェックをスキップします。', {
        error: queryError,
        userId
      });
      ErrorHandler.handle(queryError, 'マイライブラリ曲数取得', false);
      // エラー時は許可（フォールバック）
      return { canAdd: true, currentCount: 0, limit };
    }

    // TypeScript側で楽器IDでフィルタリング
    let filteredSongs = allSongs || [];
    if (instrumentId !== undefined && instrumentId !== null) {
      // 楽器IDが指定されている場合、その楽器IDに一致する曲のみをカウント
      // instrument_idがnullの曲は含めない（楽器が選択されている場合は、その楽器の曲のみをカウント）
      filteredSongs = filteredSongs.filter((song: any) => 
        song.instrument_id === instrumentId
      );
    } else if (instrumentId === null) {
      // instrumentIdがnullの場合は、instrument_idがnullの曲のみをカウント
      filteredSongs = filteredSongs.filter((song: any) => song.instrument_id === null);
    }
    // instrumentIdがundefinedの場合は、すべての曲をカウント（楽器が選択されていない場合）

    const currentCount = filteredSongs.length;
    const canAdd = currentCount < limit;

    logger.debug('マイライブラリ制限チェック:', {
      userId,
      instrumentId,
      currentCount,
      limit,
      canAdd,
      totalSongs: allSongs?.length || 0
    });

    return { canAdd, currentCount, limit };
  } catch (error) {
    logger.error('マイライブラリ制限チェック中にエラーが発生しました:', {
      error,
      userId,
      instrumentId
    });
    ErrorHandler.handle(error, 'マイライブラリ制限チェック', false);
    // エラー時は許可（フォールバック）
    const fallbackLimit = FREE_PLAN_LIMITS.MY_LIBRARY_SONGS_PER_INSTRUMENT;
    return { canAdd: true, currentCount: 0, limit: fallbackLimit };
  }
};

