import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Palette, Globe, Bell, ChartBar as BarChart3, BookOpen, MessageSquare, Shield, FileText, LogOut, ChevronRight, Library, Zap, Crown, Heart, Share2, Star, GraduationCap } from 'lucide-react-native';
import InstrumentHeader from '@/components/InstrumentHeader';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/components/LanguageContext';
import { useAuthAdvanced } from '@/hooks/useAuthAdvanced';

export default function SettingsScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading, signOut } = useAuthAdvanced();
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const { language, setLanguage, t } = useLanguage();

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
    if (isLoading) return;
    if (!isAuthenticated) return;
    getCurrentUser();
  }, [isLoading, isAuthenticated]);

  // 認証中または認証されていない場合は何も表示しない
  if (isLoading || !isAuthenticated) {
    return null;
  }

  const handleLogout = async () => {
    try {
      // ログアウト確認
      if (typeof window !== 'undefined') {
        if (!confirm('ログアウトしますか？')) {
          return;
        }
        try {
          await signOut();
        } catch (error) {
          Alert.alert('エラー', 'ログアウトに失敗しました');
        }
      } else {
        Alert.alert(
          'ログアウト確認',
          'ログアウトしますか？',
          [
            { text: 'キャンセル', style: 'cancel' },
            { text: 'ログアウト', style: 'destructive', onPress: async () => {
              try {
                await signOut();
              } catch (error) {
                Alert.alert('エラー', 'ログアウトに失敗しました');
              }
            }}
          ]
        );
      }
    } catch (error) {
      Alert.alert('エラー', 'ログアウト処理中にエラーが発生しました');
    }
  };


  const settingsItems = [
    // 料金プラン項目を一時的に非表示（アプリリリース後に表示予定）
    // {
    //   id: 'pricing',
    //   title: '料金プラン',
    //   subtitle: 'プレミアム・年額プラン',
    //   icon: Crown,
    //   color: '#FFD700',
    //   onPress: () => router.push('/(tabs)/pricing-plans' as any)
    // },
    {
      id: 'profile',
      title: 'プロフィール設定',
      subtitle: '個人情報・楽器設定',
      icon: User,
      color: '#4CAF50',
      onPress: () => router.push('/(tabs)/profile-settings' as any)
    },
    {
      id: 'my-library',
      title: 'マイライブラリ',
      subtitle: '楽曲を整理する',
      icon: Library,
      color: '#9C27B0',
      onPress: () => router.push('/(tabs)/my-library' as any)
    },
    {
      id: 'recordings-library',
      title: '録音ライブラリ',
      subtitle: '演奏履歴を時系列で確認',
      icon: BookOpen,
      color: '#607D8B',
      onPress: () => router.push('/(tabs)/recordings-library' as any)
    },
    {
      id: 'main-settings',
      title: '主要機能',
      subtitle: 'チューナー・楽器選択・演奏レベル・外観設定',
      icon: Zap,
      color: '#FF6B35',
      onPress: () => router.push('/(tabs)/main-settings' as any)
    },
    {
      id: 'tutorial',
      title: 'チュートリアル',
      subtitle: 'アプリの使い方を学ぶ',
      icon: GraduationCap,
      color: '#9C27B0',
      onPress: () => router.push('/(tabs)/app-guide' as any)
    },
    {
      id: 'notifications',
      title: '通知設定',
      subtitle: '練習リマインダー・通知方法',
      icon: Bell,
      color: '#FF9800',
      onPress: () => router.push('/(tabs)/notification-settings' as any)
    },
    {
      id: 'language',
      title: '言語設定',
      subtitle: '日本語・English',
      icon: Globe,
      color: '#2196F3',
      onPress: () => router.push('/(tabs)/language-settings' as any)
    },
    {
      id: 'privacy',
      title: 'プライバシー・法的情報',
      subtitle: 'データ・セキュリティ・利用規約・プライバシーポリシー',
      icon: Shield,
      color: '#FF5722',
      onPress: () => router.push('/(tabs)/privacy-settings' as any)
    },
    {
      id: 'support',
      title: 'フィードバック',
      subtitle: 'アプリをシェア・レビュー・ランキング',
      icon: Heart,
      color: '#E91E63',
      onPress: () => router.push('/(tabs)/support' as any)
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <InstrumentHeader />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>その他</Text>
        

        
        <View style={styles.settingsContainer}>
          {settingsItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.settingItem}
              onPress={item.onPress}
              activeOpacity={0.6}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <View style={[styles.iconContainer, { backgroundColor: `${item.color}20` }]}>
                <item.icon size={24} color={item.color} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>{item.title}</Text>
                <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
              </View>
              <ChevronRight size={20} color="#CCCCCC" />
            </TouchableOpacity>
          ))}
          

          
          {/* Account Management Section */}
          <View style={styles.accountSection}>
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
                <Text style={[styles.settingTitle, { color: '#FF4444' }]}>ログアウト</Text>
                <Text style={styles.settingSubtitle}>アカウントからログアウト</Text>
              </View>
              <ChevronRight size={20} color="#CCCCCC" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333333',
    marginTop: 8,
    marginBottom: 12,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 100,
    
    
    elevation: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  accountSection: {
    borderTopWidth: 2,
    borderTopColor: '#F0F0F0',
    marginTop: 8,
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
    color: '#333333',
    marginBottom: 4,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#666666',
  },


});