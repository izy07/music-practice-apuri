import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { useLanguage } from '@/components/LanguageContext';
import InstrumentHeader from '@/components/InstrumentHeader';
import { safeGoBack } from '@/lib/navigationUtils';
import { AppearanceSettings } from '@/components/main-settings/AppearanceSettings';

export default function AppearanceSettingsScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { 
    currentTheme, 
    selectedInstrument,
    isCustomTheme, 
    setCustomTheme, 
    resetToInstrumentTheme,
    isInitializing,
  } = useInstrumentTheme();
  
  // 初期化が完了していない場合、またはcurrentThemeが存在しない場合のフォールバック
  // タイムアウト処理も追加（初期化が完了しない場合のフォールバック）
  const [initializationTimeout, setInitializationTimeout] = useState(false);
  
  useEffect(() => {
    if (isInitializing) {
      const timeoutId = setTimeout(() => {
        setInitializationTimeout(true);
      }, 5000); // 5秒でタイムアウト
      
      return () => clearTimeout(timeoutId);
    } else {
      setInitializationTimeout(false);
    }
  }, [isInitializing]);
  
  if (isInitializing && !initializationTimeout) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>{t('themeLoading')}</Text>
      </SafeAreaView>
    );
  }
  
  // currentThemeが存在しない場合のフォールバック（タイムアウト後も表示）
  if (!currentTheme) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>{t('themeLoading')}</Text>
      </SafeAreaView>
    );
  }
  
  // 外観設定関連の状態
  // カスタムテーマが保存されている場合は、それを初期値として使用
  const [useCustomTheme, setUseCustomTheme] = useState(isCustomTheme);
  const [customColors, setCustomColors] = useState(() => {
    // カスタムテーマが保存されている場合は、currentTheme（保存されたカスタムテーマ）を使用
    if (isCustomTheme && currentTheme) {
      return {
        id: currentTheme.id || 'custom',
        name: currentTheme.name || 'カスタム',
        nameEn: currentTheme.nameEn || 'Custom',
        background: currentTheme.background || '#F7FAFC',
        surface: currentTheme.surface || '#FFFFFF',
        primary: currentTheme.primary || '#4A5568',
        secondary: currentTheme.secondary || '#E2E8F0',
        accent: currentTheme.accent || '#2D3748',
        text: currentTheme.text || '#2D3748',
        textSecondary: currentTheme.textSecondary || '#718096',
      };
    }
    // カスタムテーマが保存されていない場合は、currentTheme（楽器のデフォルトテーマ）を使用
    return {
      id: 'custom',
      name: 'カスタム',
      nameEn: 'Custom',
      background: currentTheme?.background || '#F7FAFC',
      surface: currentTheme?.surface || '#FFFFFF',
      primary: currentTheme?.primary || '#4A5568',
      secondary: currentTheme?.secondary || '#E2E8F0',
      accent: currentTheme?.accent || '#2D3748',
      text: currentTheme?.text || '#2D3748',
      textSecondary: currentTheme?.textSecondary || '#718096',
    };
  });

  // isCustomThemeが変更されたときのみ、customColorsを同期
  // これにより、保存されたカスタムテーマが正しく読み込まれる
  useEffect(() => {
    if (isCustomTheme && currentTheme) {
      // カスタムテーマが保存されている場合は、currentThemeがカスタムテーマなので、それを反映
      setCustomColors({
        id: currentTheme.id || 'custom',
        name: currentTheme.name || 'カスタム',
        nameEn: currentTheme.nameEn || 'Custom',
        background: currentTheme.background || '#F7FAFC',
        surface: currentTheme.surface || '#FFFFFF',
        primary: currentTheme.primary || '#4A5568',
        secondary: currentTheme.secondary || '#E2E8F0',
        accent: currentTheme.accent || '#2D3748',
        text: currentTheme.text || '#2D3748',
        textSecondary: currentTheme.textSecondary || '#718096',
      });
      setUseCustomTheme(true);
    } else if (!isCustomTheme && currentTheme && !useCustomTheme) {
      // カスタムテーマが保存されていない場合、かつユーザーが手動でカスタムテーマを選択していない場合のみ
      // 楽器のデフォルトテーマを反映
      setCustomColors({
        id: 'custom',
        name: 'カスタム',
        nameEn: 'Custom',
        background: currentTheme.background || '#F7FAFC',
        surface: currentTheme.surface || '#FFFFFF',
        primary: currentTheme.primary || '#4A5568',
        secondary: currentTheme.secondary || '#E2E8F0',
        accent: currentTheme.accent || '#2D3748',
        text: currentTheme.text || '#2D3748',
        textSecondary: currentTheme.textSecondary || '#718096',
      });
      setUseCustomTheme(false);
    }
  }, [isCustomTheme]); // currentThemeを依存配列から削除し、isCustomThemeの変更のみを監視

  const goBack = () => {
    safeGoBack(router, '/(tabs)/settings', true);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} edges={[]}>
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
        <Text style={[styles.headerTitle, { color: currentTheme?.text || '#2D3748' }]}>{t('appearanceSettings')}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <AppearanceSettings
          currentTheme={currentTheme}
          useCustomTheme={useCustomTheme}
          setUseCustomTheme={setUseCustomTheme}
          customColors={customColors}
          setCustomColors={setCustomColors}
          selectedInstrument={selectedInstrument}
          setCustomTheme={setCustomTheme}
          resetToInstrumentTheme={resetToInstrumentTheme}
          isCustomTheme={isCustomTheme}
        />
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 40,
  },
});
