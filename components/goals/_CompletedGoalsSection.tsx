/**
 * 達成済み目標セクションコンポーネント
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Trophy } from 'lucide-react-native';
import { Goal } from '@/lib/tabs/goals/types';
import { CompletedGoalCard } from '@/components/tabs/goals/components/_CompletedGoalCard';
import { styles } from '@/lib/tabs/goals/styles';

interface CompletedGoalsSectionProps {
  completedGoals: Goal[];
  onUpdateProgress: (goalId: string, progress: number) => Promise<void>;
  onDeleteGoal: (goalId: string) => Promise<void>;
}

export const CompletedGoalsSection: React.FC<CompletedGoalsSectionProps> = ({
  completedGoals,
  onUpdateProgress,
  onDeleteGoal,
}) => {
  const personalCompletedGoals = completedGoals.filter(goal => goal.goal_type !== 'group');

  if (personalCompletedGoals.length === 0) {
    return null;
  }

  return (
    <View style={styles.completedSection}>
      <View style={styles.completedSectionHeader}>
        <Trophy size={24} color="#4CAF50" />
        <Text style={[styles.completedSectionTitle, { color: '#000000' }]}>
          達成済み
        </Text>
      </View>
      <View style={styles.goalsList}>
        {personalCompletedGoals.map((goal) => (
          <CompletedGoalCard
            key={goal.id}
            goal={goal}
            onUpdateProgress={onUpdateProgress}
            onDeleteGoal={onDeleteGoal}
          />
        ))}
      </View>
    </View>
  );
};

