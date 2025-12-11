import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import InstrumentHeader from '@/components/InstrumentHeader';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { Calendar, Users, ListChecks, ArrowRight, Check, CheckSquare, ClipboardList } from 'lucide-react-native';
import { organizationRepository } from '@/repositories/organizationRepository';
import { scheduleRepository } from '@/repositories/scheduleRepository';
import { attendanceRepository } from '@/repositories/attendanceRepository';
import { taskRepository } from '@/repositories/taskRepository';
import type { Organization } from '@/lib/groupManagement';
import { ensureContrast } from '@/lib/colors';
import { supabase } from '@/lib/supabase';
import { AttendanceManager } from '@/lib/groupManagement';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';

type UnifiedSchedule = {
  id: string;
  organization_id: string;
  organization_name: string;
  title: string;
  practice_date: string;
  start_time?: string;
  location?: string;
};

type UnifiedTask = {
  id: string;
  organization_id: string;
  organization_name: string;
  title: string;
  status: string;
};

export default function OrgOverviewScreen() {
  const { currentTheme } = useInstrumentTheme();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [schedules, setSchedules] = useState<UnifiedSchedule[]>([]);
  const [attendanceNow, setAttendanceNow] = useState<UnifiedSchedule[]>([]);
  const [tasks, setTasks] = useState<UnifiedTask[]>([]);
  const [registeringAttendance, setRegisteringAttendance] = useState<Set<string>>(new Set());

  // 簡易トースト通知（Web環境用）
  const showToast = useCallback((message: string) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const toast = document.createElement('div');
      toast.textContent = message;
      const primaryColor = currentTheme?.primary || '#7C4DFF';
      toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: ${primaryColor};
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        z-index: 10000;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      `;
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => {
          if (document.body.contains(toast)) {
            document.body.removeChild(toast);
          }
        }, 300);
      }, 3000);
    } else {
      Alert.alert('', message, [{ text: 'OK' }]);
    }
  }, [currentTheme]);

  // 出席登録（ワンタップ）
  const handleRegisterAttendance = useCallback(async (schedule: UnifiedSchedule) => {
    if (registeringAttendance.has(schedule.id)) {
      return; // 既に登録中
    }

    setRegisteringAttendance(prev => new Set(prev).add(schedule.id));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('エラー', 'ログインが必要です');
        return;
      }

      const result = await attendanceRepository.upsert({
        schedule_id: schedule.id,
        user_id: user.id,
        status: 'attending', // 出席として登録
      });

      if (result.error) {
        ErrorHandler.handle(result.error, '出席登録', false);
        Alert.alert('エラー', '出席登録に失敗しました');
        return;
      }

      // 成功時のトースト通知
      showToast('出席登録が完了しました！');

      // 出席登録可能リストから削除（楽観的更新）
      setAttendanceNow(prev => prev.filter(s => s.id !== schedule.id));

      // データを再読み込み（バックグラウンド）
      setTimeout(() => {
        fetchOrgData(true);
      }, 500);
    } catch (error) {
      logger.error('出席登録エラー:', error);
      Alert.alert('エラー', '出席登録に失敗しました');
    } finally {
      setRegisteringAttendance(prev => {
        const next = new Set(prev);
        next.delete(schedule.id);
        return next;
      });
    }
  }, [registeringAttendance, showToast, fetchOrgData]);

  // データ取得関数をuseCallbackでメモ化（重複ロジックを統合）
  const fetchOrgData = useCallback(async (skipNotifications = false) => {
    setLoading(true);
    try {
      const orgsResult = await organizationRepository.getUserOrganizations();
      if (orgsResult.error || !orgsResult.data) {
        if (!skipNotifications) {
          ErrorHandler.handle(orgsResult.error, '組織取得', false);
        }
        setOrganizations([]);
        return;
      }
      const orgs = orgsResult.data;
      if (orgs && orgs.length >= 0) {
        // 同一IDの重複をクライアント側で除去
        const uniqueOrgs = Array.from(new Map(orgs.map((o: Organization) => [o.id, o])).values());
        setOrganizations(uniqueOrgs);

        // 練習日程（今月）を取得
        const current = new Date();
        const year = current.getFullYear();
        const month = current.getMonth() + 1;
        const allSchedules: UnifiedSchedule[] = [];
        const attendables: UnifiedSchedule[] = [];

        for (const org of uniqueOrgs) {
          const monthlyResult = await scheduleRepository.getMonthlySchedules(org.id, year, month);
          const monthly = monthlyResult.error ? null : monthlyResult.data;
          if (monthly) {
            monthly.forEach((s: any) => {
              const entry: UnifiedSchedule = {
                id: s.id,
                organization_id: org.id,
                organization_name: (org as any).name,
                title: s.title,
                practice_date: s.practice_date,
                start_time: s.start_time,
                location: s.location,
              };
              allSchedules.push(entry);
              if (attendanceRepository.canRegisterAttendance(s.practice_date)) attendables.push(entry);
            });
          }
        }
        // 日付昇順
        allSchedules.sort((a, b) => a.practice_date.localeCompare(b.practice_date));
        attendables.sort((a, b) => a.practice_date.localeCompare(b.practice_date));
        setSchedules(allSchedules);
        setAttendanceNow(attendables);

        // 出席登録可能日になったときに通知を送信（初回のみ）
        if (!skipNotifications) {
          (async () => {
            try {
              const NotificationService = (await import('@/lib/notificationService')).default;
              const notificationService = NotificationService.getInstance();
              await notificationService.loadSettings();

              // ストレージの取得（Web環境ではlocalStorage、それ以外ではAsyncStorage）
              const { Platform } = await import('react-native');
              const AsyncStorage = Platform.OS === 'web' ? null : (await import('@react-native-async-storage/async-storage')).default;
              const getStorageItem = async (key: string): Promise<string | null> => {
                if (Platform.OS === 'web') {
                  return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
                } else if (AsyncStorage) {
                  return await AsyncStorage.getItem(key);
                }
                return null;
              };
              const setStorageItem = async (key: string, value: string): Promise<void> => {
                if (Platform.OS === 'web') {
                  if (typeof localStorage !== 'undefined') {
                    localStorage.setItem(key, value);
                  }
                } else if (AsyncStorage) {
                  await AsyncStorage.setItem(key, value);
                }
              };

              const today = new Date();
              today.setHours(0, 0, 0, 0);

              for (const schedule of attendables) {
                const practiceDate = new Date(schedule.practice_date);
                practiceDate.setHours(0, 0, 0, 0);
                
                const diffTime = practiceDate.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                // 練習日の5日前になったときに通知を送信（1回だけ）
                if (diffDays === 5) {
                  const notificationKey = `attendance_notified_${schedule.id}`;
                  const hasNotified = await getStorageItem(notificationKey);
                  
                  if (!hasNotified) {
                    await notificationService.sendAttendanceAvailableNotification(
                      schedule.organization_name || '組織',
                      schedule.practice_date,
                      schedule.title
                    );
                    
                    // 通知を送信したことを記録
                    await setStorageItem(notificationKey, 'true');
                  }
                }
              }
            } catch (error) {
              // 通知エラーは無視
              console.warn('出席登録通知エラー:', error);
            }
          })();
        }

        // 課題（組織レベルで集約・最大20件）
        const unifiedTasks: UnifiedTask[] = [];
        for (const org of uniqueOrgs) {
          try {
            const tasksResult = await taskRepository.getByOrganizationId(org.id);
            const tasks = tasksResult.error ? [] : (tasksResult.data || []);
            (tasks as any[]).forEach(task => {
              unifiedTasks.push({
                id: task.id,
                organization_id: org.id,
                organization_name: (org as any).name,
                title: task.title,
                status: task.status,
              });
            });
          } catch {}
        }
        setTasks(unifiedTasks.slice(0, 20));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // 初回データ読み込み（全楽器対象の組織を取得）
  useEffect(() => {
    fetchOrgData(false);
  }, [fetchOrgData]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} > 
      <InstrumentHeader />
      {/* 戻る（共有へ） */}
      <View style={styles.topNav}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="前の画面に戻る">
          <Text style={[styles.backText, { color: ensureContrast(currentTheme.text, currentTheme.background) }]}>← 共有に戻る</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <View style={styles.loadingBox}><ActivityIndicator color={currentTheme.primary} /></View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={[styles.pageTitle, { color: currentTheme.text, marginBottom: 4 }]}>参加中の全組織(全楽器)</Text>

          {/* 全組織メニュー */}
          <View style={styles.menuContainer}>
            <View style={styles.menuRow}>
              {/* 練習日程 */}
              <TouchableOpacity
                style={[styles.menuItem, styles.menuItemHalf, { backgroundColor: currentTheme.surface, borderColor: currentTheme.primary + '33' }]}
                onPress={() => router.push('/calendar?allOrgs=true' as any)}
                activeOpacity={0.85}
              >
                <View style={[styles.menuIcon, { backgroundColor: currentTheme.primary + '20' }]}>
                  <Calendar size={20} color={currentTheme.primary} />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={[styles.menuTitle, { color: currentTheme.text }]}>練習{'\n'}日程</Text>
                  <Text style={[styles.menuSubtitle, { color: currentTheme.textSecondary }]} numberOfLines={2}>全組織のカレンダー</Text>
                </View>
              </TouchableOpacity>

              {/* 出欠登録 */}
              <TouchableOpacity
                style={[styles.menuItem, styles.menuItemHalf, { backgroundColor: currentTheme.surface, borderColor: currentTheme.primary + '33', marginLeft: 12 }]}
                onPress={() => router.push('/attendance?allOrgs=true' as any)}
                activeOpacity={0.85}
              >
                <View style={[styles.menuIcon, { backgroundColor: currentTheme.primary + '20' }]}>
                  <CheckSquare size={20} color={currentTheme.primary} />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={[styles.menuTitle, { color: currentTheme.text }]}>出欠{'\n'}登録</Text>
                  <Text style={[styles.menuSubtitle, { color: currentTheme.textSecondary }]} numberOfLines={2}>全組織の出欠管理</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* 課題一覧 */}
            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: currentTheme.surface, borderColor: currentTheme.primary + '33', marginTop: 12 }]}
              onPress={() => router.push('/tasks-all-orgs' as any)}
              activeOpacity={0.85}
            >
              <View style={[styles.menuIcon, { backgroundColor: currentTheme.primary + '20' }]}>
                <ClipboardList size={24} color={currentTheme.primary} />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={[styles.menuTitle, { color: currentTheme.text }]}>課題一覧</Text>
                <Text style={[styles.menuSubtitle, { color: currentTheme.textSecondary }]}>全組織の課題管理</Text>
              </View>
              <ArrowRight size={20} color={currentTheme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* 練習日程（今月） */}
          <View style={[styles.section, { backgroundColor: currentTheme.surface }]}> 
            <View style={styles.sectionHeader}>
              <Calendar size={18} color={currentTheme.primary} />
              <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>練習日程（今月）</Text>
            </View>
            {schedules.length === 0 ? (
              <Text style={{ color: currentTheme.textSecondary }}>今月の予定はありません</Text>
            ) : (
              schedules.slice(0, 20).map(s => (
                <TouchableOpacity key={s.id} style={[styles.rowItem]} onPress={() => router.push({ pathname: '/calendar', params: { orgId: s.organization_id } })}>
                  <Text style={[styles.rowTitle, { color: currentTheme.text }]} numberOfLines={1}>
                    {s.title}
                  </Text>
                  <Text style={[styles.rowMeta, { color: currentTheme.textSecondary }]}> {new Date(s.practice_date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' })}{s.start_time ? ` ${s.start_time}` : ''}・{s.organization_name}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>

          {/* 出欠登録 受付中 */}
          <View style={[styles.section, { backgroundColor: currentTheme.surface }]}> 
            <View style={styles.sectionHeader}>
              <Users size={18} color={currentTheme.accent} />
              <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>出欠登録 受付中</Text>
            </View>
            {attendanceNow.length === 0 ? (
              <Text style={{ color: currentTheme.textSecondary }}>現在、登録可能な日程はありません</Text>
            ) : (
              attendanceNow.map(s => {
                const isRegistering = registeringAttendance.has(s.id);
                return (
                  <View key={s.id} style={[styles.rowItem, styles.attendanceRow]}>
                    <View style={styles.attendanceRowContent}>
                      <Text style={[styles.rowTitle, { color: currentTheme.text }]} numberOfLines={1}>{s.title}</Text>
                      <Text style={[styles.rowMeta, { color: currentTheme.textSecondary }]}>{new Date(s.practice_date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' })}・{s.organization_name}</Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.attendanceButton,
                        {
                          backgroundColor: isRegistering ? currentTheme.secondary : currentTheme.primary,
                          opacity: isRegistering ? 0.6 : 1,
                        }
                      ]}
                      onPress={() => handleRegisterAttendance(s)}
                      disabled={isRegistering}
                    >
                      {isRegistering ? (
                        <ActivityIndicator size="small" color={currentTheme.surface} />
                      ) : (
                        <>
                          <Check size={16} color={currentTheme.surface} />
                          <Text style={[styles.attendanceButtonText, { color: currentTheme.surface }]}>
                            出席登録
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>

          {/* 課題（最新） */}
          <View style={[styles.section, { backgroundColor: currentTheme.surface }]}> 
            <View style={styles.sectionHeader}>
              <ListChecks size={18} color={currentTheme.textSecondary} />
              <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>課題（最新）</Text>
            </View>
            {tasks.length === 0 ? (
              <Text style={{ color: currentTheme.textSecondary }}>現在、課題はありません</Text>
            ) : (
              tasks.map(t => (
                <View key={t.id} style={styles.rowItem}>
                  <Text style={[styles.rowTitle, { color: currentTheme.text }]} numberOfLines={1}>{t.title}</Text>
                  <Text style={[styles.rowMeta, { color: currentTheme.textSecondary }]}>{t.organization_name}・{t.status === 'completed' ? '完了' : t.status === 'in_progress' ? '進行中' : '未着手'}</Text>
                </View>
              ))
            )}
          </View>

          {/* すべてを見る */}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topNav: { paddingHorizontal: 16, paddingTop: 8 },
  backButton: { alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 8 },
  backText: { fontSize: 14, fontWeight: '700' },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { flex: 1, paddingHorizontal: 16 },
    pageTitle: { fontSize: 18, fontWeight: '700', marginVertical: 12 },
    menuContainer: {
      marginBottom: 16,
      marginHorizontal: 12,
    },
    menuRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      elevation: 2,
    },
    menuItemHalf: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 8,
    },
    menuIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
    },
    menuTextContainer: {
      flex: 1,
    },
    menuTitle: {
      fontSize: 15,
      fontWeight: '700',
      marginBottom: 2,
      lineHeight: 20,
    },
    menuSubtitle: {
      fontSize: 11,
      lineHeight: 14,
    },
    section: { borderRadius: 12, padding: 12, marginBottom: 12, elevation: 2, marginHorizontal: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  rowItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#EAEAEA' },
  rowTitle: { fontSize: 15, fontWeight: '600' },
  rowMeta: { fontSize: 12, marginTop: 2 },
  attendanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  attendanceRowContent: {
    flex: 1,
    marginRight: 12,
  },
  attendanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  attendanceButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
});


