/**
 * 達成済み目標カードコンポーネント
 */
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Target, Calendar, CircleCheck as CheckCircle } from 'lucide-react-native';
import { Goal } from '@/lib/tabs/goals/types';
import { getGoalTypeLabel, getGoalTypeColor } from '@/lib/tabs/goals/utils';
import { styles } from '@/lib/tabs/goals/styles';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';

interface CompletedGoalCardProps {
  goal: Goal;
  onUpdateProgress: (goalId: string, newProgress: number) => Promise<void>;
  onDeleteGoal: (goalId: string) => Promise<void>;
}

export const CompletedGoalCard: React.FC<CompletedGoalCardProps> = ({
  goal,
  onUpdateProgress,
  onDeleteGoal,
}) => {
  const { currentTheme } = useInstrumentTheme();

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
            <CheckCircle size={28} color="#FFFFFF" />
            <Text style={styles.bigAchievementText}>達成成功！</Text>
          </View>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressLabel, { color: currentTheme.text }]}>進捗</Text>
            <Text style={[styles.progressPercentage, { color: getGoalTypeColor(goal.goal_type) }]}>
              {goal.progress_percentage || 0}%
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
        </View>
      )}
        
      {/* 短期目標の達成済み: 達成成功バッジのみ表示（進捗表示なし） */}
      {goal.goal_type === 'personal_short' && (
        <View style={styles.completeButtonContainer}>
          <View style={[styles.achievementBadge, styles.bigAchievementBadge, styles.achievementBadgeSuccess]}>
            <CheckCircle size={28} color="#FFFFFF" />
            <Text style={styles.bigAchievementText}>達成成功！</Text>
          </View>
        </View>
      )}
    </View>
  );
};

