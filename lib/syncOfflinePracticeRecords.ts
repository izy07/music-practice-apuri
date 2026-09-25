import logger from '@/lib/logger';
import { OfflineStorage, isOnline } from '@/lib/offlineStorage';
import { savePracticeSessionWithIntegration } from '@/repositories/practiceSessionRepository';
import { ErrorHandler } from '@/lib/errorHandler';

type OfflinePracticeRecord = {
  id: string;
  user_id: string;
  practice_date: string;
  duration_minutes: number;
  content?: string;
  audio_url?: string;
  video_url?: string;
  input_method?: string;
  instrument_id?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  is_synced?: boolean;
};

/**
 * オフライン保存された練習記録をサーバーへ同期する。
 * 目標と同様、オンライン復帰時に呼び出す。
 */
export async function syncOfflinePracticeRecords(userId: string): Promise<{
  synced: number;
  failed: number;
  skipped: number;
}> {
  const result = { synced: 0, failed: 0, skipped: 0 };

  if (!isOnline()) {
    return result;
  }

  try {
    const records = (await OfflineStorage.getPracticeRecords()) as OfflinePracticeRecord[];
    const unsynced = records.filter(
      (r) => r.user_id === userId && r.is_synced === false && !!r.id
    );

    if (unsynced.length === 0) {
      return result;
    }

    logger.debug(`未同期の練習記録を同期します: ${unsynced.length}件`);

    for (const record of unsynced) {
      try {
        const saveResult = await savePracticeSessionWithIntegration(
          userId,
          record.duration_minutes,
          {
            instrumentId: record.instrument_id ?? null,
            content: record.content,
            inputMethod: (['manual', 'preset', 'voice', 'timer'].includes(record.input_method || '')
              ? record.input_method
              : 'manual') as 'manual' | 'preset' | 'voice' | 'timer',
            practiceDate: record.practice_date,
            replaceMinutes: true,
            audioUrl: record.audio_url || null,
            videoUrl: record.video_url || null,
            startTime: record.start_time || null,
            endTime: record.end_time || null,
          }
        );

        if (!saveResult.success) {
          result.failed += 1;
          ErrorHandler.handle(
            saveResult.error || new Error('オフライン練習記録の同期に失敗しました'),
            'オフライン練習記録の同期',
            true
          );
          continue;
        }

        await OfflineStorage.markAsSynced(record.id);
        result.synced += 1;
      } catch (error) {
        result.failed += 1;
        ErrorHandler.handle(error, 'オフライン練習記録の同期', true);
        logger.error('練習記録同期エラー:', error);
      }
    }

    logger.debug('オフライン練習記録の同期結果', result);
    return result;
  } catch (error) {
    ErrorHandler.handle(error, 'オフライン練習記録の同期処理', true);
    logger.error('練習記録同期処理エラー:', error);
    return result;
  }
}
