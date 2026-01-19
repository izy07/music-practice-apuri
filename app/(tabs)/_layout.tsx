import React from 'react';
import { Tabs } from 'expo-router';
import { Calendar, Timer, Target, Zap, Settings } from 'lucide-react-native';
import { useLanguage } from '../../components/LanguageContext';
import { useInstrumentTheme } from '../../components/InstrumentThemeContext';
import { useSegments } from 'expo-router';
import { useAuthAdvanced } from '../../hooks/useAuthAdvanced';
import { View, ActivityIndicator, TouchableOpacity, Text, Platform } from 'react-native';

// タブのアイコンとタイトルを定義
// カレンダー（index）を真ん中の3番目に配置
const TAB_CONFIG = [
  {
    name: 'timer',
    icon: Timer,
    titleKey: 'timer',
  },
  {
    name: 'goals',
    icon: Target,
    titleKey: 'goals',
  },
  {
    name: 'index',
    icon: Calendar,
    titleKey: 'calendar',
  },
  {
    name: 'tuner',
    icon: Zap,
    titleKey: 'tuner',
  },
  {
    name: 'settings',
    icon: Settings,
    titleKey: 'settings',
  },
] as const;

// タブバーに表示するタブ名の配列
const VISIBLE_TAB_NAMES = TAB_CONFIG.map(tab => tab.name);

// 非表示にするタブ（タブバーに表示されない画面）
const HIDDEN_TABS = [
  'statistics',
  'instrument-selection',
  'feedback',
  'tutorial',
  'profile-settings',
  'major-settings',
  'language-settings',
  'beginner-guide',
  'note-training',
  'music-dictionary',
  'my-library',
  'recordings-library',
  'main-settings',
  'appearance-settings',
  'terms-of-service',
  'privacy-policy',
  'legal-info',
  'notification-settings',
  'privacy-settings',
  'pricing-plans',
  'score-auto-scroll',
  'help-support',
  'basic-practice',
  'support',
  'share', // 音楽団体管理画面を非表示
] as const;

