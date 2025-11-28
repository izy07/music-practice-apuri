/**
 * ユーザープロフィールリポジトリ
 * user_profilesテーブルへのアクセスを集約
 */

import { supabase } from '@/lib/supabase';
import { safeExecute, createResult, RepositoryResult } from '@/lib/database/baseRepository';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';

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

/**
 * ユーザープロフィールの特定フィールドを取得
 */
export const getUserProfileFields = async (
  userId: string,
  fields: string | string[]
): Promise<any> => {
  const fieldArray = Array.isArray(fields) ? fields : [fields];
  const result = await getUserProfile(userId);
  
  if (!result.success || !result.data) {
    return null;
  }
  
  const data: any = {};
  fieldArray.forEach(field => {
    data[field] = (result.data as any)[field];
  });
  
  return fieldArray.length === 1 ? data[fieldArray[0]] : data;
};

/**
 * ユーザープロフィールを更新
 */
export const updateUserProfile = async (
  userId: string,
  updates: Partial<UserProfile>
): Promise<boolean> => {
  // selected_instrument_idが含まれている場合は、存在確認を実行
  if (updates.selected_instrument_id !== undefined && updates.selected_instrument_id !== null) {
    const instrumentId = updates.selected_instrument_id;
    
    // その他楽器のIDの場合はスキップ
    if (instrumentId !== '550e8400-e29b-41d4-a716-446655440016') {
      const { data: instrumentExists, error: checkError } = await supabase
        .from('instruments')
        .select('id')
        .eq('id', instrumentId)
        .maybeSingle();
      
      if (checkError) {
        logger.error(`[${REPOSITORY_CONTEXT}] updateUserProfile:instrumentCheckError`, checkError);
        ErrorHandler.handle(checkError, '楽器ID確認', false);
        return false;
      }
      
      if (!instrumentExists) {
        logger.error(`[${REPOSITORY_CONTEXT}] updateUserProfile:invalidInstrumentId`, { instrumentId });
        ErrorHandler.handle(new Error(`楽器ID ${instrumentId} が存在しません`), '楽器ID確認', false);
        return false;
      }
    }
  }
  
  const result = await safeExecute(
    async () => {
      logger.debug(`[${REPOSITORY_CONTEXT}] updateUserProfile:start`, { userId, updates });
      
      const { error } = await supabase
        .from('user_profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
      
      if (error) {
        throw error;
      }
      
      logger.debug(`[${REPOSITORY_CONTEXT}] updateUserProfile:success`);
    },
    `${REPOSITORY_CONTEXT}.updateUserProfile`
  );
  
  return result.error === null;
};

/**
 * 現在のユーザーを取得
 */
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return null;
  }
  return user;
};

/**
 * ユーザーの休止期間を削除
 */
export const deleteBreakPeriod = async (
  breakPeriodId: string
): Promise<RepositoryResult<void>> => {
  return safeExecute(
    async () => {
      logger.debug(`[${REPOSITORY_CONTEXT}] deleteBreakPeriod:start`, { breakPeriodId });
      
      const { error } = await supabase
        .from('user_break_periods')
        .delete()
        .eq('id', breakPeriodId);

      if (error) {
        throw error;
      }

      logger.debug(`[${REPOSITORY_CONTEXT}] deleteBreakPeriod:success`);
    },
    `${REPOSITORY_CONTEXT}.deleteBreakPeriod`
  );
};

/**
 * ユーザーの過去の所属団体を削除
 */
export const deletePastOrganization = async (
  organizationId: string
): Promise<RepositoryResult<void>> => {
  return safeExecute(
    async () => {
      logger.debug(`[${REPOSITORY_CONTEXT}] deletePastOrganization:start`, { organizationId });
      
      const { error } = await supabase
        .from('user_past_organizations')
        .delete()
        .eq('id', organizationId);

      if (error) {
        throw error;
      }

      logger.debug(`[${REPOSITORY_CONTEXT}] deletePastOrganization:success`);
    },
    `${REPOSITORY_CONTEXT}.deletePastOrganization`
  );
};

/**
 * ユーザーの受賞を削除
 */
export const deleteAward = async (
  awardId: string
): Promise<RepositoryResult<void>> => {
  return safeExecute(
    async () => {
      logger.debug(`[${REPOSITORY_CONTEXT}] deleteAward:start`, { awardId });
      
      const { error } = await supabase
        .from('user_awards')
        .delete()
        .eq('id', awardId);

      if (error) {
        throw error;
      }

      logger.debug(`[${REPOSITORY_CONTEXT}] deleteAward:success`);
    },
    `${REPOSITORY_CONTEXT}.deleteAward`
  );
};

/**
 * ユーザーの演奏経験を削除
 */
export const deletePerformance = async (
  performanceId: string
): Promise<RepositoryResult<void>> => {
  return safeExecute(
    async () => {
      logger.debug(`[${REPOSITORY_CONTEXT}] deletePerformance:start`, { performanceId });
      
      const { error } = await supabase
        .from('user_performances')
        .delete()
        .eq('id', performanceId);

      if (error) {
        throw error;
      }

      logger.debug(`[${REPOSITORY_CONTEXT}] deletePerformance:success`);
    },
    `${REPOSITORY_CONTEXT}.deletePerformance`
  );
};

// 後方互換性のためのエクスポート
export const userRepository = {
  getProfile: getUserProfile,
  upsertProfile: upsertUserProfile,
  updatePracticeLevel,
  updateAvatarUrl,
  getCurrentUser,
  deleteBreakPeriod,
  deletePastOrganization,
  deleteAward,
  deletePerformance,
};

export default userRepository;


