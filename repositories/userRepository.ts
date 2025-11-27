/**
 * ユーザープロフィールリポジトリ
 * user_profilesテーブルへのアクセスを集約
 */

import { supabase } from '@/lib/supabase';
import { safeExecute, createResult, RepositoryResult } from '@/lib/database/baseRepository';
import logger from '@/lib/logger';

const REPOSITORY_CONTEXT = 'userRepository';

export interface UserProfile {
  user_id: string;
  display_name?: string;
  avatar_url?: string;
  practice_level?: string;
  selected_instrument_id?: string;
  organization?: string;
  nickname?: string;
  bio?: string;
  birthday?: string;
  current_age?: number;
  music_start_age?: number;
  music_experience_years?: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * ユーザープロフィールを取得
 */
export const getUserProfile = async (
  userId: string
): Promise<RepositoryResult<UserProfile | null>> => {
  return safeExecute(
    async () => {
      logger.debug(`[${REPOSITORY_CONTEXT}] getUserProfile:start`, { userId });
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      logger.debug(`[${REPOSITORY_CONTEXT}] getUserProfile:success`);
      return data;
    },
    `${REPOSITORY_CONTEXT}.getUserProfile`
  );
};

/**
 * ユーザープロフィールを更新または作成
 */
export const upsertUserProfile = async (
  profile: Partial<UserProfile>
): Promise<RepositoryResult<UserProfile | null>> => {
  return safeExecute(
    async () => {
      logger.debug(`[${REPOSITORY_CONTEXT}] upsertUserProfile:start`, { profile });
      
      const { data, error } = await supabase
        .from('user_profiles')
        .upsert(
          {
            ...profile,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
        .select()
        .single();

      if (error) {
        throw error;
      }

      logger.debug(`[${REPOSITORY_CONTEXT}] upsertUserProfile:success`);
      return data;
    },
    `${REPOSITORY_CONTEXT}.upsertUserProfile`
  );
};

/**
 * 練習レベルを更新
 */
export const updatePracticeLevel = async (
  userId: string,
  level: string
): Promise<RepositoryResult<void>> => {
  return safeExecute(
    async () => {
      logger.debug(`[${REPOSITORY_CONTEXT}] updatePracticeLevel:start`, { userId, level });
      
      const { error } = await supabase
        .from('user_profiles')
        .update({
          practice_level: level,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      logger.debug(`[${REPOSITORY_CONTEXT}] updatePracticeLevel:success`);
    },
    `${REPOSITORY_CONTEXT}.updatePracticeLevel`
  );
};

/**
 * アバターURLを更新
 */
export const updateAvatarUrl = async (
  userId: string,
  url: string
): Promise<RepositoryResult<void>> => {
  return safeExecute(
    async () => {
      logger.debug(`[${REPOSITORY_CONTEXT}] updateAvatarUrl:start`, { userId, url });
      
      const { error } = await supabase
        .from('user_profiles')
        .upsert(
          {
            user_id: userId,
            avatar_url: url,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      if (error) {
        throw error;
      }

      logger.debug(`[${REPOSITORY_CONTEXT}] updateAvatarUrl:success`);
    },
    `${REPOSITORY_CONTEXT}.updateAvatarUrl`
  );
};

/**
 * 選択楽器IDを更新
 */
export const updateSelectedInstrument = async (
  userId: string,
  instrumentId: string | null
): Promise<RepositoryResult<void>> => {
  return safeExecute(
    async () => {
      logger.debug(`[${REPOSITORY_CONTEXT}] updateSelectedInstrument:start`, { userId, instrumentId });
      
      // instrument_idが存在するか確認（nullの場合はスキップ）
      if (instrumentId) {
        const { data: instrumentExists, error: checkError } = await supabase
          .from('instruments')
          .select('id')
          .eq('id', instrumentId)
          .maybeSingle();
        
        if (checkError) {
          logger.error(`[${REPOSITORY_CONTEXT}] updateSelectedInstrument:checkError`, checkError);
          throw checkError;
        }
        
        if (!instrumentExists) {
          const error = new Error(`楽器ID ${instrumentId} が存在しません`);
          logger.error(`[${REPOSITORY_CONTEXT}] updateSelectedInstrument:invalidInstrumentId`, { instrumentId });
          throw error;
        }
      }
      
      const { error } = await supabase
        .from('user_profiles')
        .update({
          selected_instrument_id: instrumentId,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      logger.debug(`[${REPOSITORY_CONTEXT}] updateSelectedInstrument:success`);
    },
    `${REPOSITORY_CONTEXT}.updateSelectedInstrument`
  );
};

// 後方互換性のためのエクスポート
export const userRepository = {
  getProfile: getUserProfile,
  upsertProfile: upsertUserProfile,
  updatePracticeLevel,
  updateAvatarUrl,
};

export default userRepository;


