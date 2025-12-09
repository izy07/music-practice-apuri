/**
 * 目標カードコンポーネント
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Target, Calendar, CircleCheck as CheckCircle } from 'lucide-react-native';
import { Goal } from '@/lib/tabs/goals/types';
import { getGoalTypeLabel, getGoalTypeColor } from '@/lib/tabs/goals/utils';
import { styles } from '@/lib/tabs/goals/styles';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';

interface GoalCardProps {
  goal: Goal;
  justCompletedId: string | null;
  onUpdateProgress: (goalId: string, newProgress: number) => Promise<void>;
  onCompleteGoal: (goalId: string) => Promise<void>;
  onDeleteGoal: (goalId: string) => Promise<void>;
  onSetGoalShowOnCalendar: (goalId: string, show: boolean) => Promise<void>;
}

export const GoalCard: React.FC<GoalCardProps> = ({
  goal,
  justCompletedId,
  onUpdateProgress,
  onCompleteGoal,
  onDeleteGoal,
  onSetGoalShowOnCalendar,
}) => {
  const { currentTheme } = useInstrumentTheme();

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
              <CheckCircle size={28} color="#FFFFFF" />
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
                    width: `${goal.progress_percentage || 0}%`,
                    backgroundColor: getGoalTypeColor(goal.goal_type)
                  }
                ]} 
              />
            </View>
            <Text style={[styles.progressPercentageLabel, { color: getGoalTypeColor(goal.goal_type) }]}>
              {goal.progress_percentage || 0}%
            </Text>
          </View>

          {/* 進捗変更ボタン */}
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

          {/* カレンダー表示切り替えと達成ボタン（長期目標のみ） */}
          {/* 達成済み（progress_percentage === 100 または is_completed === true）の場合はカレンダー表示ボタンを非表示 */}
          {goal.progress_percentage === 100 || goal.is_completed ? (
            <View style={styles.calendarToggleRow}>
              {/* 達成済みの場合は何も表示しない */}
            </View>
          ) : (
            <View style={styles.calendarToggleRow}>
              <View style={styles.calendarToggleButtons}>
                <TouchableOpacity
                  style={[styles.calendarToggleBtn, { borderColor: currentTheme.secondary, backgroundColor: goal.show_on_calendar ? currentTheme.primary : 'transparent' }]}
                  onPress={() => onSetGoalShowOnCalendar(goal.id, true)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.calendarToggleText, { color: goal.show_on_calendar ? '#FFFFFF' : currentTheme.text }]}>カレンダーに表示</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.calendarToggleBtn, { borderColor: currentTheme.secondary, backgroundColor: !goal.show_on_calendar ? currentTheme.primary : 'transparent' }]}
                  onPress={() => onSetGoalShowOnCalendar(goal.id, false)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.calendarToggleText, { color: !goal.show_on_calendar ? '#FFFFFF' : currentTheme.text }]}>表示しない</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.completeButton, { backgroundColor: currentTheme.primary }]}
                onPress={() => onCompleteGoal(goal.id)}
              >
                <CheckCircle size={20} color="#FFFFFF" />
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
                <CheckCircle size={28} color="#FFFFFF" />
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
                <CheckCircle size={20} color="#FFFFFF" />
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
};

