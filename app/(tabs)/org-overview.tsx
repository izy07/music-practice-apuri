import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import InstrumentHeader from '@/components/InstrumentHeader';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { Calendar, Users, ListChecks, ArrowRight } from 'lucide-react-native';
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

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const orgsResult = await organizationRepository.getUserOrganizations();
        if (orgsResult.error || !orgsResult.data) {
          ErrorHandler.handle(orgsResult.error, '組織取得', false);
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

          // 課題（各組織のサブグループ経由で集約・最大20件）
          const unifiedTasks: UnifiedTask[] = [];
          for (const org of uniqueOrgs) {
            // サブグループ横断の仕様は維持（簡略化：サブグループは省略し、組織直下を想定）
            try {
              const { data: subGroups } = await supabase
                .from('sub_groups')
                .select('id')
                .eq('organization_id', (org as any).id);
              for (const g of (subGroups || [])) {
                const tasksResult = await taskRepository.getBySubGroupId(g.id);
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
              }
            } catch {}
          }
          setTasks(unifiedTasks.slice(0, 20));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} edges={[]}> 
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
          <Text style={[styles.pageTitle, { color: currentTheme.text }]}>参加中の全組織 一覧</Text>

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
              attendanceNow.map(s => (
                <TouchableOpacity key={s.id} style={styles.rowItem} onPress={() => router.push({ pathname: '/attendance', params: { orgId: s.organization_id } })}>
                  <Text style={[styles.rowTitle, { color: currentTheme.text }]} numberOfLines={1}>{s.title}</Text>
                  <Text style={[styles.rowMeta, { color: currentTheme.textSecondary }]}>{new Date(s.practice_date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' })}・{s.organization_name}</Text>
                </TouchableOpacity>
              ))
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
  section: { borderRadius: 12, padding: 12, marginBottom: 12, elevation: 2, marginHorizontal: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  rowItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#EAEAEA' },
  rowTitle: { fontSize: 15, fontWeight: '600' },
  rowMeta: { fontSize: 12, marginTop: 2 },
});


