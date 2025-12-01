import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, Users, CheckSquare, Settings, Plus, ArrowLeft } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import InstrumentHeader from '@/components/InstrumentHeader';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { useLanguage } from '@/components/LanguageContext';
import { OrganizationManager, SubGroupManager, PracticeScheduleManager, Organization, SubGroup } from '@/lib/groupManagement';

export default function OrganizationDashboard() {
  const router = useRouter();
  const { orgId } = useLocalSearchParams();
  const { currentTheme } = useInstrumentTheme();
  const { t } = useLanguage();
  
  // 状態管理
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [subGroups, setSubGroups] = useState<SubGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [monthlySchedules, setMonthlySchedules] = useState<any[]>([]);

  useEffect(() => {
    if (orgId) {
      loadOrganizationData();
      loadMonthlySchedules();
    }
  }, [orgId, currentDate]);

  const loadOrganizationData = async () => {
    setLoading(true);
    try {
      // 組織情報を取得（仮実装）
      const orgResult = await OrganizationManager.getUserOrganizations();
      if (orgResult.success && orgResult.organizations) {
        const org = orgResult.organizations.find((o: Organization) => o.id === orgId);
        if (org) {
          setOrganization(org);
        }
      }

      // サブグループ一覧を取得
      const subGroupsResult = await SubGroupManager.getOrganizationSubGroups(orgId as string);
      if (subGroupsResult.success && subGroupsResult.subGroups) {
        setSubGroups(subGroupsResult.subGroups);
      }
    } catch (error) {
      console.error('組織データ読み込みエラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMonthlySchedules = async () => {
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const result = await PracticeScheduleManager.getMonthlySchedules(orgId as string, year, month);
      if (result.success && result.schedules) {
        setMonthlySchedules(result.schedules);
      }
    } catch (error) {
      console.error('練習日程読み込みエラー:', error);
    }
  };

  const getPracticeTypeLabel = (type: string) => {
    switch (type) {
      case 'ensemble': return '合奏';
      case 'part_practice': return 'パート練';
      case 'individual_practice': return '個人練';
      case 'rehearsal': return 'リハーサル';
      case 'lesson': return 'レッスン';
      case 'event': return 'イベント';
      default: return type;
    }
  };

  const getPracticeTypeColor = (type: string) => {
    switch (type) {
      case 'ensemble': return currentTheme.primary;
      case 'part_practice': return currentTheme.secondary;
      case 'individual_practice': return '#9C27B0'; // 紫
      case 'rehearsal': return '#FF5722'; // オレンジ
      case 'lesson': return '#00BCD4'; // シアン
      case 'event': return currentTheme.accent;
      default: return currentTheme.textSecondary;
    }
  };

  const navigateToCalendar = () => {
    router.push(`/calendar?orgId=${orgId}` as any);
  };

  const navigateToAttendance = () => {
    router.push(`/attendance?orgId=${orgId}` as any);
  };

  const navigateToTasks = () => {
    router.push(`/tasks?orgId=${orgId}` as any);
  };

  const navigateToSettings = () => {
    router.push(`/organization-settings?orgId=${orgId}&from=dashboard` as any);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} >
        <InstrumentHeader />
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: currentTheme.text }]}>読み込み中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} >
      <InstrumentHeader />
      
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={currentTheme.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: currentTheme.text }]}>
            {organization?.name || '組織'}
          </Text>
          <Text style={[styles.headerSubtitle, { color: currentTheme.textSecondary }]}>
            {organization?.description || '音楽団体管理'}
          </Text>
        </View>
      </View>

      {/* サブグループ情報 */}
      {subGroups.length > 0 && (
        <View style={styles.subGroupsSection}>
          <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
            サブグループ
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subGroupsScroll}>
            {subGroups.map((subGroup) => 
              React.createElement(View, {
                key: subGroup.id,
                style: [styles.subGroupCard, { backgroundColor: currentTheme.surface }]
              },
                React.createElement(Text, {
                  style: [styles.subGroupName, { color: currentTheme.text }]
                }, subGroup.name),
                React.createElement(Text, {
                  style: [styles.subGroupType, { color: currentTheme.textSecondary }]
                }, subGroup.group_type === 'part' ? 'パート' : 
                   subGroup.group_type === 'grade' ? '学年' : 'セクション')
              )
            )}
          </ScrollView>
        </View>
      )}

      {/* メイン機能 */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.functionsGrid}>
          {/* カレンダー */}
          <TouchableOpacity
            style={[styles.functionCard, { backgroundColor: currentTheme.surface }]}
            onPress={navigateToCalendar}
          >
            <View style={[styles.functionIcon, { backgroundColor: `${currentTheme.primary}20` }]}>
              <Calendar size={32} color={currentTheme.primary} />
            </View>
            <Text style={[styles.functionTitle, { color: currentTheme.text }]}>
              練習日程
            </Text>
            <Text style={[styles.functionDescription, { color: currentTheme.textSecondary }]}>
              月間カレンダーで練習日を管理
            </Text>
            {monthlySchedules.length > 0 && (
              <Text style={[styles.functionCount, { color: currentTheme.primary }]}>
                {monthlySchedules.length}件の予定
              </Text>
            )}
          </TouchableOpacity>

          {/* 出欠席管理（ソロモードでは非表示） */}
          {!organization?.is_solo && (
            <TouchableOpacity
              style={[styles.functionCard, { backgroundColor: currentTheme.surface }]}
              onPress={navigateToAttendance}
            >
              <View style={[styles.functionIcon, { backgroundColor: `${currentTheme.primary}20` }]}>
                <CheckSquare size={32} color={currentTheme.primary} />
              </View>
              <Text style={[styles.functionTitle, { color: currentTheme.text }]}>
                出欠席管理
              </Text>
              <Text style={[styles.functionDescription, { color: currentTheme.textSecondary }]}>
                出席・欠席・遅刻を管理
              </Text>
            </TouchableOpacity>
          )}

          {/* 課題管理 */}
          <TouchableOpacity
            style={[styles.functionCard, { backgroundColor: currentTheme.surface }]}
            onPress={navigateToTasks}
          >
            <View style={[styles.functionIcon, { backgroundColor: `${currentTheme.primary}20` }]}>
              <Users size={32} color={currentTheme.primary} />
            </View>
            <Text style={[styles.functionTitle, { color: currentTheme.text }]}>
              課題管理
            </Text>
            <Text style={[styles.functionDescription, { color: currentTheme.textSecondary }]}>
              練習課題と進捗を管理
            </Text>
          </TouchableOpacity>

          {/* 設定 */}
          <TouchableOpacity
            style={[styles.functionCard, { backgroundColor: currentTheme.surface }]}
            onPress={navigateToSettings}
          >
            <View style={[styles.functionIcon, { backgroundColor: `${currentTheme.primary}20` }]}>
              <Settings size={32} color={currentTheme.primary} />
            </View>
            <Text style={[styles.functionTitle, { color: currentTheme.text }]}>
              組織設定
            </Text>
            <Text style={[styles.functionDescription, { color: currentTheme.textSecondary }]}>
              メンバー・権限の管理
            </Text>
          </TouchableOpacity>
        </View>

        {/* 今月の予定概要 */}
        {monthlySchedules.length > 0 && (
          <View style={styles.scheduleSummary}>
            <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
              今月の予定
            </Text>
            {monthlySchedules.slice(0, 3).map((schedule) => 
              React.createElement(View, {
                key: schedule.id,
                style: [styles.scheduleItem, { backgroundColor: currentTheme.surface }]
              },
                React.createElement(View, {
                  style: [styles.scheduleType, { 
                    backgroundColor: getPracticeTypeColor(schedule.practice_type)
                  }]
                },
                  React.createElement(Text, {
                    style: styles.scheduleTypeText
                  }, getPracticeTypeLabel(schedule.practice_type))
                ),
                React.createElement(View, { style: styles.scheduleContent },
                  React.createElement(Text, {
                    style: [styles.scheduleTitle, { color: currentTheme.text }]
                  }, schedule.title),
                  React.createElement(Text, {
                    style: [styles.scheduleDate, { color: currentTheme.textSecondary }]
                  }, new Date(schedule.practice_date).toLocaleDateString('ja-JP', { 
                    month: 'short', 
                    day: 'numeric',
                    hour: schedule.start_time ? 'numeric' : undefined,
                    minute: schedule.start_time ? '2-digit' : undefined
                  }))
                )
              )
            )}
            {monthlySchedules.length > 3 && (
              <Text style={[styles.moreSchedules, { color: currentTheme.primary }]}>
                他{monthlySchedules.length - 3}件の予定があります
              </Text>
            )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },
  backButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  subGroupsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  subGroupsScroll: {
    flexDirection: 'row',
  },
  subGroupCard: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginRight: 12,
    elevation: 2,
  },
  subGroupName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  subGroupType: {
    fontSize: 12,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  functionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  functionCard: {
    width: '48%',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    elevation: 4,
  },
  functionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  functionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  functionDescription: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  functionCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  scheduleSummary: {
    marginBottom: 24,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    elevation: 2,
  },
  scheduleType: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 12,
  },
  scheduleTypeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  scheduleContent: {
    flex: 1,
  },
  scheduleTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  scheduleDate: {
    fontSize: 12,
  },
  moreSchedules: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
  },
});
