import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Linking, Alert } from 'react-native';
import InstrumentHeader from '@/components/InstrumentHeader';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';

export default function FeedbackScreen() {
  const { currentTheme } = useInstrumentTheme();

  useEffect(() => {
    // ページが開かれたらGoogleフォームにリダイレクト
    const googleFormUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSeIhSRv5i5gHc7MZ8nLvS6hZtTQm7WEnE_ehgDbeP9XANJQ-A/viewform';
    Linking.openURL(googleFormUrl).catch(() => {
      Alert.alert('エラー', 'Googleフォームを開けませんでした');
    });
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} >
      <InstrumentHeader />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
