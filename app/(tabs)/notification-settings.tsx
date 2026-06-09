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
import { Bell, Clock, Settings, BarChart3 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { supabase } from '@/lib/supabase';
import { safeGoBack } from '@/lib/navigationUtils';

interface NotificationSettings {
  practice_reminders: boolean;
  weekly_summary: boolean;
}

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const { currentTheme } = useInstrumentTheme();
  const [settings, setSettings] = useState<NotificationSettings>({
    practice_reminders: true,
    weekly_summary: false,
  });

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
            const loadedSettings = data.notification_settings as Partial<NotificationSettings>;
            setSettings({
              practice_reminders: loadedSettings.practice_reminders ?? true,
              weekly_summary: loadedSettings.weekly_summary ?? false,
            });
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
          // 許可完了（ポップアップは表示しない）
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


  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} >
      {/* ヘッダー */}
      <View style={[styles.header, { borderBottomColor: currentTheme.secondary }]}>
        <TouchableOpacity
          onPress={() => safeGoBack(router, '/(tabs)/settings', true)} // 確実にsettings画面に戻る
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
              <BarChart3 size={18} color={currentTheme.textSecondary} />
              <Text style={[styles.settingLabel, { color: currentTheme.text }]}>週間サマリー</Text>
            </View>
            <Switch
              value={settings.weekly_summary}
              onValueChange={() => toggleSetting('weekly_summary')}
              trackColor={{ false: currentTheme.secondary, true: currentTheme.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
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
});
