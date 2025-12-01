import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, Target, Calendar, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import InstrumentHeader from '@/components/InstrumentHeader';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { supabase } from '@/lib/supabase';
import { safeGoBack } from '@/lib/navigationUtils';
import EventCalendar from '../components/EventCalendar';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import { goalService } from '@/services/goalService';

interface NewGoal {
  title: string;
  description: string;
  target_date: string;
  goal_type: 'personal_short' | 'personal_long';
}

export default function AddGoalScreen() {
  const router = useRouter();
  const { currentTheme, selectedInstrument } = useInstrumentTheme();
  
  const [newGoal, setNewGoal] = useState<NewGoal>({
    title: '',
    description: '',
    target_date: '',
    goal_type: 'personal_short'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);


  const saveGoal = async () => {
    if (!newGoal.title.trim()) {
      Alert.alert('エラー', '目標タイトルを入力してください');
      return;
    }

    if (!newGoal.goal_type) {
      Alert.alert('エラー', '目標タイプを選択してください');
      return;
    }

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('エラー', 'ユーザーが認証されていません');
        setIsLoading(false);
        return;
      }

      logger.debug('目標作成開始:', { title: newGoal.title, goal_type: newGoal.goal_type });

      const result = await goalService.createGoal(user.id, {
        title: newGoal.title.trim(),
        description: newGoal.description || undefined,
        target_date: newGoal.target_date || undefined,
        goal_type: newGoal.goal_type,
        instrument_id: selectedInstrument || null,
      });

      if (!result.success) {
        ErrorHandler.handle(new Error(result.error || '目標の作成に失敗しました'), '目標作成', true);
        Alert.alert('エラー', result.error || '目標の作成に失敗しました');
        setIsLoading(false);
        return;
      }

      logger.debug('目標作成成功');
      Alert.alert('成功', '目標が保存されました');
      // 保存成功後、前の画面に戻る（安全な戻る処理）
      safeGoBack('/(tabs)/goals');
    } catch (error) {
      ErrorHandler.handle(error, '目標保存', true);
      Alert.alert('エラー', '目標の保存に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const getGoalTypeColor = (type: string) => {
    switch (type) {
      case 'personal_short': return '#4CAF50';
      case 'personal_long': return '#2196F3';
      default: return '#666666';
    }
  };

  const getGoalTypeLabel = (type: string) => {
    switch (type) {
      case 'personal_short': return '短期目標';
      case 'personal_long': return '長期目標';
      default: return '目標';
    }
  };



  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} >
      <InstrumentHeader />
      
      {/* ヘッダー */}
      <View style={[styles.header, { borderBottomColor: currentTheme.secondary }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => safeGoBack('/(tabs)/goals')}
        >
          <ArrowLeft size={24} color={currentTheme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: currentTheme.text }]}>新しい目標を追加</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 目標タイプ選択 */}
        <View style={styles.goalTypeSection}>
          <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>目標タイプを選択</Text>
          <View style={styles.goalTypeCards}>
            <TouchableOpacity
              style={[
                styles.goalTypeCard,
                { 
                  borderColor: newGoal.goal_type === 'personal_short' ? currentTheme.primary : currentTheme.secondary,
                  backgroundColor: newGoal.goal_type === 'personal_short' ? `${currentTheme.primary}20` : currentTheme.surface
                }
              ]}
              onPress={() => setNewGoal({...newGoal, goal_type: 'personal_short'})}
            >
              <Target size={20} color={newGoal.goal_type === 'personal_short' ? currentTheme.primary : currentTheme.textSecondary} />
              <Text style={[styles.goalTypeTitle, { color: newGoal.goal_type === 'personal_short' ? currentTheme.primary : currentTheme.text }]}>
                短期目標
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.goalTypeCard,
                { 
                  borderColor: newGoal.goal_type === 'personal_long' ? currentTheme.primary : currentTheme.secondary,
                  backgroundColor: newGoal.goal_type === 'personal_long' ? `${currentTheme.primary}20` : currentTheme.surface
                }
              ]}
              onPress={() => setNewGoal({...newGoal, goal_type: 'personal_long'})}
            >
              <Target size={20} color={newGoal.goal_type === 'personal_long' ? currentTheme.primary : currentTheme.textSecondary} />
              <Text style={[styles.goalTypeTitle, { color: newGoal.goal_type === 'personal_long' ? currentTheme.primary : currentTheme.text }]}>
                長期目標
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 目標詳細フォーム */}
        <View style={[styles.formSection, { backgroundColor: currentTheme.surface }]}>
          <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>目標の詳細</Text>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: currentTheme.text }]}>目標タイトル *</Text>
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
              placeholder={newGoal.goal_type === 'personal_short' ? "例: 〇〇を完璧にする\n製本する" : "例: 憧れの曲を弾けるようにする"}
              placeholderTextColor={currentTheme.textSecondary}
              maxLength={50}
              multiline={true}
              numberOfLines={2}
              textAlignVertical="top"
            />
            <Text style={[styles.characterCount, { color: currentTheme.textSecondary }]}>
              {newGoal.title.length}/50文字
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: currentTheme.text }]}>説明</Text>
            <TextInput
              style={[styles.textArea, { 
                backgroundColor: currentTheme.background,
                color: currentTheme.text,
                borderColor: currentTheme.secondary
              }]}
              value={newGoal.description}
              onChangeText={(text) => setNewGoal({...newGoal, description: text})}
              placeholder="目標についての詳細な説明"
              placeholderTextColor={currentTheme.textSecondary}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: currentTheme.text }]}>目標期日</Text>
            <View style={styles.dateInputContainer}>
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
                  {newGoal.target_date ? newGoal.target_date : '日付を選択してください'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.calendarIconButton, { backgroundColor: `${currentTheme.primary}20` }]}
                onPress={() => setShowCalendar(true)}
                activeOpacity={0.7}
              >
                <Calendar size={20} color={currentTheme.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 保存ボタン */}
        <View style={styles.saveButtonContainer}>
          <TouchableOpacity 
            style={[
              styles.saveButton, 
              { 
                backgroundColor: isLoading ? currentTheme.textSecondary : currentTheme.primary,
                opacity: isLoading ? 0.6 : 1
              }
            ]} 
            onPress={saveGoal}
            disabled={isLoading}
          >
            <Plus size={20} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>
              {isLoading ? '保存中...' : '目標を保存'}
            </Text>
          </TouchableOpacity>
          
          {!isLoading && (
            <Text style={[styles.saveButtonSubText, { color: currentTheme.textSecondary }]}>
              保存後は目標画面に戻ります
            </Text>
          )}
        </View>
      </ScrollView>

      {/* カレンダーモーダル */}
      <Modal
        visible={showCalendar}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCalendar(false)}
      >
        <View style={styles.calendarOverlay}>
          <View style={styles.calendarModal}>
            <View style={styles.calendarHeader}>
              <TouchableOpacity onPress={() => setShowCalendar(false)}>
                <Text style={styles.calendarCloseButtonText}>閉じる</Text>
              </TouchableOpacity>
            </View>
            
            <EventCalendar
              onDateSelect={(date: Date) => {
                const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                setNewGoal({...newGoal, target_date: formattedDate});
                setShowCalendar(false);
              }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  goalTypeSection: {
    marginTop: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  goalTypeCards: {
    flexDirection: 'row',
    gap: 12,
  },
  goalTypeCard: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    gap: 6,
  },
  goalTypeTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  goalTypeDescription: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  formSection: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    marginTop: 6,
  },
  inputGroup: {
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 5,
  },
  characterCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  input: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
  },
  textArea: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 70,
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateInput: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
  },
  calendarIconButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    marginBottom: 8,
  },
  saveButtonSubText: {
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  // カレンダーモーダル用のスタイル
  calendarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarModal: {
    width: 320,
    borderRadius: 16,
    padding: 20,
    backgroundColor: '#FFFFFF',
    
    
    elevation: 10,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 20,
  },
  calendarCloseButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  dateInputText: {
    fontSize: 16,
    flex: 1,
  },
});