export default function TabLayout() {
  const { t } = useLanguage();
  const { currentTheme } = useInstrumentTheme();
  const segments = useSegments();
  const { isAuthenticated, isLoading } = useAuthAdvanced();

  // 特定の画面ではタブバーを非表示
  const shouldHideTabBar = segments.some(
    segment => segment === 'tutorial' || segment === 'instrument-selection'
  );

  // 認証チェック
  if (isLoading || !isAuthenticated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={currentTheme.primary} />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={({ route }) => {
        const isVisible = VISIBLE_TAB_NAMES.includes(route.name as any);
        const isHidden = (HIDDEN_TABS as readonly string[]).includes(route.name);
        
        return {
          headerShown: false,
          tabBarActiveTintColor: currentTheme.primary,
          tabBarInactiveTintColor: currentTheme.textSecondary,
          
          // タブバーのスタイル
          tabBarStyle: {
            backgroundColor: currentTheme.surface,
            borderTopWidth: 1,
            borderTopColor: currentTheme.secondary,
            height: 60, // 高さを減らす
            paddingTop: 4,
            paddingBottom: 4, // 下部のパディングを減らす
            paddingHorizontal: 0,
            paddingLeft: 0,
            paddingRight: 0,
            margin: 0,
            marginLeft: 0,
            marginRight: 0,
            marginBottom: 0,
            width: '100%',
            maxWidth: '100%',
            minWidth: '100%',
            elevation: 8,
            display: shouldHideTabBar ? 'none' : 'flex',
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 10000, // 他の要素の上に表示（イベント管理セクションと重ならないように高く設定）
            overflow: 'hidden', // 余計な要素が表示されないように
          },
          
          // タブアイテムのスタイル
          tabBarItemStyle: {
            flex: isVisible ? 1 : 0, // 表示タブは均等に幅を占める、非表示タブはスペースを取らない
            paddingVertical: isVisible ? 2 : 0,
            paddingHorizontal: 0,
            margin: 0,
            minWidth: isVisible ? 0 : 0,
            maxWidth: isVisible ? '100%' : 0,
            width: isVisible ? undefined : 0,
            height: isVisible ? 'auto' : 0, // ラベルを表示するためにautoに設定
            minHeight: isVisible ? 50 : 0, // 最小高さを減らす
            justifyContent: 'flex-start', // ラベルを表示するためにflex-startに変更
            alignItems: 'center',
            flexDirection: 'column', // アイコンとラベルを縦に配置
          },
          
          // タブコンテンツのスタイル
          tabBarContentStyle: {
            flexDirection: 'row',
            alignItems: 'flex-start', // ラベルを表示するためにflex-startに変更
            justifyContent: 'flex-start', // 左から均等に配置
            width: '100%',
            maxWidth: '100%',
            minWidth: '100%',
            padding: 0,
            paddingLeft: 0,
            paddingRight: 0,
            margin: 0,
            marginLeft: 0,
            marginRight: 0,
            gap: 0,
            overflow: 'visible', // ラベルを表示するためにvisibleに変更
          },
          
          // ラベルのスタイル（表示タブでは常にラベルを表示）
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '500',
            marginTop: 3,
            marginBottom: 0,
            textAlign: 'center',
            display: 'flex', // ラベルを確実に表示
            visibility: 'visible', // ラベルを確実に表示
            opacity: 1, // ラベルを確実に表示
            height: 'auto', // ラベルの高さを自動調整
            minHeight: 14, // 最小高さを設定
          },
          
          // アイコンのスタイル
          tabBarIconStyle: {
            margin: 0,
            padding: 0,
            width: 24,
            height: 24,
          },
          
          // その他の設定
          tabBarShowIcon: false, // デフォルトのアイコンを非表示（カスタムボタンで表示）
          tabBarShowLabel: false, // デフォルトのラベルを非表示（カスタムボタンで表示）
          tabBarScrollEnabled: false, // スクロールを無効化
          tabBarHideOnKeyboard: false,
          
          // 非表示タブは完全に非表示（個別のタブ設定で上書きされる）
          // メインタブでは個別のtabBarButton設定が優先される
          tabBarButton: isHidden ? () => null : undefined,
          // デフォルトのアイコンとラベルを完全に無効化
          tabBarIcon: () => null,
          tabBarLabel: '',
        };
      }}
      initialRouteName="index"
    >
      {/* メインタブ - アイコンとタイトルを定義 */}
      {TAB_CONFIG.map((tab) => {
        const IconComponent = tab.icon;
        const tabTitle = t(tab.titleKey);
        return (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title: tabTitle,
              tabBarLabel: '', // ラベルはカスタムボタンで表示するため空にする
              tabBarShowLabel: false, // デフォルトのラベルを非表示
              tabBarIcon: () => null, // デフォルトのアイコンを非表示（カスタムボタンで表示）
              // カスタムボタンでラベルを確実に表示（デフォルト要素を完全に無効化）
              tabBarButton: (props: any) => {
                const { onPress, accessibilityState } = props;
                const focused = accessibilityState?.selected;
                const iconColor = focused ? currentTheme.primary : currentTheme.textSecondary;
                
                // デフォルトのchildrenを無視して、完全にカスタムレンダリング
                return (
                  <TouchableOpacity
                    onPress={onPress}
                    activeOpacity={0.7}
                    data-custom-tab="true"
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      paddingTop: 2,
                      paddingBottom: Platform.OS === 'ios' ? 4 : 4,
                      minHeight: 50,
                      height: 'auto',
                      overflow: 'hidden',
                      position: 'relative',
                      zIndex: 1,
                    }}
                  >
                    <View 
                      style={{
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 2,
                        overflow: 'hidden',
                        width: 28,
                        height: 28,
                      }}
                    >
                      <IconComponent size={28} color={iconColor} />
                    </View>
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '500',
                        color: iconColor,
                        textAlign: 'center',
                        marginTop: 3,
                        lineHeight: 14,
                        width: '100%',
                      }}
                      numberOfLines={1}
                    >
                      {tabTitle}
                    </Text>
                  </TouchableOpacity>
                );
              },
            }}
          />
        );
      })}

      {/* 非表示タブ（タブバーに表示されない画面）- tabBarButton: () => nullで完全に非表示 */}
      {HIDDEN_TABS.map((tabName) => {
        // 各画面のタイトルをマッピング
        const titleMap: Record<string, string> = {
          'my-library': t('myLibrary'),
          'feedback': t('feedback'),
          'beginner-guide': t('guide'),
          'basic-practice': '基礎練',
          'profile-settings': t('profileSettings'),
          'recordings-library': t('recordingsLibrary'),
          'main-settings': '楽器変更',
          'appearance-settings': t('appearanceSettings'),
          'language-settings': t('languageSettings'),
          'notification-settings': t('notificationSettings'),
          'privacy-settings': t('privacySettings'),
          'pricing-plans': '料金プラン',
          'help-support': t('help'),
          'note-training': '音名トレーニング',
          'music-dictionary': '音楽用語辞典',
          'statistics': t('statistics'),
          'instrument-selection': '楽器選択',
          'tutorial': t('tutorial'),
          'terms-of-service': t('terms'),
          'privacy-policy': t('privacy'),
          'legal-info': '法的情報',
          'score-auto-scroll': '楽譜自動スクロール',
          'support': t('help'),
          'share': t('share'),
        };
        
        const screenTitle = titleMap[tabName] || tabName;
        
        return (
          <Tabs.Screen
            key={tabName}
            name={tabName as any}
            options={{
              title: screenTitle, // 画面タイトルを設定
              headerTitle: screenTitle, // ヘッダータイトルも設定
              tabBarButton: () => null, // タブバーから完全に除外
              tabBarItemStyle: { 
                display: 'none',
                width: 0,
                height: 0,
                padding: 0,
                margin: 0,
                minWidth: 0,
                maxWidth: 0,
                flex: 0,
              },
              tabBarShowLabel: false,
            }}
          />
        );
      })}
    </Tabs>
  );
}
