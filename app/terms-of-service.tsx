/**
 * 利用規約画面（認証フロー等から遷移）
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import LegalDocumentBody from '@/components/legal/LegalDocumentBody';
import { TERMS_OF_SERVICE_SECTIONS } from '@/lib/legal/termsOfServiceSections';

const colors = {
  primary: '#2E7D32',
  background: '#FAFAFA',
  surface: '#FFFFFF',
  text: '#212121',
  border: '#E0E0E0',
};

export default function TermsOfServiceScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>利用規約</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <LegalDocumentBody
          documentTitle="音楽練習支援アプリケーション"
          sections={TERMS_OF_SERVICE_SECTIONS}
          importantNotice="本規約は法的拘束力があります。ご利用前に必ずお読みください。"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
});
