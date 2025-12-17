import { Tabs } from 'expo-router';
import { Calendar, Timer, Target, Zap, Settings, Share2 } from 'lucide-react-native';
import { useLanguage } from '../../components/LanguageContext';
import { useInstrumentTheme } from '../../components/InstrumentThemeContext';
import { useSegments } from 'expo-router';
import { useAuthAdvanced } from '../../hooks/useAuthAdvanced';
import { View, ActivityIndicator, Platform } from 'react-native';

// タブのアイコンとタイトルを定義（順序: 目標、タイマー、カレンダー、チューナー、音楽団体、その他）
const TAB_CONFIG = [
  {
    name: 'goals',
    icon: Target,
    titleKey: 'goals',
    label: '目標',
  },
  {
    name: 'timer',
    icon: Timer,
    titleKey: 'timer',
    label: 'タイマー',
  },
  {
    name: 'index',
    icon: Calendar,
    titleKey: 'calendar',
    label: 'カレンダー',
  },
  {
    name: 'tuner',
    icon: Zap,
    titleKey: 'tuner',
    label: 'チューナー',
  },
  {
    name: 'share',
    icon: Share2,
    titleKey: 'share',
    label: '音楽団体',
  },
  {
    name: 'settings',
    icon: Settings,
    titleKey: 'settings',
    label: 'その他',
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
  'language-settings',
  'beginner-guide',
  'note-training',
  'music-dictionary',
  'my-library',
  'recordings-library',
  'main-settings',
  'terms-of-service',
  'privacy-policy',
  'legal-info',
  'notification-settings',
  'privacy-settings',
  'pricing-plans',
  'score-auto-scroll',
  'help-support',
  'basic-practice',
  'room',
  'support',
  'org-overview',
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
        
        return {
          headerShown: false,
          tabBarActiveTintColor: currentTheme.primary,
          tabBarInactiveTintColor: currentTheme.textSecondary,
          
          // タブバーのスタイル
          tabBarStyle: {
            backgroundColor: currentTheme.surface,
            borderTopWidth: 1,
            borderTopColor: currentTheme.secondary,
            height: Platform.OS === 'web' ? 70 : 80, // スマホでは高さを増やす
            paddingTop: Platform.OS === 'web' ? 10 : 8,
            paddingBottom: Platform.OS === 'web' ? 10 : 8,
            paddingHorizontal: 0,
            paddingLeft: 0,
            paddingRight: 0,
            margin: 0,
            marginLeft: 0,
            marginRight: 0,
            width: '100%',
            maxWidth: '100%',
            minWidth: '100%',
            elevation: 8,
            display: shouldHideTabBar ? 'none' : 'flex',
          },
          
          // タブアイテムのスタイル
          tabBarItemStyle: {
            flex: isVisible ? 1 : 0, // 表示タブは均等に幅を占める、非表示タブはスペースを取らない
            paddingVertical: isVisible ? 6 : 0,
            paddingHorizontal: 0,
            margin: 0,
            minWidth: isVisible ? 0 : 0,
            maxWidth: isVisible ? '100%' : 0,
            width: isVisible ? undefined : 0,
            height: isVisible ? undefined : 0,
            display: isVisible ? 'flex' : 'none',
            justifyContent: 'center',
            alignItems: 'center',
          },
          
          // タブコンテンツのスタイル
          tabBarContentStyle: {
            flexDirection: 'row',
            alignItems: 'center',
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
            overflow: 'hidden',
          },
          
          // ラベルのスタイル
          tabBarLabelStyle: {
            fontSize: Platform.OS === 'web' ? 12 : 10, // スマホでは少し小さく
            fontWeight: '500',
            marginTop: Platform.OS === 'web' ? 4 : 2,
            marginBottom: 0,
            textAlign: 'center',
            minHeight: 14, // 最小高さを確保
            lineHeight: 14, // 行の高さを設定
          },
          
          // アイコンのスタイル
          tabBarIconStyle: {
            margin: 0,
            padding: 0,
            width: 32,
            height: 32,
          },
          
          // その他の設定
          tabBarShowIcon: true,
          tabBarShowLabel: true,
          tabBarScrollEnabled: false, // スクロールを無効化
          tabBarHideOnKeyboard: false,
          
          // 非表示タブは完全に非表示
          tabBarButton: isVisible ? undefined : () => null,
        };
      }}
      initialRouteName="index"
    >
      {/* メインタブ - アイコンとタイトルを定義 */}
      {TAB_CONFIG.map((tab) => {
        const IconComponent = tab.icon;
        return (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title: tab.label || t(tab.titleKey), // 日本語ラベルを優先使用
              tabBarIcon: ({ size, color }) => (
                <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                  <IconComponent size={size ? size * 1.3 : 32} color={color} />
                </View>
              ),
            }}
          />
        );
      })}

      {/* 非表示タブ（タブバーに表示されない画面）- tabBarButton: () => nullで完全に非表示 */}
      {HIDDEN_TABS.map((tabName) => (
        <Tabs.Screen
          key={tabName}
          name={tabName as any}
          options={{
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
      ))}
    </Tabs>
  );
}
