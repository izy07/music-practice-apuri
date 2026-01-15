import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { useLanguage } from '@/components/LanguageContext';
import { asSafeRoutePath } from '@/lib/navigationHelpers';

export default function MainSettingsScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { 
    currentTheme, 
  } = useInstrumentTheme();
  
  // 画面が表示されたら即座に楽器選択画面に遷移
  useEffect(() => {
    router.replace(asSafeRoutePath('/(tabs)/instrument-selection'));
  }, [router]);
  
  // currentThemeが存在しない場合のフォールバック
  if (!currentTheme) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>{t('themeLoading')}</Text>
      </SafeAreaView>
    );
  }

  // 遷移中のローディング表示
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} edges={[]}>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={currentTheme?.primary || '#4A5568'} />
        <Text style={[styles.loadingText, { color: currentTheme?.text || '#2D3748' }]}>読み込み中...</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
});

