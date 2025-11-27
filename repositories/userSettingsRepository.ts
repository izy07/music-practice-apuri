/**
 * ユーザー設定リポジトリ
 * user_settingsテーブルへのアクセスを集約
 */

import { supabase } from '@/lib/supabase';
import { safeExecute, RepositoryResult } from '@/lib/database/baseRepository';
import logger from '@/lib/logger';

const REPOSITORY_CONTEXT = 'userSettingsRepository';

export interface UserSettings {
  user_id: string;
  language?: 'ja' | 'en';
  theme?: 'light' | 'dark' | 'auto';
  notifications_enabled?: boolean;
  practice_reminder_enabled?: boolean;
  practice_reminder_time?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * ユーザー設定を取得
 */
export const getUserSettings = async (
  userId: string
): Promise<RepositoryResult<UserSettings | null>> => {
  return safeExecute(
    async () => {
      logger.debug(`[${REPOSITORY_CONTEXT}] getUserSettings:start`, { userId });
      
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      // レコードが存在しない場合はnullを返す（エラーではない）
      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      logger.debug(`[${REPOSITORY_CONTEXT}] getUserSettings:success`);
      return data || null;
    },
    `${REPOSITORY_CONTEXT}.getUserSettings`
  );
};

/**
 * ユーザー設定を保存
 */
export const saveUserSettings = async (
  userId: string,
  settings: Partial<UserSettings>
): Promise<RepositoryResult<UserSettings | null>> => {
  return safeExecute(
    async () => {
      logger.debug(`[${REPOSITORY_CONTEXT}] saveUserSettings:start`, { userId, settings });
      
      const { data, error } = await supabase
        .from('user_settings')
        .upsert(
          {
            user_id: userId,
            ...settings,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
        .select()
        .single();

      if (error) {
        throw error;
      }

      logger.debug(`[${REPOSITORY_CONTEXT}] saveUserSettings:success`);
      return data;
    },
    `${REPOSITORY_CONTEXT}.saveUserSettings`
  );
};

/**
 * 言語設定を保存
 */
export const saveLanguageSetting = async (
  userId: string,
  language: 'ja' | 'en'
): Promise<RepositoryResult<UserSettings | null>> => {
  return saveUserSettings(userId, { language });
};

/**
 * 言語設定を取得
 */
export const getLanguageSetting = async (
  userId: string
): Promise<RepositoryResult<'ja' | 'en'>> => {
  return safeExecute(
    async () => {
      logger.debug(`[${REPOSITORY_CONTEXT}] getLanguageSetting:start`, { userId });
      
      const { data, error } = await supabase
        .from('user_settings')
        .select('language')
        .eq('user_id', userId)
        .maybeSingle();

      // レコードが存在しない場合は'ja'をデフォルトとして返す
      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      const language = (data?.language || 'ja') as 'ja' | 'en';
      logger.debug(`[${REPOSITORY_CONTEXT}] getLanguageSetting:success`, { language });
      return language;
    },
    `${REPOSITORY_CONTEXT}.getLanguageSetting`
  );
};

