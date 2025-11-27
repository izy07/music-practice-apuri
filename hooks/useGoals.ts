/**
 * 目標管理のカスタムフック
 * goals.tsx から抽出したビジネスロジック
 */

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Goal } from '@/types/models';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';

export const useGoals = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [completedGoals, setCompletedGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // 目標の読み込み
  const loadGoals = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === 'PGRST116') return;
        throw error;
      }

      if (data) {
        const activeGoals = data.filter((g: Goal) => !g.is_completed);
        setGoals(activeGoals);
      }
    } catch (error) {
      ErrorHandler.handle(error, '目標読み込み', false);
    }
  }, []);

  // 完了済み目標の読み込み
  const loadCompletedGoals = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === 'PGRST116') return;
        throw error;
      }

      if (data) {
        const completed = data.filter((g: any) => g.is_completed === true);
        setCompletedGoals(completed);
      }
    } catch (error) {
      ErrorHandler.handle(error, '完了済み目標読み込み', false);
    }
  }, []);

  // 目標の保存
  const saveGoal = useCallback(async (goalData: {
    title: string;
    description: string;
    target_date: string;
    goal_type: 'personal_short' | 'personal_long' | 'group';
  }) => {
    if (!goalData.title.trim()) {
      Alert.alert('エラー', '目標タイトルを入力してください');
      return false;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('エラー', 'ログインが必要です');
        return false;
      }

      const { error } = await supabase
        .from('goals')
        .insert({
          user_id: user.id,
          title: goalData.title.trim(),
          description: goalData.description.trim() || null,
          target_date: goalData.target_date || null,
          goal_type: goalData.goal_type,
          progress_percentage: 0,
          is_active: true,
        });

      if (error) {
        Alert.alert('エラー', '目標の保存に失敗しました');
        return false;
      }

      Alert.alert('成功', '目標を保存しました');
      await loadGoals();
      return true;
    } catch (error) {
      ErrorHandler.handle(error, '目標保存', false);
      Alert.alert('エラー', '目標の保存に失敗しました');
      return false;
    }
  }, [loadGoals]);

  // 進捗の更新
  const updateProgress = useCallback(async (goalId: string, newProgress: number) => {
    try {
      const { error } = await supabase
        .from('goals')
        .update({ progress_percentage: newProgress })
        .eq('id', goalId);

      if (error) throw error;

      await loadGoals();
    } catch (error) {
      ErrorHandler.handle(error, '進捗更新', false);
      Alert.alert('エラー', '進捗の更新に失敗しました');
    }
  }, [loadGoals]);

  // 目標の達成
  const completeGoal = useCallback(async (goalId: string) => {
    try {
      const { error } = await supabase
        .from('goals')
        .update({ 
          is_completed: true,
          progress_percentage: 100,
        })
        .eq('id', goalId);

      if (error) throw error;

      Alert.alert('おめでとうございます！', '目標を達成しました！');
      await Promise.all([loadGoals(), loadCompletedGoals()]);
    } catch (error) {
      ErrorHandler.handle(error, '目標達成', false);
      Alert.alert('エラー', '目標の達成処理に失敗しました');
    }
  }, [loadGoals, loadCompletedGoals]);

  // 目標の削除
  const deleteGoal = useCallback(async (goalId: string) => {
    if (isDeleting) return;

    setIsDeleting(true);

    Alert.alert(
      '目標を削除',
      'この目標を削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('goals')
                .delete()
                .eq('id', goalId);

              if (error) {
                Alert.alert('エラー', '目標の削除に失敗しました');
                return;
              }

              // ローカル状態から削除
              setGoals(prevGoals => prevGoals.filter(goal => goal.id !== goalId));
              Alert.alert('成功', '目標を削除しました');
            } catch (error) {
              ErrorHandler.handle(error, '目標削除', false);
              Alert.alert('エラー', '目標の削除に失敗しました');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  }, [isDeleting]);

  return {
    goals,
    completedGoals,
    loading,
    loadGoals,
    loadCompletedGoals,
    saveGoal,
    updateProgress,
    completeGoal,
    deleteGoal,
  };
};

