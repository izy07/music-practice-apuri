import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { safeGoBack } from '@/lib/navigationUtils';
import { useScrollToTopOnFocus } from '@/hooks/useScrollToTopOnFocus';

/**
 * 使い方ガイド: 初回スライド（tutorial）を見返す入口のみ
 */
export default function AppGuideScreen() {
  const router = useRouter();
  const { currentTheme } = useInstrumentTheme();
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTopOnFocus(scrollRef);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]}>
      <View
        style={[
          styles.header,
          { borderBottomColor: currentTheme.secondary, backgroundColor: currentTheme.surface },
        ]}
      >
        <TouchableOpacity
          onPress={() => safeGoBack(router, '/(tabs)/settings', true)}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={currentTheme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: currentTheme.text }]}>使い方ガイド</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <TouchableOpacity
          style={[
            styles.slideTutorialCard,
            { backgroundColor: currentTheme.surface, borderColor: currentTheme.secondary },
          ]}
          onPress={() => router.push('/(tabs)/tutorial?from=settings' as any)}
          activeOpacity={0.75}
        >
          <Text style={[styles.slideTutorialTitle, { color: currentTheme.text }]}>
            はじめに（スライド）をもう一度見る
          </Text>
          <Text style={[styles.slideTutorialSubtitle, { color: currentTheme.textSecondary }]}>
            主要機能を短いスライドで振り返れます
          </Text>
        </TouchableOpacity>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 125,
  },
  slideTutorialCard: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
  },
  slideTutorialTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  slideTutorialSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
});
