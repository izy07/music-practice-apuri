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
  MY_LIBRARY_SONGS_PER_INSTRUMENT: 10, // 各楽器ごとに10個まで（ステータスに関係なく）
  MAX_INSTRUMENTS: 2, // Freeプランで使用可能な楽器の最大数
} as const;

/**
 * 指定された楽器IDで記録が1個でもあるかをチェック
 * 
 * 処理フロー:
 * 1. 楽器IDがnullの場合はfalseを返す
 * 2. 複数のテーブルから楽器IDの存在を並列チェック（count: 'exact', head: true）
 * 3. いずれかのテーブルに記録があればtrueを返す
 * 4. すべてのテーブルに記録がなければfalseを返す
 * 
 * 注意: 1個でも記録があれば「使用中」として扱う
 * 注意: エラー時はfalseを返す（安全側に倒す）
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
    // 並列処理でパフォーマンスを向上（Promise.allを使用）
    // 注意: count: 'exact', head: true でレコードデータは取得せず、カウントのみを取得（効率的）
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
 * 処理フロー:
 * 1. 複数のテーブルから楽器IDを並列取得（recordings, goals, my_songs, practice_sessions, events）
 * 2. すべての楽器IDを収集（重複を排除 - Setを使用）
 * 3. 一意の楽器ID数を返す
 * 
 * 注意: 記録が1個でもある楽器を「使用中」として扱う
 * 注意: 楽器IDがnullのレコードは除外（有効な楽器IDのみを取得）
 * 注意: エラー時は1個として扱う（フォールバック）
 * 
 * @param userId ユーザーID
 * @returns 楽器の数（実際の数、制限なし）
 */
