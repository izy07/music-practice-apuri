import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  BookOpen, 
  ChevronRight, 
  Search,
  Zap,
  Music,
  Target,
  Calendar,
  Mail
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';

interface TutorialItem {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  route: string;
}

export default function HelpSupportScreen() {
  const router = useRouter();
  const { currentTheme } = useInstrumentTheme();
  const [searchQuery, setSearchQuery] = useState('');

  // チュートリアル項目
  const tutorialItems: TutorialItem[] = [
    {
      id: '1',
      title: '初心者ガイド',
      description: 'アプリの基本的な使い方を学ぶ',
      icon: BookOpen,
      route: '/(tabs)/beginner-guide'
    },
    {
      id: '2',
      title: '楽器選択',
      description: '楽器を選択してテーマを設定',
      icon: Music,
      route: '/(tabs)/instrument-selection'
    },
    {
      id: '3',
      title: '練習記録の入力',
      description: '練習記録の入力方法を学ぶ',
      icon: Calendar,
      route: '/(tabs)/basic-practice'
    },
    {
      id: '4',
      title: '目標設定',
      description: '練習目標の設定方法を学ぶ',
      icon: Target,
      route: '/(tabs)/goals'
    },
    {
      id: '5',
      title: '録音機能',
      description: '演奏の録音方法を学ぶ',
      icon: Zap,
      route: '/(tabs)/recordings-library'
    }
  ];

  // 検索フィルタリング
  const filteredTutorials = tutorialItems.filter(tutorial => 
    tutorial.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tutorial.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} >
      {/* ヘッダー */}
      <View style={[styles.header, { borderBottomColor: currentTheme.secondary }]}>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/settings')}
          style={styles.backButton}
        >
          <Text style={[styles.backButtonText, { color: currentTheme.text }]}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: currentTheme.text }]}>ヘルプ・サポート</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 検索バー */}
        <View style={[styles.searchContainer, { backgroundColor: currentTheme.surface }]}>
          <Search size={20} color={currentTheme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: currentTheme.text }]}
            placeholder="チュートリアルを検索..."
            placeholderTextColor={currentTheme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* チュートリアル */}
        <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
          <View style={styles.sectionHeader}>
            <BookOpen size={20} color={currentTheme.primary} />
            <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>チュートリアル</Text>
          </View>
          
          {filteredTutorials.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.tutorialItem}
              onPress={() => router.push(item.route as any)}
            >
              <View style={styles.tutorialInfo}>
                <item.icon size={24} color={currentTheme.primary} />
                <View style={styles.tutorialText}>
                  <Text style={[styles.tutorialTitle, { color: currentTheme.text }]}>
                    {item.title}
                  </Text>
                  <Text style={[styles.tutorialDescription, { color: currentTheme.textSecondary }]}>
                    {item.description}
                  </Text>
                </View>
              </View>
              <ChevronRight size={20} color={currentTheme.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* お問い合わせ情報 */}
        <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
          <View style={styles.sectionHeader}>
            <Mail size={20} color={currentTheme.primary} />
            <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>お問い合わせ</Text>
          </View>
          
          <View style={[styles.contactInfoBox, { backgroundColor: currentTheme.background }]}>
            <Mail size={18} color={currentTheme.primary} />
            <View style={styles.contactInfoContent}>
              <Text style={[styles.contactEmail, { color: currentTheme.text }]}>
                app.gakki@gmail.com
              </Text>
              <Text style={[styles.contactDescription, { color: currentTheme.textSecondary }]}>
                ご連絡はこちらまでお願いします
              </Text>
            </View>
          </View>
        </View>
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
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 60,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    
    
    
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  tutorialItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  tutorialInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  tutorialText: {
    flex: 1,
  },
  tutorialTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  tutorialDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  contactInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 10,
    marginTop: 8,
  },
  contactInfoContent: {
    flex: 1,
  },
  contactEmail: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  contactDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
});
