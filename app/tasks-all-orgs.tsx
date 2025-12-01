/**
 * 全組織の課題一覧画面
 * 
 * 参加中の全組織の課題と代表曲を表示し、選択できる画面
 * 
 * @module app/tasks-all-orgs
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ClipboardList } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import InstrumentHeader from '@/components/InstrumentHeader';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { useLanguage } from '@/components/LanguageContext';
import { useOrganization } from '@/hooks/useOrganization';
import { taskService } from '@/services/taskService';
import type { Task } from '@/types/organization';

interface UnifiedTask extends Task {
  organization_name: string;
}

export default function TasksAllOrgsScreen() {
  const router = useRouter();
  const { currentTheme } = useInstrumentTheme();
  const { t } = useLanguage();
  const { organizations, loadOrganizations, loading: orgLoading } = useOrganization();
  
  const [tasks, setTasks] = useState<UnifiedTask[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadOrganizations();
  }, []);

  useEffect(() => {
    if (organizations.length > 0) {
      loadAllTasks();
    }
  }, [organizations]);

  const loadAllTasks = async () => {
    setLoading(true);
    try {
      const allTasks: UnifiedTask[] = [];
      
      for (const org of organizations) {
        try {
          // 組織のサブグループを取得
          // 組織のタスクを取得
          const tasksResult = await taskService.getByOrganizationId(org.id);
          if (tasksResult.success && tasksResult.data) {
            for (const task of tasksResult.data) {
              allTasks.push({
                ...task,
                organization_name: org.name,
              });
            }
          }
        } catch (error) {
          console.error(`組織 ${org.id} のタスク取得エラー:`, error);
        }
      }
      
      // 作成日時の新しい順にソート
      allTasks.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });
      
      setTasks(allTasks);
    } catch (error) {
      console.error('タスク読み込みエラー:', error);
      Alert.alert('エラー', 'タスクの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };


  const getStatusText = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return '完了';
      case 'in_progress':
        return '進行中';
      default:
        return '未着手';
    }
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return '#4CAF50';
      case 'in_progress':
        return '#FF9800';
      default:
        return '#9E9E9E';
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} >
      <InstrumentHeader />
      
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={currentTheme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: currentTheme.text }]}>
          全組織の課題一覧
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* コンテンツ */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: currentTheme.textSecondary }]}>
              読み込み中...
            </Text>
          </View>
        ) : tasks.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: currentTheme.surface }]}>
            <ClipboardList size={48} color={currentTheme.textSecondary} />
            <Text style={[styles.emptyText, { color: currentTheme.text }]}>
              課題がありません
            </Text>
          </View>
        ) : (
          tasks.map((task) => (
            <TouchableOpacity
              key={task.id}
              style={[styles.taskCard, { backgroundColor: currentTheme.surface }]}
              onPress={() => {
                // 課題詳細画面に遷移（実装が必要）
                Alert.alert('課題詳細', `課題: ${task.title}\n組織: ${task.organization_name}`);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.taskHeader}>
                <View style={styles.taskInfo}>
                  <Text style={[styles.taskTitle, { color: currentTheme.text }]} numberOfLines={2}>
                    {task.title}
                  </Text>
                  <Text style={[styles.taskOrganization, { color: currentTheme.textSecondary }]}>
                    {task.organization_name}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(task.status) + '20' },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: getStatusColor(task.status) },
                    ]}
                  >
                    {getStatusText(task.status)}
                  </Text>
                </View>
              </View>
              
              {task.description && (
                <Text
                  style={[styles.taskDescription, { color: currentTheme.textSecondary }]}
                  numberOfLines={2}
                >
                  {task.description}
                </Text>
              )}
              
              {task.due_date && (
                <View style={styles.taskMeta}>
                  <Text style={[styles.taskMetaText, { color: currentTheme.textSecondary }]}>
                    期限: {new Date(task.due_date).toLocaleDateString('ja-JP')}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
  taskCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  taskInfo: {
    flex: 1,
    marginRight: 12,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  taskOrganization: {
    fontSize: 12,
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
    marginBottom: 8,
  },
  taskMeta: {
    marginTop: 4,
  },
  taskMetaText: {
    fontSize: 12,
  },
});

