/**
 * ユーザーデータ削除の正式実装（単一の入口）
 *
 * 方針:
 * - UI はここに集約された関数だけを呼ぶ
 * - 失敗は握りつぶさず呼び出し側で表示できるよう error を返す
 * - 経歴は別テーブルではなく user_profiles.instrument_specific_data に保存する
 */

import { supabase } from '@/lib/supabase';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import { safeExecute, RepositoryResult } from '@/lib/database/baseRepository';
import { getInstrumentSpecificProfileData, saveInstrumentSpecificProfileData } from '@/repositories/userRepository';

const CONTEXT = 'deletionRepository';

const PROFILE_CLEAR_FULL = {
  display_name: null as string | null,
  instrument_specific_data: {} as Record<string, unknown>,
  birthday: null as string | null,
  organization: null as string | null,
  current_organization: null as string | null,
  current_age: null as number | null,
  music_start_age: null as number | null,
  music_experience_years: null as number | null,
  custom_instrument_name: null as string | null,
};

const PROFILE_CLEAR_BASE = {
  display_name: null as string | null,
  instrument_specific_data: {} as Record<string, unknown>,
};

const INSTRUMENT_SCOPED_TABLES = [
  'recordings',
  'goals',
  'my_songs',
  'practice_sessions',
  'events',
] as const;

function isMissingRelationError(error: unknown): boolean {
  const e = error as { code?: string; message?: string };
  const message = (e?.message || '').toLowerCase();
  return (
    e?.code === 'PGRST205' ||
    e?.code === 'PGRST116' ||
    e?.code === '42P01' ||
    e?.code === '42703' ||
    e?.code === 'PGRST204' ||
    (message.includes('column') && message.includes('does not exist')) ||
    message.includes('could not find the table') ||
    message.includes('does not exist')
  );
}

/**
 * 1. 録音削除（DB行 + Storage）
 */
export async function deleteRecordingComplete(
  recordingId: string
): Promise<RepositoryResult<{ storageDeleted: boolean }>> {
  return safeExecute(
    async () => {
      logger.debug(`[${CONTEXT}] deleteRecordingComplete:start`, { recordingId });

      const { data: recording, error: fetchError } = await supabase
        .from('recordings')
        .select('id, file_path, user_id')
        .eq('id', recordingId)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!recording) {
        throw new Error('削除対象の録音が見つかりません');
      }

      const { error: deleteError } = await supabase
        .from('recordings')
        .delete()
        .eq('id', recordingId);

      if (deleteError) throw deleteError;

      let storageDeleted = true;
      const path = recording.file_path?.trim() || '';
      if (path && !path.startsWith('http') && !path.startsWith('blob:') && !path.startsWith('data:')) {
        const { error: storageError } = await supabase.storage
          .from('recordings')
          .remove([path]);
        if (storageError) {
          storageDeleted = false;
          logger.error(`[${CONTEXT}] Storage削除失敗（DB行は削除済み）`, storageError);
          // DBは消えているので部分失敗として呼び出し側に返す
          throw new Error(
            `録音メタデータは削除しましたが、音声ファイルの削除に失敗しました: ${storageError.message}`
          );
        }
      }

      logger.debug(`[${CONTEXT}] deleteRecordingComplete:success`, { storageDeleted });
      return { storageDeleted };
    },
    `${CONTEXT}.deleteRecordingComplete`
  );
}

/**
 * 2. プロフィール情報クリア（アカウントは残す）
 */
