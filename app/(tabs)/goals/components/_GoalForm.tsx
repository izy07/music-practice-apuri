import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Calendar } from 'lucide-react-native';
import { styles } from '@/lib/tabs/goals/styles';

interface GoalFormProps {
  newGoal: {
    title: string;
    description: string;
    target_date: string;
    goal_type: 'personal_short' | 'personal_long';
  };
  setNewGoal: React.Dispatch<React.SetStateAction<{
    title: string;
    description: string;
    target_date: string;
    goal_type: 'personal_short' | 'personal_long';
  }>>;
  editingGoalId: string | null;
  setEditingGoalId: React.Dispatch<React.SetStateAction<string | null>>;
  setShowAddGoalForm: React.Dispatch<React.SetStateAction<boolean>>;
  selectedYear: number;
  setSelectedYear: React.Dispatch<React.SetStateAction<number>>;
  selectedMonth: number;
  setSelectedMonth: React.Dispatch<React.SetStateAction<number>>;
  setShowCalendar: React.Dispatch<React.SetStateAction<boolean>>;
  isSaving: boolean;
  saveGoal: () => Promise<void>;
  currentTheme: {
    surface: string;
    background: string;
    text: string;
    textSecondary: string;
    secondary: string;
    primary: string;
  };
}

export const GoalForm: React.FC<GoalFormProps> = ({
  newGoal,
  setNewGoal,
  editingGoalId,
  setEditingGoalId,
  setShowAddGoalForm,
  selectedYear,
  setSelectedYear,
  selectedMonth,
  setSelectedMonth,
  setShowCalendar,
  isSaving,
  saveGoal,
  currentTheme,
}) => {
  return (
    <View style={[styles.addGoalForm, { backgroundColor: currentTheme.surface }]}>
      <View style={styles.formHeader}>
        <Text style={[styles.formTitle, { color: currentTheme.text }]}>
          {editingGoalId ? '目標を編集' : '新しい目標を追加'}
        </Text>
        {editingGoalId && (
          <TouchableOpacity
            onPress={() => {
              setEditingGoalId(null);
              setNewGoal({ title: '', description: '', target_date: '', goal_type: 'personal_short' });
              setShowAddGoalForm(false);
            }}
            style={styles.closeButton}
          >
            <Text style={[styles.closeButtonText, { color: currentTheme.textSecondary }]}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: currentTheme.text }]}>目標タイトル</Text>
        <TextInput
          style={[styles.input, { 
            backgroundColor: currentTheme.background,
            color: currentTheme.text,
            borderColor: currentTheme.secondary
          }]}
          value={newGoal.title}
          onChangeText={(text) => {
            if (text.length <= 50) {
              setNewGoal({...newGoal, title: text});
            }
          }}
          placeholder={newGoal.goal_type === 'personal_short' ? '例: スケールを正確に弾ける' : '例: 憧れの曲を弾けるようになる'}
          placeholderTextColor={currentTheme.textSecondary}
          maxLength={50}
          nativeID="goal-title-input"
          accessibilityLabel="目標タイトル"
        />
        <Text style={[styles.characterCount, { color: currentTheme.textSecondary }]}>
          {newGoal.title.length}/50文字
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: currentTheme.text }]}>目標期日</Text>
        
        {/* 年・月選択 */}
        <View style={styles.dateSelectorRow}>
          <View style={styles.yearMonthSelector}>
            <TouchableOpacity
              style={[styles.selectorButton, { borderColor: currentTheme.secondary }]}
              onPress={() => setSelectedYear(prev => prev - 1)}
            >
              <Text style={[styles.selectorButtonText, { color: currentTheme.text }]}>◀</Text>
            </TouchableOpacity>
            <Text style={[styles.yearMonthText, { color: currentTheme.text }]}>
              {selectedYear}年{selectedMonth + 1}月
            </Text>
            <TouchableOpacity
              style={[styles.selectorButton, { borderColor: currentTheme.secondary }]}
              onPress={() => setSelectedYear(prev => prev + 1)}
            >
              <Text style={[styles.selectorButtonText, { color: currentTheme.text }]}>▶</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.monthSelector}>
            <TouchableOpacity
              style={[styles.selectorButton, { borderColor: currentTheme.secondary }]}
              onPress={() => {
                if (selectedMonth === 0) {
                  setSelectedMonth(11);
                  setSelectedYear(prev => prev - 1);
                } else {
                  setSelectedMonth(prev => prev - 1);
                }
              }}
            >
              <Text style={[styles.selectorButtonText, { color: currentTheme.text }]}>◀</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.selectorButton, { borderColor: currentTheme.secondary }]}
              onPress={() => {
                if (selectedMonth === 11) {
                  setSelectedMonth(0);
                  setSelectedYear(prev => prev + 1);
                } else {
                  setSelectedMonth(prev => prev + 1);
                }
              }}
            >
              <Text style={[styles.selectorButtonText, { color: currentTheme.text }]}>▶</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* 日付選択 */}
        <TouchableOpacity
          style={[styles.dateInput, { 
            backgroundColor: currentTheme.background,
            borderColor: currentTheme.secondary
          }]}
          onPress={() => setShowCalendar(true)}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.dateInputText, 
            { 
              color: newGoal.target_date ? currentTheme.text : currentTheme.textSecondary 
            }
          ]}>
            {newGoal.target_date ? newGoal.target_date : '日付を選択'}
          </Text>
          <Calendar size={20} color={currentTheme.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.typeButton, newGoal.goal_type === 'personal_short' && { backgroundColor: currentTheme.primary }]}
          onPress={() => setNewGoal({...newGoal, goal_type: 'personal_short'})}
        >
          <Text style={[styles.typeButtonText, { 
            color: newGoal.goal_type === 'personal_short' ? '#FFFFFF' : currentTheme.text 
          }]}>
            短期目標
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeButton, newGoal.goal_type === 'personal_long' && { backgroundColor: currentTheme.primary }]}
          onPress={() => setNewGoal({...newGoal, goal_type: 'personal_long'})}
        >
          <Text style={[styles.typeButtonText, { 
            color: newGoal.goal_type === 'personal_long' ? '#FFFFFF' : currentTheme.text 
          }]}>
            長期目標
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={[styles.saveButton, { backgroundColor: currentTheme.primary, opacity: isSaving ? 0.6 : 1 }]} 
        onPress={saveGoal}
        disabled={isSaving}
      >
        {isSaving ? (
          <Text style={styles.saveButtonText}>{editingGoalId ? '更新中...' : '保存中...'}</Text>
        ) : (
          <Text style={styles.saveButtonText}>{editingGoalId ? '目標を更新' : '目標を保存'}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};
