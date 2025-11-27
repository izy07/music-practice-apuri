/**
 * 目標管理サービスの実装
 * 
 * ビジネスロジックをリポジトリから分離し、UI層に提供
 * 単一責任の原則に従い、目標関連のビジネスロジックのみを担当
 */

import { goalRepository } from '@/repositories/goalRepository';
import { safeServiceExecute, ServiceResult } from './baseService';
import logger from '@/lib/logger';

const SERVICE_CONTEXT = 'goalService';

/**
 * 目標作成パラメータ
 */
export interface CreateGoalParams {
  title: string;
  description?: string;
  target_date?: string;
  goal_type: 'personal_short' | 'personal_long' | 'group';
  instrument_id?: string | null;
}

/**
 * 目標更新パラメータ
 */
export interface UpdateGoalParams {
  progress_percentage?: number;
  title?: string;
  description?: string;
  target_date?: string;
  show_on_calendar?: boolean;
}

/**
 * 目標サービス
 * 
 * リポジトリ層への依存を抽象化し、ビジネスロジックを提供
 */
export class GoalService {
  /**
   * 目標一覧を取得
   */
  async getGoals(
    userId: string,
    instrumentId?: string | null
  ): Promise<ServiceResult<any[]>> {
    return safeServiceExecute(
      async () => {
        logger.debug(`[${SERVICE_CONTEXT}] getGoals:start`, { userId, instrumentId });
        const goals = await goalRepository.getGoals(userId, instrumentId);
        logger.debug(`[${SERVICE_CONTEXT}] getGoals:success`, { count: goals.length });
        return goals;
      },
      `${SERVICE_CONTEXT}.getGoals`,
      'GOAL_FETCH_ERROR'
    );
  }

  /**
   * 達成済み目標一覧を取得
   */
  async getCompletedGoals(
    userId: string,
    instrumentId?: string | null
  ): Promise<ServiceResult<any[]>> {
    return safeServiceExecute(
      async () => {
        logger.debug(`[${SERVICE_CONTEXT}] getCompletedGoals:start`, { userId, instrumentId });
        const goals = await goalRepository.getCompletedGoals(userId, instrumentId);
        logger.debug(`[${SERVICE_CONTEXT}] getCompletedGoals:success`, { count: goals.length });
        return goals;
      },
      `${SERVICE_CONTEXT}.getCompletedGoals`,
      'GOAL_FETCH_ERROR'
    );
  }

  /**
   * 目標を作成
   */
  async createGoal(
    userId: string,
    params: CreateGoalParams
  ): Promise<ServiceResult<void>> {
    // バリデーション
    if (!params.title || params.title.trim().length === 0) {
      return {
        success: false,
        error: 'タイトルは必須です',
        code: 'VALIDATION_ERROR',
      };
    }

    if (params.title.length > 200) {
      return {
        success: false,
        error: 'タイトルは200文字以内で入力してください',
        code: 'VALIDATION_ERROR',
      };
    }

    return safeServiceExecute(
      async () => {
        logger.debug(`[${SERVICE_CONTEXT}] createGoal:start`, { userId, params });
        await goalRepository.createGoal(userId, params);
        logger.info(`[${SERVICE_CONTEXT}] createGoal:success`, { userId });
      },
      `${SERVICE_CONTEXT}.createGoal`,
      'GOAL_CREATE_ERROR'
    );
  }

  /**
   * 目標の進捗を更新
   */
  async updateProgress(
    goalId: string,
    userId: string,
    progress: number
  ): Promise<ServiceResult<void>> {
    // バリデーション
    if (progress < 0 || progress > 100) {
      return {
        success: false,
        error: '進捗は0-100の範囲で指定してください',
        code: 'VALIDATION_ERROR',
      };
    }

    return safeServiceExecute(
      async () => {
        logger.debug(`[${SERVICE_CONTEXT}] updateProgress:start`, { goalId, progress });
        await goalRepository.updateProgress(goalId, progress, userId);
        logger.info(`[${SERVICE_CONTEXT}] updateProgress:success`, { goalId });
      },
      `${SERVICE_CONTEXT}.updateProgress`,
      'GOAL_UPDATE_ERROR'
    );
  }

  /**
   * 目標を達成としてマーク
   */
  async completeGoal(
    goalId: string,
    userId: string
  ): Promise<ServiceResult<void>> {
    return safeServiceExecute(
      async () => {
        logger.debug(`[${SERVICE_CONTEXT}] completeGoal:start`, { goalId });
        await goalRepository.completeGoal(goalId, userId);
        logger.info(`[${SERVICE_CONTEXT}] completeGoal:success`, { goalId });
      },
      `${SERVICE_CONTEXT}.completeGoal`,
      'GOAL_COMPLETE_ERROR'
    );
  }

  /**
   * 目標を削除
   */
  async deleteGoal(
    goalId: string,
    userId: string
  ): Promise<ServiceResult<void>> {
    return safeServiceExecute(
      async () => {
        logger.debug(`[${SERVICE_CONTEXT}] deleteGoal:start`, { goalId });
        await goalRepository.deleteGoal(goalId, userId);
        logger.info(`[${SERVICE_CONTEXT}] deleteGoal:success`, { goalId });
      },
      `${SERVICE_CONTEXT}.deleteGoal`,
      'GOAL_DELETE_ERROR'
    );
  }

  /**
   * 目標のカレンダー表示を更新
   */
  async updateShowOnCalendar(
    goalId: string,
    userId: string,
    show: boolean
  ): Promise<ServiceResult<void>> {
    return safeServiceExecute(
      async () => {
        logger.debug(`[${SERVICE_CONTEXT}] updateShowOnCalendar:start`, { goalId, show });
        await goalRepository.updateShowOnCalendar(goalId, show, userId);
        logger.info(`[${SERVICE_CONTEXT}] updateShowOnCalendar:success`, { goalId });
      },
      `${SERVICE_CONTEXT}.updateShowOnCalendar`,
      'GOAL_UPDATE_ERROR'
    );
  }
}

// シングルトンインスタンスをエクスポート
export const goalService = new GoalService();