export const getUserInstrumentCount = async (userId: string): Promise<number> => {
  try {
    // すべての楽器IDを取得（重複を排除 - 並列処理でパフォーマンスを向上）
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

    // すべての楽器IDを収集（重複を排除 - Setを使用）
    // 型安全性のため明示的に型を指定（any型を回避）
    interface RecordWithInstrumentId {
      instrument_id: string;
    }
    const instrumentIds = new Set<string>();
    
    // 各テーブルの結果を処理（楽器IDを収集）
    const allResults: (RecordWithInstrumentId[] | null)[] = [
      recordingsResult.data,
      goalsResult.data,
      mySongsResult.data,
      practiceSessionsResult.data,
      eventsResult.data
    ];
    
    allResults.forEach(data => {
      if (data && Array.isArray(data)) {
        data.forEach((item: RecordWithInstrumentId) => {
          // instrument_idが存在し、nullでない場合のみ追加
          if (item.instrument_id && typeof item.instrument_id === 'string') {
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
 * プランに応じた最大録音時間を取得（秒）
 * 
 * @param entitlement エンタイトルメント情報
 * @returns 最大録音時間（秒）
 */
export const getMaxRecordingDuration = (entitlement: Entitlement | null | undefined): number => {
  if (entitlement?.isEntitled) {
    return 3600; // プレミアム: 60分
  }
  return 180; // フリープラン: 3分
};

/**
 * プランに応じた1日の最大録音数を取得
 * 
 * @param entitlement エンタイトルメント情報
 * @returns 1日の最大録音数
 */
export const getMaxDailyRecordings = (entitlement: Entitlement | null | undefined): number => {
  if (entitlement?.isEntitled) {
    return 2; // プレミアム: 2個
  }
  return 1; // フリープラン: 1個
};

/**
 * 1日の録音数制限をチェック
 * 
 * @param userId ユーザーID
 * @param entitlement エンタイトルメント情報
 * @param selectedDate 選択された日付（nullの場合は今日）
 * @returns 録音可能かどうか
 */
export const checkDailyRecordingLimit = async (
  userId: string,
  entitlement: Entitlement | null | undefined,
  selectedDate?: Date | string | null
): Promise<{ canRecord: boolean; currentCount: number; limit: number; reason?: string }> => {
  try {
    // Premiumユーザーも1日2個までという制限があるため、チェックは必要
    const maxDaily = getMaxDailyRecordings(entitlement);
    
    // チェック対象の日付を決定
    const targetDate = selectedDate ? new Date(selectedDate) : new Date();
    
    // 指定日の0時00分00秒と23時59分59秒を取得
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0);
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59);

    const { data: recordings, error } = await supabase
      .from('recordings')
      .select('id', { count: 'exact', head: false })
      .eq('user_id', userId)
      .gte('recorded_at', startOfDay.toISOString())
      .lte('recorded_at', endOfDay.toISOString());

    if (error) {
      logger.warn('1日の録音数取得に失敗しました。制限チェックをスキップします。', {
        error,
        userId,
        targetDate: targetDate.toISOString()
      });
      ErrorHandler.handle(error, '1日録音数取得', false);
      // エラー時は許可（フォールバック）
      return { canRecord: true, currentCount: 0, limit: maxDaily };
    }

    const currentCount = recordings?.length || 0;
    const canRecord = currentCount < maxDaily;

    logger.debug('1日録音制限チェック:', {
      userId,
      currentCount,
      limit: maxDaily,
      canRecord,
      targetDate: targetDate.toISOString()
    });

    return { 
      canRecord, 
      currentCount, 
      limit: maxDaily,
      reason: !canRecord 
        ? `本日は既に${maxDaily}個の録音があります。${entitlement?.isEntitled ? '明日以降録音できます。' : '明日以降またはプレミアムで録音できます。'}`
        : undefined
    };
  } catch (error) {
    logger.error('1日録音制限チェック中にエラーが発生しました:', {
      error,
      userId
    });
    ErrorHandler.handle(error, '1日録音制限チェック', false);
    // エラー時は許可（フォールバック）
    const fallbackLimit = getMaxDailyRecordings(entitlement);
    return { canRecord: true, currentCount: 0, limit: fallbackLimit };
  }
};

/**
 * 月間録音回数をチェック（楽器ごと）
 * 
 * @param userId ユーザーID
 * @param entitlement エンタイトルメント情報
 * @param selectedDate 選択された日付（Freeプランの場合は今月である必要がある）
 * @param instrumentId 楽器ID（指定された楽器の録音数のみをチェック）
 * @returns 録音可能かどうか
 */
export const checkMonthlyRecordingLimit = async (
  userId: string,
  entitlement: Entitlement | null | undefined,
  selectedDate?: Date | string | null,
  instrumentId?: string | null
): Promise<{ canRecord: boolean; currentCount: number; limit: number; reason?: string }> => {
  try {
    // Premiumユーザーは無制限
    if (entitlement?.isEntitled) {
      return { canRecord: true, currentCount: 0, limit: Infinity };
    }

    // 楽器ごとの制限値（各楽器ごとに3回まで）
    const limit = FREE_PLAN_LIMITS.RECORDINGS_PER_MONTH_PER_INSTRUMENT;

    // Freeプランの場合、選択された日付が今月であることを確認
    if (selectedDate !== undefined && !isCurrentMonth(selectedDate)) {
      logger.debug('Freeプラン: 選択された日付が今月ではありません', {
        selectedDate,
        userId,
        instrumentId
      });
      return {
        canRecord: false,
        currentCount: 0,
        limit,
        reason: 'Freeプランでは当月のみ録音可能です'
      };
    }

    // 楽器IDが指定されていない場合は、カウントを0として返す
    if (!instrumentId) {
      logger.debug('楽器IDが指定されていないため、カウントを0として返します', {
        userId
      });
      return { canRecord: true, currentCount: 0, limit };
    }

    // 今月の録音数を取得（指定された楽器の録音のみをカウント）
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    
    // 指定された楽器の録音のみを取得
    let query = supabase
      .from('recordings')
      .select('id')
      .eq('user_id', userId)
      .eq('instrument_id', instrumentId)
      .gte('recorded_at', start.toISOString())
      .lte('recorded_at', new Date(end.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString());

    const { data: recordings, error } = await query;

    if (error) {
      logger.warn('月間録音数の取得に失敗しました。制限チェックをスキップします。', {
        error,
        userId,
        instrumentId,
        year,
        month
      });
      ErrorHandler.handle(error, '月間録音数取得', false);
      // エラー時は許可（フォールバック）
      return { canRecord: true, currentCount: 0, limit };
    }

    const currentCount = recordings?.length || 0;
    const canRecord = currentCount < limit;

    logger.debug('月間録音制限チェック（楽器ごと）:', {
      userId,
      instrumentId,
      currentCount,
      limit,
      canRecord
    });

    return { canRecord, currentCount, limit };
  } catch (error) {
    logger.error('月間録音制限チェック中にエラーが発生しました:', {
      error,
      userId,
      instrumentId
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
 * プレミアム解約時の目標調整（最新順FIFO - First In, First Out）
 * 
 * 解約時に目標数を制限数に合わせて調整する
 * 処理フロー:
 * 1. Premiumユーザーは調整不要（早期リターン）
 * 2. 全目標を取得（楽器IDでフィルタリングしない）
 * 3. 達成済み目標と未達成目標を分離（制限は未達成目標のみに適用）
 * 4. 楽器IDごとにグループ化
 * 5. 各楽器ごとに最新2個を保持、それ以外は非表示（show_on_calendar = false）
 * 6. 各楽器ごとに最新の目標のshow_on_calendarをtrueにする
 * 7. カレンダー更新イベントを発火
 * 
 * 注意: データは削除しない（show_on_calendarをfalseにするだけ）
 * 注意: 各楽器ごとに2個までの制限を適用（楽器数を掛け算しない）
 * 
 * @param userId ユーザーID
 * @param entitlement エンタイトルメント情報
 * @returns 調整された目標数
 */
/**
 * 使用中の楽器IDリストを取得（記録が1個でもある楽器）
 * 
 * 処理フロー:
 * 1. 複数のテーブルから楽器IDを並列取得（recordings, goals, my_songs, practice_sessions, events）
 * 2. すべての楽器IDを収集（重複を排除 - Setを使用）
 * 3. 一意の楽器IDリストを返す
 * 
 * 注意: 記録が1個でもある楽器を「使用中」として扱う
 * 注意: 楽器IDがnullのレコードは除外（有効な楽器IDのみを取得）
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

    // すべての楽器IDを収集（重複を排除 - Setを使用）
    // 型安全性のため明示的に型を指定（any型を回避）
    interface RecordWithInstrumentId {
      instrument_id: string;
    }
    const instrumentIds = new Set<string>();
    
    // 各テーブルの結果を処理（楽器IDを収集）
    const allResults: (RecordWithInstrumentId[] | null)[] = [
      recordingsResult.data,
      goalsResult.data,
      mySongsResult.data,
      practiceSessionsResult.data,
      eventsResult.data
    ];
    
    allResults.forEach(data => {
      if (data && Array.isArray(data)) {
        data.forEach((item: RecordWithInstrumentId) => {
          // instrument_idが存在し、nullでない場合のみ追加
          if (item.instrument_id && typeof item.instrument_id === 'string') {
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

/**
 * プレミアム解約時の全データ調整（目標、録音、楽曲）
 * 
 * 処理フロー:
 * 1. Premiumユーザーは調整不要（早期リターン）
 * 2. 目標、録音、楽曲を並列で調整
 * 3. 各調整の結果を集約して返す
 * 
 * @param userId ユーザーID
 * @param entitlement エンタイトルメント情報
 * @returns 調整結果の集約
 */
export const adjustAllDataOnDowngrade = async (
  userId: string,
  entitlement: Entitlement | null | undefined
): Promise<{
  goals: { adjusted: boolean; totalGoals: number; keptGoals: number };
  recordings: { adjusted: boolean; totalRecordings: number; keptRecordings: number };
  songs: { adjusted: boolean; totalSongs: number; keptSongs: number };
}> => {
  try {
    // Premiumユーザーは調整不要
    if (entitlement?.isEntitled) {
      logger.debug('プレミアムユーザーのため、全データ調整をスキップします');
      return {
        goals: { adjusted: false, totalGoals: 0, keptGoals: 0 },
        recordings: { adjusted: false, totalRecordings: 0, keptRecordings: 0 },
        songs: { adjusted: false, totalSongs: 0, keptSongs: 0 },
      };
    }

    logger.info('解約時の全データ調整を開始します:', { userId });

    // 目標、録音、楽曲を並列で調整
    const [goalsResult, recordingsResult, songsResult] = await Promise.all([
      adjustGoalsOnDowngrade(userId, entitlement).catch((error) => {
        logger.error('目標調整エラー（続行）:', error);
        return { adjusted: false, totalGoals: 0, keptGoals: 0 };
      }),
      adjustRecordingsOnDowngrade(userId, entitlement).catch((error) => {
        logger.error('録音調整エラー（続行）:', error);
        return { adjusted: false, totalRecordings: 0, keptRecordings: 0 };
      }),
      adjustMyLibrarySongsOnDowngrade(userId, entitlement).catch((error) => {
        logger.error('楽曲調整エラー（続行）:', error);
        return { adjusted: false, totalSongs: 0, keptSongs: 0 };
      }),
    ]);

    logger.info('解約時の全データ調整が完了しました:', {
      goals: goalsResult,
      recordings: recordingsResult,
      songs: songsResult,
    });

    return {
      goals: goalsResult,
      recordings: recordingsResult,
      songs: songsResult,
    };
  } catch (error) {
    logger.error('解約時の全データ調整中にエラーが発生しました:', {
      error,
      userId
    });
    ErrorHandler.handle(error, 'adjustAllDataOnDowngrade', false);
    return {
      goals: { adjusted: false, totalGoals: 0, keptGoals: 0 },
      recordings: { adjusted: false, totalRecordings: 0, keptRecordings: 0 },
      songs: { adjusted: false, totalSongs: 0, keptSongs: 0 },
    };
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
    // 注意: 達成済み目標は制限の対象外（制限は未達成目標のみに適用）
    // 型安全性のため明示的に型を指定（any型を回避）
    interface GoalForAdjustment {
      id: string;
      instrument_id?: string | null;
      is_completed?: boolean;
      progress_percentage?: number;
      created_at?: string;
    }
    const activeGoals = allGoals.filter((g: GoalForAdjustment) => 
      !g.is_completed && (g.progress_percentage ?? 0) < 100
    );
    
    logger.debug('解約時の目標調整開始（各楽器ごとに2個まで）:', {
      userId,
      limitPerInstrument,
      totalGoals: allGoals.length,
      activeGoals: activeGoals.length
    });

    // 楽器IDごとにグループ化（Mapを使用して効率的に管理）
    // 楽器IDがnullの目標も1つのグループとして扱う（レガシーデータ対応）
    const goalsByInstrument = new Map<string | null, GoalForAdjustment[]>();
    
    for (const goal of activeGoals) {
      const instrumentId = goal.instrument_id || null;
      if (!goalsByInstrument.has(instrumentId)) {
        goalsByInstrument.set(instrumentId, []);
      }
      goalsByInstrument.get(instrumentId)!.push(goal);
    }

    // 各楽器ごとに最新2個を保持、それ以外は非表示にする
    // FIFO (First In, First Out) アプローチ: 最新に作成した目標を優先的に保持
    const goalsToKeep: GoalForAdjustment[] = [];
    const goalsToHide: GoalForAdjustment[] = [];

    // 各楽器グループについて、制限を適用
    for (const [instrumentId, instrumentGoals] of goalsByInstrument) {
      // created_atでソート（最新順 - FIFOアプローチ）
      // 注意: created_atがnullの場合は0として扱う（古い目標として扱う）
      const sorted = [...instrumentGoals].sort((a: GoalForAdjustment, b: GoalForAdjustment) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA; // 降順（新しい順）
      });

      // 各楽器ごとに最新2個を保持（limitPerInstrument = 2）
      // 残りは非表示にする（削除はしない - データは保持）
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
 * プレミアム解約時の録音数調整（各楽器ごとに月3回まで）
 * 
 * 処理フロー:
 * 1. Premiumユーザーは調整不要（早期リターン）
 * 2. 現在の月の録音を各楽器ごとに取得
 * 3. 各楽器ごとに最新3個を保持、それ以外は削除
 * 
 * @param userId ユーザーID
 * @param entitlement エンタイトルメント情報
 * @returns 調整された録音数
 */
export const adjustRecordingsOnDowngrade = async (
  userId: string,
  entitlement: Entitlement | null | undefined
): Promise<{ adjusted: boolean; totalRecordings: number; keptRecordings: number }> => {
  try {
    // Premiumユーザーは調整不要
    if (entitlement?.isEntitled) {
      logger.debug('プレミアムユーザーのため、録音調整をスキップします');
      return { adjusted: false, totalRecordings: 0, keptRecordings: 0 };
    }

    const limitPerInstrument = FREE_PLAN_LIMITS.RECORDINGS_PER_MONTH_PER_INSTRUMENT;
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // 現在の月の録音を取得
    const { data: recordings, error } = await supabase
      .from('recordings')
      .select('id, instrument_id, created_at')
      .eq('user_id', userId)
      .gte('created_at', startOfMonth.toISOString())
      .lte('created_at', endOfMonth.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('録音取得エラー:', error);
      ErrorHandler.handle(error, '録音取得', false);
      return { adjusted: false, totalRecordings: 0, keptRecordings: 0 };
    }

    if (!recordings || recordings.length === 0) {
      logger.debug('録音が存在しないため、調整不要です');
      return { adjusted: false, totalRecordings: 0, keptRecordings: 0 };
    }

    // 楽器IDごとにグループ化
    const recordingsByInstrument = new Map<string | null, typeof recordings>();
    for (const recording of recordings) {
      const instrumentId = recording.instrument_id || null;
      if (!recordingsByInstrument.has(instrumentId)) {
        recordingsByInstrument.set(instrumentId, []);
      }
      recordingsByInstrument.get(instrumentId)!.push(recording);
    }

    // 各楽器ごとに最新3個を保持、それ以外は削除
    const recordingsToDelete: string[] = [];
    let totalKept = 0;

    for (const [instrumentId, instrumentRecordings] of recordingsByInstrument) {
      // created_atでソート（最新順）
      const sorted = [...instrumentRecordings].sort((a, b) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA; // 降順（新しい順）
      });

      // 各楽器ごとに最新3個を保持
      const recordingsToKeep = sorted.slice(0, limitPerInstrument);
      const recordingsToRemove = sorted.slice(limitPerInstrument);

      totalKept += recordingsToKeep.length;
      recordingsToDelete.push(...recordingsToRemove.map(r => r.id));

      logger.debug(`楽器ごとの録音調整 (instrumentId: ${instrumentId || 'null'}):`, {
        total: sorted.length,
        kept: recordingsToKeep.length,
        removed: recordingsToRemove.length
      });
    }

    // 調整不要の場合は早期リターン
    if (recordingsToDelete.length === 0) {
      logger.debug('録音数が制限以内のため、調整不要です');
      return { 
        adjusted: false, 
        totalRecordings: recordings.length, 
        keptRecordings: recordings.length 
      };
    }

    // 古い録音を削除
    if (recordingsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('recordings')
        .delete()
        .in('id', recordingsToDelete);

      if (deleteError) {
        logger.error('録音削除エラー:', deleteError);
        ErrorHandler.handle(deleteError, '録音削除', false);
        return { adjusted: false, totalRecordings: recordings.length, keptRecordings: totalKept };
      }
    }

    logger.info('解約時の録音調整が完了しました（各楽器ごとに月3回まで）:', {
      totalRecordings: recordings.length,
      keptRecordings: totalKept,
      deletedRecordings: recordingsToDelete.length
    });

    return {
      adjusted: true,
      totalRecordings: recordings.length,
      keptRecordings: totalKept
    };
  } catch (error) {
    logger.error('解約時の録音調整中にエラーが発生しました:', {
      error,
      userId
    });
    ErrorHandler.handle(error, 'adjustRecordingsOnDowngrade', false);
    return { adjusted: false, totalRecordings: 0, keptRecordings: 0 };
  }
};

/**
 * プレミアム解約時の楽曲数調整（各楽器ごとに10曲まで）
 * 
 * 処理フロー:
 * 1. Premiumユーザーは調整不要（早期リターン）
 * 2. 全楽曲を取得（楽器IDでフィルタリングしない）
 * 3. 楽器IDごとにグループ化
 * 4. 各楽器ごとに最新10個を保持、それ以外は削除
 * 
 * @param userId ユーザーID
 * @param entitlement エンタイトルメント情報
 * @returns 調整された楽曲数
 */
export const adjustMyLibrarySongsOnDowngrade = async (
  userId: string,
  entitlement: Entitlement | null | undefined
): Promise<{ adjusted: boolean; totalSongs: number; keptSongs: number }> => {
  try {
    // Premiumユーザーは調整不要
    if (entitlement?.isEntitled) {
      logger.debug('プレミアムユーザーのため、楽曲調整をスキップします');
      return { adjusted: false, totalSongs: 0, keptSongs: 0 };
    }

    const limitPerInstrument = FREE_PLAN_LIMITS.MY_LIBRARY_SONGS_PER_INSTRUMENT;

    // 全楽曲を取得
    const { data: songs, error } = await supabase
      .from('my_songs')
      .select('id, instrument_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('楽曲取得エラー:', error);
      ErrorHandler.handle(error, '楽曲取得', false);
      return { adjusted: false, totalSongs: 0, keptSongs: 0 };
    }

    if (!songs || songs.length === 0) {
      logger.debug('楽曲が存在しないため、調整不要です');
      return { adjusted: false, totalSongs: 0, keptSongs: 0 };
    }

    // 楽器IDごとにグループ化
    const songsByInstrument = new Map<string | null, typeof songs>();
    for (const song of songs) {
      const instrumentId = song.instrument_id || null;
      if (!songsByInstrument.has(instrumentId)) {
        songsByInstrument.set(instrumentId, []);
      }
      songsByInstrument.get(instrumentId)!.push(song);
    }

    // 各楽器ごとに最新10個を保持、それ以外は削除
    const songsToDelete: string[] = [];
    let totalKept = 0;

    for (const [instrumentId, instrumentSongs] of songsByInstrument) {
      // created_atでソート（最新順）
      const sorted = [...instrumentSongs].sort((a, b) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA; // 降順（新しい順）
      });

      // 各楽器ごとに最新10個を保持
      const songsToKeep = sorted.slice(0, limitPerInstrument);
      const songsToRemove = sorted.slice(limitPerInstrument);

      totalKept += songsToKeep.length;
      songsToDelete.push(...songsToRemove.map(s => s.id));

      logger.debug(`楽器ごとの楽曲調整 (instrumentId: ${instrumentId || 'null'}):`, {
        total: sorted.length,
        kept: songsToKeep.length,
        removed: songsToRemove.length
      });
    }

    // 調整不要の場合は早期リターン
    if (songsToDelete.length === 0) {
      logger.debug('楽曲数が制限以内のため、調整不要です');
      return { 
        adjusted: false, 
        totalSongs: songs.length, 
        keptSongs: songs.length 
      };
    }

    // 古い楽曲を削除
    if (songsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('my_songs')
        .delete()
        .in('id', songsToDelete);

      if (deleteError) {
        logger.error('楽曲削除エラー:', deleteError);
        ErrorHandler.handle(deleteError, '楽曲削除', false);
        return { adjusted: false, totalSongs: songs.length, keptSongs: totalKept };
      }
    }

    logger.info('解約時の楽曲調整が完了しました（各楽器ごとに10曲まで）:', {
      totalSongs: songs.length,
      keptSongs: totalKept,
      deletedSongs: songsToDelete.length
    });

    return {
      adjusted: true,
      totalSongs: songs.length,
      keptSongs: totalKept
    };
  } catch (error) {
    logger.error('解約時の楽曲調整中にエラーが発生しました:', {
      error,
      userId
    });
    ErrorHandler.handle(error, 'adjustMyLibrarySongsOnDowngrade', false);
    return { adjusted: false, totalSongs: 0, keptSongs: 0 };
  }
};

/**
 * 各楽器ごとに最新の目標のshow_on_calendarをtrueにする（1つだけ）
 * 
 * 処理フロー:
 * 1. 目標を楽器IDごとにグループ化
 * 2. 各グループでcreated_atが最新の目標を1つ選択
 * 3. 選択された目標のshow_on_calendarをtrueに設定
 * 4. 他の目標のshow_on_calendarはfalseのまま（既存の状態を保持）
 * 
 * 注意: カレンダー表示は各楽器ごとに1つだけ表示される
 * 
 * @param userId ユーザーID
 * @param goals 目標の配列（型安全性のため明示的に型を指定）
 */
async function ensureOneGoalPerInstrumentVisible(
  userId: string,
  goals: Array<{
    id: string;
    instrument_id?: string | null;
    created_at?: string;
    show_on_calendar?: boolean;
  }>
): Promise<void> {
  try {
    // 楽器IDごとにグループ化（Mapを使用して効率的に管理）
    // 型安全性のため明示的に型を指定（any型を回避）
    interface GoalForCalendar {
      id: string;
      instrument_id?: string | null;
      created_at?: string;
      show_on_calendar?: boolean;
    }
    const goalsByInstrument = new Map<string | null, GoalForCalendar[]>();
    
    for (const goal of goals) {
      const instrumentId = goal.instrument_id || null;
      if (!goalsByInstrument.has(instrumentId)) {
        goalsByInstrument.set(instrumentId, []);
      }
      goalsByInstrument.get(instrumentId)!.push(goal);
    }

    // 各楽器ごとに最新の目標のshow_on_calendarをtrueにする
    // 注意: 各楽器ごとに1つだけカレンダーに表示される
    for (const [instrumentId, instrumentGoals] of goalsByInstrument) {
      // created_atでソート（最新順 - FIFOアプローチ）
      // 注意: created_atがnullの場合は0として扱う（古い目標として扱う）
      const sorted = [...instrumentGoals].sort((a: GoalForCalendar, b: GoalForCalendar) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA; // 降順（新しい順）
      });

      // 最新の目標のshow_on_calendarをtrueにする（既にtrueの場合はスキップ）
      // 注意: 最新の目標のみがカレンダーに表示される（他の目標はfalseのまま）
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
 * 処理フロー:
 * 1. Premiumユーザーは無制限（早期リターン）
 * 2. 既存の曲数を取得（楽器IDでフィルタリング）
 * 3. instrument_idカラムが存在しない場合、カラムなしで再試行（レガシーデータ対応）
 * 4. TypeScript側で楽器IDでフィルタリング（データベース側でフィルタリングできない場合のフォールバック）
 * 5. 制限値をチェック（各楽器ごとに10個まで）
 * 
 * 注意: 各楽器ごとに10個までの制限を適用（楽器数を掛け算しない）
 * 注意: instrument_idカラムが存在しない場合は、すべての曲をカウント（レガシーデータ対応）
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

    // 各楽器ごとに10個まで（楽器数で掛け算しない）
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

    // TypeScript側で楽器IDでフィルタリング（データベース側でフィルタリングできない場合のフォールバック）
    // 型安全性のため明示的に型を指定（any型を回避）
    interface SongWithInstrumentId {
      id: string;
      instrument_id?: string | null;
    }
    let filteredSongs: SongWithInstrumentId[] = (allSongs as SongWithInstrumentId[]) || [];
    
    if (instrumentId !== undefined && instrumentId !== null) {
      // 楽器IDが指定されている場合、その楽器IDに一致する曲のみをカウント
      // instrument_idがnullの曲は含めない（楽器が選択されている場合は、その楽器の曲のみをカウント）
      filteredSongs = filteredSongs.filter((song: SongWithInstrumentId) => 
        song.instrument_id === instrumentId
      );
    } else if (instrumentId === null) {
      // instrumentIdがnullの場合は、instrument_idがnullの曲のみをカウント（レガシーデータ対応）
      filteredSongs = filteredSongs.filter((song: SongWithInstrumentId) => song.instrument_id === null);
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
