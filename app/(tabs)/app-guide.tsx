import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, ChevronDown, ChevronUp, BookOpen, Calendar, Target, BarChart3, Music, Timer, Mic, Settings } from 'lucide-react-native';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { safeGoBack } from '@/lib/navigationUtils';
import { createShadowStyle } from '@/lib/shadowStyles';

/**
 * 【アプリ使い方ガイド画面】既存ユーザー向けの詳細な機能説明
 * - その他画面の「チュートリアル」項目からアクセス
 * - 各機能の使い方を詳しく説明
 * - 一覧形式で、知りたいセクションをピンポイントで確認可能
 */
export default function AppGuideScreen() {
  const router = useRouter();
  const { currentTheme } = useInstrumentTheme();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const guideSections = [
    {
      id: 'overview',
      icon: BookOpen,
      title: 'アプリの概要',
      description: '楽器練習アプリの基本的な使い方をご紹介します。',
      content: [
        'このアプリは、楽器練習を継続的にサポートするためのツールです。',
        '練習記録、基礎練、統計分析、録音機能など、様々な機能を提供しています。',
        '各機能を活用して、効率的に楽器の上達を目指しましょう。'
      ]
    },
    {
      id: 'practice-record',
      icon: Calendar,
      title: '練習記録の付け方',
      description: '日々の練習を記録して、練習の習慣化を図りましょう。',
      content: [
        '📅 カレンダー画面で日付をタップすると、練習記録を入力できます。',
        '⏱️ クイック記録ボタンで、その日の練習時間をワンタップで記録できます。',
        '📝 練習内容を自由に記録できます（基礎練のメニュー名など）。',
        '✅ 基礎練メニューで「練習した！」ボタンを押すと、カレンダーに✅マークが表示されます。',
        '🎤 録音機能を使って、演奏を毎日録音して保存することもできます。録音はその他の録音ライブラリから一覧で確認することができます。',
        '🎨 カレンダー上のマークについて：練習時間のみの記録は濃いカスタムカラー、録音のみの記録は赤、両方記録で薄いカスタムカラーのマークがつきます。'
      ]
    },
    {
      id: 'basic-practice',
      icon: Music,
      title: '基礎練の使い方',
      description: '基礎練メニューで効率的に練習しましょう。',
      content: [
        '🎯 基礎練画面では、レベル別（初級・中級・マスター）の練習メニューを提供しています。',
        '📋 各メニューには、練習の仕方、推奨テンポ、練習ポイントが記載されています。',
        '▶️ メニューをタップして詳細を確認し、「練習した！」ボタンを押すと記録されます。',
        '✅ 「練習した！」ボタンを押すと、カレンダーに✅マークが表示され、統計画面に反映されます。',
        '📊 統計画面の「基礎練内容別の分析」で、よく練習している基礎練を確認できます。'
      ]
    },
    {
      id: 'statistics',
      icon: BarChart3,
      title: '統計・分析画面',
      description: '練習データを分析して、自分の練習パターンを把握しましょう。',
      content: [
        '📈 日別・週別・月別・年別の統計を確認できます。',
        '📊 グラフで練習時間の推移を視覚的に確認できます。',
        '🎯 基礎練内容別の分析で、よく練習しているメニューを確認できます。',
        '📅 週間練習パターンで、どの曜日に多く練習しているか確認できます。',
        '⏰ 練習時間帯統計で、いつ練習しているか確認できます。',
        '🔥 連続練習日数で、練習の継続状況を確認できます。'
      ]
    },
    {
      id: 'timer',
      icon: Timer,
      title: 'タイマー機能',
      description: 'タイマーを使って、集中して練習しましょう。',
      content: [
        '⏱️ タイマー画面で、練習時間を設定できます。',
        '🎵 プリセット時間（15分、30分、60分など）から選択できます。',
        '⚙️ カスタム時間を設定することもできます。',
        '🔔 タイマー終了時に通知が表示されます。',
        '💾 タイマーで計測した時間は、自動的に練習記録に保存されます。'
      ]
    },
    {
      id: 'recording',
      icon: Mic,
      title: '録音機能',
      description: '演奏を録音して、上達の過程を記録しましょう。',
      content: [
        '🎤 カレンダー画面や練習記録モーダルから録音機能を起動できます。',
        '⏺️ 録音ボタンを押すと、演奏を録音できます。',
        '⏸️ 録音を停止すると、録音データが保存されます。',
        '📚 録音ライブラリで、過去の録音を確認・再生できます。',
        '⭐ お気に入りの録音にマークを付けることができます。'
      ]
    },
    {
      id: 'goals',
      icon: Target,
      title: '目標設定',
      description: '練習目標を設定して、モチベーションを維持しましょう。',
      content: [
        '🎯 目標画面で、短期・長期の目標を設定できます。',
        '📅 目標の期限を設定できます。',
        '📊 目標の進捗状況を確認できます。',
        '✅ 目標を達成すると、達成通知が表示されます。',
        '📈 目標達成の履歴を確認できます。'
      ]
    },
    {
      id: 'settings',
      icon: Settings,
      title: '設定・カスタマイズ',
      description: 'アプリを自分好みにカスタマイズしましょう。',
      content: [
        '👤 プロフィール設定で、個人情報を登録でき自分の経歴を一目で確認することができます。',
        '📚 マイライブラリで、過去に弾いた曲や弾きたい曲を管理することができます。',
        '🌐 録音ライブラリで演奏録音を一覧で確認することができ、上達を実感しやすくなります。',
        '🎨 画面の背景は楽器変更画面にある外観設定からお好みの色にすることができます。',
        '📚 マイライブラリで、楽曲を管理できます。'
      ]
    }
  ];

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} >
      <View style={[styles.header, { borderBottomColor: currentTheme.secondary, backgroundColor: currentTheme.surface }]}>
        <TouchableOpacity onPress={() => safeGoBack(router, '/(tabs)/settings', true)} style={styles.backButton}>
          <ArrowLeft size={24} color={currentTheme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: currentTheme.text }]}>アプリ使い方ガイド</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* セクション一覧 */}
        {guideSections.map((section) => {
          const IconComponent = section.icon;
          const isExpanded = expandedSections.has(section.id);
          
          return (
            <View key={section.id} style={[styles.sectionCard, { backgroundColor: currentTheme.surface, borderColor: currentTheme.secondary }]}>
              {/* セクションヘッダー */}
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => toggleSection(section.id)}
                activeOpacity={0.7}
              >
                <View style={styles.sectionHeaderLeft}>
                  <View style={[styles.sectionIconSmall, { backgroundColor: `${currentTheme.primary}20` }]}>
                    <IconComponent size={24} color={currentTheme.primary} />
                  </View>
                  <View style={styles.sectionHeaderText}>
                    <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
                      {section.title}
                    </Text>
                    <Text style={[styles.sectionDescription, { color: currentTheme.textSecondary }]} numberOfLines={1}>
                      {section.description}
                    </Text>
                  </View>
                </View>
                {isExpanded ? (
                  <ChevronUp size={24} color={currentTheme.textSecondary} />
                ) : (
                  <ChevronDown size={24} color={currentTheme.textSecondary} />
                )}
              </TouchableOpacity>

              {/* 展開されたコンテンツ */}
              {isExpanded && (
                <View style={styles.expandedContent}>
                  <View style={styles.contentList}>
                    {section.content.map((item, index) => (
                      <View key={index} style={[styles.contentItem, { backgroundColor: currentTheme.background }]}>
                        <Text style={[styles.contentText, { color: currentTheme.text }]}>
                          {item}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          );
        })}
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
    paddingBottom: 40,
  },
  sectionCard: {
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    ...createShadowStyle({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    }),
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  sectionIconSmall: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  expandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  contentList: {
    width: '100%',
    marginTop: 8,
  },
  contentItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
  },
  contentText: {
    fontSize: 15,
    lineHeight: 24,
  },
});


