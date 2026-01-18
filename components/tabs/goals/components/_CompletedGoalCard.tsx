/**
 * 達成済み目標カードコンポーネント
 */
import React, { useState, useEffect } from 'react';
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

export const CompletedGoalCard: React.FC<CompletedGoalCardProps> = ({
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

  // サブ目標を取得（goalが更新されたとき）
  useEffect(() => {
    if (goal.sub_goals) {
      setSubGoals(goal.sub_goals);
    } else if (goal.goal_type === 'personal_long' && user?.id) {
      // サブ目標が読み込まれていない場合、取得を試みる
      (async () => {
        try {
          const loadedSubGoals = await subGoalRepository.getSubGoalsByGoalId(goal.id, user.id);
          setSubGoals(loadedSubGoals);
        } catch (error) {
          // エラーは無視（サブ目標がない可能性がある）
        }
      })();
    }
  }, [goal.sub_goals, goal.id, goal.goal_type, user?.id]);

  // サブ目標の完了状態をトグル
  const handleToggleSubGoal = async (subGoalId: string) => {
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
  };

  const hasSubGoals = subGoals && subGoals.length > 0;

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

      {/* 長期目標の達成済み: 進捗表示とパーセンテージ変更ボタン（いつでも戻せる） */}
      {goal.goal_type === 'personal_long' && (
        <View style={styles.progressSection}>
          {/* 達成済みバッジ（大） */}
          <View style={[styles.achievementBadge, styles.bigAchievementBadge, styles.achievementBadgeSuccess]}>
            <CheckCircle size={20} color="#FFFFFF" />
            <Text style={styles.bigAchievementText}>達成成功！</Text>
          </View>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressLabel, { color: currentTheme.text }]}>進捗</Text>
            <Text style={[styles.progressPercentage, { color: getGoalTypeColor(goal.goal_type) }]}>
              {goal.progress_percentage || 0}%
              {hasSubGoals && ` (${subGoals.filter(sg => sg.is_completed).length}/${subGoals.length})`}
            </Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: currentTheme.secondary }]}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${goal.progress_percentage || 0}%`,
                  backgroundColor: getGoalTypeColor(goal.goal_type)
                }
              ]} 
            />
          </View>

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
              <View style={styles.achievementBadgeInline}>
                <CheckCircle size={16} color="#4CAF50" />
                <Text style={[styles.achievementText, { color: '#4CAF50' }]}>達成済み</Text>
              </View>
            </View>
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
};

