import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Calendar, Plus, Edit3, Trash2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { logger } from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import { supabase } from '@/lib/supabase';

// テーマの型定義
interface InstrumentTheme {
  background: string;
  surface: string;
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  textSecondary: string;
}

interface Event {
  id: string;
  title: string;
  description?: string;
}

interface EventManagementSectionProps {
  currentTheme: InstrumentTheme | null | undefined;
  events: { [key: number]: Event[] } | null | undefined;
  onAddEvent: () => void;
  onEditEvent: (event: Event) => void;
  onEventDeleted: () => void;
}

// デフォルトテーマ
const defaultTheme: InstrumentTheme = {
  background: '#FFFFFF',
  surface: '#F5F5F5',
  primary: '#2196F3',
  secondary: '#4ECDC4',
  accent: '#9C27B0',
  text: '#333333',
  textSecondary: '#666666',
};

export default function EventManagementSection({
  currentTheme,
  events,
  onAddEvent,
  onEditEvent,
  onEventDeleted,
}: EventManagementSectionProps) {
  const router = useRouter();
  
  // currentThemeがundefinedまたはnullの場合はデフォルトテーマを使用
  const theme = currentTheme || defaultTheme;

  const handleDeleteEvent = async (event: Event) => {
    Alert.alert(
      '削除の確認',
      'このイベントを削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('events')
                .delete()
                .eq('id', event.id);

              if (error) throw error;
              
              onEventDeleted();
              logger.info('イベントを削除しました');
            } catch (error) {
              ErrorHandler.handle(error, 'イベントの削除', true);
              logger.error('イベントの削除エラー:', error);
              Alert.alert('エラー', 'イベントの削除に失敗しました');
            }
          },
        },
      ]
    );
  };

  const allEvents = events ? Object.values(events).flat() : [];
  const displayEvents = allEvents.slice(0, 5);

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <View style={styles.header}>
        <Calendar size={20} color={theme.primary} />
        <Text style={[styles.title, { color: theme.text }]}>イベント管理</Text>
      </View>
      
      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: theme.primary }]}
        onPress={onAddEvent}
      >
        <Plus size={16} color="#FFFFFF" />
        <Text style={styles.addButtonText}>イベントを登録</Text>
      </TouchableOpacity>

      {allEvents.length === 0 ? (
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          まだ登録されたイベントはありません
        </Text>
      ) : (
        displayEvents.map((event, index) => (
          <View key={`event-${event.id}-${index}`} style={styles.eventCard}>
            <View style={styles.eventHeader}>
              <Text style={[styles.eventTitle, { color: theme.text }]}>{event.title}</Text>
              <View style={styles.eventActions}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: theme.secondary }]}
                  onPress={() => onEditEvent(event)}
                >
                  <Edit3 size={14} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#FF4444' }]}
                  onPress={() => handleDeleteEvent(event)}
                >
                  <Trash2 size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
            {event.description && (
              <Text style={[styles.eventDescription, { color: theme.textSecondary }]}>
                {event.description}
              </Text>
            )}
          </View>
        ))
      )}
      
      {allEvents.length > 5 && (
        <TouchableOpacity
          style={[styles.viewAllButton, { backgroundColor: theme.secondary }]}
          onPress={() => router.push('/(tabs)/goals')}
        >
          <Text style={styles.viewAllButtonText}>すべてのイベントを見る</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 0,
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 0,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 0,
    marginBottom: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    fontStyle: 'italic',
    marginVertical: 8,
  },
  eventCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 0,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 2,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  eventTitle: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
    lineHeight: 14,
  },
  eventActions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionButton: {
    padding: 6,
    borderRadius: 0,
  },
  eventDescription: {
    fontSize: 9,
    fontStyle: 'italic',
    lineHeight: 12,
    marginTop: 2,
  },
  viewAllButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 0,
    alignItems: 'center',
    marginTop: 8,
  },
  viewAllButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
  },
});

