import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { Calendar, Plus, Edit3, Trash2, Filter } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { logger } from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import { supabase } from '@/lib/supabase';
import { EVENT_COLORS, EventColor, getEventColorCode, getEventColorOption } from '@/lib/eventColors';

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
  date?: string;
  color?: EventColor | string | null;
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
  const [selectedColorFilter, setSelectedColorFilter] = useState<EventColor | 'all'>('all');
  
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
  
  // 色でフィルタリング
  const filteredEvents = useMemo(() => {
    if (selectedColorFilter === 'all') {
      return allEvents;
    }
    return allEvents.filter(event => {
      const eventColor = (event.color as EventColor) || 'yellow';
      return eventColor === selectedColorFilter;
    });
  }, [allEvents, selectedColorFilter]);
  
  // メンテナンスイベントを取得（最新のもの）
  const lastMaintenanceEvent = useMemo(() => {
    const maintenanceEvents = allEvents
      .filter(event => {
        const eventColor = (event.color as EventColor) || 'yellow';
        return eventColor === 'green';
      })
      .sort((a, b) => {
        if (!a.date || !b.date) return 0;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
    return maintenanceEvents[0] || null;
  }, [allEvents]);
  
  const displayEvents = filteredEvents.slice(0, 5);

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

      {/* 前回メンテナンス表示 */}
      {lastMaintenanceEvent && (
        <View style={[styles.maintenanceInfo, { backgroundColor: theme.background, borderColor: getEventColorCode('green') }]}>
          <Text style={[styles.maintenanceLabel, { color: theme.text }]}>
            🔧 前回メンテナンス
          </Text>
          <Text style={[styles.maintenanceDate, { color: theme.textSecondary }]}>
            {lastMaintenanceEvent.date 
              ? new Date(lastMaintenanceEvent.date).toLocaleDateString('ja-JP', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })
              : '日付不明'}
          </Text>
          {lastMaintenanceEvent.title && (
            <Text style={[styles.maintenanceTitle, { color: theme.text }]}>
              {lastMaintenanceEvent.title}
            </Text>
          )}
        </View>
      )}

      {/* 色フィルタ */}
      {allEvents.length > 0 && (
        <View style={styles.filterContainer}>
          <Filter size={14} color={theme.textSecondary} />
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterContent}
          >
            <TouchableOpacity
              style={[
                styles.filterButton,
                {
                  backgroundColor: selectedColorFilter === 'all' ? theme.primary : theme.background,
                  borderColor: theme.secondary,
                },
              ]}
              onPress={() => setSelectedColorFilter('all')}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  {
                    color: selectedColorFilter === 'all' ? theme.surface : theme.text,
                  },
                ]}
              >
                すべて
              </Text>
            </TouchableOpacity>
            {Object.values(EVENT_COLORS).map((colorOption) => {
              const count = allEvents.filter(event => {
                const eventColor = (event.color as EventColor) || 'yellow';
                return eventColor === colorOption.value;
              }).length;
              
              if (count === 0) return null;
              
              return (
                <TouchableOpacity
                  key={colorOption.value}
                  style={[
                    styles.filterButton,
                    {
                      backgroundColor: selectedColorFilter === colorOption.value ? colorOption.color : theme.background,
                      borderColor: colorOption.color,
                    },
                  ]}
                  onPress={() => setSelectedColorFilter(colorOption.value)}
                >
                  <View style={[styles.filterColorDot, { backgroundColor: colorOption.color }]} />
                  <Text
                    style={[
                      styles.filterButtonText,
                      {
                        color: selectedColorFilter === colorOption.value ? '#FFFFFF' : theme.text,
                      },
                    ]}
                  >
                    {colorOption.label} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {filteredEvents.length === 0 ? (
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          まだ登録されたイベントはありません
        </Text>
      ) : (
        displayEvents.map((event, index) => {
          const eventColor = (event.color as EventColor) || 'yellow';
          const colorCode = getEventColorCode(eventColor);
          
          return (
            <View key={`event-${event.id}-${index}`} style={[styles.eventCard, { borderLeftColor: colorCode, borderLeftWidth: 4 }]}>
              <View style={styles.eventHeader}>
                <View style={styles.eventTitleContainer}>
                  <View style={[styles.eventColorDot, { backgroundColor: colorCode }]} />
                  <Text style={[styles.eventTitle, { color: theme.text }]}>{event.title}</Text>
                  {event.date && (
                    <Text style={[styles.eventDate, { color: theme.textSecondary }]}>
                      {new Date(event.date).toLocaleDateString('ja-JP', { 
                        month: 'numeric', 
                        day: 'numeric',
                        weekday: 'short'
                      })}
                    </Text>
                  )}
                </View>
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
          );
        })
      )}
      
      {filteredEvents.length > 5 && (
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
  eventTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    gap: 8,
  },
  eventTitle: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
  },
  eventDate: {
    fontSize: 9,
    lineHeight: 12,
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
  maintenanceInfo: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  maintenanceLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  maintenanceDate: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  maintenanceTitle: {
    fontSize: 12,
    marginTop: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  filterScroll: {
    flex: 1,
  },
  filterContent: {
    gap: 6,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  filterButtonText: {
    fontSize: 11,
    fontWeight: '500',
  },
  filterColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  eventColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
});

