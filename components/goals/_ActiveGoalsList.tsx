/**
 * 未達成目標リストコンポーネント
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Goal } from '@/lib/tabs/goals/types';
import { GoalCard } from '@/components/tabs/goals/components/_GoalCard';
import { styles } from '@/lib/tabs/goals/styles';

interface ActiveGoalsListProps {
  goals: Goal[];
  justCompletedId: string | null;
  onUpdateProgress: (goalId: string, progress: number) => Promise<void>;
  onCompleteGoal: (goalId: string) => Promise<void>;
  onDeleteGoal: (goalId: string) => Promise<void>;
  onSetGoalShowOnCalendar: (goalId: string, show: boolean) => Promise<void>;
}

export const ActiveGoalsList: React.FC<ActiveGoalsListProps> = ({
  goals,
  justCompletedId,
  onUpdateProgress,
  onCompleteGoal,
  onDeleteGoal,
  onSetGoalShowOnCalendar,
}) => {
  const personalGoals = goals.filter(goal => goal.goal_type !== 'group');

  return (
    <View style={styles.goalsList}>
      {personalGoals.map((goal) => (
        <GoalCard
          key={goal.id}
          goal={goal}
          justCompletedId={justCompletedId}
          onUpdateProgress={onUpdateProgress}
          onCompleteGoal={onCompleteGoal}
          onDeleteGoal={onDeleteGoal}
          onSetGoalShowOnCalendar={onSetGoalShowOnCalendar}
        />
      ))}
    </View>
  );
};

