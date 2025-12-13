import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal, TextInput, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckSquare, CheckCircle, XCircle, Clock, ArrowLeft, Users } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import InstrumentHeader from '@/components/InstrumentHeader';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { useLanguage } from '@/components/LanguageContext';
import { PracticeScheduleManager, AttendanceManager, PracticeSchedule, AttendanceRecord } from '@/lib/groupManagement';
import { organizationRepository } from '@/repositories/organizationRepository';
import { attendanceRepository } from '@/repositories/attendanceRepository';
import { supabase } from '@/lib/supabase';
import { safeGoBack } from '@/lib/navigationUtils';

type UnifiedSchedule = PracticeSchedule & {
  organization_id: string;
  organization_name: string;
};

export default function AttendanceScreen() {
  const router = useRouter();
  const { orgId, allOrgs } = useLocalSearchParams();
  const { currentTheme } = useInstrumentTheme();
  const { t } = useLanguage();
  const isAllOrgsMode = allOrgs === 'true';
  
  // 状態管理
  const [schedules, setSchedules] = useState<UnifiedSchedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<UnifiedSchedule | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<'absent' | 'late' | null>(null);
  const [reason, setReason] = useState('');
  const [memberNames, setMemberNames] = useState<{ [userId: string]: string }>({});

  useEffect(() => {
    loadSchedules();
  }, [orgId, allOrgs]);

  useEffect(() => {
    if (selectedSchedule) {
      loadAttendanceRecords();
    }
  }, [selectedSchedule]);

  // 出席登録可能日になったときに通知を送信
  useEffect(() => {
    const checkAndSendAttendanceNotifications = async () => {
      try {
        const NotificationService = (await import('@/lib/notificationService')).default;
        const notificationService = NotificationService.getInstance();
        await notificationService.loadSettings();

        // ストレージの取得（Web環境ではlocalStorage、それ以外ではAsyncStorage）
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

        // 出席登録可能な練習日程をチェック
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (const schedule of schedules) {
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
    };

    if (schedules.length > 0) {
      checkAndSendAttendanceNotifications();
    }
  }, [schedules]);

  const loadSchedules = async () => {
    setLoading(true);
    try {
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      if (isAllOrgsMode) {
        // 全組織の出欠登録可能な練習日程を取得
        const orgsResult = await organizationRepository.getUserOrganizations();
        if (orgsResult.error || !orgsResult.data) {
          console.error('組織取得エラー:', orgsResult.error);
          setSchedules([]);
          return;
        }
        
        const orgs = orgsResult.data;
        const allSchedules: UnifiedSchedule[] = [];
        
        await Promise.all(orgs.map(async (org) => {
          try {
            const result = await PracticeScheduleManager.getMonthlySchedules(org.id, year, month);
            if (result.success && result.schedules) {
              // 練習日の5日前から当日までの日程をフィルタリング
              const attendableSchedules = result.schedules
                .filter((schedule: PracticeSchedule) => attendanceRepository.shouldShowInAttendance(schedule.practice_date))
                .map((schedule: PracticeSchedule) => ({
                  ...schedule,
                  organization_id: org.id,
                  organization_name: org.name || '（名称なし）',
                }));
              allSchedules.push(...attendableSchedules);
            }
          } catch (error) {
            console.error(`組織 ${org.id} の練習日程取得エラー:`, error);
          }
        }));
        
        // 日付順にソート
        allSchedules.sort((a, b) => {
          const dateA = new Date(a.practice_date);
          const dateB = new Date(b.practice_date);
          return dateA.getTime() - dateB.getTime();
        });
        
        setSchedules(allSchedules);
      } else {
        // 単一組織の練習日程を取得
        if (orgId) {
          const result = await PracticeScheduleManager.getMonthlySchedules(orgId as string, year, month);
          if (result.success && result.schedules) {
            // 単一組織の場合はorganization情報を追加し、練習日の5日前から当日までの日程をフィルタリング
            const orgsResult = await organizationRepository.getUserOrganizations();
            const org = orgsResult.data?.find(o => o.id === orgId);
            const schedulesWithOrg = result.schedules
              .filter((schedule: PracticeSchedule) => attendanceRepository.shouldShowInAttendance(schedule.practice_date))
              .map((schedule: PracticeSchedule) => ({
                ...schedule,
                organization_id: orgId as string,
                organization_name: org?.name || '（名称なし）',
              }));
            setSchedules(schedulesWithOrg);
          }
        }
      }
    } catch (error) {
      console.error('練習日程読み込みエラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAttendanceRecords = async () => {
    if (!selectedSchedule) return;
    
    setLoading(true);
    try {
      const result = await AttendanceManager.getAttendanceRecords(selectedSchedule.id);
      if (result.success && result.records) {
        setAttendanceRecords(result.records);
        
        // メンバー名を取得
        const userIds = [...new Set(result.records.map(r => r.user_id))];
        const names: { [userId: string]: string } = {};
        
        await Promise.all(userIds.map(async (userId) => {
          try {
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('display_name')
              .eq('user_id', userId)
              .maybeSingle();
            
            names[userId] = profile?.display_name || 'ユーザー';
          } catch (error) {
            names[userId] = 'ユーザー';
          }
        }));
        
        setMemberNames(names);
      }
    } catch (error) {
      console.error('出欠席記録読み込みエラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const canRegisterAttendance = (practiceDate: string) => {
    return AttendanceManager.canRegisterAttendance(practiceDate);
  };

  const handleAttendanceButtonPress = (status: 'present' | 'absent' | 'late') => {
    if (status === 'absent' || status === 'late') {
      // 欠席・遅刻の場合は理由入力モーダルを表示
      setPendingStatus(status);
      setReason('');
      setShowReasonModal(true);
    } else {
      // 出席の場合は直接登録
      registerAttendance(status, '');
    }
  };

  const registerAttendance = async (status: 'present' | 'absent' | 'late', notes: string = '') => {
    if (!selectedSchedule) return;

    setLoading(true);
    try {
      const result = await AttendanceManager.registerAttendance(selectedSchedule.id, status, notes);
      if (result.success) {
        Alert.alert('成功', '出欠席を登録しました');
        setShowReasonModal(false);
        setReason('');
        setPendingStatus(null);
        await loadAttendanceRecords();
      } else {
        Alert.alert('エラー', result.error || '出欠席の登録に失敗しました');
      }
    } catch (error) {
      Alert.alert('エラー', '出欠席の登録に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle size={20} color="#4CAF50" />;
      case 'absent':
        return <XCircle size={20} color="#F44336" />;
      case 'late':
        return <Clock size={20} color="#FF9800" />;
      default:
        return <CheckSquare size={20} color={currentTheme.textSecondary} />;
    }
  };

  const getAttendanceStatusLabel = (status: string) => {
    switch (status) {
      case 'present': return '出席';
      case 'absent': return '欠席';
      case 'late': return '遅刻';
      default: return '未登録';
    }
  };

  const getAttendanceCounts = () => {
    const present = attendanceRecords.filter(r => r.status === 'present').length;
    const absent = attendanceRecords.filter(r => r.status === 'absent').length;
    const late = attendanceRecords.filter(r => r.status === 'late').length;
    const total = attendanceRecords.length;
    
    return { present, absent, late, total };
  };

  // 現在のユーザーの出欠記録を取得
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    getCurrentUser();
  }, []);

  const currentUserRecord = currentUserId 
    ? attendanceRecords.find(r => r.user_id === currentUserId) 
    : null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]}>
      <InstrumentHeader />
      
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          const fallbackRoute = isAllOrgsMode ? '/(tabs)/org-overview' : '/(tabs)/share';
          safeGoBack(fallbackRoute);
        }}>
          <ArrowLeft size={24} color={currentTheme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: currentTheme.text }]}>
          {isAllOrgsMode ? '全組織の出欠登録' : '出欠席管理'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 練習日程選択 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
            {isAllOrgsMode ? '出欠登録可能な練習日程' : '練習日程を選択'}
          </Text>
          
          {schedules.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: currentTheme.surface }]}>
              <CheckSquare size={48} color={currentTheme.textSecondary} />
              <Text style={[styles.emptyStateText, { color: currentTheme.text }]}>
                {isAllOrgsMode ? '現在、登録可能な日程はありません' : '今月の練習予定はありません'}
              </Text>
            </View>
          ) : (
            schedules.map((schedule) => {
              const canRegister = canRegisterAttendance(schedule.practice_date);
              const isSelected = selectedSchedule?.id === schedule.id;
              
              return (
                <View key={schedule.id} style={styles.scheduleWrapper}>
                  <TouchableOpacity
                    style={[
                      styles.scheduleCard,
                      { 
                        backgroundColor: isSelected ? currentTheme.primary + '20' : currentTheme.surface,
                        borderColor: isSelected ? currentTheme.primary : 'transparent',
                        borderWidth: isSelected ? 2 : 0
                      }
                    ]}
                    onPress={() => setSelectedSchedule(schedule)}
                  >
                    <View style={styles.scheduleContent}>
                      <Text style={[styles.scheduleTitle, { color: currentTheme.text }]}>
                        {schedule.title}
                      </Text>
                      <Text style={[styles.scheduleDate, { color: currentTheme.textSecondary }]}>
                        {new Date(schedule.practice_date).toLocaleDateString('ja-JP', { 
                          month: 'numeric',
                          day: 'numeric',
                          weekday: 'short'
                        })}
                        {schedule.start_time && ` ${schedule.start_time}`}
                        {isAllOrgsMode && schedule.organization_name && (
                          <Text style={[styles.organizationName, { color: currentTheme.primary }]}>
                            {' '}・{schedule.organization_name}
                          </Text>
                        )}
                      </Text>
                      {schedule.location && (
                        <Text style={[styles.scheduleLocation, { color: currentTheme.textSecondary }]}>
                          📍 {schedule.location}
                        </Text>
                      )}
                    </View>
                    <View style={styles.scheduleStatus}>
                      {canRegister ? (
                        <View style={[styles.statusBadge, { backgroundColor: '#4CAF50' }]}>
                          <Text style={styles.statusText}>登録可能</Text>
                        </View>
                      ) : (
                        <View style={[styles.statusBadge, { backgroundColor: '#9E9E9E' }]}>
                          <Text style={styles.statusText}>期間外</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                  {isSelected && (
                    <View style={[styles.inlineRegistration, { borderTopColor: currentTheme.secondary + '30' }]}>
                      <Text style={[styles.inlineRegistrationTitle, { color: currentTheme.text }]}>
                        出欠席を登録
                      </Text>
                      {canRegister ? (
                        <View style={styles.attendanceButtons}>
                          <TouchableOpacity
                            style={[styles.attendanceButton, { backgroundColor: '#4CAF50' }]}
                            onPress={() => handleAttendanceButtonPress('present')}
                            disabled={loading}
                          >
                            <CheckCircle size={24} color="#FFFFFF" />
                            <Text style={styles.attendanceButtonText}>出席</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.attendanceButton, { backgroundColor: '#F44336' }]}
                            onPress={() => handleAttendanceButtonPress('absent')}
                            disabled={loading}
                          >
                            <XCircle size={24} color="#FFFFFF" />
                            <Text style={styles.attendanceButtonText}>欠席</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.attendanceButton, { backgroundColor: '#FF9800' }]}
                            onPress={() => handleAttendanceButtonPress('late')}
                            disabled={loading}
                          >
                            <Clock size={24} color="#FFFFFF" />
                            <Text style={styles.attendanceButtonText}>遅刻</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View style={[styles.registrationClosed, { backgroundColor: currentTheme.surface }]}>
                          <Text style={[styles.registrationClosedText, { color: currentTheme.textSecondary }]}>
                            出欠席登録期間外です
                          </Text>
                          <Text style={[styles.registrationClosedSubtext, { color: currentTheme.textSecondary }]}>
                            練習日当日〜5日後まで登録できます
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        {selectedSchedule && currentUserRecord && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
              あなたの登録状況
            </Text>
            <View style={[styles.currentStatus, { backgroundColor: currentTheme.surface }]}>
              <View style={styles.currentStatusContent}>
                {getAttendanceStatusIcon(currentUserRecord.status)}
                <Text style={[styles.currentStatusText, { color: currentTheme.text }]}>
                  {getAttendanceStatusLabel(currentUserRecord.status)}
                </Text>
                <Text style={[styles.currentStatusTime, { color: currentTheme.textSecondary }]}>
                  {currentUserRecord.created_at ? new Date(currentUserRecord.created_at).toLocaleString('ja-JP') : ''}
                </Text>
              </View>
              {currentUserRecord.notes && (
                <View style={styles.reasonContainer}>
                  <Text style={[styles.reasonLabel, { color: currentTheme.textSecondary }]}>理由:</Text>
                  <Text style={[styles.reasonText, { color: currentTheme.text }]}>{currentUserRecord.notes}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* 集計結果 */}
        {selectedSchedule && attendanceRecords.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
              集計結果
            </Text>
            <View style={[styles.summaryCard, { backgroundColor: currentTheme.surface }]}>
              <View style={styles.summaryHeader}>
                <Users size={20} color={currentTheme.primary} />
                <Text style={[styles.summaryTitle, { color: currentTheme.text }]}>
                  出欠席の集計
                </Text>
              </View>
              <View style={styles.summaryStats}>
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: '#4CAF50' }]}>
                    {getAttendanceCounts().present}
                  </Text>
                  <Text style={[styles.statLabel, { color: currentTheme.textSecondary }]}>
                    出席
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: '#F44336' }]}>
                    {getAttendanceCounts().absent}
                  </Text>
                  <Text style={[styles.statLabel, { color: currentTheme.textSecondary }]}>
                    欠席
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: '#FF9800' }]}>
                    {getAttendanceCounts().late}
                  </Text>
                  <Text style={[styles.statLabel, { color: currentTheme.textSecondary }]}>
                    遅刻
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: currentTheme.text }]}>
                    {getAttendanceCounts().total}
                  </Text>
                  <Text style={[styles.statLabel, { color: currentTheme.textSecondary }]}>
                    合計
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* 全メンバーの出欠席一覧 */}
        {selectedSchedule && attendanceRecords.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
              全メンバーの出欠席
            </Text>
            
            <View style={[styles.membersList, { backgroundColor: currentTheme.surface }]}>
              {attendanceRecords.map((record) => {
                const memberName = memberNames[record.user_id] || 'ユーザー';
                const isCurrentUser = record.user_id === currentUserId;
                
                return (
                  <View 
                    key={record.id} 
                    style={[
                      styles.memberItem,
                      isCurrentUser && { backgroundColor: currentTheme.primary + '10' }
                    ]}
                  >
                    <View style={styles.memberItemContent}>
                      <View style={styles.memberItemHeader}>
                        <Text style={[styles.memberName, { color: currentTheme.text }]}>
                          {memberName}
                          {isCurrentUser && (
                            <Text style={[styles.currentUserBadge, { color: currentTheme.primary }]}> (あなた)</Text>
                          )}
                        </Text>
                        <View style={styles.memberStatus}>
                          {getAttendanceStatusIcon(record.status)}
                          <Text style={[styles.memberStatusText, { color: currentTheme.text }]}>
                            {getAttendanceStatusLabel(record.status)}
                          </Text>
                        </View>
                      </View>
                      {record.notes && (
                        <View style={styles.memberReasonContainer}>
                          <Text style={[styles.memberReasonLabel, { color: currentTheme.textSecondary }]}>理由:</Text>
                          <Text style={[styles.memberReasonText, { color: currentTheme.text }]}>{record.notes}</Text>
                        </View>
                      )}
                      <Text style={[styles.memberTime, { color: currentTheme.textSecondary }]}>
                        {record.created_at ? new Date(record.created_at).toLocaleString('ja-JP') : ''}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

      </ScrollView>

      {/* 理由入力モーダル */}
      <Modal
        visible={showReasonModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowReasonModal(false);
          setReason('');
          setPendingStatus(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: currentTheme.text }]}>
                {pendingStatus === 'absent' ? '欠席理由' : '遅刻理由'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowReasonModal(false);
                  setReason('');
                  setPendingStatus(null);
                }}
              >
                <Text style={[styles.modalClose, { color: currentTheme.text }]}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={[styles.modalDescription, { color: currentTheme.textSecondary }]}>
              {pendingStatus === 'absent' ? '欠席の理由を入力してください（任意）' : '遅刻の理由を入力してください（任意）'}
            </Text>
            
            <TextInput
              style={[
                styles.reasonInput,
                {
                  backgroundColor: currentTheme.background,
                  color: currentTheme.text,
                  borderColor: currentTheme.secondary,
                }
              ]}
              value={reason}
              onChangeText={setReason}
              placeholder="理由を入力してください"
              placeholderTextColor={currentTheme.textSecondary}
              multiline
              numberOfLines={4}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton, { backgroundColor: currentTheme.secondary }]}
                onPress={() => {
                  setShowReasonModal(false);
                  setReason('');
                  setPendingStatus(null);
                }}
              >
                <Text style={[styles.modalButtonText, { color: currentTheme.text }]}>キャンセル</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSubmitButton, { backgroundColor: pendingStatus === 'absent' ? '#F44336' : '#FF9800' }]}
                onPress={() => {
                  if (pendingStatus) {
                    registerAttendance(pendingStatus, reason.trim());
                  }
                }}
                disabled={loading}
              >
                <Text style={styles.modalButtonText}>登録</Text>
              </TouchableOpacity>
            </View>
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
    marginTop: 12,
    fontWeight: '500',
  },
  scheduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
  },
  scheduleContent: {
    flex: 1,
  },
  scheduleTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  scheduleDate: {
    fontSize: 14,
    marginBottom: 4,
  },
  scheduleLocation: {
    fontSize: 12,
  },
  scheduleStatus: {
    marginLeft: 12,
  },
  scheduleWrapper: {
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  attendanceButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  attendanceButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginHorizontal: 4,
    borderRadius: 12,
    gap: 8,
  },
  attendanceButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  registrationClosed: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
  },
  registrationClosedText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  registrationClosedSubtext: {
    fontSize: 12,
    textAlign: 'center',
  },
  currentStatus: {
    padding: 16,
    borderRadius: 12,
    elevation: 2,
  },
  currentStatusTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  currentStatusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currentStatusText: {
    fontSize: 16,
    fontWeight: '500',
  },
  currentStatusTime: {
    fontSize: 12,
    marginLeft: 'auto',
  },
  summaryCard: {
    padding: 16,
    borderRadius: 12,
    elevation: 2,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  attendanceList: {
    maxHeight: 200,
  },
  attendanceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  attendanceItemContent: {
    flex: 1,
  },
  memberNameSmall: {
    fontSize: 14,
    fontWeight: '500',
  },
  registrationTime: {
    fontSize: 12,
  },
  attendanceItemStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  attendanceStatusText: {
    fontSize: 12,
  },
  organizationName: {
    fontSize: 14,
    fontWeight: '500',
  },
  reasonContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  reasonLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 14,
    lineHeight: 20,
  },
  membersList: {
    borderRadius: 12,
    padding: 16,
    elevation: 2,
  },
  memberItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  memberItemContent: {
    flex: 1,
  },
  memberItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  currentUserBadge: {
    fontSize: 14,
    fontWeight: '500',
  },
  memberStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  memberStatusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  memberReasonContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  memberReasonLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  memberReasonText: {
    fontSize: 14,
    lineHeight: 20,
  },
  memberTime: {
    fontSize: 12,
    marginTop: 4,
  },
  inlineRegistration: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  inlineRegistrationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalClose: {
    fontSize: 24,
    fontWeight: '300',
  },
  modalDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  reasonInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButton: {
    // backgroundColor is set inline
  },
  modalSubmitButton: {
    // backgroundColor is set inline
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
