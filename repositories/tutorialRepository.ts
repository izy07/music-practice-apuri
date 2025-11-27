/**
 * チュートリアル進捗リポジトリ
 * tutorial_progressテーブルへのアクセスを集約
 */

import { supabase } from '@/lib/supabase';
import { safeExecute, RepositoryResult } from '@/lib/database/baseRepository';
import logger from '@/lib/logger';

const REPOSITORY_CONTEXT = 'tutorialRepository';

export interface TutorialProgress {
  user_id: string;
  completed_steps?: string[];
  is_completed?: boolean;
  current_step?: number;
  completed_at?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * チュートリアル進捗を取得
 */
export const getTutorialProgress = async (
  userId: string
): Promise<RepositoryResult<TutorialProgress | null>> => {
  return safeExecute(
    async () => {
      logger.debug(`[${REPOSITORY_CONTEXT}] getTutorialProgress:start`, { userId });
      
      const { data, error } = await supabase
        .from('tutorial_progress')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      // レコードが存在しない場合はnullを返す（エラーではない）
      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      logger.debug(`[${REPOSITORY_CONTEXT}] getTutorialProgress:success`);
      return data || null;
    },
    `${REPOSITORY_CONTEXT}.getTutorialProgress`
  );
};

/**
 * チュートリアル進捗を保存
 */
export const saveTutorialProgress = async (
  userId: string,
  progress: Partial<TutorialProgress>
): Promise<RepositoryResult<TutorialProgress | null>> => {
  return safeExecute(
    async () => {
      logger.debug(`[${REPOSITORY_CONTEXT}] saveTutorialProgress:start`, { userId, progress });
      
      const { data, error } = await supabase
        .from('tutorial_progress')
        .upsert(
          {
            user_id: userId,
            ...progress,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
        .select()
        .single();

      if (error) {
        throw error;
      }

      logger.debug(`[${REPOSITORY_CONTEXT}] saveTutorialProgress:success`);
      return data;
    },
    `${REPOSITORY_CONTEXT}.saveTutorialProgress`
  );
};

/**
 * チュートリアルを完了としてマーク
 */
export const markTutorialCompleted = async (
  userId: string
): Promise<RepositoryResult<TutorialProgress | null>> => {
  return saveTutorialProgress(userId, {
    is_completed: true,
    completed_at: new Date().toISOString(),
    current_step: 6,
  });
};

