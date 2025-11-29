import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert, Modal, Dimensions, TextInput } from 'react-native';
import { Calendar, ChevronLeft, ChevronRight, Clock, MapPin } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import InstrumentHeader from '@/components/InstrumentHeader';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { useLanguage } from '@/components/LanguageContext';
import { PracticeScheduleManager, PracticeSchedule, OrganizationManager } from '@/lib/groupManagement';
import { formatLocalDate } from '@/lib/dateUtils';
import { organizationRepository } from '@/repositories/organizationRepository';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import { createShadowStyle } from '@/lib/shadowStyles';

type UnifiedSchedule = PracticeSchedule & {
  organization_id: string;
  organization_name: string;
};

export default function CalendarScreen() {
  const router = useRouter();
  const { orgId, allOrgs } = useLocalSearchParams();
  const { currentTheme } = useInstrumentTheme();
  const { t } = useLanguage();
  const isAllOrgsMode = allOrgs === 'true';
  
  // 画面サイズを取得（レスポンシブ対応）
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const isTablet = screenWidth >= 768;
  
  // 状態管理 - localStorageから保存された日付を読み込む
  const [currentDate, setCurrentDate] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedDate = localStorage.getItem('calendar_view_date');
      logger.debug('保存された日付を読み込み:', savedDate);
      if (savedDate) {
        const date = new Date(savedDate);
        logger.debug('読み込んだ日付:', date.getFullYear(), '年', date.getMonth() + 1, '月');
        return date;
      }
    }
    const defaultDate = new Date();
    logger.debug('デフォルト日付を使用:', defaultDate.getFullYear(), '年', defaultDate.getMonth() + 1, '月');
    return defaultDate;
  });
  const [schedules, setSchedules] = useState<UnifiedSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    location: '',
    practiceType: 'ensemble' as 'ensemble' | 'part_practice' | 'event'
  });

  useEffect(() => {
    loadSchedules();
  }, [currentDate, orgId, allOrgs]);

  // currentDateが変更されたらlocalStorageに保存
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dateStr = currentDate.toISOString();
      localStorage.setItem('calendar_view_date', dateStr);
      logger.debug('日付を保存:', currentDate.getFullYear(), '年', currentDate.getMonth() + 1, '月', '→', dateStr);
    }
  }, [currentDate]);

  const loadSchedules = async () => {
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      if (isAllOrgsMode) {
        // 全組織の練習日程を取得
        const orgsResult = await organizationRepository.getUserOrganizations();
        if (orgsResult.error || !orgsResult.data) {
          ErrorHandler.handle(orgsResult.error, '組織取得', false);
          setSchedules([]);
          return;
        }
        
        const orgs = orgsResult.data;
        const allSchedules: UnifiedSchedule[] = [];
        
        await Promise.all(orgs.map(async (org) => {
          try {
            const result = await PracticeScheduleManager.getMonthlySchedules(org.id, year, month);
            if (result.success && result.schedules) {
              const schedulesWithOrg = result.schedules.map((schedule: PracticeSchedule) => ({
                ...schedule,
                organization_id: org.id,
                organization_name: org.name || '（名称なし）',
              }));
              allSchedules.push(...schedulesWithOrg);
            }
          } catch (error) {
            ErrorHandler.handle(error, `組織 ${org.id} の練習日程取得`, false);
          }
        }));
        
        // 日付順にソート
        allSchedules.sort((a, b) => {
          const dateA = new Date(a.practice_date);
          const dateB = new Date(b.practice_date);
          return dateA.getTime() - dateB.getTime();
        });
        
        logger.debug(`カレンダー: ${allSchedules.length}件の予定を取得`);
        setSchedules(allSchedules);
      } else {
        // 単一組織の練習日程を取得
        if (orgId) {
          const result = await PracticeScheduleManager.getMonthlySchedules(orgId as string, year, month);
          if (result.success && result.schedules) {
            // 単一組織の場合はorganization情報を追加
            const orgsResult = await organizationRepository.getUserOrganizations();
            const org = orgsResult.data?.find(o => o.id === orgId);
            const schedulesWithOrg = result.schedules.map((schedule: PracticeSchedule) => ({
              ...schedule,
              organization_id: orgId as string,
              organization_name: org?.name || '（名称なし）',
            }));
            logger.debug(`カレンダー（単一組織）: ${schedulesWithOrg.length}件の予定を取得`);
            setSchedules(schedulesWithOrg);
          }
        }
      }
    } catch (error) {
      ErrorHandler.handle(error, '練習日程読み込み', false);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // 前月の日付を追加
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i);
      days.push({ date: prevDate, isCurrentMonth: false });
    }
    
    // 今月の日付を追加
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      days.push({ date, isCurrentMonth: true });
    }
    
    // 次月の日付を追加（6週分にするため）
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      const nextDate = new Date(year, month + 1, day);
      days.push({ date: nextDate, isCurrentMonth: false });
    }
    
    return days;
  };

  const getSchedulesForDate = (date: Date) => {
    const dateStr = formatLocalDate(date);
    return schedules.filter(schedule => schedule.practice_date === dateStr);
  };

  const getPracticeTypeColor = (type: string) => {
    switch (type) {
      case 'ensemble': return currentTheme.primary;
      case 'part_practice': return '#2196F3'; // 青色（固定）
      case 'individual_practice': return '#9C27B0'; // 紫
      case 'rehearsal': return '#FF5722'; // オレンジ
      case 'lesson': return '#00BCD4'; // シアン
      case 'event': return currentTheme.accent;
      default: return currentTheme.textSecondary;
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

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const handleCreateSchedule = async () => {
    if (!createForm.title.trim()) {
      Alert.alert('エラー', 'タイトルを入力してください');
      return;
    }

    setLoading(true);
    try {
      const result = await PracticeScheduleManager.createSchedule({
        organization_id: (orgId as string) || '',
        title: createForm.title.trim(),
        practice_date: selectedDate ? formatLocalDate(selectedDate) : formatLocalDate(new Date()),
        practice_type: createForm.practiceType as any,
        start_time: createForm.startTime || undefined,
        end_time: createForm.endTime || undefined,
        location: createForm.location.trim() || undefined,
        notes: createForm.description.trim() || undefined,
      });

      if (result.success) {
        Alert.alert('成功', '練習日程を作成しました！');
        setShowCreateModal(false);
        setCreateForm({
          title: '',
          description: '',
          startTime: '',
          endTime: '',
          location: '',
          practiceType: 'ensemble'
        });
        setSelectedDate(null);
        await loadSchedules();
      } else {
        Alert.alert('エラー', result.error || '練習日程の作成に失敗しました');
      }
    } catch (error) {
      Alert.alert('エラー', '練習日程の作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const days = getDaysInMonth(currentDate);
  const today = new Date();
  const isToday = (date: Date) => {
    return date.toDateString() === today.toDateString();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} edges={[]}>
      <InstrumentHeader />
      
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backButton, { color: currentTheme.primary }]}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: currentTheme.text }]}>
          {isAllOrgsMode ? '全組織の練習日程' : '練習日程'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* スクロール可能なコンテンツ */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        {/* 月ナビゲーション */}
        <View style={styles.monthNavigation}>
          <TouchableOpacity onPress={() => navigateMonth('prev')}>
            <ChevronLeft size={24} color={currentTheme.text} />
          </TouchableOpacity>
          <Text style={[styles.monthTitle, { color: currentTheme.text }]}>
            {currentDate.getFullYear()}年{currentDate.getMonth() + 1}月
          </Text>
          <TouchableOpacity onPress={() => navigateMonth('next')}>
            <ChevronRight size={24} color={currentTheme.text} />
          </TouchableOpacity>
        </View>

        {/* カレンダー */}
        <View style={[styles.calendar, isTablet && styles.calendarTablet]}>
          {/* 曜日ヘッダー */}
          <View style={styles.weekHeader}>
            {['日', '月', '火', '水', '木', '金', '土'].map((day) => (
              <Text key={day} style={[styles.weekDay, { color: currentTheme.textSecondary }]}>
                {day}
              </Text>
            ))}
          </View>

          {/* 日付グリッド */}
          <View style={styles.daysGrid}>
            {days.map((day, index) => {
              const daySchedules = getSchedulesForDate(day.date);
              const isCurrentMonth = day.isCurrentMonth;
              const isCurrentDay = isToday(day.date);
              
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dayCell,
                    { 
                      backgroundColor: isCurrentMonth ? 'transparent' : currentTheme.surface,
                      borderColor: isCurrentDay ? currentTheme.primary : 'transparent',
                      borderWidth: isCurrentDay ? 2 : 0
                    }
                  ]}
                  onPress={() => {
                    if (isCurrentMonth) {
                      setSelectedDate(day.date);
                      setShowCreateModal(true);
                    }
                  }}
                >
                  <Text style={[
                    styles.dayText,
                    { 
                      color: isCurrentMonth ? currentTheme.text : currentTheme.textSecondary,
                      fontWeight: isCurrentDay ? 'bold' : 'normal'
                    }
                  ]}>
                    {day.date.getDate()}
                  </Text>
                  
                  {/* 予定の色付きドット */}
                  <View style={styles.scheduleDots}>
                    {daySchedules.slice(0, 3).map((schedule, idx) => (
                      <View
                        key={idx}
                        style={[
                          styles.scheduleDot,
                          { backgroundColor: getPracticeTypeColor(schedule.practice_type) }
                        ]}
                      />
                    ))}
                    {daySchedules.length > 3 && (
                      <Text style={[styles.moreDots, { color: currentTheme.textSecondary }]}>
                        +{daySchedules.length - 3}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 今月の予定一覧 */}
        <View style={styles.schedulesList}>
        <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
          今月の予定
        </Text>
        
        {schedules.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: currentTheme.surface }]}>
            <Calendar size={48} color={currentTheme.textSecondary} />
            <Text style={[styles.emptyStateText, { color: currentTheme.text }]}>
              今月の予定はありません
            </Text>
          </View>
        ) : (
          schedules.map((schedule) => (
            <View key={schedule.id} style={[styles.scheduleItem, { backgroundColor: currentTheme.surface }]}>
              <View style={[styles.scheduleType, { backgroundColor: getPracticeTypeColor(schedule.practice_type) }]}>
                <Text style={styles.scheduleTypeText}>
                  {getPracticeTypeLabel(schedule.practice_type)}
                </Text>
              </View>
              <View style={styles.scheduleContent}>
                <Text style={[styles.scheduleTitle, { color: currentTheme.text }]}>
                  {schedule.title}
                </Text>
                <Text style={[styles.scheduleDate, { color: currentTheme.textSecondary }]}>
                  {(() => {
                    const dateParts = schedule.practice_date.split('-');
                    const date = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
                    return date.toLocaleDateString('ja-JP', { 
                      month: 'numeric', 
                      day: 'numeric',
                      weekday: 'short'
                    });
                  })()}
                  {schedule.start_time && ` ${schedule.start_time}`}
                  {isAllOrgsMode && schedule.organization_name && (
                    <Text style={[styles.organizationName, { color: currentTheme.primary }]}>
                      {' '}・{schedule.organization_name}
                    </Text>
                  )}
                </Text>
                {schedule.location && (
                  <View style={styles.scheduleLocation}>
                    <MapPin size={14} color={currentTheme.textSecondary} />
                    <Text style={[styles.locationText, { color: currentTheme.textSecondary }]}>
                      {schedule.location}
                    </Text>
                  </View>
                )}
                {schedule.notes && (
                  <Text style={[styles.scheduleDescription, { color: currentTheme.textSecondary }]}> 
                    {schedule.notes}
                  </Text>
                )}
              </View>
            </View>
          ))
        )}
        </View>
      </ScrollView>

      {/* 練習日程作成モーダル */}
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
                練習日程を作成
              </Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Text style={[styles.closeButton, { color: currentTheme.text }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedDate && (
                <View style={styles.selectedDateInfo}>
                  <Calendar size={20} color={currentTheme.primary} />
                  <Text style={[styles.selectedDateText, { color: currentTheme.text }]}>
                    {selectedDate.toLocaleDateString('ja-JP', { 
                      year: 'numeric',
                      month: 'long', 
                      day: 'numeric',
                      weekday: 'long'
                    })}
                  </Text>
                </View>
              )}

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: currentTheme.text }]}>
                  タイトル *
                </Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: currentTheme.background,
                    color: currentTheme.text,
                    borderColor: currentTheme.secondary
                  }]}
                  value={createForm.title}
                  onChangeText={(text) => setCreateForm(prev => ({ ...prev, title: text }))}
                  placeholder="練習タイトルを入力"
                  placeholderTextColor={currentTheme.textSecondary}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: currentTheme.text }]}>
                  練習の種類
                </Text>
                <View style={styles.practiceTypeButtons}>
                  {(['ensemble', 'part_practice', 'individual_practice', 'rehearsal', 'lesson', 'event'] as const).map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.practiceTypeButton,
                        { 
                          backgroundColor: createForm.practiceType === type ? currentTheme.primary : currentTheme.background,
                          borderColor: currentTheme.secondary
                        }
                      ]}
                      onPress={() => setCreateForm(prev => ({ ...prev, practiceType: type }))}
                    >
                      <Text style={[
                        styles.practiceTypeButtonText,
                        { 
                          color: createForm.practiceType === type ? currentTheme.surface : currentTheme.text
                        }
                      ]}>
                        {getPracticeTypeLabel(type)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.timeInputs}>
                <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                  <Text style={[styles.inputLabel, { color: currentTheme.text }]}>
                    開始時刻
                  </Text>
                  <TextInput
                    style={[styles.textInput, { 
                      backgroundColor: currentTheme.background,
                      color: currentTheme.text,
                      borderColor: currentTheme.secondary
                    }]}
                    value={createForm.startTime}
                    onChangeText={(text) => setCreateForm(prev => ({ ...prev, startTime: text }))}
                    placeholder="例: 19:00"
                    placeholderTextColor={currentTheme.textSecondary}
                  />
                </View>
                <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                  <Text style={[styles.inputLabel, { color: currentTheme.text }]}>
                    終了時刻
                  </Text>
                  <TextInput
                    style={[styles.textInput, { 
                      backgroundColor: currentTheme.background,
                      color: currentTheme.text,
                      borderColor: currentTheme.secondary
                    }]}
                    value={createForm.endTime}
                    onChangeText={(text) => setCreateForm(prev => ({ ...prev, endTime: text }))}
                    placeholder="例: 21:00"
                    placeholderTextColor={currentTheme.textSecondary}
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: currentTheme.text }]}>
                  場所
                </Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: currentTheme.background,
                    color: currentTheme.text,
                    borderColor: currentTheme.secondary
                  }]}
                  value={createForm.location}
                  onChangeText={(text) => setCreateForm(prev => ({ ...prev, location: text }))}
                  placeholder="練習場所を入力"
                  placeholderTextColor={currentTheme.textSecondary}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: currentTheme.text }]}>
                  説明
                </Text>
                <TextInput
                  style={[styles.textArea, { 
                    backgroundColor: currentTheme.background,
                    color: currentTheme.text,
                    borderColor: currentTheme.secondary
                  }]}
                  value={createForm.description}
                  onChangeText={(text) => setCreateForm(prev => ({ ...prev, description: text }))}
                  placeholder="詳細な説明を入力"
                  placeholderTextColor={currentTheme.textSecondary}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <TouchableOpacity
                style={[styles.modalButton, { 
                  backgroundColor: currentTheme.primary,
                  opacity: loading ? 0.6 : 1
                }]}
                onPress={handleCreateSchedule}
                disabled={loading}
              >
                <Text style={[styles.modalButtonText, { color: currentTheme.surface }]}>
                  {loading ? '作成中...' : '練習日程を作成'}
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
  backButton: {
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  monthNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  calendar: {
    marginHorizontal: 20,
    marginTop: 40,
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 0,
    elevation: 4,
    ...createShadowStyle({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 4,
    }),
  },
  weekHeader: {
    flexDirection: 'row',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
    position: 'relative',
    minHeight: 40, // 最小高さを設定してレスポンシブ対応
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
  },
  scheduleDots: {
    position: 'absolute',
    bottom: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  scheduleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 2,
  },
  moreDots: {
    fontSize: 10,
    marginLeft: 2,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  schedulesList: {
    paddingHorizontal: 20,
    marginTop: 20,
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
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    ...createShadowStyle({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    }),
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
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  scheduleDate: {
    fontSize: 14,
    marginBottom: 8,
  },
  scheduleLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 12,
    marginLeft: 4,
  },
  scheduleDescription: {
    fontSize: 14,
    lineHeight: 20,
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
  selectedDateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 16,
  },
  selectedDateText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
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
    minHeight: 80,
  },
  timeInputs: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  practiceTypeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  practiceTypeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  practiceTypeButtonText: {
    fontSize: 14,
    fontWeight: '500',
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
  organizationName: {
    fontSize: 14,
    fontWeight: '500',
  },
  // タブレット対応スタイル
  calendarTablet: {
    marginHorizontal: 40,
    maxWidth: 600,
    alignSelf: 'center',
  },
});
