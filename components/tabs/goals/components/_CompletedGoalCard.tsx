/**
 * 達成済み目標カードコンポーネント
 */
import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Target, Calendar, CircleCheck as CheckCircle, List, Square, CheckSquare2 } from 'lucide-react-native';
import { Goal, SubGoal } from '@/lib/tabs/goals/types';
import { getGoalTypeLabel, getGoalTypeColor } from '@/lib/tabs/goals/utils';
import { styles } from '@/lib/tabs/goals/styles';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { useAuthAdvanced } from '@/hooks/useAuthAdvanced';
import { subGoalRepository } from '@/repositories/subGoalRepository';

interface CompletedGoalCardProps {
  goal: Goal;
  onUpdateProgress: (goalId: string, newProgress: number) => Promise<void>;
  onDeleteGoal: (goalId: string) => Promise<void>;
  onUncompleteGoal?: (goalId: string) => Promise<void>;
  onGoalUpdated?: (goal: Goal) => void;
}

export const CompletedGoalCard: React.FC<CompletedGoalCardProps> = memo(({
  goal,
  onUpdateProgress,
  onDeleteGoal,
  onUncompleteGoal,
  onGoalUpdated,
}) => {
  const { currentTheme } = useInstrumentTheme();
  const { user } = useAuthAdvanced();
  const [subGoals, setSubGoals] = useState<SubGoal[]>(goal.sub_goals || []);
  const [isLoadingSubGoals, setIsLoadingSubGoals] = useState(false);

  // サブ目標を取得（goalが更新されたとき）- 最適化版
  const hasSubGoalsLoaded = useMemo(() => goal.sub_goals !== undefined, [goal.sub_goals]);
  
  useEffect(() => {
    if (goal.sub_goals) {
      setSubGoals(goal.sub_goals);
    } else if (goal.goal_type === 'personal_long' && user?.id && !hasSubGoalsLoaded) {
      // サブ目標が明示的に読み込まれていない場合のみ取得
      let isMounted = true;
      (async () => {
        try {
          const loadedSubGoals = await subGoalRepository.getSubGoalsByGoalId(goal.id, user.id);
          if (isMounted) {
            setSubGoals(loadedSubGoals);
          }
        } catch (error) {
          // エラーは無視（サブ目標がない可能性がある）
        }
      })();
      return () => {
        isMounted = false;
      };
    }
  }, [goal.sub_goals, goal.id, goal.goal_type, user?.id, hasSubGoalsLoaded]);

  // サブ目標の完了状態をトグル（useCallbackで最適化）
  const handleToggleSubGoal = useCallback(async (subGoalId: string) => {
    if (!user?.id) return;
    
    setIsLoadingSubGoals(true);
    try {
      const result = await subGoalRepository.toggleSubGoalCompletion(subGoalId, user.id);
      const updatedSubGoals = subGoals.map(sg => 
        sg.id === subGoalId ? result.subGoal : sg
      );
      setSubGoals(updatedSubGoals);
      
      // 親目標の進捗率も更新されたため、親コンポーネントに通知
      if (onGoalUpdated) {
        const updatedGoal: Goal = {
          ...goal,
          sub_goals: updatedSubGoals,
          progress_percentage: result.updatedProgress,
          is_completed: result.updatedProgress === 100,
        };
        onGoalUpdated(updatedGoal);
      }
      
      // 親コンポーネントの進捗率も更新（リフレッシュを促す）
      if (onUpdateProgress) {
        await onUpdateProgress(goal.id, result.updatedProgress);
      }
    } catch (error) {
      console.error('サブ目標の更新エラー:', error);
    } finally {
      setIsLoadingSubGoals(false);
    }
  }, [user?.id, subGoals, goal, onGoalUpdated, onUpdateProgress]);

  const hasSubGoals = useMemo(() => subGoals && subGoals.length > 0, [subGoals]);

  return (
    <View key={goal.id} style={[styles.goalCard, styles.completedGoalCard]}>
      <View style={styles.goalHeader}>
        <View style={styles.goalHeaderLeft}>
          <View style={[styles.goalTypeBadge, { backgroundColor: getGoalTypeColor(goal.goal_type) }]}>
            {goal.goal_type === 'personal_long' ? (
              <Target size={14} color="#FFFFFF" />
            ) : (
              <CheckCircle size={14} color="#FFFFFF" />
            )}
            <Text style={styles.goalTypeBadgeText}>{getGoalTypeLabel(goal.goal_type)}</Text>
          </View>
          <View style={styles.achievementIcon}>
            <CheckCircle size={20} color="#4CAF50" />
          </View>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => onDeleteGoal(goal.id)}
        >
          <Text style={styles.deleteButtonText}>×</Text>
        </TouchableOpacity>
      </View>
      
      <Text style={[styles.goalTitle, { color: currentTheme.text }]}>{goal.title}</Text>
      {goal.description && (
        <Text style={[styles.goalDescription, { color: currentTheme.textSecondary }]}>{goal.description}</Text>
      )}
      
      {goal.target_date && (
        <View style={styles.goalDate}>
          <Calendar size={16} color={currentTheme.textSecondary} />
          <Text style={[styles.goalDateText, { color: currentTheme.textSecondary }]}>目標期日: {goal.target_date}</Text>
        </View>
      )}

      {/* 長期目標の達成済み: 達成済みバッジのみ表示（進捗テキストと100%は非表示） */}
      {goal.goal_type === 'personal_long' && (
        <View style={styles.progressSection}>
          {/* 達成済みバッジ（大） */}
          <View style={[styles.achievementBadge, styles.bigAchievementBadge, styles.achievementBadgeSuccess]}>
            <CheckCircle size={20} color="#FFFFFF" />
            <Text style={styles.bigAchievementText}>達成成功！</Text>
          </View>
          {/* 進捗テキストと100%は非表示（達成済みのため） */}

          {/* サブ目標がある場合: サブ目標リストを表示 */}
          {hasSubGoals ? (
            <>
              <View style={[styles.subGoalsSection, { backgroundColor: currentTheme.background, borderColor: currentTheme.secondary }]}>
                <View style={styles.subGoalsHeader}>
                  <List size={14} color={currentTheme.textSecondary} />
                  <Text style={[styles.subGoalsTitle, { color: currentTheme.textSecondary }]}>
                    やることリスト
                  </Text>
                </View>
                {isLoadingSubGoals && (
                  <ActivityIndicator size="small" color={getGoalTypeColor(goal.goal_type)} style={{ marginVertical: 8 }} />
                )}
                {subGoals.map((subGoal) => (
                  <TouchableOpacity
                    key={subGoal.id}
                    style={[styles.subGoalItem, { borderColor: currentTheme.secondary }]}
                    onPress={() => handleToggleSubGoal(subGoal.id)}
                    disabled={isLoadingSubGoals}
                    activeOpacity={0.7}
                  >
                    {subGoal.is_completed ? (
                      <CheckSquare2 size={20} color={getGoalTypeColor(goal.goal_type)} />
                    ) : (
                      <Square size={20} color={currentTheme.textSecondary} />
                    )}
                    <Text
                      style={[
                        styles.subGoalText,
                        { color: currentTheme.text },
                        subGoal.is_completed && styles.subGoalTextCompleted
                      ]}
                      numberOfLines={2}
                    >
                      {subGoal.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : (
            // 達成成功（100%）の場合は±10%ボタンを非表示
            (goal.progress_percentage === 100 || goal.is_completed) ? null : (
              <View style={styles.progressButtons}>
                <TouchableOpacity
                  style={[styles.progressButton, styles.progressButtonMinus]}
                  activeOpacity={0.7}
                  onPress={() => {
                    const currentProgress = goal.progress_percentage || 0;
                    onUpdateProgress(goal.id, Math.max(0, currentProgress - 10));
                  }}
                >
                  <Text style={styles.progressButtonText}>−10%</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.progressButton, styles.progressButtonPlus, { backgroundColor: getGoalTypeColor(goal.goal_type) }]}
                  activeOpacity={0.7}
                  onPress={() => {
                    const currentProgress = goal.progress_percentage || 0;
                    onUpdateProgress(goal.id, Math.min(100, currentProgress + 10));
                  }}
                >
                  <Text style={[styles.progressButtonText, { color: '#FFFFFF' }]}>+10%</Text>
                </TouchableOpacity>
              </View>
            )
          )}
        </View>
      )}
        
      {/* 短期目標の達成済み: 達成成功バッジのみ表示（進捗表示なし） */}
      {goal.goal_type === 'personal_short' && (
        <View style={styles.completeButtonContainer}>
          <View style={[styles.achievementBadge, styles.bigAchievementBadge, styles.achievementBadgeSuccess]}>
            <CheckCircle size={20} color="#FFFFFF" />
            <Text style={styles.bigAchievementText}>達成成功！</Text>
          </View>
        </View>
      )}

      {/* 未達成に戻すボタン */}
      {onUncompleteGoal && (
        <TouchableOpacity
          style={[styles.uncompleteButton, { backgroundColor: currentTheme.secondary }]}
          onPress={() => onUncompleteGoal(goal.id)}
          activeOpacity={0.7}
        >
          <Text style={[styles.uncompleteButtonText, { color: currentTheme.text }]}>未達成に戻す</Text>
        </TouchableOpacity>
      )}
    </View>
  );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.goal.id === nextProps.goal.id &&
      prevProps.goal.progress_percentage === nextProps.goal.progress_percentage &&
      prevProps.goal.sub_goals?.length === nextProps.goal.sub_goals?.length &&
      prevProps.goal.is_completed === nextProps.goal.is_completed
    );
  }
);