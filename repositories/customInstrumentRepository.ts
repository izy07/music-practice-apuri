import { supabase } from '@/lib/supabase';
import logger from '@/lib/logger';
import { safeExecute, RepositoryResult } from '@/lib/repositoryHelpers';

const REPOSITORY_CONTEXT = 'customInstrumentRepository';

export interface CustomInstrument {
  id: string;
  user_id: string;
  instrument_name: string;
  instrument_id: string;
  created_at: string;
  updated_at: string;
}

/**
 * ユーザーのカスタム楽器一覧を取得
 */
export const getCustomInstruments = async (userId: string): Promise<RepositoryResult<CustomInstrument[]>> => {
  return safeExecute(
    async () => {
      logger.debug(`[${REPOSITORY_CONTEXT}] getCustomInstruments:start`, { userId });
      
      const { data, error } = await supabase
        .from('user_custom_instruments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      logger.debug(`[${REPOSITORY_CONTEXT}] getCustomInstruments:success`, { count: data?.length || 0 });
      return data || [];
    },
    `${REPOSITORY_CONTEXT}.getCustomInstruments`
  );
};

/**
 * カスタム楽器を作成
 */
export const createCustomInstrument = async (
  userId: string,
  instrumentName: string
): Promise<RepositoryResult<CustomInstrument>> => {
  return safeExecute(
    async () => {
      logger.debug(`[${REPOSITORY_CONTEXT}] createCustomInstrument:start`, { userId, instrumentName });
      
      const instrumentId = crypto.randomUUID();
      
      const { data, error } = await supabase
        .from('user_custom_instruments')
        .insert({
          user_id: userId,
          instrument_name: instrumentName,
          instrument_id: instrumentId,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      logger.debug(`[${REPOSITORY_CONTEXT}] createCustomInstrument:success`, { id: data.id });
      return data;
    },
    `${REPOSITORY_CONTEXT}.createCustomInstrument`
  );
};

/**
 * カスタム楽器を削除
 */
export const deleteCustomInstrument = async (
  userId: string,
  customInstrumentId: string
): Promise<RepositoryResult<void>> => {
  return safeExecute(
    async () => {
      logger.debug(`[${REPOSITORY_CONTEXT}] deleteCustomInstrument:start`, { userId, customInstrumentId });
      
      const { error } = await supabase
        .from('user_custom_instruments')
        .delete()
        .eq('user_id', userId)
        .eq('id', customInstrumentId);

      if (error) {
        throw error;
      }

      logger.debug(`[${REPOSITORY_CONTEXT}] deleteCustomInstrument:success`);
    },
    `${REPOSITORY_CONTEXT}.deleteCustomInstrument`
  );
};

/**
 * カスタム楽器のinstrument_idを取得（楽器データ削除時に使用）
 */
export const getCustomInstrumentId = async (
  userId: string,
  customInstrumentId: string
): Promise<RepositoryResult<string | null>> => {
  return safeExecute(
    async () => {
      logger.debug(`[${REPOSITORY_CONTEXT}] getCustomInstrumentId:start`, { userId, customInstrumentId });
      
      const { data, error } = await supabase
        .from('user_custom_instruments')
        .select('instrument_id')
        .eq('user_id', userId)
        .eq('id', customInstrumentId)
        .single();

      if (error) {
        throw error;
      }

      logger.debug(`[${REPOSITORY_CONTEXT}] getCustomInstrumentId:success`, { instrumentId: data?.instrument_id });
      return data?.instrument_id || null;
    },
    `${REPOSITORY_CONTEXT}.getCustomInstrumentId`
  );
};
