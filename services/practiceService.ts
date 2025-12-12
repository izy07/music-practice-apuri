/**
 * 練習記録管理サービスの実装
 * 
 * 練習セッション関連のビジネスロジックを提供
 */

import {
  createPracticeSession,
  getTodayPracticeSessions,
  savePracticeSessionWithIntegration,
  getPracticeSessionsByDate,
  getPracticeSessionsByDateRange,
  PracticeSession,
} from '@/repositories/practiceSessionRepository';
import { safeServiceExecute, ServiceResult } from './baseService';
import logger from '@/lib/logger';

const SERVICE_CONTEXT = 'practiceService';

/**
 * 練習記録作成パラメータ
 */
export interface CreatePracticeParams {
  userId: string;
  minutes: number;
  instrumentId?: string | null;
  content?: string;
  inputMethod?: 'manual' | 'preset' | 'voice' | 'timer';
  practiceDate?: string;
}

/**
 * 練習サービス
 */
export class PracticeService {
  /**
   * 今日の練習記録を取得
   */
  async getTodaySessions(
    userId: string,
    instrumentId?: string | null
  ): Promise<ServiceResult<PracticeSession[]>> {
    return safeServiceExecute(
      async () => {
        logger.debug(`[${SERVICE_CONTEXT}] getTodaySessions:start`, { userId, instrumentId });
        const result = await getTodayPracticeSessions(userId, instrumentId);
        
        if (result.error) {
          throw result.error;
        }
        
        logger.debug(`[${SERVICE_CONTEXT}] getTodaySessions:success`, { 
          count: result.data?.length || 0 
        });
        
        return result.data || [];
      },
      `${SERVICE_CONTEXT}.getTodaySessions`,
      'PRACTICE_FETCH_ERROR'
    );
  }

  /**
   * 指定日の練習記録を取得
   */
  async getSessionsByDate(
    userId: string,
    practiceDate: string,
    instrumentId?: string | null
  ): Promise<ServiceResult<PracticeSession[]>> {
    return safeServiceExecute(
      async () => {
        logger.debug(`[${SERVICE_CONTEXT}] getSessionsByDate:start`, { 
          userId, 
          practiceDate, 
          instrumentId 
        });
        const result = await getPracticeSessionsByDate(userId, practiceDate, instrumentId);
        
        if (result.error) {
          throw result.error;
        }
        
        logger.debug(`[${SERVICE_CONTEXT}] getSessionsByDate:success`, { 
          count: result.data?.length || 0 
        });
        
        return result.data || [];
      },
      `${SERVICE_CONTEXT}.getSessionsByDate`,
      'PRACTICE_FETCH_ERROR'
    );
  }

  /**
   * 期間指定で練習記録を取得（統計用）
   */
  async getSessionsByDateRange(
    userId: string,
    startDate: string,
    endDate?: string,
    instrumentId?: string | null,
    limit: number = 100 // ページネーション対応: メモリ使用量削減のため100件に制限
  ): Promise<ServiceResult<PracticeSession[]>> {
    return safeServiceExecute(
      async () => {
        logger.debug(`[${SERVICE_CONTEXT}] getSessionsByDateRange:start`, { 
          userId, 
          startDate, 
          endDate,
          instrumentId 
        });
        const result = await getPracticeSessionsByDateRange(
          userId, 
          startDate, 
          endDate, 
          instrumentId,
          limit
        );
        
        if (result.error) {
          throw result.error;
        }
        
        logger.debug(`[${SERVICE_CONTEXT}] getSessionsByDateRange:success`, { 
          count: result.data?.length || 0 
        });
        
        return result.data || [];
      },
      `${SERVICE_CONTEXT}.getSessionsByDateRange`,
      'PRACTICE_FETCH_ERROR'
    );
  }

  /**
   * 練習記録を作成（統合保存）
   */
  async saveSession(
    params: CreatePracticeParams
  ): Promise<ServiceResult<void>> {
    // バリデーション
    if (params.minutes <= 0) {
      return {
        success: false,
        error: '練習時間は1分以上で入力してください',
        code: 'VALIDATION_ERROR',
      };
    }

    if (params.minutes > 1440) {
      return {
        success: false,
        error: '練習時間は1440分（24時間）以内で入力してください',
        code: 'VALIDATION_ERROR',
      };
    }

    return safeServiceExecute(
      async () => {
        logger.debug(`[${SERVICE_CONTEXT}] saveSession:start`, { params });
        
        const result = await savePracticeSessionWithIntegration(
          params.userId,
          params.minutes,
          {
            instrumentId: params.instrumentId,
            content: params.content,
            inputMethod: params.inputMethod,
          }
        );
        
        if (!result.success || result.error) {
          throw result.error || new Error('練習記録の保存に失敗しました');
        }
        
        logger.info(`[${SERVICE_CONTEXT}] saveSession:success`, { 
          userId: params.userId,
          minutes: params.minutes 
        });
      },
      `${SERVICE_CONTEXT}.saveSession`,
      'PRACTICE_SAVE_ERROR'
    );
  }

  /**
   * 練習記録を新規作成（統合しない）
   */
  async createSession(
    params: CreatePracticeParams
  ): Promise<ServiceResult<PracticeSession>> {
    // バリデーション
    if (params.minutes <= 0) {
      return {
        success: false,
        error: '練習時間は1分以上で入力してください',
        code: 'VALIDATION_ERROR',
      };
    }

    if (!params.practiceDate) {
      return {
        success: false,
        error: '練習日付は必須です',
        code: 'VALIDATION_ERROR',
      };
    }

    return safeServiceExecute(
      async () => {
        logger.debug(`[${SERVICE_CONTEXT}] createSession:start`, { params });
        
        const result = await createPracticeSession({
          user_id: params.userId,
          practice_date: params.practiceDate!,
          duration_minutes: params.minutes,
          content: params.content || '練習記録',
          input_method: params.inputMethod || 'manual',
          instrument_id: params.instrumentId,
        });
        
        if (result.error) {
          throw result.error;
        }
        
        if (!result.data) {
          throw new Error('練習記録の作成に失敗しました');
        }
        
        logger.info(`[${SERVICE_CONTEXT}] createSession:success`, { 
          sessionId: result.data.id 
        });
        
        return result.data;
      },
      `${SERVICE_CONTEXT}.createSession`,
      'PRACTICE_CREATE_ERROR'
    );
  }
}

// シングルトンインスタンスをエクスポート
export const practiceService = new PracticeService();

