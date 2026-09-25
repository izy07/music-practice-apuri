import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SafeView from '@/components/SafeView';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowRight, ArrowLeft, ChevronRight } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import { navigateWithBasePath } from '@/lib/navigationUtils';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { useAuthAdvanced } from '@/hooks/useAuthAdvanced';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type TutorialPoint = {
  label: string;
  detail?: string;
};

type TutorialStep = {
  icon: string;
  title: string;
  subtitle?: string;
  lead?: string;
  points: TutorialPoint[];
  accent: [string, string];
  showCalendarMarks?: boolean;
};

/**
 * 新規ユーザー向けチュートリアル（スキップなし・全ステップ必読）
 * 詳細な使い方は設定の「使い方ガイド」へ寄せ、ここでは要点だけを見せる
 */
const TUTORIAL_STEPS: TutorialStep[] = [
  {
    icon: '🎵',
    title: 'ようこそ',
    subtitle: 'あなただけの楽器練習帳',
    lead: '練習の記録を中心に、成長が振り返れる機能をまとめました。',
    points: [
      { label: 'マイライブラリで弾きたい曲・弾いた曲を管理' },
      { label: 'イベント管理でメンテナンスなどを管理' },
      { label: '録音ライブラリで過去の演奏を聞いて成長を実感' },
    ],
    accent: ['#5B7CFA', '#7C5CFF'],
  },
  {
    icon: '📅',
    title: 'カレンダー',
    lead: 'ホーム画面です。日付を開くと、その日の練習を記録できます。',
    points: [
      { label: '日々の演奏録音で成長を実感' },
      { label: 'クイック記録で簡単に練習時間を記録' },
      { label: '過去のメンテナンスも簡単に確認' },
    ],
    accent: ['#E85D8A', '#F06B6B'],
    showCalendarMarks: true,
  },
  {
    icon: '🎯',
    title: '目標',
    lead: 'やりたいことを目標にして、達成状況を確認できます。',
    points: [
      { label: '短期・長期の目標を設定' },
      { label: '進捗をカレンダーと連動' },
    ],
    accent: ['#2DB88A', '#3DCFB0'],
  },
  {
    icon: '⏱️',
    title: 'タイマー・チューナー',
    lead: '測る・合わせるの2つを、練習中にすぐ使えます。',
    points: [
      { label: 'タイマーで練習時間を計測', detail: '終了後自動で記録' },
      { label: 'チューナーで音程を確認', detail: '実際の音もすぐ確認できる機能付き' },
    ],
    accent: ['#F06A8A', '#F5B942'],
  },
  {
    icon: '🎼',
    title: '基礎練',
    lead: '楽器・レベル別のメニューで、基礎から積み上げられます。',
    points: [
      { label: '初級・中級・マスターのレベル別メニュー' },
      { label: '練習した！ボタンでカレンダーに反映' },
    ],
    accent: ['#2BB8C0', '#4A5FD6'],
  },
  {
    icon: '📚',
    title: 'ほかの便利な機能',
    lead: 'ガイドや見た目のカスタムも、設定からいつでも使えます。',
    points: [
      { label: 'ガイド', detail: '運指・お手入れ・Q&A' },
      { label: '統計', detail: '練習の振り返りグラフ' },
      { label: '外観設定', detail: '色のカスタム' },
    ],
    accent: ['#5BA8A4', '#E8A0B0'],
  },
];

