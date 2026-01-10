/**
 * サブ目標（sub_goals）関連のリポジトリ
 */
import { supabase } from '@/lib/supabase';
import { SubGoal } from '@/lib/tabs/goals/types';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';

export const subGoalRepository = {
  /**
   * 現在のユーザーIDを取得
   */
  async getCurrentUserId(): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  },

  /**
   * 目標IDに紐づくサブ目標一覧を取得
   */
  async getSubGoalsByGoalId(goalId: string, userId: string): Promise<SubGoal[]> {
    try {
      const { data, error } = await supabase
        .from('sub_goals')
        .select('*')
        .eq('goal_id', goalId)
        .eq('user_id', userId)
        .order('order_index', { ascending: true });

      if (error) {
        logger.error('サブ目標の取得エラー:', error);
        throw error;
      }

      return (data || []).map((item: any) => ({
        id: item.id,
        goal_id: item.goal_id,
        user_id: item.user_id,
        title: item.title,
        description: item.description || undefined,
        is_completed: item.is_completed || false,
        completed_at: item.completed_at || undefined,
        order_index: item.order_index || 0,
        created_at: item.created_at,
        updated_at: item.updated_at,
      }));
    } catch (error) {
      ErrorHandler.handle(error, 'サブ目標取得', false);
      throw error;
    }
  },

  /**
   * サブ目標を作成
   */
  async createSubGoal(
    goalId: string,
    userId: string,
    subGoal: {
      title: string;
      description?: string;
      order_index?: number;
    }
  ): Promise<SubGoal> {
    try {
      // 既存のサブ目標数を確認（最大10個）
      const existingSubGoals = await this.getSubGoalsByGoalId(goalId, userId);
      if (existingSubGoals.length >= 10) {
        throw new Error('サブ目標は最大10個まで設定できます');
      }

      // order_indexが指定されていない場合、最後に追加
      const orderIndex = subGoal.order_index ?? existingSubGoals.length;

      const { data, error } = await supabase
        .from('sub_goals')
        .insert({
          goal_id: goalId,
          user_id: userId,
          title: subGoal.title.trim(),
          description: subGoal.description?.trim() || null,
          is_completed: false,
          order_index: orderIndex,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        logger.error('サブ目標の作成エラー:', error);
        throw error;
      }

      return {
        id: data.id,
        goal_id: data.goal_id,
        user_id: data.user_id,
        title: data.title,
        description: data.description || undefined,
        is_completed: data.is_completed || false,
        completed_at: data.completed_at || undefined,
        order_index: data.order_index || 0,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    } catch (error) {
      ErrorHandler.handle(error, 'サブ目標作成', false);
      throw error;
    }
  },

  /**
   * サブ目標を更新（完了状態が変更された場合は親目標の進捗率も自動更新）
   */
  async updateSubGoal(
    subGoalId: string,
    userId: string,
    updates: {
      title?: string;
      description?: string;
      is_completed?: boolean;
      order_index?: number;
    }
  ): Promise<SubGoal> {
    try {
      // 現在のgoal_idを取得（完了状態が変更される場合に進捗率を更新するため）
      let goalId: string | null = null;
      if (updates.is_completed !== undefined) {
        const { data: currentData } = await supabase
          .from('sub_goals')
          .select('goal_id')
          .eq('id', subGoalId)
          .eq('user_id', userId)
          .single();
        goalId = currentData?.goal_id || null;
      }

      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (updates.title !== undefined) {
        updateData.title = updates.title.trim();
      }
      if (updates.description !== undefined) {
        updateData.description = updates.description?.trim() || null;
      }
      if (updates.is_completed !== undefined) {
        updateData.is_completed = updates.is_completed;
        updateData.completed_at = updates.is_completed ? new Date().toISOString() : null;
      }
      if (updates.order_index !== undefined) {
        updateData.order_index = updates.order_index;
      }

      const { data, error } = await supabase
        .from('sub_goals')
        .update(updateData)
        .eq('id', subGoalId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        logger.error('サブ目標の更新エラー:', error);
        throw error;
      }

      // 完了状態が変更された場合、親目標の進捗率を自動計算して更新
      if (updates.is_completed !== undefined && goalId) {
        try {
          const subGoals = await this.getSubGoalsByGoalId(goalId, userId);
          const calculatedProgress = this.calculateProgressFromSubGoals(subGoals);

          // 親目標の進捗率を更新
          const { error: updateError } = await supabase
            .from('goals')
            .update({ 
              progress_percentage: calculatedProgress,
              updated_at: new Date().toISOString(),
              // 進捗率が100%の場合は完了としてマーク
              ...(calculatedProgress === 100 ? { is_completed: true, completed_at: new Date().toISOString() } : { is_completed: false, completed_at: null }),
            })
            .eq('id', goalId)
            .eq('user_id', userId);

          if (updateError) {
            logger.error('親目標の進捗率更新エラー:', updateError);
            // エラーはログに記録するが、サブ目標の更新は成功しているので続行
          }
        } catch (progressError) {
          logger.error('進捗率計算エラー:', progressError);
          // エラーはログに記録するが、サブ目標の更新は成功しているので続行
        }
      }

      return {
        id: data.id,
        goal_id: data.goal_id,
        user_id: data.user_id,
        title: data.title,
        description: data.description || undefined,
        is_completed: data.is_completed || false,
        completed_at: data.completed_at || undefined,
        order_index: data.order_index || 0,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    } catch (error) {
      ErrorHandler.handle(error, 'サブ目標更新', false);
      throw error;
    }
  },

  /**
   * サブ目標の完了状態をトグル（親目標の進捗率も自動更新）
   */
  async toggleSubGoalCompletion(subGoalId: string, userId: string): Promise<{ subGoal: SubGoal; updatedProgress: number }> {
    try {
      // 現在の状態とgoal_idを取得
      const { data: currentData, error: fetchError } = await supabase
        .from('sub_goals')
        .select('is_completed, goal_id')
        .eq('id', subGoalId)
        .eq('user_id', userId)
        .single();

      if (fetchError) {
        logger.error('サブ目標の取得エラー:', fetchError);
        throw fetchError;
      }

      const newCompletedState = !currentData.is_completed;
      const goalId = currentData.goal_id;

      // サブ目標を更新
      const updatedSubGoal = await this.updateSubGoal(subGoalId, userId, {
        is_completed: newCompletedState,
      });

      // 親目標の進捗率を自動計算して更新
      const subGoals = await this.getSubGoalsByGoalId(goalId, userId);
      const calculatedProgress = this.calculateProgressFromSubGoals(subGoals);

      // 親目標の進捗率を更新
      const { error: updateError } = await supabase
        .from('goals')
        .update({ 
          progress_percentage: calculatedProgress,
          updated_at: new Date().toISOString(),
          // 進捗率が100%の場合は完了としてマーク
          ...(calculatedProgress === 100 ? { is_completed: true, completed_at: new Date().toISOString() } : { is_completed: false, completed_at: null }),
        })
        .eq('id', goalId)
        .eq('user_id', userId);

      if (updateError) {
        logger.error('親目標の進捗率更新エラー:', updateError);
        // エラーはログに記録するが、サブ目標の更新は成功しているので続行
      }

      return { subGoal: updatedSubGoal, updatedProgress: calculatedProgress };
    } catch (error) {
      ErrorHandler.handle(error, 'サブ目標完了状態トグル', false);
      throw error;
    }
  },

  /**
   * サブ目標を削除
   */
  async deleteSubGoal(subGoalId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('sub_goals')
        .delete()
        .eq('id', subGoalId)
        .eq('user_id', userId);

      if (error) {
        logger.error('サブ目標の削除エラー:', error);
        throw error;
      }
    } catch (error) {
      ErrorHandler.handle(error, 'サブ目標削除', false);
      throw error;
    }
  },

  /**
   * 目標に紐づくすべてのサブ目標を削除
   */
  async deleteAllSubGoalsByGoalId(goalId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('sub_goals')
        .delete()
        .eq('goal_id', goalId)
        .eq('user_id', userId);

      if (error) {
        logger.error('サブ目標の一括削除エラー:', error);
        throw error;
      }
    } catch (error) {
      ErrorHandler.handle(error, 'サブ目標一括削除', false);
      throw error;
    }
  },

  /**
   * サブ目標の順序を更新（複数）
   */
  async updateSubGoalsOrder(
    goalId: string,
    userId: string,
    orderUpdates: { id: string; order_index: number }[]
  ): Promise<void> {
    try {
      // トランザクション的に更新（Supabaseでは1つずつ更新）
      const updatePromises = orderUpdates.map((update) =>
        supabase
          .from('sub_goals')
          .update({ order_index: update.order_index, updated_at: new Date().toISOString() })
          .eq('id', update.id)
          .eq('goal_id', goalId)
          .eq('user_id', userId)
      );

      const results = await Promise.all(updatePromises);
      const errors = results.filter((result) => result.error);

      if (errors.length > 0) {
        logger.error('サブ目標の順序更新エラー:', errors);
        throw errors[0].error;
      }
    } catch (error) {
      ErrorHandler.handle(error, 'サブ目標順序更新', false);
      throw error;
    }
  },

  /**
   * サブ目標の完了率から進捗率を計算
   */
  calculateProgressFromSubGoals(subGoals: SubGoal[]): number {
    if (!subGoals || subGoals.length === 0) {
      return 0;
    }

    const completedCount = subGoals.filter((sg) => sg.is_completed).length;
    return Math.round((completedCount / subGoals.length) * 100);
  },
};
