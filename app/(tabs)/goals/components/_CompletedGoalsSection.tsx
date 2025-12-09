/**
 * 達成済み目標セクションコンポーネント
 */

import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Trophy } from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useThemeColors';

interface Goal {
  id: string;
  title: string;
  description?: string;
  target_date?: string;
  progress_percentage: number;
  goal_type: 'personal_short' | 'personal_long' | 'group';
  is_active: boolean;
  is_completed: boolean;
  completed_at?: string;
  show_on_calendar?: boolean;
}

interface Props {
  completedGoals: Goal[];
  getGoalTypeLabel: (type: string) => string;
  getGoalTypeColor: (type: string) => string;
  onUpdateProgress?: (goalId: string, progress: number) => Promise<void>;
  onDeleteGoal?: (goalId: string) => Promise<void>;
}

export const CompletedGoalsSection: React.FC<Props> = memo(({
  completedGoals,
  getGoalTypeLabel,
  getGoalTypeColor,
  onUpdateProgress,
  onDeleteGoal,
}) => {
  const colors = useThemeColors();

  const sectionStyle = useMemo(() => [
    styles.section,
    { backgroundColor: colors.surface }
  ], [colors.surface]);

  const sectionTitleStyle = useMemo(() => [
    styles.sectionTitle,
    { color: colors.text }
  ], [colors.text]);

  const emptyTextStyle = useMemo(() => [
    styles.emptyText,
    { color: colors.textSecondary }
  ], [colors.textSecondary]);

  return (
    <View style={sectionStyle}>
      <View style={styles.sectionHeader}>
        <Trophy size={24} color={colors.primary} />
        <Text style={sectionTitleStyle}>
          達成済み目標
        </Text>
      </View>
      
      {completedGoals.length === 0 ? (
        <Text style={emptyTextStyle}>
          まだ達成した目標はありません
        </Text>
      ) : (
        <View style={styles.goalsList}>
          {completedGoals.map(goal => (
            <CompletedGoalCard
              key={goal.id}
              goal={goal}
              colors={colors}
              getGoalTypeLabel={getGoalTypeLabel}
              getGoalTypeColor={getGoalTypeColor}
              onUpdateProgress={onUpdateProgress}
              onDeleteGoal={onDeleteGoal}
            />
          ))}
        </View>
      )}
    </View>
  );
});

// 個別の目標カードコンポーネント（メモ化）
const CompletedGoalCard = memo<{
  goal: Goal;
  colors: ReturnType<typeof useThemeColors>;
  getGoalTypeLabel: (type: string) => string;
  getGoalTypeColor: (type: string) => string;
  onUpdateProgress?: (goalId: string, progress: number) => Promise<void>;
  onDeleteGoal?: (goalId: string) => Promise<void>;
}>(({ goal, colors, getGoalTypeLabel, getGoalTypeColor, onUpdateProgress, onDeleteGoal }) => {
  const cardStyle = useMemo(() => [
    styles.completedGoalCard,
    { backgroundColor: colors.background, borderColor: colors.secondary + '33' }
  ], [colors.background, colors.secondary]);

  const titleStyle = useMemo(() => [
    styles.completedGoalTitle,
    { color: colors.text }
  ], [colors.text]);

  const descriptionStyle = useMemo(() => [
    styles.completedGoalDescription,
    { color: colors.textSecondary }
  ], [colors.textSecondary]);

  const dateStyle = useMemo(() => [
    styles.completedGoalDate,
    { color: colors.textSecondary }
  ], [colors.textSecondary]);

  return (
    <View style={cardStyle}>
      <View style={styles.completedGoalHeader}>
        <View style={[styles.completedGoalBadge, { backgroundColor: getGoalTypeColor(goal.goal_type) }]}>
          <Text style={styles.completedGoalBadgeText}>{getGoalTypeLabel(goal.goal_type)}</Text>
        </View>
        {onDeleteGoal && (
          <TouchableOpacity
            style={[styles.deleteButton, { backgroundColor: '#FF4444', zIndex: 10 }]}
            onPress={(e) => {
              e.stopPropagation();
              if (onDeleteGoal) {
                onDeleteGoal(goal.id).catch((error) => {
                  console.error('削除エラー:', error);
                });
              }
            }}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.deleteButtonText}>×</Text>
          </TouchableOpacity>
        )}
      </View>
      <Text style={titleStyle}>{goal.title}</Text>
      {goal.description && (
        <Text style={descriptionStyle}>
          {goal.description}
        </Text>
      )}
      <Text style={dateStyle}>
        達成日: {goal.completed_at ? new Date(goal.completed_at).toLocaleDateString('ja-JP') : '不明'}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  goalsList: {
    gap: 12,
  },
  completedGoalCard: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  completedGoalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    position: 'relative',
    zIndex: 1,
  },
  completedGoalBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  completedGoalBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  completedGoalTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  completedGoalDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  completedGoalDate: {
    fontSize: 12,
  },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF4444',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    position: 'relative',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 20,
  },
});

// デフォルトエクスポートを追加（Expo Routerのルートエラーを回避）
export default CompletedGoalsSection;

