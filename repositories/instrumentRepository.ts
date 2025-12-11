/**
 * 楽器（instruments）関連のリポジトリ
 * instrumentsテーブルへのアクセスを集約
 */

import { supabase } from '@/lib/supabase';
import { safeExecute, RepositoryResult } from '@/lib/database/baseRepository';
import logger from '@/lib/logger';
import { practiceDataCache, PracticeDataCache } from '@/lib/cache/practiceDataCache';

const REPOSITORY_CONTEXT = 'instrumentRepository';
const CACHE_KEY_INSTRUMENTS = 'instruments:all';

/**
 * データベースから取得した楽器データの型
 */
export interface InstrumentFromDB {
  id: string;
  name: string;
  name_en: string;
  color_primary?: string;
  color_secondary?: string;
  color_accent?: string;
  starting_note?: string;
  tuning_notes?: string[];
  created_at?: string;
  updated_at?: string;
}

/**
 * すべての楽器を取得
 */
export const getAllInstruments = async (): Promise<RepositoryResult<InstrumentFromDB[]>> => {
  return safeExecute(
    async () => {
      logger.debug(`[${REPOSITORY_CONTEXT}] getAllInstruments:start`);
      
      // キャッシュから取得を試行
      const cached = practiceDataCache.get<InstrumentFromDB[]>(CACHE_KEY_INSTRUMENTS);
      if (cached) {
        logger.debug(`[${REPOSITORY_CONTEXT}] getAllInstruments:cache hit`);
        return cached;
      }
      
      const { data: instruments, error } = await supabase
        .from('instruments')
        .select('id, name, name_en, color_primary, color_secondary, color_accent, starting_note, tuning_notes')
        .order('name', { ascending: true });

      if (error) {
        // RLSポリシーエラーの詳細ログを追加
        if (error.code === '42501' || error.message?.includes('permission denied') || error.message?.includes('row-level security')) {
          logger.warn(`[${REPOSITORY_CONTEXT}] getAllInstruments:RLSポリシーエラー`, {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
          });
          throw error;
        }
        
        // color_backgroundカラムが存在しないエラー（42703）の場合は警告のみ
        if (error.code === '42703' && error.message?.includes('color_background')) {
          logger.warn(`[${REPOSITORY_CONTEXT}] color_backgroundカラムが存在しません。基本カラムのみで処理を続行します。`);
          // 基本カラムのみで再試行
          const { data: retryData, error: retryError } = await supabase
            .from('instruments')
            .select('id, name, name_en, color_primary, color_secondary, color_accent')
            .order('name', { ascending: true });
          
          if (retryError) {
            throw retryError;
          }
          
          return retryData || [];
        }
        
        // その他のエラーの詳細ログ
        logger.warn(`[${REPOSITORY_CONTEXT}] getAllInstruments:エラー`, {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        
        throw error;
      }

      // instrumentsテーブルが空の場合の処理を改善
      if (!instruments || instruments.length === 0) {
        logger.warn(`[${REPOSITORY_CONTEXT}] getAllInstruments:データベースに楽器データが存在しません`);
        return [];
      }
      
      // キャッシュに保存
      practiceDataCache.set(CACHE_KEY_INSTRUMENTS, instruments);
      
      logger.debug(`[${REPOSITORY_CONTEXT}] getAllInstruments:success`, { count: instruments.length });
      return instruments;
    },
    `${REPOSITORY_CONTEXT}.getAllInstruments`
  );
};

/**
 * IDで楽器を取得
 */
export const getInstrumentById = async (
  instrumentId: string
): Promise<RepositoryResult<InstrumentFromDB | null>> => {
  return safeExecute(
    async () => {
      logger.debug(`[${REPOSITORY_CONTEXT}] getInstrumentById:start`, { instrumentId });
      
      const { data: instrument, error } = await supabase
        .from('instruments')
        .select('id, name, name_en, color_primary, color_secondary, color_accent, starting_note, tuning_notes')
        .eq('id', instrumentId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      logger.debug(`[${REPOSITORY_CONTEXT}] getInstrumentById:success`);
      return instrument;
    },
    `${REPOSITORY_CONTEXT}.getInstrumentById`
  );
};

/**
 * 複数のIDで楽器を取得
 */
export const getInstrumentsByIds = async (
  instrumentIds: string[]
): Promise<RepositoryResult<InstrumentFromDB[]>> => {
  return safeExecute(
    async () => {
      logger.debug(`[${REPOSITORY_CONTEXT}] getInstrumentsByIds:start`, { count: instrumentIds.length });
      
      if (instrumentIds.length === 0) {
        return [];
      }
      
      const { data: instruments, error } = await supabase
        .from('instruments')
        .select('id, name, name_en, color_primary, color_secondary, color_accent, starting_note, tuning_notes')
        .in('id', instrumentIds)
        .order('name', { ascending: true });

      if (error) {
        throw error;
      }

      logger.debug(`[${REPOSITORY_CONTEXT}] getInstrumentsByIds:success`, { count: instruments?.length || 0 });
      return instruments || [];
    },
    `${REPOSITORY_CONTEXT}.getInstrumentsByIds`
  );
};

// 後方互換性のためのエクスポート
export const instrumentRepository = {
  getAllInstruments,
  getInstrumentById,
  getInstrumentsByIds,
};

export default instrumentRepository;

