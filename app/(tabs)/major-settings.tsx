import React, { useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Palette, Bell, Shield, ChevronRight, ArrowLeft } from 'lucide-react-native';
import InstrumentHeader from '@/components/InstrumentHeader';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/components/LanguageContext';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { setCurrentRoute } from '@/lib/navigationHistory';
import { asSafeRoutePath } from '@/lib/navigationHelpers';
import { safeGoBack } from '@/lib/navigationUtils';
import { useScrollToTopOnFocus } from '@/hooks/useScrollToTopOnFocus';

export default function MajorSettingsScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { currentTheme } = useInstrumentTheme();
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTopOnFocus(scrollRef);

  React.useEffect(() => {
    setCurrentRoute('/(tabs)/major-settings');
  }, []);

  const goBack = () => {
    safeGoBack(router, '/(tabs)/settings', true);
  };

  const items = useMemo(
    () => [
      {
        id: 'appearance-settings',
        title: t('appearanceSettings'),
        subtitle: 'カスタムテーマ・カラーパレット',
        icon: Palette,
        color: '#9C27B0',
        onPress: () => router.push(asSafeRoutePath('/(tabs)/appearance-settings')),
      },
      {
        id: 'notification',
        title: t('notificationSettings'),
        subtitle: t('notificationSettingsSubtitle'),
        icon: Bell,
        color: '#FF9800',
        onPress: () => router.push(asSafeRoutePath('/(tabs)/notification-settings')),
      },
      {
        id: 'privacy-settings',
        title: t('privacySettings'),
        subtitle: 'データ管理・セキュリティ設定',
        icon: Shield,
        color: '#4CAF50',
        onPress: () => router.push(asSafeRoutePath('/(tabs)/privacy-settings')),
      },
    ],
    [router, t]
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme?.background || '#F7FAFC' }]}>
      <InstrumentHeader />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: currentTheme?.surface || '#FFFFFF', borderBottomColor: currentTheme?.secondary || '#E2E8F0' }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={goBack}
          activeOpacity={0.6}
        >
          <ArrowLeft size={24} color={currentTheme?.text || '#2D3748'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: currentTheme?.text || '#2D3748' }]}>主要機能設定</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        <View style={[styles.settingsContainer, { backgroundColor: currentTheme?.surface || '#FFFFFF' }]}>
          {items.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.settingItem, { borderBottomColor: currentTheme?.secondary || '#E2E8F0' }]}
              onPress={item.onPress}
              activeOpacity={0.6}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <View style={[styles.iconContainer, { backgroundColor: `${item.color}20` }]}>
                <item.icon size={24} color={item.color} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, { color: currentTheme?.text || '#2D3748' }]}>{item.title}</Text>
                <Text style={[styles.settingSubtitle, { color: currentTheme?.textSecondary || '#718096' }]}>{item.subtitle}</Text>
              </View>
              <ChevronRight size={20} color={currentTheme?.textSecondary || '#CCCCCC'} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  content: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100, // タブバーの高さ + 余裕
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 8,
  },
  settingsContainer: {
    borderRadius: 20,
    marginBottom: 40,
    elevation: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingContent: { flex: 1 },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingSubtitle: { fontSize: 14 },
});

