/**
 * 達成済み目標セクションコンポーネント
 */

import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Trophy } from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Goal } from '@/lib/tabs/goals/types';
import { CompletedGoalCard } from '@/components/tabs/goals/components/_CompletedGoalCard';

interface Props {
  completedGoals: Goal[];
  getGoalTypeLabel: (type: string) => string;
  getGoalTypeColor: (type: string) => string;
  onUpdateProgress?: (goalId: string, progress: number) => Promise<void>;
  onDeleteGoal?: (goalId: string) => Promise<void>;
  onUncompleteGoal?: (goalId: string) => Promise<void>;
  onGoalUpdated?: (goal: Goal) => void;
  /** レスポンシブ: セクションの最大幅（指定時のみ適用） */
  sectionMaxWidth?: number;
  /** レスポンシブ: セクションのパディング */
  sectionPadding?: number;
}

export const CompletedGoalsSection: React.FC<Props> = memo(({
  completedGoals,
  getGoalTypeLabel,
  getGoalTypeColor,
  onUpdateProgress,
  onDeleteGoal,
  onUncompleteGoal,
  onGoalUpdated,
  sectionMaxWidth,
  sectionPadding,
}) => {
  const colors = useThemeColors();

  const sectionStyle = useMemo(() => [
    styles.section,
    { backgroundColor: colors.surface },
    ...(sectionMaxWidth != null
      ? [{ width: sectionMaxWidth, maxWidth: '100%' as const, alignSelf: 'center' as const }]
      : [{ width: '100%' as const, alignSelf: 'stretch' as const }]),
    ...(sectionPadding != null ? [{ padding: sectionPadding }] : []),
  ], [colors.surface, sectionMaxWidth, sectionPadding]);

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
              onUpdateProgress={onUpdateProgress}
              onDeleteGoal={onDeleteGoal}
              onUncompleteGoal={onUncompleteGoal}
              onGoalUpdated={onGoalUpdated}
            />
          ))}
        </View>
      )}
    </View>
  );
});


const styles = StyleSheet.create({
  section: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    width: '100%',
    alignSelf: 'stretch',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    minWidth: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  goalsList: {
    gap: 12,
    width: '100%',
    alignItems: 'stretch',
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
  uncompleteButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uncompleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

// デフォルトエクスポートを追加（Expo Routerのルートエラーを回避）
export default CompletedGoalsSection;