export default function TutorialScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ from?: string }>();
  const isReviewMode = params.from === 'settings';
  const { currentTheme } = useInstrumentTheme();
  const { clearNewSignupFlag, fetchUserProfile, hasInstrumentSelected, patchAuthUser } = useAuthAdvanced();
  const [currentStep, setCurrentStep] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const useNativeDriver = Platform.OS !== 'web';

  const steps = TUTORIAL_STEPS;
  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;
  const progressLabel = `${currentStep + 1} / ${steps.length}`;

  useEffect(() => {
    logger.debug('チュートリアル画面がマウントされました', { isReviewMode });
    setIsNavigating(false);
  }, [isReviewMode]);

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(12);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver,
      }),
    ]).start();
  }, [currentStep, fadeAnim, slideAnim, useNativeDriver]);

  const markTutorialCompleted = async (): Promise<void> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        tutorial_completed: true,
        tutorial_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (
      updateError &&
      !(
        updateError.code === 'PGRST116' ||
        updateError.message?.includes('column') ||
        updateError.message?.includes('does not exist')
      )
    ) {
      logger.error('チュートリアル完了状況の保存エラー:', updateError);
      ErrorHandler.handle(updateError, 'チュートリアル完了の保存', true);
    }

    try {
      await clearNewSignupFlag();
    } catch (flagError) {
      logger.warn('新規登録フラグの削除に失敗しました（続行）:', flagError);
    }

    // ローカル状態を即完了にして遷移ループを防ぐ（fetch 完了を待たない）
    patchAuthUser({ tutorial_completed: true });

    try {
      void fetchUserProfile();
    } catch (profileError) {
      logger.warn('チュートリアル完了後のプロフィール更新に失敗しました（続行）:', profileError);
    }
  };

  const handleNext = () => {
    if (!isLast) setCurrentStep((s) => s + 1);
  };

  const handlePrevious = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  };

  const finishTutorial = async () => {
    if (isNavigating) return;
    setIsNavigating(true);

    try {
      if (isReviewMode) {
        // 設定から見返した場合は完了フラグを触らず戻る
        router.replace('/(tabs)/settings');
        return;
      }

      await markTutorialCompleted();

      if (hasInstrumentSelected?.()) {
        router.replace('/(tabs)/index');
      } else {
        router.replace('/(tabs)/instrument-selection');
      }
    } catch (error) {
      ErrorHandler.handle(error, 'チュートリアル完了', true);
      try {
        navigateWithBasePath(router, '/instrument-selection');
      } catch (navError) {
        ErrorHandler.handle(navError, '画面遷移', true);
      }
    } finally {
      setTimeout(() => setIsNavigating(false), 200);
    }
  };

  const accent = step.accent[0];

  const markColors = useMemo(
    () => ({
      timeOnly: currentTheme?.accent || '#F5A623',
      recordingOnly: '#FF4444',
      both: currentTheme?.primary || accent,
    }),
    [currentTheme?.accent, currentTheme?.primary, accent]
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.tint, { backgroundColor: accent }]} />

      <SafeView style={styles.topBar}>
        <Text style={styles.progressText}>{progressLabel}</Text>
        <View style={styles.dots}>
          {steps.map((_, index) => {
            const active = index === currentStep;
            const past = index < currentStep;
            return (
              <View
                key={index}
                style={[
                  styles.dot,
                  past && styles.dotPast,
                  active && [styles.dotActive, { backgroundColor: accent }],
                ]}
              />
            );
          })}
        </View>
      </SafeView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.card,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={[styles.iconCircle, { backgroundColor: accent }]}>
            <Text style={styles.iconText}>{step.icon}</Text>
          </View>

          <Text style={styles.title}>{step.title}</Text>
          {!!step.subtitle && <Text style={styles.subtitle}>{step.subtitle}</Text>}
          {!!step.lead && <Text style={styles.lead}>{step.lead}</Text>}

          <View style={styles.points}>
            {step.points.map((point) => (
              <View key={point.label} style={styles.pointRow}>
                <View style={[styles.bullet, { backgroundColor: accent }]} />
                <View style={styles.pointTextWrap}>
                  <Text style={styles.pointLabel}>{point.label}</Text>
                  {!!point.detail && <Text style={styles.pointDetail}>{point.detail}</Text>}
                </View>
              </View>
            ))}
          </View>

          {step.showCalendarMarks && (
            <View style={styles.markCard}>
              <Text style={styles.markTitle}>カレンダーの色</Text>
              <View style={styles.markRow}>
                <View style={styles.markItem}>
                  <View style={[styles.markDot, { backgroundColor: markColors.timeOnly }]} />
                  <Text style={styles.markLabel}>時間のみ</Text>
                </View>
                <View style={styles.markItem}>
                  <View style={[styles.markDot, { backgroundColor: markColors.recordingOnly }]} />
                  <Text style={styles.markLabel}>録音のみ</Text>
                </View>
                <View style={styles.markItem}>
                  <View style={[styles.markDot, { backgroundColor: markColors.both }]} />
                  <Text style={styles.markLabel}>両方</Text>
                </View>
              </View>
            </View>
          )}
        </Animated.View>

        <View style={styles.nav}>
          {currentStep > 0 ? (
            <TouchableOpacity style={styles.prevBtn} onPress={handlePrevious} activeOpacity={0.7}>
              <ArrowLeft size={18} color="#555" />
              <Text style={styles.prevText}>戻る</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.navSpacer} />
          )}

          {!isLast ? (
            <TouchableOpacity
              style={[styles.nextBtn, { backgroundColor: accent }]}
              onPress={handleNext}
              activeOpacity={0.85}
            >
              <Text style={styles.nextText}>次へ</Text>
              <ArrowRight size={18} color="#FFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.nextBtn, { backgroundColor: accent }, isNavigating && styles.disabled]}
              onPress={finishTutorial}
              disabled={isNavigating}
              activeOpacity={0.85}
            >
              <Text style={styles.nextText}>
                {isNavigating
                  ? '移動中...'
                  : isReviewMode
                    ? '設定に戻る'
                    : '楽器を選ぶ'}
              </Text>
              {!isNavigating && <ChevronRight size={18} color="#FFF" />}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  tint: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.07,
  },
  topBar: {
    paddingTop: Platform.OS === 'ios' ? 8 : 16,
    paddingBottom: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 10,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#777',
    letterSpacing: 0.5,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  dotPast: {
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  dotActive: {
    width: 20,
    height: 7,
    borderRadius: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 36,
    alignItems: 'center',
    minHeight: SCREEN_HEIGHT * 0.65,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 22,
    ...Platform.select({
      web: { boxShadow: '0 12px 40px rgba(0,0,0,0.1)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 6,
      },
    }),
  },
  iconCircle: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconText: {
    fontSize: 34,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: '#777',
    textAlign: 'center',
    marginBottom: 10,
  },
  lead: {
    fontSize: 15,
    lineHeight: 22,
    color: '#444',
    textAlign: 'left',
    marginBottom: 18,
  },
  points: {
    width: '100%',
    gap: 12,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  pointTextWrap: {
    flex: 1,
  },
  pointLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    lineHeight: 22,
  },
  pointDetail: {
    fontSize: 13,
    color: '#777',
    lineHeight: 18,
    marginTop: 2,
  },
  markCard: {
    marginTop: 20,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#F4F5F7',
  },
  markTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginBottom: 12,
    textAlign: 'center',
  },
  markRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  markItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  markDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  markLabel: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  nav: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 420,
    marginTop: 24,
    gap: 12,
    alignItems: 'center',
  },
  navSpacer: {
    width: 96,
  },
  prevBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 22,
    backgroundColor: '#EEE',
  },
  prevText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#555',
  },
  nextBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 24,
  },
  nextText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  disabled: {
    opacity: 0.6,
  },
});
