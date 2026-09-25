import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import InstrumentHeader from '@/components/InstrumentHeader';
import { safeGoBack } from '@/lib/navigationUtils';
import LegalDocumentBody from '@/components/legal/LegalDocumentBody';
import { PRIVACY_POLICY_SECTIONS } from '@/lib/legal/privacyPolicySections';

export default function PrivacyPolicyScreen() {
  const { currentTheme } = useInstrumentTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]}>
      <InstrumentHeader />

      <View style={[styles.header, { borderBottomColor: currentTheme.secondary || '#E0E0E0' }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => safeGoBack(router, '/(tabs)/privacy-settings', true)}
        >
          <ArrowLeft size={24} color={currentTheme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: currentTheme.text }]}>プライバシーポリシー</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <LegalDocumentBody
          documentTitle="プライバシーポリシー"
          documentSubtitle="音楽練習支援アプリケーション「Music Practice」"
          sections={PRIVACY_POLICY_SECTIONS}
          variant="themed"
          theme={{
            text: currentTheme.text,
            textSecondary: currentTheme.textSecondary,
            surface: currentTheme.surface,
            primary: currentTheme.primary,
          }}
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
});
