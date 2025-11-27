import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert, Modal, TextInput } from 'react-native';
import { CheckSquare, Plus, ArrowLeft, Users, Calendar, Edit3 } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import InstrumentHeader from '@/components/InstrumentHeader';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { useLanguage } from '@/components/LanguageContext';
import { TaskManager, SubGroupManager, PracticeTask, SubGroup, TaskProgress } from '@/lib/groupManagement';

export default function TasksScreen() {
  const router = useRouter();
  const { orgId } = useLocalSearchParams();
  const { currentTheme } = useInstrumentTheme();
  const { t } = useLanguage();
  
  // 状態管理
  const [subGroups, setSubGroups] = useState<SubGroup[]>([]);
  const [selectedSubGroup, setSelectedSubGroup] = useState<SubGroup | null>(null);
  const [tasks, setTasks] = useState<PracticeTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    dueDate: ''
  });

  useEffect(() => {
    loadSubGroups();
  }, [orgId]);

  useEffect(() => {
    if (selectedSubGroup) {
      loadTasks();
    }
  }, [selectedSubGroup]);

  const loadSubGroups = async () => {
    setLoading(true);
    try {
      const result = await SubGroupManager.getOrganizationSubGroups(orgId as string);
      if (result.success && result.subGroups) {
        setSubGroups(result.subGroups);
        // 最初のサブグループを選択
        if (result.subGroups.length > 0) {
          setSelectedSubGroup(result.subGroups[0]);
        }
      }
    } catch (error) {
      console.error('サブグループ読み込みエラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async () => {
    if (!selectedSubGroup) return;
    
    setLoading(true);
    try {
      const result = await TaskManager.getSubGroupTasks(selectedSubGroup.id);
      if (result.success && result.tasks) {
        setTasks(result.tasks);
      }
    } catch (error) {
      console.error('タスク読み込みエラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTask = async () => {
    if (!selectedSubGroup || !createForm.title.trim()) {
      Alert.alert('エラー', 'タイトルを入力してください');
      return;
    }

    setLoading(true);
    try {
      const result = await TaskManager.createTask(
        orgId as string,
        selectedSubGroup.id,
        createForm.title.trim(),
        createForm.description.trim() || undefined,
        undefined, // assignedTo
        'medium', // priority
        createForm.dueDate || undefined // dueDate
      );

      if (result.success) {
        Alert.alert('成功', 'タスクを作成しました！');
        setShowCreateModal(false);
        setCreateForm({ title: '', description: '', dueDate: '' });
        await loadTasks();
      } else {
        Alert.alert('エラー', result.error || 'タスクの作成に失敗しました');
      }
    } catch (error) {
      Alert.alert('エラー', 'タスクの作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const updateTaskProgress = async (taskId: string, status: 'not_started' | 'in_progress' | 'completed') => {
    setLoading(true);
    try {
      const result = await TaskManager.updateTaskProgress(taskId, status);
      if (result.success) {
        await loadTasks();
      } else {
        Alert.alert('エラー', result.error || '進捗の更新に失敗しました');
      }
    } catch (error) {
      Alert.alert('エラー', '進捗の更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const getProgressStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckSquare size={20} color="#4CAF50" />;
      case 'in_progress':
        return <Edit3 size={20} color="#FF9800" />;
      case 'not_started':
        return <CheckSquare size={20} color="#9E9E9E" />;
      default:
        return <CheckSquare size={20} color="#9E9E9E" />;
    }
  };

  const getProgressStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return '完了';
      case 'in_progress': return '進行中';
      case 'not_started': return '未着手';
      default: return '未着手';
    }
  };

  const getProgressStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#4CAF50';
      case 'in_progress': return '#FF9800';
      case 'not_started': return '#9E9E9E';
      default: return '#9E9E9E';
    }
  };

  const isOverdue = (dueDate: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const getSubGroupTypeLabel = (type: string) => {
    switch (type) {
      case 'part': return 'パート';
      case 'grade': return '学年';
      case 'section': return 'セクション';
      default: return type;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} edges={[]}>
      <InstrumentHeader />
      
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={currentTheme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: currentTheme.text }]}>
          課題管理
        </Text>
        <TouchableOpacity onPress={() => setShowCreateModal(true)}>
          <Plus size={24} color={currentTheme.primary} />
        </TouchableOpacity>
      </View>

      {/* サブグループ選択 */}
      {subGroups.length > 0 && (
        <View style={styles.subGroupSelector}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {subGroups.map((subGroup) => (
              <TouchableOpacity
                key={subGroup.id}
                style={[
                  styles.subGroupButton,
                  { 
                    backgroundColor: selectedSubGroup?.id === subGroup.id ? currentTheme.primary : currentTheme.surface,
                    borderColor: selectedSubGroup?.id === subGroup.id ? currentTheme.primary : currentTheme.secondary
                  }
                ]}
                onPress={() => setSelectedSubGroup(subGroup)}
              >
                <Text style={[
                  styles.subGroupButtonText,
                  { 
                    color: selectedSubGroup?.id === subGroup.id ? currentTheme.surface : currentTheme.text
                  }
                ]}>
                  {subGroup.name}
                </Text>
                <Text style={[
                  styles.subGroupTypeText,
                  { 
                    color: selectedSubGroup?.id === subGroup.id ? currentTheme.surface : currentTheme.textSecondary
                  }
                ]}>
                  {getSubGroupTypeLabel(subGroup.group_type)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* タスク一覧 */}
        <View style={styles.section}>
          {selectedSubGroup && (
            <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
              {selectedSubGroup.name}の課題
            </Text>
          )}
          
          {tasks.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: currentTheme.surface }]}>
              <CheckSquare size={48} color={currentTheme.textSecondary} />
              <Text style={[styles.emptyStateText, { color: currentTheme.text }]}>
                課題がありません
              </Text>
              <Text style={[styles.emptyStateSubtext, { color: currentTheme.textSecondary }]}>
                新しい課題を作成してください
              </Text>
            </View>
          ) : (
            tasks.map((task) => (
              <View key={task.id} style={[styles.taskCard, { backgroundColor: currentTheme.surface }]}>
                <View style={styles.taskHeader}>
                  <View style={styles.taskTitleContainer}>
                    <Text style={[styles.taskTitle, { color: currentTheme.text }]}>
                      {task.title}
                    </Text>
                    {task.dueDate && (
                      <View style={[
                        styles.dueDateContainer,
                        { 
                          backgroundColor: isOverdue(task.dueDate) ? '#F44336' : currentTheme.primary + '20'
                        }
                      ]}>
                        <Calendar size={12} color={isOverdue(task.dueDate) ? '#FFFFFF' : currentTheme.primary} />
                        <Text style={[
                          styles.dueDateText,
                          { color: isOverdue(task.dueDate) ? '#FFFFFF' : currentTheme.primary }
                        ]}>
                          {new Date(task.dueDate).toLocaleDateString('ja-JP', { 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: getProgressStatusColor('not_started') + '20' }
                  ]}>
                    <Text style={[
                      styles.statusText,
                      { color: getProgressStatusColor('not_started') }
                    ]}>
                      {getProgressStatusLabel('not_started')}
                    </Text>
                  </View>
                </View>

                {task.description && (
                  <Text style={[styles.taskDescription, { color: currentTheme.textSecondary }]}>
                    {task.description}
                  </Text>
                )}

                {/* 進捗更新ボタン */}
                <View style={styles.progressButtons}>
                  <TouchableOpacity
                    style={[
                      styles.progressButton,
                      { 
                        backgroundColor: '#9E9E9E',
                        opacity: 'not_started' === 'not_started' ? 1 : 0.5
                      }
                    ]}
                    onPress={() => updateTaskProgress(task.id, 'not_started')}
                    disabled={loading}
                  >
                    <CheckSquare size={16} color="#FFFFFF" />
                    <Text style={styles.progressButtonText}>未着手</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.progressButton,
                      { 
                        backgroundColor: '#FF9800',
                        opacity: 'in_progress' === 'in_progress' ? 1 : 0.5
                      }
                    ]}
                    onPress={() => updateTaskProgress(task.id, 'in_progress')}
                    disabled={loading}
                  >
                    <Edit3 size={16} color="#FFFFFF" />
                    <Text style={styles.progressButtonText}>進行中</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.progressButton,
                      { 
                        backgroundColor: '#4CAF50',
                        opacity: 'completed' === 'completed' ? 1 : 0.5
                      }
                    ]}
                    onPress={() => updateTaskProgress(task.id, 'completed')}
                    disabled={loading}
                  >
                    <CheckSquare size={16} color="#FFFFFF" />
                    <Text style={styles.progressButtonText}>完了</Text>
                  </TouchableOpacity>
                </View>

                {/* メンバーの進捗状況 */}
                <View style={styles.membersProgress}>
                  <Text style={[styles.membersProgressTitle, { color: currentTheme.textSecondary }]}>
                    メンバーの進捗
                  </Text>
                  <View style={styles.progressStats}>
                    <View style={styles.progressStat}>
                      <Text style={[styles.progressStatNumber, { color: '#4CAF50' }]}>0</Text>
                      <Text style={[styles.progressStatLabel, { color: currentTheme.textSecondary }]}>完了</Text>
                    </View>
                    <View style={styles.progressStat}>
                      <Text style={[styles.progressStatNumber, { color: '#FF9800' }]}>0</Text>
                      <Text style={[styles.progressStatLabel, { color: currentTheme.textSecondary }]}>進行中</Text>
                    </View>
                    <View style={styles.progressStat}>
                      <Text style={[styles.progressStatNumber, { color: '#9E9E9E' }]}>0</Text>
                      <Text style={[styles.progressStatLabel, { color: currentTheme.textSecondary }]}>未着手</Text>
                    </View>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* タスク作成モーダル */}
      <Modal
        visible={showCreateModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: currentTheme.text }]}>
                新しい課題を作成
              </Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Text style={[styles.closeButton, { color: currentTheme.text }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedSubGroup && (
                <View style={styles.selectedSubGroupInfo}>
                  <Users size={20} color={currentTheme.primary} />
                  <Text style={[styles.selectedSubGroupText, { color: currentTheme.text }]}>
                    {selectedSubGroup.name} ({getSubGroupTypeLabel(selectedSubGroup.group_type)})
                  </Text>
                </View>
              )}

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: currentTheme.text }]}>
                  課題タイトル *
                </Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: currentTheme.background,
                    color: currentTheme.text,
                    borderColor: currentTheme.secondary
                  }]}
                  value={createForm.title}
                  onChangeText={(text) => setCreateForm(prev => ({ ...prev, title: text }))}
                  placeholder="例：第1楽章の1-10小節を練習する"
                  placeholderTextColor={currentTheme.textSecondary}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: currentTheme.text }]}>
                  詳細説明
                </Text>
                <TextInput
                  style={[styles.textArea, { 
                    backgroundColor: currentTheme.background,
                    color: currentTheme.text,
                    borderColor: currentTheme.secondary
                  }]}
                  value={createForm.description}
                  onChangeText={(text) => setCreateForm(prev => ({ ...prev, description: text }))}
                  placeholder="課題の詳細な説明を入力"
                  placeholderTextColor={currentTheme.textSecondary}
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: currentTheme.text }]}>
                  期限（任意）
                </Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: currentTheme.background,
                    color: currentTheme.text,
                    borderColor: currentTheme.secondary
                  }]}
                  value={createForm.dueDate}
                  onChangeText={(text) => setCreateForm(prev => ({ ...prev, dueDate: text }))}
                  placeholder="YYYY-MM-DD形式"
                  placeholderTextColor={currentTheme.textSecondary}
                />
              </View>

              <TouchableOpacity
                style={[styles.modalButton, { 
                  backgroundColor: currentTheme.primary,
                  opacity: loading ? 0.6 : 1
                }]}
                onPress={createTask}
                disabled={loading}
              >
                <Text style={[styles.modalButtonText, { color: currentTheme.surface }]}>
                  {loading ? '作成中...' : '課題を作成'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  subGroupSelector: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  subGroupButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  subGroupButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  subGroupTypeText: {
    fontSize: 12,
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    borderRadius: 12,
    elevation: 2,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  taskCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  taskTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  dueDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  dueDateText: {
    fontSize: 10,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  taskDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  progressButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  progressButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginHorizontal: 2,
    borderRadius: 8,
    gap: 4,
  },
  progressButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  membersProgress: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  membersProgressTitle: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  progressStat: {
    alignItems: 'center',
  },
  progressStatNumber: {
    fontSize: 18,
    fontWeight: '700',
  },
  progressStatLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    fontSize: 24,
    fontWeight: '600',
  },
  modalBody: {
    padding: 20,
  },
  selectedSubGroupInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  selectedSubGroupText: {
    fontSize: 14,
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
  },
  modalButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
