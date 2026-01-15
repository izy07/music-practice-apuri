import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Palette, BookOpen, LogOut, ChevronRight, Library, Zap, Crown, Heart, GraduationCap } from 'lucide-react-native';
import InstrumentHeader from '@/components/InstrumentHeader';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/components/LanguageContext';
import { useAuthAdvanced } from '@/hooks/useAuthAdvanced';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { setCurrentRoute } from '@/lib/navigationHistory';
import { asSafeRoutePath } from '@/lib/navigationHelpers';
import { BottomBannerAd } from '@/components/ads/BottomBannerAd';

export default function SettingsScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading, isInitialized, signOut } = useAuthAdvanced();
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const { language, setLanguage, t } = useLanguage();
  const { currentTheme } = useInstrumentTheme();
  
  // 現在のルートを記録（マウント時）
  React.useEffect(() => {
    setCurrentRoute('/(tabs)/settings');
    return () => {
      // アンマウント時はクリアしない（他の画面に遷移する際に使用するため）
    };
  }, []);

  // getCurrentUser関数を先に定義
  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user?.email || null);
    } catch (error) {
      // Error getting current user
    }
  };

  React.useEffect(() => {
    // Web環境では、isLoadingを無視してユーザー情報を取得
    if (Platform.OS === 'web') {
      // Web環境では、isAuthenticatedがtrueの場合のみユーザー情報を取得
      if (isAuthenticated) {
        getCurrentUser();
      }
    } else {
      // ネイティブ環境では、isLoadingとisAuthenticatedをチェック
      if (isLoading) return;
      if (!isAuthenticated) return;
      getCurrentUser();
    }
  }, [isLoading, isAuthenticated]);

  // 認証チェックはレイアウトレベルで実行されるため、ここでは不要

  const handleLogout = async () => {
    try {
      // ログアウト確認
      if (typeof window !== 'undefined') {
        if (!confirm(t('logoutMessage'))) {
          return;
        }
        try {
          await signOut();
        } catch (error) {
          Alert.alert(t('error'), t('logoutFailed'));
        }
      } else {
        Alert.alert(
          t('logoutConfirm'),
          t('logoutMessage'),
          [
            { text: t('cancel'), style: 'cancel' },
            { text: t('logoutTitle'), style: 'destructive', onPress: async () => {
              try {
                await signOut();
              } catch (error) {
                Alert.alert(t('error'), t('logoutFailed'));
              }
            }}
          ]
        );
      }
    } catch (error) {
      Alert.alert(t('error'), t('logoutError'));
    }
  };


  const settingsItems = useMemo(() => [
    {
      id: 'profile',
      title: t('profileSettings'),
      subtitle: t('profileSettingsSubtitle'),
      icon: User,
      color: '#4CAF50',
      onPress: () => router.push(asSafeRoutePath('/(tabs)/profile-settings'))
    },
    {
      id: 'my-library',
      title: t('myLibrary'),
      subtitle: t('myLibrarySubtitle'),
      icon: Library,
      color: '#9C27B0',
      onPress: () => router.push(asSafeRoutePath('/(tabs)/my-library'))
    },
    {
      id: 'recordings-library',
      title: t('recordingsLibrary'),
      subtitle: t('recordingsLibrarySubtitle'),
      icon: BookOpen,
      color: '#607D8B',
      onPress: () => router.push(asSafeRoutePath('/(tabs)/recordings-library'))
    },
    {
      id: 'main-settings',
      title: '楽器変更',
      subtitle: '楽器の選択',
      icon: Zap,
      color: '#FF6B35',
      onPress: () => router.push(asSafeRoutePath('/(tabs)/main-settings'))
    },
    {
      id: 'major-settings',
      title: '主要機能設定',
      subtitle: '外観・言語・通知・プライバシー',
      icon: Palette,
      color: '#9C27B0',
      onPress: () => router.push(asSafeRoutePath('/(tabs)/major-settings'))
    },
    {
      id: 'tutorial',
      title: t('tutorial'),
      subtitle: t('tutorialSubtitle'),
      icon: GraduationCap,
      color: '#9C27B0',
      onPress: () => router.push(asSafeRoutePath('/(tabs)/app-guide'))
    },
    {
      id: 'pricing',
      title: '料金プラン',
      subtitle: 'プレミアム・年額プラン',
      icon: Crown,
      color: '#FFD700',
      onPress: () => router.push(asSafeRoutePath('/(tabs)/pricing-plans'))
    },
    {
      id: 'support',
      title: t('feedbackTitle'),
      subtitle: t('feedbackSubtitle'),
      icon: Heart,
      color: '#E91E63',
      onPress: () => router.push(asSafeRoutePath('/(tabs)/support'))
    },
  ], [t, router]);

  const renderSettingItem = (item: (typeof settingsItems)[number]) => {
    // 余白を減らす対象の項目ID
    const compactItems = ['major-settings', 'tutorial', 'pricing', 'support'];
    const isCompact = compactItems.includes(item.id);

    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.settingItem,
          isCompact && styles.settingItemCompact,
          { borderBottomColor: currentTheme?.secondary || '#E2E8F0' },
        ]}
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
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme?.background || '#F7FAFC' }]} >
      <InstrumentHeader />
      
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: currentTheme?.text || '#2D3748' }]}>{t('other')}</Text>
        

        
        <View style={[styles.settingsContainer, { backgroundColor: currentTheme?.surface || '#FFFFFF' }]}>
          {settingsItems.map(renderSettingItem)}
          

          
          {/* Account Management Section */}
          <View style={[styles.accountSection, { borderTopColor: currentTheme?.secondary || '#E2E8F0' }]}>
            <TouchableOpacity
              style={[styles.settingItem, styles.logoutItem]}
              onPress={handleLogout}
              activeOpacity={0.6}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <View style={[styles.iconContainer, { backgroundColor: '#FF444420' }]}>
                <LogOut size={24} color="#FF4444" />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, { color: '#FF4444' }]}>{t('logoutTitle')}</Text>
                <Text style={[styles.settingSubtitle, { color: currentTheme?.textSecondary || '#718096' }]}>{t('logoutSubtitle')}</Text>
              </View>
              <ChevronRight size={20} color={currentTheme?.textSecondary || '#CCCCCC'} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* タブバー上に広告バナー（フリープランのみ） */}
      <BottomBannerAd />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 165, // タブバーの高さ + 広告バナー分 + 余裕
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 8,
  },
  userInfoContainer: {
    backgroundColor: '#E8F5E8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  userInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 4,
  },
  userInfoEmail: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
  },
  userInfoLanguage: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },

  settingsContainer: {
    borderRadius: 20,
    marginBottom: 40,
    elevation: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  settingItemCompact: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  accountSection: {
    borderTopWidth: 2,
    marginTop: 4,
  },

  logoutItem: {
    borderBottomWidth: 0,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
  },


});