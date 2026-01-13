import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Linking, Alert } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import InstrumentHeader from '@/components/InstrumentHeader';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { useLanguage } from '@/components/LanguageContext';
import { safeGoBack } from '@/lib/navigationUtils';

export default function FeedbackScreen() {
  const { currentTheme } = useInstrumentTheme();
  const { t } = useLanguage();
  const router = useRouter();

  useEffect(() => {
    // ページが開かれたらGoogleフォームにリダイレクト
    const googleFormUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSeIhSRv5i5gHc7MZ8nLvS6hZtTQm7WEnE_ehgDbeP9XANJQ-A/viewform';
    Linking.openURL(googleFormUrl).catch(() => {
      Alert.alert('エラー', 'Googleフォームを開けませんでした');
    });
  }, []);

  const goBack = () => {
    safeGoBack(router, '/(tabs)/settings', true);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} >
      <InstrumentHeader />
      
      {/* ヘッダー */}
      <View style={[styles.header, { borderBottomColor: currentTheme.secondary }]}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <ArrowLeft size={24} color={currentTheme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: currentTheme.text }]}>
          {t('feedback')}
        </Text>
        <View style={styles.placeholder} />
      </View>
      
      <View style={[styles.loadingContainer, { backgroundColor: currentTheme.background }]}>
        <ActivityIndicator size="large" color={currentTheme.primary} />
      </View>
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
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
