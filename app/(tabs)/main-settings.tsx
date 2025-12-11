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
import { useFocusEffect } from '@react-navigation/native';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { useLanguage } from '@/components/LanguageContext';
import InstrumentHeader from '@/components/InstrumentHeader';
import { safeGoBack } from '@/lib/navigationUtils';
import { useAuthAdvanced } from '@/hooks/useAuthAdvanced';
import { InstrumentSettings } from '@/components/main-settings/InstrumentSettings';
import { AppearanceSettings } from '@/components/main-settings/AppearanceSettings';

export default function MainSettingsScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { 
    currentTheme, 
    selectedInstrument,
    isCustomTheme, 
    setCustomTheme, 
    resetToInstrumentTheme,
  } = useInstrumentTheme();
  const { fetchUserProfile } = useAuthAdvanced();
  
  // 画面にフォーカスが当たった時に楽器選択状態を更新
  useFocusEffect(
    React.useCallback(() => {
      // 楽器選択画面から戻ってきた時に、最新の楽器選択状態を取得
      fetchUserProfile();
    }, [fetchUserProfile])
  );
  
  // currentThemeが存在しない場合のフォールバック
  if (!currentTheme) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>{t('themeLoading')}</Text>
      </SafeAreaView>
    );
  }
  
  const [mode, setMode] = useState<'instrument' | 'appearance'>('instrument');
  
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
    safeGoBack('/(tabs)/settings', true);
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
        <Text style={[styles.headerTitle, { color: currentTheme?.text || '#2D3748' }]}>{t('mainFeaturesSettings')}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* モード切り替えタブ */}
      <View style={[styles.tabContainer, { backgroundColor: currentTheme?.background || '#F7FAFC' }]}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScrollContent}
        >
          <TouchableOpacity
            style={[
              styles.tabButton,
              { 
                backgroundColor: mode === 'instrument' ? currentTheme?.primary || '#4A5568' : currentTheme?.surface || '#FFFFFF',
                borderColor: currentTheme?.primary || '#4A5568'
              }
            ]}
            onPress={() => setMode('instrument')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('instrumentSelection')}
          >
            <Text style={[
              styles.tabButtonText,
              { color: mode === 'instrument' ? currentTheme?.surface || '#FFFFFF' : currentTheme?.text || '#2D3748' }
            ]}>
              {t('instrumentSelection')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              { 
                backgroundColor: mode === 'appearance' ? currentTheme?.primary || '#4A5568' : currentTheme?.surface || '#FFFFFF',
                borderColor: currentTheme?.primary || '#4A5568'
              }
            ]}
            onPress={() => setMode('appearance')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('appearanceSettings')}
          >
            <Text style={[
              styles.tabButtonText,
              { color: mode === 'appearance' ? currentTheme?.surface || '#FFFFFF' : currentTheme?.text || '#2D3748' }
            ]}>
              {t('appearanceSettings')}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {mode === 'instrument' && (
          <InstrumentSettings currentTheme={currentTheme} />
        )}

        {mode === 'appearance' && (
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
        )}
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
  tabContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabScrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 2,
  },
  tabButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 2,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
});

