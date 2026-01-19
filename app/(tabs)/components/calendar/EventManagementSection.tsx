import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, Platform } from 'react-native';
import { Calendar, Plus, Edit3, Trash2, Filter } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { logger } from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import { supabase } from '@/lib/supabase';
import { EVENT_COLORS, EventColor, getEventColorCode, getEventColorOption, DEFAULT_EVENT_COLOR } from '@/lib/eventColors';

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
  events: { [key: string]: Event[] } | null | undefined;
  onAddEvent: () => void;
  onEditEvent: (event: Event) => void;
  onEventDeleted: () => void;
}

const parseEventDate = (dateStr: string): Date | null => {
  // Supabaseのevents.dateは主に "YYYY-MM-DD" を想定（UTC解釈による日付ズレを避けるためローカル0時で生成）
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const d = new Date(`${dateStr}T00:00:00`);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
};

const formatEventListDate = (dateStr: string): string => {
  const d = parseEventDate(dateStr);
  if (!d) return dateStr;
  const nowYear = new Date().getFullYear();
  const isDifferentYear = d.getFullYear() !== nowYear;

  return d.toLocaleDateString('ja-JP', isDifferentYear
    ? { year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short' }
    : { month: 'numeric', day: 'numeric', weekday: 'short' }
  );
};

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
    logger.debug('イベント管理一覧: 削除ボタンがクリックされました', event);
    
    // Web環境ではwindow.confirmを使用
    let confirmed = false;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      confirmed = window.confirm(`「${event.title}」を削除しますか？`);
    } else {
      // React Native環境ではAlert.alertを使用
      await new Promise<void>((resolve) => {
        Alert.alert(
          '削除の確認',
          `「${event.title}」を削除しますか？`,
          [
            { 
              text: 'キャンセル', 
              style: 'cancel',
              onPress: () => {
                logger.debug('イベント管理一覧: 削除がキャンセルされました');
                resolve();
              }
            },
            {
              text: '削除',
              style: 'destructive',
              onPress: () => {
                confirmed = true;
                resolve();
              }
            }
          ],
          { cancelable: true, onDismiss: () => resolve() }
        );
      });
    }
    
    if (!confirmed) {
      logger.debug('イベント管理一覧: 削除がキャンセルされました');
      return;
    }
    
    try {
      logger.debug('イベント管理一覧: イベント削除開始', event.id);
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', event.id);

      if (error) {
        logger.error('イベント管理一覧: イベント削除エラー:', error);
        throw error;
      }
      
      logger.info('イベント管理一覧: イベントを削除しました', event.id);
      
      // コールバックを呼び出してデータを更新
      await onEventDeleted();
      
      // 削除成功のアラートを表示
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('イベントを削除しました');
      } else {
        Alert.alert('削除完了', 'イベントを削除しました');
      }
    } catch (error) {
      ErrorHandler.handle(error, 'イベントの削除', true);
      logger.error('イベント管理一覧: イベントの削除エラー:', error);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('イベントの削除に失敗しました');
      } else {
        Alert.alert('エラー', 'イベントの削除に失敗しました');
      }
    }
  };

  // eventsは { [dateStr: string]: Event[] } の形式なので、各イベントに日付を追加
  const allEvents = events 
    ? Object.entries(events).flatMap(([dateStr, eventArray]) => 
        eventArray.map(event => ({ ...event, date: event.date || dateStr }))
      )
    : [];
  
  // 色でフィルタリング
  const filteredEvents = useMemo(() => {
    if (selectedColorFilter === 'all') {
      return allEvents;
    }
    return allEvents.filter(event => {
      const eventColor = (event.color as EventColor) || DEFAULT_EVENT_COLOR;
      return eventColor === selectedColorFilter;
    });
  }, [allEvents, selectedColorFilter]);

  // 日付が新しい順（降順）に並び替え（最新を上に）
  const sortedFilteredEvents = useMemo(() => {
    return [...filteredEvents].sort((a, b) => {
      const aDate = a.date ? parseEventDate(a.date) : null;
      const bDate = b.date ? parseEventDate(b.date) : null;

      // 日付がないものは下へ
      if (!aDate && !bDate) return 0;
      if (!aDate) return 1;
      if (!bDate) return -1;

      return bDate.getTime() - aDate.getTime();
    });
  }, [filteredEvents]);
  
  // メンテナンスイベントを取得（最新のもの）と表示ラベルの判定
  const maintenanceEventInfo = useMemo(() => {
    const maintenanceEvents = allEvents
      .filter(event => {
        const eventColor = (event.color as EventColor) || DEFAULT_EVENT_COLOR;
        return eventColor === 'green';
      })
      .sort((a, b) => {
        if (!a.date || !b.date) return 0;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
    
    if (maintenanceEvents.length === 0) {
      return { event: null, label: null };
    }
    
    const latestEvent = maintenanceEvents[0];
    if (!latestEvent.date) {
      return { event: latestEvent, label: '🔧 前回メンテナンス' };
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = new Date(latestEvent.date);
    eventDate.setHours(0, 0, 0, 0);
    
    const diffTime = eventDate.getTime() - today.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    let label: string;
    if (diffDays < 0) {
      // 当日よりも前
      label = '🔧 前回メンテナンス';
    } else if (diffDays === 0) {
      // 当日
      label = '🔧 メンテナンス当日';
    } else {
      // 当日より後
      label = '🔧 メンテナンス予定';
    }
    
    return { event: latestEvent, label };
  }, [allEvents]);
  
  const displayEvents = sortedFilteredEvents.slice(0, 5);

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]} pointerEvents="box-none">
      <View style={styles.header} pointerEvents="auto">
        <Calendar size={20} color={theme.primary} />
        <Text style={[styles.title, { color: theme.text }]}>イベント管理</Text>
      </View>
      
      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: theme.primary }]}
        onPress={onAddEvent}
        pointerEvents="auto"
      >
        <Plus size={16} color="#FFFFFF" />
        <Text style={styles.addButtonText}>イベントを登録</Text>
      </TouchableOpacity>

      {/* メンテナンス表示（日付に応じてラベルを変更） */}
      {maintenanceEventInfo.event && maintenanceEventInfo.label && (
        <View style={[styles.maintenanceInfo, { backgroundColor: theme.background, borderColor: getEventColorCode('green') }]}>
          <Text style={[styles.maintenanceLabel, { color: theme.text }]}>
            {maintenanceEventInfo.label}
          </Text>
          <Text style={[styles.maintenanceDate, { color: theme.textSecondary }]}>
            {maintenanceEventInfo.event.date 
              ? new Date(maintenanceEventInfo.event.date).toLocaleDateString('ja-JP', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })
              : '日付不明'}
          </Text>
          {maintenanceEventInfo.event.title && (
            <Text style={[styles.maintenanceTitle, { color: theme.text }]}>
              {maintenanceEventInfo.event.title}
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
                const eventColor = (event.color as EventColor) || DEFAULT_EVENT_COLOR;
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
          const eventColor = (event.color as EventColor) || DEFAULT_EVENT_COLOR;
          const colorCode = getEventColorCode(eventColor);
          
          return (
            <View key={`event-${event.id}-${index}`} style={[styles.eventCard, { borderLeftColor: colorCode, borderLeftWidth: 4 }]}>
            <View style={styles.eventHeader}>
              <View style={styles.eventTitleContainer}>
                  <View style={[styles.eventColorDot, { backgroundColor: colorCode }]} />
                <Text style={[styles.eventTitle, { color: theme.text }]}>{event.title}</Text>
                {event.date && (
                  <Text style={[styles.eventDate, { color: theme.textSecondary }]}>
                    {formatEventListDate(event.date)}
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
    marginBottom: 80, // タブバーと重ならないように下部にマージンを追加
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
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 4,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  eventTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    gap: 6,
    flexWrap: 'wrap',
  },
  eventTitle: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
    flexShrink: 1,
  },
  eventDate: {
    fontSize: 9,
    lineHeight: 12,
  },
  eventActions: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'flex-start',
    paddingTop: 2,
  },
  actionButton: {
    padding: 6,
    borderRadius: 4,
    minWidth: 28,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
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
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
  },
  maintenanceLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 1,
    lineHeight: 14,
  },
  maintenanceDate: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 0,
    lineHeight: 16,
  },
  maintenanceTitle: {
    fontSize: 12,
    marginTop: 1,
    lineHeight: 14,
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
    minWidth: 60,
  },
  filterButtonText: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 14,
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

