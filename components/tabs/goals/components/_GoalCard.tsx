/**
 * 目標カードコンポーネント
 */
import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Target, Calendar, CircleCheck as CheckCircle, Square, CheckSquare2, Plus, Edit, Trash2, List } from 'lucide-react-native';
import { Goal, SubGoal } from '@/lib/tabs/goals/types';
import { getGoalTypeLabel, getGoalTypeColor } from '@/lib/tabs/goals/utils';
import { styles } from '@/lib/tabs/goals/styles';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { subGoalRepository } from '@/repositories/subGoalRepository';
import { useAuthAdvanced } from '@/hooks/useAuthAdvanced';

interface GoalCardProps {
  goal: Goal;
  justCompletedId: string | null;
  onUpdateProgress: (goalId: string, newProgress: number) => Promise<void>;
  onCompleteGoal: (goalId: string) => Promise<void>;
  onDeleteGoal: (goalId: string) => Promise<void>;
  onSetGoalShowOnCalendar: (goalId: string, show: boolean) => Promise<void>;
  onGoalUpdated?: (updatedGoal: Goal) => void; // サブ目標更新時に親コンポーネントに通知
}

export const GoalCard: React.FC<GoalCardProps> = memo(({
  goal,
  justCompletedId,
  onUpdateProgress,
  onCompleteGoal,
  onDeleteGoal,
  onSetGoalShowOnCalendar,
  onGoalUpdated,
}) => {
  const { currentTheme } = useInstrumentTheme();
  const { user } = useAuthAdvanced();
  const [subGoals, setSubGoals] = useState<SubGoal[]>(goal.sub_goals || []);
  const [isLoadingSubGoals, setIsLoadingSubGoals] = useState(false);
  const [showSubGoalsEditor, setShowSubGoalsEditor] = useState(false);

  // サブ目標を取得（goalが更新されたとき）
  useEffect(() => {
    if (goal.sub_goals) {
      setSubGoals(goal.sub_goals);
    }
  }, [goal.sub_goals]);

  // サブ目標の完了状態をトグル
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

  // サブ目標がある場合の進捗率計算（useMemoで最適化）
  const hasSubGoals = useMemo(() => subGoals && subGoals.length > 0, [subGoals]);
  const completedSubGoalsCount = useMemo(() => 
    hasSubGoals ? subGoals.filter(sg => sg.is_completed).length : 0,
    [hasSubGoals, subGoals]
  );
  const displayProgress = useMemo(() => {
    if (hasSubGoals) {
      return subGoalRepository.calculateProgressFromSubGoals(subGoals);
    }
    return goal.progress_percentage || 0;
  }, [hasSubGoals, subGoals, goal.progress_percentage]);

  return (
    <View key={goal.id} style={[styles.goalCard, { backgroundColor: currentTheme.surface }]}>
      <View style={[styles.goalHeader, { position: 'relative', zIndex: 1 }]}>
        <View style={styles.goalHeaderLeft}>
          <View style={[styles.goalTypeBadge, { backgroundColor: getGoalTypeColor(goal.goal_type) }]}>
            {goal.goal_type === 'personal_long' ? (
              <Target size={14} color="#FFFFFF" />
            ) : (
              <CheckCircle size={14} color="#FFFFFF" />
            )}
            <Text style={styles.goalTypeBadgeText}>{getGoalTypeLabel(goal.goal_type)}</Text>
          </View>
          {goal.progress_percentage === 100 && (
            <View style={styles.achievementIcon}>
              <CheckCircle size={20} color="#4CAF50" />
            </View>
          )}
        </View>
        <TouchableOpacity
          style={[styles.deleteButton, { position: 'relative', zIndex: 10 }]}
          onPress={async (e) => {
            e.stopPropagation();
            try {
              if (onDeleteGoal) {
                await onDeleteGoal(goal.id);
              } else {
                console.warn('onDeleteGoal is not provided');
              }
            } catch (error) {
              console.error('削除エラー:', error);
            }
          }}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.deleteButtonText}>×</Text>
        </TouchableOpacity>
      </View>
      
      <Text style={[styles.goalTitle, { color: currentTheme.text }]} numberOfLines={2}>
        {goal.title}
      </Text>
      {goal.description && (
        <Text style={[styles.goalDescription, { color: currentTheme.textSecondary }]} numberOfLines={1}>
          {goal.description}
        </Text>
      )}
      
      {goal.target_date && (
        <View style={styles.goalDate}>
          <Calendar size={16} color={currentTheme.textSecondary} />
          <Text style={[styles.goalDateText, { color: currentTheme.textSecondary }]}>目標期日: {goal.target_date}</Text>
        </View>
      )}

      {/* 長期目標の場合: 進捗表示とパーセンテージ変更ボタン */}
      {goal.goal_type === 'personal_long' && (
        <View style={styles.progressSection}>
          {goal.progress_percentage === 100 && (
            <View style={[styles.achievementBadge, styles.bigAchievementBadge, styles.achievementBadgeSuccess]}>
              <CheckCircle size={20} color="#FFFFFF" />
              <Text style={styles.bigAchievementText}>達成成功！</Text>
            </View>
          )}
          
          {/* 進捗スライダー（大きく目立つように） */}
          <View style={styles.progressSliderContainer}>
            <View style={styles.progressSliderTrack}>
              <View 
                style={[
                  styles.progressSliderFill, 
                  { 
                    width: `${displayProgress || 0}%`,
                    backgroundColor: getGoalTypeColor(goal.goal_type)
                  }
                ]} 
              />
            </View>
            <Text style={[styles.progressPercentageLabel, { color: getGoalTypeColor(goal.goal_type) }]}>
              {displayProgress || 0}%
              {hasSubGoals && ` (${subGoals.filter(sg => sg.is_completed).length}/${subGoals.length})`}
            </Text>
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
            /* サブ目標がない場合: 手動進捗調整ボタン */
            <View style={styles.progressButtonsWithBar}>
              <TouchableOpacity
                style={[
                  styles.progressButton, 
                  styles.progressButtonMinus,
                  { borderColor: currentTheme.textSecondary + '80' }
                ]}
                activeOpacity={0.7}
                onPress={() => {
                  const currentProgress = goal.progress_percentage || 0;
                  onUpdateProgress(goal.id, Math.max(0, currentProgress - 10));
                }}
              >
                <Text style={styles.progressButtonText}>−10%</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.progressButton, 
                  styles.progressButtonPlus, 
                  { 
                    backgroundColor: getGoalTypeColor(goal.goal_type),
                    borderWidth: 1.5,
                    borderColor: getGoalTypeColor(goal.goal_type)
                  }
                ]}
                activeOpacity={0.7}
                onPress={() => {
                  const currentProgress = goal.progress_percentage || 0;
                  onUpdateProgress(goal.id, Math.min(100, currentProgress + 10));
                }}
              >
                <Text style={[styles.progressButtonText, { color: '#FFFFFF' }]}>+10%</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* カレンダー表示切り替えと達成ボタン（長期目標のみ） */}
          {/* 達成済み（progress_percentage === 100 または is_completed === true）の場合はカレンダー表示ボタンを非表示 */}
          {goal.progress_percentage === 100 || goal.is_completed ? (
            <View style={styles.calendarToggleRow}>
              {/* 達成済みの場合は何も表示しない */}
            </View>
          ) : (
            <View style={[styles.calendarToggleRow, { gap: 0 }]}>
              <View style={[styles.calendarToggleButtons, { gap: 0 }]}>
                <TouchableOpacity
                  style={[styles.calendarToggleBtn, { 
                    borderColor: currentTheme.secondary, 
                    backgroundColor: goal.show_on_calendar ? currentTheme.primary : 'transparent',
                    borderRightWidth: 0,
                    borderTopLeftRadius: 8,
                    borderBottomLeftRadius: 8,
                    borderTopRightRadius: 0,
                    borderBottomRightRadius: 0,
                  }]}
                  onPress={() => onSetGoalShowOnCalendar(goal.id, true)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.calendarToggleText, { color: goal.show_on_calendar ? '#FFFFFF' : currentTheme.text }]}>カレンダーに表示</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.calendarToggleBtn, { 
                    borderColor: currentTheme.secondary, 
                    backgroundColor: !goal.show_on_calendar ? currentTheme.primary : 'transparent',
                    borderLeftWidth: 0,
                    borderTopLeftRadius: 0,
                    borderBottomLeftRadius: 0,
                    borderTopRightRadius: 8,
                    borderBottomRightRadius: 8,
                  }]}
                  onPress={() => onSetGoalShowOnCalendar(goal.id, false)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.calendarToggleText, { color: !goal.show_on_calendar ? '#FFFFFF' : currentTheme.text }]}>表示しない</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.completeButton, { 
                  backgroundColor: currentTheme.primary,
                  marginLeft: 0,
                  borderTopLeftRadius: 0,
                  borderBottomLeftRadius: 0,
                }]}
                onPress={() => onCompleteGoal(goal.id)}
              >
                <CheckCircle size={16} color="#FFFFFF" />
                <Text style={styles.completeButtonText}>達成！</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
      
      {/* 短期目標の場合: カレンダー表示切り替えと達成ボタン */}
      {goal.goal_type === 'personal_short' && (
        <>
          {goal.is_completed ? (
            <View style={styles.completeButtonContainer}>
              <View style={[styles.achievementBadge, styles.bigAchievementBadge, styles.achievementBadgeSuccess]}>
                <CheckCircle size={20} color="#FFFFFF" />
                <Text style={styles.bigAchievementText}>達成成功！</Text>
              </View>
            </View>
          ) : (
            <View style={[styles.calendarToggleRow, { gap: 0 }]}>
              <View style={[styles.calendarToggleButtons, { gap: 0 }]}>
                <TouchableOpacity
                  style={[styles.calendarToggleBtn, { 
                    borderColor: currentTheme.secondary, 
                    backgroundColor: goal.show_on_calendar ? currentTheme.primary : 'transparent',
                    borderRightWidth: 0,
                    borderTopLeftRadius: 8,
                    borderBottomLeftRadius: 8,
                    borderTopRightRadius: 0,
                    borderBottomRightRadius: 0,
                  }]}
                  onPress={() => onSetGoalShowOnCalendar(goal.id, true)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.calendarToggleText, { color: goal.show_on_calendar ? '#FFFFFF' : currentTheme.text }]}>カレンダーに表示</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.calendarToggleBtn, { 
                    borderColor: currentTheme.secondary, 
                    backgroundColor: !goal.show_on_calendar ? currentTheme.primary : 'transparent',
                    borderLeftWidth: 0,
                    borderTopLeftRadius: 0,
                    borderBottomLeftRadius: 0,
                    borderTopRightRadius: 8,
                    borderBottomRightRadius: 8,
                  }]}
                  onPress={() => onSetGoalShowOnCalendar(goal.id, false)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.calendarToggleText, { color: !goal.show_on_calendar ? '#FFFFFF' : currentTheme.text }]}>表示しない</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.completeButton, { 
                  backgroundColor: currentTheme.primary,
                  marginLeft: 0,
                  borderTopLeftRadius: 0,
                  borderBottomLeftRadius: 0,
                }]}
                onPress={() => onCompleteGoal(goal.id)}
              >
                <CheckCircle size={16} color="#FFFFFF" />
                <Text style={styles.completeButtonText}>達成！</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {/* 達成直後のオーバーレイ演出 */}
      {justCompletedId === goal.id && (
        <View style={styles.justCompletedOverlay}>
          <View style={[styles.achievementBadge, styles.bigAchievementBadge, styles.achievementBadgeSuccess, { opacity: 0.98 }]}>
            <CheckCircle size={32} color="#FFFFFF" />
            <Text style={styles.justCompletedText}>達成成功！</Text>
          </View>
        </View>
      )}
    </View>
  );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.goal.id === nextProps.goal.id &&
      prevProps.goal.progress_percentage === nextProps.goal.progress_percentage &&
      prevProps.goal.sub_goals?.length === nextProps.goal.sub_goals?.length &&
      prevProps.justCompletedId === nextProps.justCompletedId
    );
  }
);
