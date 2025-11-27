import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, ArrowRight, BookOpen, Calendar, Target, BarChart3, Music, Timer, Mic, Settings } from 'lucide-react-native';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { safeGoBack } from '@/lib/navigationUtils';

/**
 * 【アプリ使い方ガイド画面】既存ユーザー向けの詳細な機能説明
 * - その他画面の「チュートリアル」項目からアクセス
 * - 各機能の使い方を詳しく説明
 */
export default function AppGuideScreen() {
  const router = useRouter();
  const { currentTheme } = useInstrumentTheme();
  const [currentSection, setCurrentSection] = useState(0);

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
        '🎤 録音機能を使って、演奏を毎日録音して保存することもできます。録音はその他の録音ライブラリから一覧で確認することができます。'
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
        '🎨 画面の背景は主要機能設定にある外観設定からお好みの色にすることができます。',
        '📚 マイライブラリで、楽曲を管理できます。'
      ]
    }
  ];

  const handlePrevious = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
    }
  };

  const handleNext = () => {
    if (currentSection < guideSections.length - 1) {
      setCurrentSection(currentSection + 1);
    }
  };

  const currentGuide = guideSections[currentSection];
  const IconComponent = currentGuide.icon;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} edges={[]}>
      <View style={[styles.header, { borderBottomColor: '#E0E0E0' }]}>
        <TouchableOpacity onPress={() => safeGoBack('/(tabs)/settings', true)} style={styles.backButton}>
          <ArrowLeft size={24} color={currentTheme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: currentTheme.text }]}>アプリ使い方ガイド</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* セクションインジケーター */}
        <View style={styles.sectionIndicator}>
          {guideSections.map((_, index) => (
            <View
              key={index}
              style={[
                styles.sectionDot,
                {
                  width: index === currentSection ? 12 : 8,
                  height: index === currentSection ? 12 : 8,
                  backgroundColor: index === currentSection ? currentTheme.primary : '#E0E0E0',
                },
              ]}
            />
          ))}
        </View>

        {/* 現在のセクション */}
        <View style={styles.currentSection}>
          <View style={[styles.sectionIcon, { backgroundColor: `${currentTheme.primary}20` }]}>
            <IconComponent size={40} color={currentTheme.primary} />
          </View>
          <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
            {currentGuide.title}
          </Text>
          <Text style={[styles.sectionDescription, { color: currentTheme.textSecondary }]}>
            {currentGuide.description}
          </Text>

          {/* コンテンツリスト */}
          <View style={styles.contentList}>
            {currentGuide.content.map((item, index) => (
              <View key={index} style={styles.contentItem}>
                <Text style={[styles.contentText, { color: currentTheme.text }]}>
                  {item}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* ナビゲーションボタン */}
        <View style={styles.navigationButtons}>
          {currentSection > 0 && (
            <TouchableOpacity
              style={[styles.navButton, styles.prevButton, { borderColor: currentTheme.textSecondary }]}
              onPress={handlePrevious}
            >
              <ArrowLeft size={20} color={currentTheme.text} />
              <Text style={[styles.prevButtonText, { color: currentTheme.text }]}>前へ</Text>
            </TouchableOpacity>
          )}

          {currentSection < guideSections.length - 1 && (
            <TouchableOpacity
              style={[styles.navButton, styles.nextButton, { backgroundColor: currentTheme.primary }]}
              onPress={handleNext}
            >
              <Text style={styles.nextButtonText}>次へ</Text>
              <ArrowRight size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>

        {/* 最後のセクション */}
        {currentSection === guideSections.length - 1 && (
          <View style={styles.finishSection}>
            <Text style={[styles.finishTitle, { color: currentTheme.text }]}>
              ガイドを完了しました！
            </Text>
            <Text style={[styles.finishDescription, { color: currentTheme.textSecondary }]}>
              アプリの機能を活用して、楽器練習を継続しましょう。
            </Text>
            <TouchableOpacity
              style={[styles.finishButton, { backgroundColor: currentTheme.primary }]}
              onPress={() => safeGoBack('/(tabs)/settings', true)} // 強制的にsettings画面に戻る
            >
              <Text style={styles.finishButtonText}>完了</Text>
            </TouchableOpacity>
          </View>
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
    padding: 20,
    paddingBottom: 40,
  },
  sectionIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 30,
  },
  sectionDot: {
    borderRadius: 6,
  },
  currentSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  sectionIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  sectionDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
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
    backgroundColor: '#F8F9FA',
  },
  contentText: {
    fontSize: 15,
    lineHeight: 24,
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 120,
    justifyContent: 'center',
    gap: 8,
  },
  prevButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  prevButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    marginLeft: 'auto',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  finishSection: {
    alignItems: 'center',
    marginTop: 30,
    padding: 20,
  },
  finishTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  finishDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  finishButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    minWidth: 200,
    alignItems: 'center',
  },
  finishButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});


