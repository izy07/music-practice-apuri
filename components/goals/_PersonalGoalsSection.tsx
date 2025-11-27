/**
 * 個人目標セクションコンポーネント
 * 
 * 短期目標と長期目標の表示と追加ボタンを提供
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Plus, Target } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useInstrumentThemeLight } from '@/hooks/useInstrumentThemeLight';
import { Goal } from '@/lib/tabs/goals/types';
import { styles } from '@/lib/tabs/goals/styles';

interface PersonalGoalsSectionProps {
  userProfile: { nickname?: string | null };
  goals: Goal[];
  onGoalTypeSelect: (type: 'personal_short' | 'personal_long') => void;
}

export const PersonalGoalsSection: React.FC<PersonalGoalsSectionProps> = ({
  userProfile,
  goals,
  onGoalTypeSelect,
}) => {
  const router = useRouter();
  const { primaryColor } = useInstrumentThemeLight();

  const shortTermGoal = goals.find(goal => goal.goal_type === 'personal_short');
  const longTermGoal = goals.find(goal => goal.goal_type === 'personal_long');

  return (
    <View style={[styles.section, { backgroundColor: '#FFFFFF' }]}>
      <View style={styles.sectionHeader}>
        <Target size={24} color={primaryColor} />
        <Text style={[styles.sectionTitle, { color: '#000000' }]}>
          {userProfile.nickname ? `${userProfile.nickname}の目標！` : '目標'}
        </Text>
      </View>
      
      <View style={styles.goalTypes}>
        <TouchableOpacity
          style={[styles.goalTypeCard, { borderColor: primaryColor }]}
          onPress={() => onGoalTypeSelect('personal_short')}
        >
          <Text style={[styles.goalTypeTitle, { color: primaryColor }]}>短期目標</Text>
          <Text style={[styles.goalTypeDescription, { color: '#666666' }]}>
            {shortTermGoal?.title || 'もっと高い音を出せるようにする'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.goalTypeCard, { borderColor: primaryColor }]}
          onPress={() => onGoalTypeSelect('personal_long')}
        >
          <Text style={[styles.goalTypeTitle, { color: primaryColor }]}>長期目標</Text>
          <Text style={[styles.goalTypeDescription, { color: '#666666' }]}>
            {longTermGoal?.title || '〇〇を弾けるようになりたい。'}
          </Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity
        style={[styles.addGoalButton, { backgroundColor: primaryColor }]}
        onPress={() => router.push('/add-goal')}
      >
        <Plus size={20} color="#FFFFFF" />
        <Text style={[styles.addButtonText, { color: '#FFFFFF' }]}>目標を追加</Text>
      </TouchableOpacity>
    </View>
  );
};

