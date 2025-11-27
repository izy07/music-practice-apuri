/**
 * チュートリアル管理サービスの実装
 * 
 * チュートリアル進捗関連のビジネスロジックを提供
 */

import {
  getTutorialProgress,
  saveTutorialProgress,
  markTutorialCompleted,
} from '@/repositories/tutorialRepository';
import { safeServiceExecute, ServiceResult } from './baseService';
import logger from '@/lib/logger';

const SERVICE_CONTEXT = 'tutorialService';

/**
 * チュートリアルサービス
 */
export class TutorialService {
  /**
   * チュートリアル進捗を取得
   */
  async getProgress(userId: string): Promise<ServiceResult<any>> {
    return safeServiceExecute(
      async () => {
        logger.debug(`[${SERVICE_CONTEXT}] getProgress:start`, { userId });
        const result = await getTutorialProgress(userId);
        
        if (result.error) {
          throw result.error;
        }
        
        logger.debug(`[${SERVICE_CONTEXT}] getProgress:success`);
        return result.data;
      },
      `${SERVICE_CONTEXT}.getProgress`,
      'TUTORIAL_FETCH_ERROR'
    );
  }

  /**
   * チュートリアル進捗を保存
   */
  async saveProgress(
    userId: string,
    progress: Partial<{
      completed_steps: string[];
      is_completed: boolean;
      current_step: number;
    }>
  ): Promise<ServiceResult<void>> {
    return safeServiceExecute(
      async () => {
        logger.debug(`[${SERVICE_CONTEXT}] saveProgress:start`, { userId, progress });
        const result = await saveTutorialProgress(userId, progress);
        
        if (result.error) {
          throw result.error;
        }
        
        logger.info(`[${SERVICE_CONTEXT}] saveProgress:success`);
      },
      `${SERVICE_CONTEXT}.saveProgress`,
      'TUTORIAL_SAVE_ERROR'
    );
  }

  /**
   * チュートリアルを完了としてマーク
   */
  async markCompleted(userId: string): Promise<ServiceResult<void>> {
    return safeServiceExecute(
      async () => {
        logger.debug(`[${SERVICE_CONTEXT}] markCompleted:start`, { userId });
        const result = await markTutorialCompleted(userId);
        
        if (result.error) {
          throw result.error;
        }
        
        logger.info(`[${SERVICE_CONTEXT}] markCompleted:success`);
      },
      `${SERVICE_CONTEXT}.markCompleted`,
      'TUTORIAL_COMPLETE_ERROR'
    );
  }
}

// シングルトンインスタンスをエクスポート
export const tutorialService = new TutorialService();

