/**
 * ユーザー設定管理サービスの実装
 * 
 * ユーザー設定関連のビジネスロジックを提供
 */

import {
  getUserSettings,
  saveUserSettings,
  saveLanguageSetting,
  getLanguageSetting,
} from '@/repositories/userSettingsRepository';
import { safeServiceExecute, ServiceResult } from './baseService';
import logger from '@/lib/logger';

const SERVICE_CONTEXT = 'userSettingsService';

/**
 * ユーザー設定サービス
 */
export class UserSettingsService {
  /**
   * ユーザー設定を取得
   */
  async getSettings(userId: string): Promise<ServiceResult<any>> {
    return safeServiceExecute(
      async () => {
        logger.debug(`[${SERVICE_CONTEXT}] getSettings:start`, { userId });
        const result = await getUserSettings(userId);
        
        if (result.error) {
          throw result.error;
        }
        
        logger.debug(`[${SERVICE_CONTEXT}] getSettings:success`);
        return result.data;
      },
      `${SERVICE_CONTEXT}.getSettings`,
      'SETTINGS_FETCH_ERROR'
    );
  }

  /**
   * ユーザー設定を保存
   */
  async saveSettings(
    userId: string,
    settings: Partial<{
      language: 'ja' | 'en';
      theme: 'light' | 'dark' | 'auto';
      notifications_enabled: boolean;
      practice_reminder_enabled: boolean;
      practice_reminder_time: string;
    }>
  ): Promise<ServiceResult<void>> {
    return safeServiceExecute(
      async () => {
        logger.debug(`[${SERVICE_CONTEXT}] saveSettings:start`, { userId, settings });
        const result = await saveUserSettings(userId, settings);
        
        if (result.error) {
          throw result.error;
        }
        
        logger.info(`[${SERVICE_CONTEXT}] saveSettings:success`);
      },
      `${SERVICE_CONTEXT}.saveSettings`,
      'SETTINGS_SAVE_ERROR'
    );
  }

  /**
   * 言語設定を保存
   */
  async saveLanguage(
    userId: string,
    language: 'ja' | 'en'
  ): Promise<ServiceResult<void>> {
    return safeServiceExecute(
      async () => {
        logger.debug(`[${SERVICE_CONTEXT}] saveLanguage:start`, { userId, language });
        const result = await saveLanguageSetting(userId, language);
        
        if (result.error) {
          throw result.error;
        }
        
        logger.info(`[${SERVICE_CONTEXT}] saveLanguage:success`);
      },
      `${SERVICE_CONTEXT}.saveLanguage`,
      'LANGUAGE_SAVE_ERROR'
    );
  }

  /**
   * 言語設定を取得
   */
  async getLanguage(userId: string): Promise<ServiceResult<'ja' | 'en'>> {
    return safeServiceExecute(
      async () => {
        logger.debug(`[${SERVICE_CONTEXT}] getLanguage:start`, { userId });
        const result = await getLanguageSetting(userId);
        
        if (result.error) {
          throw result.error;
        }
        
        logger.debug(`[${SERVICE_CONTEXT}] getLanguage:success`);
        return result.data || 'ja';
      },
      `${SERVICE_CONTEXT}.getLanguage`,
      'LANGUAGE_FETCH_ERROR'
    );
  }
}

// シングルトンインスタンスをエクスポート
export const userSettingsService = new UserSettingsService();

