import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
  Animated,
  Dimensions,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SafeView from '@/components/SafeView';
import { useRouter } from 'expo-router';
import { ArrowRight, ArrowLeft, ChevronRight } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import { navigateWithBasePath } from '@/lib/navigationUtils';
import NotificationService from '@/lib/notificationService';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { useAuthAdvanced } from '@/hooks/useAuthAdvanced';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * 【チュートリアル画面】新規ユーザー向けのアプリ使い方ガイド
 * - 新規登録/Google認証成功後に表示される
 * - アプリの主要機能を段階的に紹介
 * - 一般的なアプリのような洗練されたUIデザイン
 */
export default function TutorialScreen() {
  const router = useRouter();
  const { currentTheme } = useInstrumentTheme();
  const { clearNewSignupFlag } = useAuthAdvanced();
  const [currentStep, setCurrentStep] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  
  // アニメーション用の値（シンプル化）
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const tutorialSteps = [
    {
      icon: '🎵',
      title: '楽器練習アプリへ\nようこそ!',
      subtitle: '〜あなただけの楽器練習帳〜',
      description: '楽器練習を楽しく継続しましょう。このアプリがあなたの練習を全力でサポートします。',
      gradientColors: ['#667eea', '#764ba2'],
    },
    {
      icon: '📅',
      title: 'カレンダー画面の\n機能紹介',
      description: '• カレンダーで練習時間・内容を管理\n• 「演奏録音」や「クイック記録」で簡単に記録\n• イベント登録で練習予定を管理\n• 楽器ヘッダーから代表曲画面を開けます',
      gradientColors: ['#f093fb', '#f5576c'],
    },
    {
      icon: '🎯',
      title: '目標画面',
      description: '• 練習目標を設定して進捗を可視化\n• 目標達成状況を確認\n• モチベーション維持に役立ちます',
      gradientColors: ['#43e97b', '#38f9d7'],
    },
    {
      icon: '⏱️',
      title: 'タイマーとチューナー',
      description: '• 円形型タイマーで練習時間を計測\n• 自動記録機能で練習時間を自動保存\n• チューナーで正確な音程を確認',
      gradientColors: ['#fa709a', '#fee140'],
    },
    {
      icon: '🎼',
      title: '基礎練機能',
      description: '• 楽器別・レベル別の豊富な基礎練習メニュー\n• 「練習済み！」でカレンダーにマークと内容表示\n• 基礎からしっかり上達をサポート',
      gradientColors: ['#30cfd0', '#330867'],
    },
    {
      icon: '📚',
      title: 'その他の便利機能',
      description: '• ガイドは、楽器のことを網羅！楽器初心者にもわかりやすく基本情報や運指表、お手入れ方法からよくあるQ &Aまで\n• 外観設定で色を好みにカスタマイズ\n• 楽器ごとにデータ切り分け\n• マイライブラリで弾いた/弾きたい楽曲を管理\n• グラフや統計で練習の振り返り',
      gradientColors: ['#a8edea', '#fed6e3'],
    },
  ];

  // Web環境ではuseNativeDriverをfalseに設定
  const useNativeDriver = Platform.OS !== 'web';

  useEffect(() => {
    logger.debug('チュートリアル画面がマウントされました');
    setIsNavigating(false);
    loadNotificationSettings();
    
    // 初期アニメーション（シンプル化：フェードのみ）
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver,
    }).start();
  }, []);

  // ステップ変更時のアニメーション（シンプル化：フェード+軽いスライド）
  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(15); // 移動距離を減らす（50px → 15px）

    // シンプルなフェード+スライドのみ
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver,
      }),
    ]).start();
  }, [currentStep, useNativeDriver]);

  const loadNotificationSettings = async () => {
    try {
      const notificationService = NotificationService.getInstance();
      const settings = await notificationService.loadSettings();
      if (settings) {
        setNotificationEnabled(settings.practice_reminders || false);
      }
    } catch (error) {
      // エラーは無視
    }
  };

  const handleNotificationToggle = async () => {
    if (isRequestingPermission) return;
    
    setIsRequestingPermission(true);
    
    try {
      const notificationService = NotificationService.getInstance();
      const newEnabled = !notificationEnabled;
      
      // 通知をオフにする場合、権限リクエストは不要で設定を直接更新
      if (!newEnabled) {
        setNotificationEnabled(false);
        
        const settings = await notificationService.loadSettings();
        if (settings) {
          const updatedSettings = {
            ...settings,
            practice_reminders: false,
            daily_practice: false,
          };
          await notificationService.saveSettings(updatedSettings);
          logger.debug('通知設定をオフにしました', updatedSettings);
        }
        setIsRequestingPermission(false);
        return;
      }
      
      // 通知をオンにする場合のみ権限リクエスト
      if (Platform.OS === 'web') {
        if (!('Notification' in window)) {
          Alert.alert('通知がサポートされていません', 'このブラウザでは通知機能を利用できません');
          setIsRequestingPermission(false);
          return;
        }

        // 現在の権限状態を確認
        const currentPermission = Notification.permission;
        
        // 既に拒否されている場合は、設定から許可する必要があることを伝える
        if (currentPermission === 'denied') {
          Alert.alert(
            '通知が拒否されています',
            'ブラウザの設定から通知を許可してください。\n\n設定方法:\n1. ブラウザのアドレスバー左側の🔒アイコンをクリック\n2. 「通知」を「許可」に変更\n3. ページをリロードしてください'
          );
          setIsRequestingPermission(false);
          return;
        }

        // 権限をリクエスト（default状態の場合のみ有効）
        const permission = await notificationService.requestPermission();
        
        if (permission === 'granted') {
          setNotificationEnabled(true);
          
          const settings = await notificationService.loadSettings();
          if (settings) {
            const updatedSettings = {
              ...settings,
              practice_reminders: true,
              daily_practice: true,
            };
            await notificationService.saveSettings(updatedSettings);
            logger.debug('通知設定を保存しました', updatedSettings);
            
            await notificationService.sendPracticeReminder();
          }
        } else if (permission === 'denied') {
          Alert.alert(
            '通知が拒否されました',
            'ブラウザの設定から通知を許可してください。\n\n設定方法:\n1. ブラウザのアドレスバー左側の🔒アイコンをクリック\n2. 「通知」を「許可」に変更\n3. ページをリロードしてください'
          );
        } else {
          // default状態で許可されなかった場合
          Alert.alert('通知が許可されていません', '通知を受け取るには、ブラウザの設定で通知を許可してください');
        }
      } else {
        const permission = await notificationService.requestPermission();
        
        if (permission === 'granted') {
          setNotificationEnabled(true);
          
          const settings = await notificationService.loadSettings();
          if (settings) {
            const updatedSettings = {
              ...settings,
              practice_reminders: true,
              daily_practice: true,
            };
            await notificationService.saveSettings(updatedSettings);
            logger.debug('通知設定を保存しました', updatedSettings);
          }
          
          const registered = await notificationService.registerPushToken();
          if (registered) {
            logger.debug('プッシュトークンを登録しました');
            await notificationService.sendPracticeReminder();
          }
        } else if (permission === 'denied') {
          Alert.alert(
            '通知が拒否されました',
            '通知を受け取るには、端末の設定から通知を許可してください。\n\n設定方法:\niOS: 設定 > 通知 > 音楽練習アプリ\nAndroid: 設定 > アプリ > 音楽練習アプリ > 通知'
          );
        } else {
          Alert.alert('通知が許可されていません', '通知を受け取るには、端末の設定から通知を許可してください');
        }
      }
    } catch (error) {
      ErrorHandler.handle(error, '通知設定更新', true);
    } finally {
      setIsRequestingPermission(false);
    }
  };

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleInstrumentSelection = async () => {
    if (isNavigating) return;
    
    setIsNavigating(true);
    
    try {
      router.replace('/(tabs)/instrument-selection');
    } catch (error) {
      ErrorHandler.handle(error, '楽器選択画面への遷移', true);
      if (typeof window !== 'undefined') {
        try {
          navigateWithBasePath('/instrument-selection');
        } catch (navError) {
          ErrorHandler.handle(navError, '画面遷移', true);
        }
      }
    } finally {
      setTimeout(() => {
        setIsNavigating(false);
      }, 200);
    }
  };

  const handleComplete = async () => {
    try {
      logger.debug('チュートリアル完了ボタンが押されました');
      
      // ユーザー情報の確認（_layout.tsxが自動的にログイン画面にリダイレクトするため、ここでは何もしない）
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // _layout.tsxが自動的にログイン画面にリダイレクトするため、ここでは何もしない
        return;
      }

      const updateData: any = {
        updated_at: new Date().toISOString()
      };
      
      try {
        const { error: checkError } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);
        
        updateData.tutorial_completed = true;
        updateData.tutorial_completed_at = new Date().toISOString();
      } catch (checkErr: any) {
        // PGRST204エラー（schema cache error）の場合は静かにスキップ
        if (checkErr?.code === 'PGRST204' || checkErr?.message?.includes('column') || checkErr?.message?.includes('does not exist') || checkErr?.message?.includes('schema cache')) {
          // エラーをログに出力せず、静かにスキップ
          return;
        }
      }
      
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('user_id', user.id);

      if (updateError && !(updateError.code === 'PGRST116' || updateError.message?.includes('column') || updateError.message?.includes('does not exist'))) {
        logger.error('チュートリアル完了状況の保存エラー:', updateError);
      } else {
        logger.debug('チュートリアル完了状況を保存しました');
      }

      // 新規登録フラグを削除（チュートリアル完了時）
      try {
        await clearNewSignupFlag();
        logger.debug('新規登録フラグを削除しました（チュートリアル完了）');
      } catch (flagError) {
        logger.warn('新規登録フラグの削除に失敗しました（続行）:', flagError);
      }

      logger.debug('🔍 楽器選択状況を確認中...');
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('selected_instrument_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (profile?.selected_instrument_id) {
        logger.debug('楽器選択済み - カレンダー画面に遷移');
        setTimeout(() => {
          try {
            router.replace('/(tabs)/index');
            logger.debug('カレンダー画面への遷移完了');
          } catch (navError) {
            ErrorHandler.handle(navError, 'カレンダー画面への遷移', true);
            if (typeof window !== 'undefined') {
              navigateWithBasePath('/index');
            }
          }
        }, 100);
      } else {
        logger.debug('🎓 楽器未選択 - 楽器選択画面に遷移');
        setTimeout(() => {
          try {
            router.replace('/(tabs)/instrument-selection');
            logger.debug('楽器選択画面への遷移完了');
          } catch (navError) {
            ErrorHandler.handle(navError, '楽器選択画面への遷移', true);
            if (typeof window !== 'undefined') {
              navigateWithBasePath('/instrument-selection');
            }
          }
        }, 100);
      }
    } catch (error) {
      ErrorHandler.handle(error, 'チュートリアル完了', true);
      setTimeout(() => {
        try {
          router.replace('/(tabs)/instrument-selection');
        } catch (fallbackError) {
          ErrorHandler.handle(fallbackError, '画面遷移', true);
          if (typeof window !== 'undefined') {
            navigateWithBasePath('/instrument-selection');
          }
        }
      }, 100);
    }
  };

  const currentStepData = tutorialSteps[currentStep];

  return (
    <SafeAreaView style={styles.container}>
      {/* グラデーション背景 */}
      <View style={[
        styles.gradientBackground,
        {
          backgroundColor: currentStepData.gradientColors[0],
        }
      ]}>
        {/* グラデーションオーバーレイ */}
        <View style={[
          styles.gradientOverlay,
          Platform.OS === 'web' ? {
            background: `linear-gradient(135deg, ${currentStepData.gradientColors[0]} 0%, ${currentStepData.gradientColors[1]} 100%)`,
          } as any : {}
        ]} />
      </View>

      {/* ページインジケーター（上部） */}
      <SafeView style={styles.topIndicator}>
        <View style={styles.stepIndicatorContainer}>
          {tutorialSteps.map((_, index) => {
            const isActive = index === currentStep;
            const isPast = index < currentStep;
            
            return (
              <Animated.View
                key={index}
                style={[
                  styles.stepIndicatorDot,
                  isActive && styles.stepIndicatorDotActive,
                  isPast && styles.stepIndicatorDotPast,
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
        {/* メインカード */}
        <Animated.View
          style={[
            styles.mainCard,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
              ],
            },
          ]}
        >
          {/* アイコン */}
          <View style={styles.iconContainer}>
            <View style={[styles.iconCircle, { backgroundColor: currentStepData.gradientColors[0] }]}>
              <Text style={styles.iconText}>{currentStepData.icon}</Text>
            </View>
            {/* アイコン周りの装飾 */}
            <View style={[styles.iconDecoration, { borderColor: currentStepData.gradientColors[0] }]} />
          </View>

          {/* タイトル */}
          <Text style={styles.stepTitle}>{currentStepData.title}</Text>

          {/* サブタイトル（1枚目の場合のみ） */}
          {currentStep === 0 && currentStepData.subtitle && (
            <Text style={styles.stepSubtitle}>{currentStepData.subtitle}</Text>
          )}

          {/* 説明文 */}
          <Text style={styles.stepDescription}>{currentStepData.description}</Text>

          {/* カレンダーマークの説明（ステップ2の場合のみ） */}
          {currentStep === 1 && (
            <Animated.View
              style={[
                styles.calendarMarkCard,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <Text style={styles.calendarMarkTitle}>🎨 カレンダー上のマーク</Text>
              <View style={styles.markExamplesContainer}>
                <View style={styles.markExample}>
                  <View style={[styles.markDot, { backgroundColor: currentTheme.accent }]} />
                  <Text style={styles.markLabel}>練習時間のみ</Text>
                </View>
                <View style={styles.markExample}>
                  <View style={[styles.markDot, { backgroundColor: '#FF4444' }]} />
                  <Text style={styles.markLabel}>録音のみ</Text>
                </View>
                <View style={styles.markExample}>
                  <View style={[styles.markDot, { backgroundColor: currentTheme.primary }]} />
                  <Text style={styles.markLabel}>両方記録</Text>
                </View>
              </View>
            </Animated.View>
          )}
        </Animated.View>

        {/* ナビゲーションボタン */}
        <View style={styles.navigationContainer}>
          {currentStep > 0 && (
            <TouchableOpacity
              style={styles.prevButton}
              onPress={handlePrevious}
              activeOpacity={0.7}
            >
              <ArrowLeft size={20} color="#666" />
              <Text style={styles.prevButtonText}>戻る</Text>
            </TouchableOpacity>
          )}

          {currentStep < tutorialSteps.length - 1 ? (
            <TouchableOpacity
              style={[styles.nextButton, { backgroundColor: currentStepData.gradientColors[0] }]}
              onPress={handleNext}
              activeOpacity={0.8}
            >
              <Text style={styles.nextButtonText}>次へ</Text>
              <ArrowRight size={20} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.completeButton,
                { backgroundColor: currentStepData.gradientColors[0] },
                isNavigating && styles.completeButtonDisabled
              ]}
              onPress={handleInstrumentSelection}
              disabled={isNavigating}
              activeOpacity={0.8}
            >
              <Text style={styles.completeButtonText}>
                {isNavigating ? '遷移中...' : '楽器選択を開始'}
              </Text>
              {!isNavigating && <ChevronRight size={20} color="#FFFFFF" />}
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
    backgroundColor: '#FFFFFF',
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.08,
  },
  gradientOverlay: {
    flex: 1,
    ...(Platform.OS === 'web' && {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    }),
  },
  topIndicator: {
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  stepIndicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  stepIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  stepIndicatorDotActive: {
    width: 24,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  stepIndicatorDotPast: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: SCREEN_HEIGHT * 0.7,
  },
  mainCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 30,
        elevation: 10,
      },
    }),
  },
  iconContainer: {
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
        elevation: 8,
      },
    }),
  },
  iconText: {
    fontSize: 50,
  },
  iconDecoration: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    opacity: 0.2,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    color: '#1a1a1a',
    lineHeight: 38,
  },
  stepSubtitle: {
    fontSize: 18,
    fontWeight: '400',
    textAlign: 'center',
    marginBottom: 16,
    color: '#666666',
    fontStyle: 'italic',
  },
  stepDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 26,
    color: '#666666',
    marginBottom: 8,
  },
  calendarMarkCard: {
    width: '100%',
    marginTop: 20,
    padding: 20,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  calendarMarkTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    textAlign: 'center',
    marginBottom: 16,
  },
  markExamplesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    gap: 12,
  },
  markExample: {
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  markDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
      },
    }),
  },
  markLabel: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
  notificationCard: {
    width: '100%',
    marginTop: 24,
    padding: 20,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 12,
  },
  notificationToggle: {
    width: 52,
    height: 30,
    backgroundColor: '#E5E7EB',
    borderRadius: 15,
    padding: 3,
    justifyContent: 'center',
  },
  notificationToggleActive: {
    backgroundColor: '#667eea',
  },
  notificationToggleDisabled: {
    opacity: 0.6,
  },
  notificationToggleKnob: {
    width: 24,
    height: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    alignSelf: 'flex-start',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
        transition: 'transform 0.3s ease',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
      },
    }),
  },
  notificationToggleKnobActive: {
    alignSelf: 'flex-end',
  },
  notificationLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  notificationDescription: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    marginTop: 32,
    paddingHorizontal: 8,
    gap: 12,
  },
  prevButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 25,
    backgroundColor: '#F5F5F5',
    gap: 8,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      },
    }),
  },
  prevButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 25,
    flex: 1,
    justifyContent: 'center',
    gap: 8,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
      },
    }),
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 28,
    flex: 1,
    justifyContent: 'center',
    gap: 10,
    ...Platform.select({
      web: {
        boxShadow: '0 6px 20px rgba(0, 0, 0, 0.2)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
      },
    }),
  },
  completeButtonDisabled: {
    opacity: 0.6,
  },
  completeButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
