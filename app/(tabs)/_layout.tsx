import { Tabs } from 'expo-router';
import { Calendar, Timer, Target, Zap, Settings, Share2 } from 'lucide-react-native';
import { useLanguage } from '../../components/LanguageContext';
import { useInstrumentTheme } from '../../components/InstrumentThemeContext';
import { useSegments } from 'expo-router';
import { useAuthAdvanced } from '../../hooks/useAuthAdvanced';
import { View, ActivityIndicator } from 'react-native';

// タブのアイコンとタイトルを定義
const TAB_CONFIG = [
  {
    name: 'index',
    icon: Calendar,
    titleKey: 'calendar',
  },
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
    name: 'tuner',
    icon: Zap,
    titleKey: 'tuner',
  },
  {
    name: 'share',
    icon: Share2,
    titleKey: 'share',
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
// 注意: basic-practiceは削除（index.tsxが直接Screenとして認識されるため重複を避ける）
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
  // 'main-settings', // 一時的にコメントアウト - キャッシュがクリアされたら再度有効化
  'terms-of-service',
  'privacy-policy',
  'legal-info',
  'notification-settings',
  'privacy-settings',
  'pricing-plans',
  'score-auto-scroll',
  'help-support',
  // 'basic-practice', // 削除: index.tsxが直接Screenとして認識されるため重複を避ける
  'room',
  'support',
  'org-overview',
] as const;

export default function TabLayout() {
  const { t } = useLanguage();
  const { currentTheme } = useInstrumentTheme();
  const segments = useSegments();
  const { isAuthenticated, isLoading } = useAuthAdvanced();
  const { Platform } = require('react-native');

  // 特定の画面ではタブバーを非表示
  const shouldHideTabBar = segments.some(
    segment => segment === 'tutorial' || segment === 'instrument-selection'
  );

  // 認証チェック
  // 読み込み中でもコンテンツを表示（リロード時も現在の画面を維持）
  // 未認証で読み込み完了した場合のみ、認証画面に遷移（app/_layout.tsxで処理される）
  // 読み込み中は常にコンテンツを表示

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
            height: 70,
            paddingTop: 10,
            paddingBottom: 10,
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
            fontSize: 12,
            fontWeight: '500',
            marginTop: 4,
            marginBottom: 0,
            textAlign: 'center',
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
              title: t(tab.titleKey),
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
      
      {/* basic-practiceは登録しない（index.tsxが自動的にbasic-practiceとして認識される） */}
    </Tabs>
  );
}
