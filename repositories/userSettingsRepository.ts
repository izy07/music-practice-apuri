/**
 * ユーザー設定リポジトリ
 * user_settingsテーブルへのアクセスを集約
 */

import { supabase } from '@/lib/supabase';
import { safeExecute, RepositoryResult } from '@/lib/database/baseRepository';
import logger from '@/lib/logger';

const REPOSITORY_CONTEXT = 'userSettingsRepository';

export interface TunerSettings {
  reference_pitch?: number;
  temperament?: string;
  volume?: number;
  a4Frequency?: number;
  sensitivity?: number;
  responseSpeed?: number;
  smoothing?: number;
  toleranceRange?: number;
  referenceToneVolume?: number;
}

export interface UserSettings {
  user_id: string;
  language?: 'ja' | 'en';
  theme?: 'light' | 'dark' | 'auto';
  notifications_enabled?: boolean;
  practice_reminder_enabled?: boolean;
  practice_reminder_time?: string;
  tuner_settings?: TunerSettings | null;
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

      // 406エラー（Not Acceptable）はRLSポリシーの問題または認証状態の問題
      // レコードが存在しないものとして扱い、デフォルト値を返す
      if (error) {
        if (error.code === 'PGRST116' || error.code === 'PGRST205') {
          // レコードが存在しない場合はnullを返す（エラーではない）
          logger.debug(`[${REPOSITORY_CONTEXT}] getUserSettings:レコードが存在しません`);
          return null;
        } else if (error.status === 406 || error.message?.includes('406') || error.message?.includes('Not Acceptable')) {
          // 406エラーの場合はRLSポリシーまたは認証状態の問題
          // レコードが存在しないものとして扱い、デフォルト値を返す
          logger.warn(`[${REPOSITORY_CONTEXT}] getUserSettings:406エラー - RLSポリシーまたは認証状態の問題。デフォルト値を使用します。`, {
            userId,
            error: {
              code: error.code,
              message: error.message,
              status: error.status
            }
          });
          return null;
        } else {
          throw error;
        }
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
      
      // まず既存のレコードを確認
      const { data: existing } = await supabase
        .from('user_settings')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();

      let data;
      if (existing) {
        // 既存レコードがある場合は更新
        const { data: updateData, error: updateError } = await supabase
          .from('user_settings')
          .update({
            ...settings,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }
        data = updateData;
      } else {
        // レコードがない場合は挿入
        const { data: insertData, error: insertError } = await supabase
          .from('user_settings')
          .insert({
            user_id: userId,
            ...settings,
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (insertError) {
          throw insertError;
        }
        data = insertData;
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

      // 406エラー（Not Acceptable）はRLSポリシーの問題または認証状態の問題
      // レコードが存在しないものとして扱い、デフォルト値'ja'を返す
      if (error) {
        if (error.code === 'PGRST116' || error.code === 'PGRST205') {
          // レコードが存在しない場合は'ja'をデフォルトとして返す
          logger.debug(`[${REPOSITORY_CONTEXT}] getLanguageSetting:レコードが存在しません。デフォルト値'ja'を返します。`);
          return 'ja' as 'ja' | 'en';
        } else if (error.status === 406 || error.message?.includes('406') || error.message?.includes('Not Acceptable')) {
          // 406エラーの場合はRLSポリシーまたは認証状態の問題
          // レコードが存在しないものとして扱い、デフォルト値'ja'を返す
          logger.warn(`[${REPOSITORY_CONTEXT}] getLanguageSetting:406エラー - RLSポリシーまたは認証状態の問題。デフォルト値'ja'を使用します。`, {
            userId,
            error: {
              code: error.code,
              message: error.message,
              status: error.status
            }
          });
          return 'ja' as 'ja' | 'en';
        } else {
          throw error;
        }
      }

      const language = (data?.language || 'ja') as 'ja' | 'en';
      logger.debug(`[${REPOSITORY_CONTEXT}] getLanguageSetting:success`, { language });
      return language;
    },
    `${REPOSITORY_CONTEXT}.getLanguageSetting`
  );
};

