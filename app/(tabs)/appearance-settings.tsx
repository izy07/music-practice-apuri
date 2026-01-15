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
  } = useInstrumentTheme();
  
  // currentThemeが存在しない場合のフォールバック
  if (!currentTheme) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>{t('themeLoading')}</Text>
      </SafeAreaView>
    );
  }
  
  // 外観設定関連の状態
  const [useCustomTheme, setUseCustomTheme] = useState(isCustomTheme);
  const [customColors, setCustomColors] = useState({
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
  });

  // currentThemeが変更されたらcustomColorsを同期（カスタムテーマでない場合のみ）
  useEffect(() => {
    if (!isCustomTheme && currentTheme) {
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
    }
  }, [currentTheme, isCustomTheme]);

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