export async function clearUserProfile(
  userId: string
): Promise<RepositoryResult<void>> {
  return safeExecute(
    async () => {
      logger.debug(`[${CONTEXT}] clearUserProfile:start`, { userId });

      const fullPayload = {
        ...PROFILE_CLEAR_FULL,
        updated_at: new Date().toISOString(),
      };

      const { error: fullError } = await supabase
        .from('user_profiles')
        .update(fullPayload)
        .eq('user_id', userId);

      if (fullError && isMissingRelationError(fullError)) {
        const { error: baseError } = await supabase
          .from('user_profiles')
          .update({
            ...PROFILE_CLEAR_BASE,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);
        if (baseError) throw baseError;
      } else if (fullError) {
        throw fullError;
      }

      logger.debug(`[${CONTEXT}] clearUserProfile:success`);
    },
    `${CONTEXT}.clearUserProfile`
  );
}

export type CareerDataPayload = {
  pastOrganizationsUi: Array<{ id?: string; name: string; startYm?: string; endYm?: string }>;
  awardsUi: Array<{ id?: string; title: string; dateYm?: string; result?: string }>;
  performancesUi: Array<{ id?: string; title: string }>;
  breakPeriodsUi: Array<{ id?: string; startDate: string; endDate: string; reason: string }>;
};

/**
 * 3. 経歴・実績を instrument_specific_data に保存（削除含む）
 */
export async function persistInstrumentCareerData(
  userId: string,
  instrumentId: string,
  career: CareerDataPayload,
  extraInstrumentFields?: Record<string, unknown>
): Promise<RepositoryResult<void>> {
  return safeExecute(
    async () => {
      logger.debug(`[${CONTEXT}] persistInstrumentCareerData:start`, { userId, instrumentId });

      const existingResult = await getInstrumentSpecificProfileData(userId, instrumentId);
      if (existingResult.error) throw existingResult.error;
      const existingData = existingResult.data || {};

      const updated = {
        ...existingData,
        ...extraInstrumentFields,
        career_data: {
          pastOrganizationsUi: career.pastOrganizationsUi.filter((o) => o.name.trim() !== ''),
          awardsUi: career.awardsUi.filter((a) => a.title.trim() !== ''),
          performancesUi: career.performancesUi.filter((p) => p.title.trim() !== ''),
          breakPeriodsUi: career.breakPeriodsUi,
        },
      };

      const saveResult = await saveInstrumentSpecificProfileData(userId, instrumentId, updated);
      if (saveResult.error) throw saveResult.error;

      logger.debug(`[${CONTEXT}] persistInstrumentCareerData:success`);
    },
    `${CONTEXT}.persistInstrumentCareerData`
  );
}

/**
 * 4. 楽器スコープのデータ削除（録音・目標・練習・イベント・マイソング）
 * includeLegacyNull: 使用楽器が1つのときのみ null 紐付け行も含める
 */
export async function deleteInstrumentScopedData(
  userId: string,
  instrumentId: string,
  options?: { includeLegacyNull?: boolean }
): Promise<RepositoryResult<{ failedTables: string[] }>> {
  return safeExecute(
    async () => {
      logger.debug(`[${CONTEXT}] deleteInstrumentScopedData:start`, {
        userId,
        instrumentId,
        includeLegacyNull: options?.includeLegacyNull,
      });

      const failedTables: string[] = [];
      const includeLegacyNull = !!options?.includeLegacyNull;

      // 録音は Storage も消すため先にパスを取得
      let recordingQuery = supabase
        .from('recordings')
        .select('id, file_path')
        .eq('user_id', userId);
      recordingQuery = includeLegacyNull
        ? recordingQuery.or(`instrument_id.eq.${instrumentId},instrument_id.is.null`)
        : recordingQuery.eq('instrument_id', instrumentId);

      const { data: recordings, error: listError } = await recordingQuery;
      if (listError && !isMissingRelationError(listError)) {
        throw listError;
      }

      const storagePaths = (recordings || [])
        .map((r) => r.file_path)
        .filter((p): p is string => !!p && !p.startsWith('http') && !p.startsWith('blob:') && !p.startsWith('data:'));

      for (const table of INSTRUMENT_SCOPED_TABLES) {
        let query = supabase.from(table).delete().eq('user_id', userId);
        query = includeLegacyNull
          ? query.or(`instrument_id.eq.${instrumentId},instrument_id.is.null`)
          : query.eq('instrument_id', instrumentId);

        const { error } = await query;
        if (error && !isMissingRelationError(error)) {
          logger.error(`[${CONTEXT}] ${table} 削除失敗`, error);
          failedTables.push(table);
        }
      }

      if (storagePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('recordings')
          .remove(storagePaths);
        if (storageError) {
          logger.error(`[${CONTEXT}] 楽器スコープ Storage削除失敗`, storageError);
          failedTables.push('storage:recordings');
        }
      }

      // instrument_specific_data から当該楽器キーを除去
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('instrument_specific_data')
        .eq('user_id', userId)
        .maybeSingle();

      if (!profileError && profile?.instrument_specific_data) {
        const data = { ...(profile.instrument_specific_data as Record<string, unknown>) };
        if (instrumentId in data) {
          delete data[instrumentId];
          const { error: updateError } = await supabase
            .from('user_profiles')
            .update({
              instrument_specific_data: data,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId);
          if (updateError) {
            failedTables.push('user_profiles.instrument_specific_data');
          }
        }
      }

      if (failedTables.length > 0) {
        throw new Error(
          `楽器データの一部削除に失敗しました: ${failedTables.join(', ')}`
        );
      }

      logger.debug(`[${CONTEXT}] deleteInstrumentScopedData:success`);
      return { failedTables };
    },
    `${CONTEXT}.deleteInstrumentScopedData`
  );
}

/**
 * 5. アカウント削除（RPC）
 */
export async function deleteUserAccount(): Promise<RepositoryResult<void>> {
  return safeExecute(
    async () => {
      logger.debug(`[${CONTEXT}] deleteUserAccount:start`);
      const { error } = await supabase.rpc('delete_user_account');
      if (error) {
        throw new Error(error.message || 'アカウント削除に失敗しました');
      }
      logger.debug(`[${CONTEXT}] deleteUserAccount:success`);
    },
    `${CONTEXT}.deleteUserAccount`
  );
}

/**
 * 呼び出し側でエラーをユーザー表示するヘルパー
 */
export function reportDeletionError(error: unknown, context: string): void {
  ErrorHandler.handle(error, context, true);
}

export const deletionRepository = {
  deleteRecordingComplete,
  clearUserProfile,
  persistInstrumentCareerData,
  deleteInstrumentScopedData,
  deleteUserAccount,
  reportDeletionError,
};
