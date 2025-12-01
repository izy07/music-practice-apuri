import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PartyPopper, ArrowLeft, Calendar, Clock, MapPin, ChevronRight } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import InstrumentHeader from '@/components/InstrumentHeader';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { useLanguage } from '@/components/LanguageContext';
import { PracticeScheduleManager, PracticeSchedule } from '@/lib/groupManagement';
import { organizationRepository } from '@/repositories/organizationRepository';

type UnifiedEvent = PracticeSchedule & {
  organization_id: string;
  organization_name: string;
};

export default function EventsScreen() {
  const router = useRouter();
  const { orgId, allOrgs } = useLocalSearchParams();
  const { currentTheme } = useInstrumentTheme();
  const { t } = useLanguage();
  const isAllOrgsMode = allOrgs === 'true';
  
  const [events, setEvents] = useState<UnifiedEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    loadEvents();
  }, [currentDate, orgId, allOrgs]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      if (isAllOrgsMode) {
        // 全組織のイベントを取得
        const orgsResult = await organizationRepository.getUserOrganizations();
        const orgs = orgsResult.data || [];
        const allEvents: UnifiedEvent[] = [];
        
        await Promise.all(orgs.map(async (org) => {
          try {
            const result = await PracticeScheduleManager.getMonthlySchedules(org.id, year, month);
            if (result.success && result.schedules) {
              // イベントのみをフィルタリング
              const eventsWithOrg = result.schedules
                .filter((schedule: PracticeSchedule) => schedule.practice_type === 'event')
                .map((schedule: PracticeSchedule) => ({
                  ...schedule,
                  organization_id: org.id,
                  organization_name: org.name || '（名称なし）',
                }));
              allEvents.push(...eventsWithOrg);
            }
          } catch (error) {
            console.error(`組織 ${org.id} のイベント取得エラー:`, error);
          }
        }));
        
        // 日付順にソート
        allEvents.sort((a, b) => {
          const dateA = new Date(a.practice_date);
          const dateB = new Date(b.practice_date);
          return dateA.getTime() - dateB.getTime();
        });
        
        setEvents(allEvents);
      } else {
        // 単一組織のイベントを取得
        if (!orgId) {
          setEvents([]);
          return;
        }
        const result = await PracticeScheduleManager.getMonthlySchedules(orgId as string, year, month);
        if (result.success && result.schedules) {
          // イベントのみをフィルタリング
          const eventsOnly = result.schedules
            .filter((schedule: PracticeSchedule) => schedule.practice_type === 'event')
            .map((schedule: PracticeSchedule) => ({
              ...schedule,
              organization_id: orgId as string,
              organization_name: '',
            }));
          setEvents(eventsOnly);
        }
      }
    } catch (error) {
      console.error('イベント読み込みエラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]}>
      <InstrumentHeader />
      
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          if (isAllOrgsMode) {
            router.replace('/(tabs)/org-overview' as any);
          } else {
            router.back();
          }
        }}>
          <ArrowLeft size={24} color={currentTheme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: currentTheme.text }]}>
          {isAllOrgsMode ? '全組織のイベント一覧' : 'イベント一覧'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 月ナビゲーション */}
        <View style={styles.monthNavigation}>
          <TouchableOpacity onPress={() => navigateMonth('prev')}>
            <ArrowLeft size={24} color={currentTheme.text} />
          </TouchableOpacity>
          <Text style={[styles.monthTitle, { color: currentTheme.text }]}>
            {currentDate.getFullYear()}年{currentDate.getMonth() + 1}月
          </Text>
          <TouchableOpacity onPress={() => navigateMonth('next')}>
            <ChevronRight size={24} color={currentTheme.text} />
          </TouchableOpacity>
        </View>

        {/* イベント一覧 */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={currentTheme.primary} />
          </View>
        ) : events.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: currentTheme.surface }]}>
            <PartyPopper size={48} color={currentTheme.textSecondary} />
            <Text style={[styles.emptyStateText, { color: currentTheme.text }]}>
              {currentDate.getMonth() + 1}月のイベントはありません
            </Text>
          </View>
        ) : (
          <View style={styles.eventsList}>
            {events.map((event) => (
              <View key={event.id} style={[styles.eventCard, { backgroundColor: currentTheme.surface }]}>
                {isAllOrgsMode && event.organization_name && (
                  <View style={styles.eventOrgHeader}>
                    <Text style={[styles.eventOrgName, { color: currentTheme.primary }]}>
                      {event.organization_name}
                    </Text>
                  </View>
                )}
                <View style={styles.eventHeader}>
                  <View style={[styles.eventTypeBadge, { backgroundColor: '#FF6B35' }]}>
                    <Text style={styles.eventTypeText}>イベント</Text>
                  </View>
                </View>
                <Text style={[styles.eventTitle, { color: currentTheme.text }]}>
                  {event.title}
                </Text>
                <View style={styles.eventDetails}>
                  <View style={styles.eventDetailRow}>
                    <Calendar size={16} color={currentTheme.textSecondary} />
                    <Text style={[styles.eventDetailText, { color: currentTheme.textSecondary }]}>
                      {formatDate(event.practice_date)}
                    </Text>
                  </View>
                  {event.start_time && (
                    <View style={styles.eventDetailRow}>
                      <Clock size={16} color={currentTheme.textSecondary} />
                      <Text style={[styles.eventDetailText, { color: currentTheme.textSecondary }]}>
                        {event.start_time}
                        {event.end_time && ` - ${event.end_time}`}
                      </Text>
                    </View>
                  )}
                  {event.location && (
                    <View style={styles.eventDetailRow}>
                      <MapPin size={16} color={currentTheme.textSecondary} />
                      <Text style={[styles.eventDetailText, { color: currentTheme.textSecondary }]}>
                        {event.location}
                      </Text>
                    </View>
                  )}
                </View>
                {event.notes && (
                  <Text style={[styles.eventDescription, { color: currentTheme.textSecondary }]}>
                    {event.notes}
                  </Text>
                )}
              </View>
            ))}
          </View>
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
  monthNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 16,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    borderRadius: 12,
    elevation: 2,
  },
  emptyStateText: {
    fontSize: 16,
    marginTop: 12,
    fontWeight: '500',
  },
  eventsList: {
    gap: 12,
    paddingBottom: 20,
  },
  eventCard: {
    borderRadius: 12,
    padding: 16,
    elevation: 2,
  },
  eventOrgHeader: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  eventOrgName: {
    fontSize: 12,
    fontWeight: '600',
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 8,
  },
  eventTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  eventTypeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  eventDetails: {
    gap: 8,
    marginBottom: 8,
  },
  eventDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventDetailText: {
    fontSize: 14,
  },
  eventDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
});

