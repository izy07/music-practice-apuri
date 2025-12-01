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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, Clock, Star, Settings } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { supabase } from '@/lib/supabase';
import { safeGoBack } from '@/lib/navigationUtils';

interface NotificationSettings {
  practice_reminders: boolean;
  goal_achievement: boolean;
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
    goal_achievement: true,
    sound_notifications: true,
    vibration_notifications: true,
    quiet_hours_enabled: false,
    quiet_hours_start: '22:00',
    quiet_hours_end: '08:00',
  });

  useEffect(() => {
    loadNotificationSettings();
  }, []);

  const loadNotificationSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('user_settings')
          .select('notification_settings')
          .eq('user_id', user.id)
          .single();

        if (data?.notification_settings) {
          setSettings({ ...settings, ...data.notification_settings });
        }
      }
            } catch (error) {
          // Error loading notification settings
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

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Star size={18} color={currentTheme.textSecondary} />
              <Text style={[styles.settingLabel, { color: currentTheme.text }]}>目標・達成通知</Text>
            </View>
            <Switch
              value={settings.goal_achievement}
              onValueChange={() => toggleSetting('goal_achievement')}
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
              <View style={styles.timeContainer}>
                <Text style={[styles.timeLabel, { color: currentTheme.text }]}>
                  {settings.quiet_hours_start} 〜 {settings.quiet_hours_end}
                </Text>
              </View>
            </View>
          )}
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
});
