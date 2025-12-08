import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, Clock, Settings, Users, Calendar, CheckSquare, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { supabase } from '@/lib/supabase';
import { safeGoBack } from '@/lib/navigationUtils';

interface NotificationSettings {
  practice_reminders: boolean;
  organization_attendance_available: boolean;
  organization_schedule_added: boolean;
  organization_task_added: boolean;
  sound_notifications: boolean;
  vibration_notifications: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
}

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const { currentTheme } = useInstrumentTheme();
  const [settings, setSettings] = useState<NotificationSettings>({
    practice_reminders: true,
    organization_attendance_available: true,
    organization_schedule_added: true,
    organization_task_added: true,
    sound_notifications: true,
    vibration_notifications: true,
    quiet_hours_enabled: false,
    quiet_hours_start: '22:00',
    quiet_hours_end: '08:00',
  });
  const [timeModalVisible, setTimeModalVisible] = useState(false);
  const [editingTimeType, setEditingTimeType] = useState<'start' | 'end' | null>(null);
  const [tempStartTime, setTempStartTime] = useState('22:00');
  const [tempEndTime, setTempEndTime] = useState('08:00');

  useEffect(() => {
    loadNotificationSettings();
  }, []);

  const loadNotificationSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        try {
          // select('*')を使用することで、カラムが存在しない場合でも400エラーを回避
          const { data, error } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

          // エラーが発生した場合（レコードが存在しない等）は無視
          if (error) {
            // レコードが存在しない場合は正常（デフォルト設定を使用）
            if (error.code === 'PGRST116' || error.code === 'PGRST205') {
              return;
            }
            // その他のエラーも無視
            return;
          }

          // notification_settingsカラムが存在する場合のみ設定を更新
          if (data && 'notification_settings' in data && data.notification_settings) {
            setSettings({ ...settings, ...data.notification_settings });
          }
        } catch (queryError) {
          // すべてのエラーを無視（カラムが存在しない場合などは正常な動作）
        }
      }
    } catch (error) {
      // エラーを完全に無視
    }
  };

  const saveNotificationSettings = async (newSettings: NotificationSettings) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('user_settings')
          .upsert({
            user_id: user.id,
            notification_settings: newSettings,
            updated_at: new Date().toISOString(),
          });

        if (error) {
          throw error;
        }

        setSettings(newSettings);
        Alert.alert('成功', '通知設定を保存しました');
      }
    } catch (error) {
      Alert.alert('エラー', '通知設定の保存に失敗しました');
    }
  };

  const toggleSetting = (key: keyof NotificationSettings) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
    saveNotificationSettings(newSettings);
  };

  const requestNotificationPermission = async () => {
    if (Platform.OS === 'web') {
      try {
        if (!('Notification' in window)) {
          Alert.alert('通知がサポートされていません', 'このブラウザでは通知機能を利用できません');
          return;
        }

        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          Alert.alert('成功', '通知の許可が完了しました');
          // テスト通知を送信
          testNotification();
        } else if (permission === 'denied') {
          Alert.alert('通知が拒否されました', 'ブラウザの設定で通知を許可してください');
        } else {
          Alert.alert('通知が許可されていません', 'ブラウザの設定で通知を許可してください');
        }
      } catch (error) {
        Alert.alert('エラー', '通知の許可を取得できませんでした');
      }
    } else {
      Alert.alert('通知設定', '通知の設定は端末の設定から行ってください');
    }
  };

  const testNotification = async () => {
    if (Platform.OS === 'web' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('音楽練習アプリ', {
        body: 'これはテスト通知です。通知設定が正常に動作しています。',
        icon: '/icon.png',
      });
    } else {
      Alert.alert('通知テスト', '通知のテストはWeb環境でのみ利用できます');
    }
  };

  // 時刻のバリデーション（HH:MM形式）
  const validateTime = (time: string): boolean => {
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  };

  // 時刻選択モーダルを開く
  const openTimePicker = (type: 'start' | 'end') => {
    setTempStartTime(settings.quiet_hours_start);
    setTempEndTime(settings.quiet_hours_end);
    setEditingTimeType(type);
    setTimeModalVisible(true);
  };

  // 時刻を保存
  const saveTime = () => {
    if (!validateTime(tempStartTime) || !validateTime(tempEndTime)) {
      Alert.alert('エラー', '時刻はHH:MM形式で入力してください（例: 22:00）');
      return;
    }

    const newSettings = {
      ...settings,
      quiet_hours_start: tempStartTime,
      quiet_hours_end: tempEndTime,
    };
    setSettings(newSettings);
    saveNotificationSettings(newSettings);
    setTimeModalVisible(false);
    setEditingTimeType(null);
  };

  // 時刻入力のフォーマット処理
  const formatTimeInput = (text: string): string => {
    // 数字のみ抽出
    const numbers = text.replace(/[^0-9]/g, '');
    
    if (numbers.length === 0) return '';
    if (numbers.length <= 2) return numbers;
    
    // HH:MM形式に変換
    const hours = numbers.slice(0, 2);
    const minutes = numbers.slice(2, 4);
    
    // 時間の範囲チェック
    const hourNum = parseInt(hours, 10);
    const validHours = hourNum > 23 ? '23' : hours;
    
    return `${validHours}:${minutes.slice(0, 2)}`;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} >
      {/* ヘッダー */}
      <View style={[styles.header, { borderBottomColor: currentTheme.secondary }]}>
        <TouchableOpacity
          onPress={() => safeGoBack('/(tabs)/settings', true)} // 強制的にsettings画面に戻る
          style={styles.backButton}
        >
          <Text style={[styles.backButtonText, { color: currentTheme.text }]}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: currentTheme.text }]}>通知設定</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 通知権限 */}
        <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
          <View style={styles.sectionHeader}>
            <Bell size={20} color={currentTheme.primary} />
            <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>通知権限</Text>
          </View>
          <Text style={[styles.sectionDescription, { color: currentTheme.textSecondary }]}>
            アプリからの通知を受信するには、通知の許可が必要です
          </Text>
          <TouchableOpacity
            style={[styles.permissionButton, { backgroundColor: currentTheme.primary }]}
            onPress={requestNotificationPermission}
          >
            <Text style={styles.permissionButtonText}>通知を許可</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.testButton, { borderColor: currentTheme.secondary }]}
            onPress={testNotification}
          >
            <Text style={[styles.testButtonText, { color: currentTheme.text }]}>テスト通知</Text>
          </TouchableOpacity>
        </View>

        {/* 通知の種類 */}
        <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
          <View style={styles.sectionHeader}>
            <Settings size={20} color={currentTheme.primary} />
            <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>通知の種類</Text>
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Clock size={18} color={currentTheme.textSecondary} />
              <Text style={[styles.settingLabel, { color: currentTheme.text }]}>練習リマインダー</Text>
            </View>
            <Switch
              value={settings.practice_reminders}
              onValueChange={() => toggleSetting('practice_reminders')}
              trackColor={{ false: currentTheme.secondary, true: currentTheme.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* 組織関連の通知 */}
        <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
          <View style={styles.sectionHeader}>
            <Users size={20} color={currentTheme.primary} />
            <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>組織関連の通知</Text>
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <CheckSquare size={18} color={currentTheme.textSecondary} />
              <Text style={[styles.settingLabel, { color: currentTheme.text }]}>出席登録可能日</Text>
            </View>
            <Switch
              value={settings.organization_attendance_available}
              onValueChange={() => toggleSetting('organization_attendance_available')}
              trackColor={{ false: currentTheme.secondary, true: currentTheme.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Calendar size={18} color={currentTheme.textSecondary} />
              <Text style={[styles.settingLabel, { color: currentTheme.text }]}>練習日程が追加されたとき</Text>
            </View>
            <Switch
              value={settings.organization_schedule_added}
              onValueChange={() => toggleSetting('organization_schedule_added')}
              trackColor={{ false: currentTheme.secondary, true: currentTheme.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <CheckSquare size={18} color={currentTheme.textSecondary} />
              <Text style={[styles.settingLabel, { color: currentTheme.text }]}>課題が追加されたとき</Text>
            </View>
            <Switch
              value={settings.organization_task_added}
              onValueChange={() => toggleSetting('organization_task_added')}
              trackColor={{ false: currentTheme.secondary, true: currentTheme.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* 通知の方法 */}
        <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
          <View style={styles.sectionHeader}>
            <Bell size={20} color={currentTheme.primary} />
            <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>通知の方法</Text>
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: currentTheme.text }]}>サウンド</Text>
            </View>
            <Switch
              value={settings.sound_notifications}
              onValueChange={() => toggleSetting('sound_notifications')}
              trackColor={{ false: currentTheme.secondary, true: currentTheme.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: currentTheme.text }]}>バイブレーション</Text>
            </View>
            <Switch
              value={settings.vibration_notifications}
              onValueChange={() => toggleSetting('vibration_notifications')}
              trackColor={{ false: currentTheme.secondary, true: currentTheme.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* おやすみ時間 */}
        <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
          <View style={styles.sectionHeader}>
            <Clock size={20} color={currentTheme.primary} />
            <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>おやすみ時間</Text>
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: currentTheme.text }]}>おやすみ時間を有効にする</Text>
            </View>
            <Switch
              value={settings.quiet_hours_enabled}
              onValueChange={() => toggleSetting('quiet_hours_enabled')}
              trackColor={{ false: currentTheme.secondary, true: currentTheme.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          {settings.quiet_hours_enabled && (
            <View style={styles.quietHoursContainer}>
              <Text style={[styles.quietHoursLabel, { color: currentTheme.textSecondary }]}>
                おやすみ時間中は通知が送信されません
              </Text>
              
              {/* 開始時刻選択 */}
              <TouchableOpacity
                style={[styles.timeSelectButton, { borderColor: currentTheme.secondary }]}
                onPress={() => openTimePicker('start')}
              >
                <View style={styles.timeSelectContent}>
                  <Text style={[styles.timeSelectLabel, { color: currentTheme.textSecondary }]}>
                    開始時刻
                  </Text>
                  <View style={styles.timeSelectValue}>
                    <Text style={[styles.timeSelectTime, { color: currentTheme.text }]}>
                      {settings.quiet_hours_start}
                    </Text>
                    <ChevronRight size={20} color={currentTheme.textSecondary} />
                  </View>
                </View>
              </TouchableOpacity>

              {/* 終了時刻選択 */}
              <TouchableOpacity
                style={[styles.timeSelectButton, { borderColor: currentTheme.secondary, marginTop: 12 }]}
                onPress={() => openTimePicker('end')}
              >
                <View style={styles.timeSelectContent}>
                  <Text style={[styles.timeSelectLabel, { color: currentTheme.textSecondary }]}>
                    終了時刻
                  </Text>
                  <View style={styles.timeSelectValue}>
                    <Text style={[styles.timeSelectTime, { color: currentTheme.text }]}>
                      {settings.quiet_hours_end}
                    </Text>
                    <ChevronRight size={20} color={currentTheme.textSecondary} />
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* 時刻選択モーダル */}
          <Modal
            visible={timeModalVisible}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setTimeModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: currentTheme.surface }]}>
                <Text style={[styles.modalTitle, { color: currentTheme.text }]}>
                  おやすみ時間を設定
                </Text>

                <View style={styles.timeInputContainer}>
                  <View style={styles.timeInputRow}>
                    <Text style={[styles.timeInputLabel, { color: currentTheme.text }]}>
                      開始時刻
                    </Text>
                    <TextInput
                      style={[styles.timeInput, {
                        backgroundColor: currentTheme.background,
                        color: currentTheme.text,
                        borderColor: currentTheme.secondary,
                      }]}
                      value={tempStartTime}
                      onChangeText={(text) => setTempStartTime(formatTimeInput(text))}
                      placeholder="22:00"
                      placeholderTextColor={currentTheme.textSecondary}
                      maxLength={5}
                    />
                  </View>

                  <View style={styles.timeInputRow}>
                    <Text style={[styles.timeInputLabel, { color: currentTheme.text }]}>
                      終了時刻
                    </Text>
                    <TextInput
                      style={[styles.timeInput, {
                        backgroundColor: currentTheme.background,
                        color: currentTheme.text,
                        borderColor: currentTheme.secondary,
                      }]}
                      value={tempEndTime}
                      onChangeText={(text) => setTempEndTime(formatTimeInput(text))}
                      placeholder="08:00"
                      placeholderTextColor={currentTheme.textSecondary}
                      maxLength={5}
                    />
                  </View>
                </View>

                <Text style={[styles.timeHint, { color: currentTheme.textSecondary }]}>
                  時刻はHH:MM形式で入力してください（例: 22:00）
                </Text>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonCancel, { borderColor: currentTheme.secondary }]}
                    onPress={() => setTimeModalVisible(false)}
                  >
                    <Text style={[styles.modalButtonText, { color: currentTheme.text }]}>
                      キャンセル
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonSave, { backgroundColor: currentTheme.primary }]}
                    onPress={saveTime}
                  >
                    <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>
                      保存
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 60,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    
    
    
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  permissionButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  testButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  quietHoursContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  quietHoursLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  timeContainer: {
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  timeSelectButton: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    backgroundColor: 'transparent',
  },
  timeSelectContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeSelectLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  timeSelectValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeSelectTime: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  timeInputContainer: {
    gap: 16,
    marginBottom: 12,
  },
  timeInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeInputLabel: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  timeInput: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    textAlign: 'center',
    marginLeft: 16,
  },
  timeHint: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    borderWidth: 1,
  },
  modalButtonSave: {
    // backgroundColor is set dynamically
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
