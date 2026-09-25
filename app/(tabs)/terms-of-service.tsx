import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, AlertTriangle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import InstrumentHeader from '@/components/InstrumentHeader';
import { safeGoBack } from '@/lib/navigationUtils';
import LegalDocumentBody from '@/components/legal/LegalDocumentBody';
import { TERMS_OF_SERVICE_SECTIONS } from '@/lib/legal/termsOfServiceSections';

export default function TermsOfServiceScreen() {
  const { currentTheme } = useInstrumentTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]}>
      <InstrumentHeader />

      <View style={[styles.header, { borderBottomColor: currentTheme.secondary }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => safeGoBack(router, '/(tabs)/privacy-settings', true)}
        >
          <ArrowLeft size={24} color={currentTheme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: currentTheme.text }]}>利用規約</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.importantNotice, { backgroundColor: `${currentTheme.primary}10` }]}>
          <AlertTriangle size={20} color={currentTheme.primary} />
          <Text style={[styles.importantText, { color: currentTheme.text }]}>
            本規約は法的拘束力があります。ご利用前に必ずお読みください。
          </Text>
        </View>

        <LegalDocumentBody
          documentTitle="Music Practice 利用規約"
          documentSubtitle="音楽練習支援アプリケーション"
          sections={TERMS_OF_SERVICE_SECTIONS}
          variant="themed"
          theme={{
            text: currentTheme.text,
            textSecondary: currentTheme.textSecondary,
            surface: currentTheme.surface,
            primary: currentTheme.primary,
          }}
          showFooter={false}
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
  importantNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  importantText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 12,
    flex: 1,
  },
});
