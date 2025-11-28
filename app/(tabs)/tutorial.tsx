import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SafeView from '@/components/SafeView';
import { useRouter } from 'expo-router';
import { ArrowRight, ArrowLeft } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import { navigateWithBasePath } from '@/lib/navigationUtils';

/**
 * 【チュートリアル画面】新規ユーザー向けのアプリ使い方ガイド
 * - 新規登録/Google認証成功後に表示される
 * - アプリの主要機能を段階的に紹介
 * - ユーザーがアプリの使い方を理解できるようにサポート
 */
export default function TutorialScreen() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0); // 現在のチュートリアルステップ
  const [isNavigating, setIsNavigating] = useState(false); // ナビゲーション中フラグ
  const [notificationEnabled, setNotificationEnabled] = useState(false); // 通知設定

  /**
   * 【マウント確認】チュートリアル画面の表示確認
   */
  React.useEffect(() => {
    logger.debug('チュートリアル画面がマウントされました');
    logger.debug('認証→チュートリアル画面遷移フロー完了');
    
    // ローディング状態をリセット
    setIsNavigating(false);
  }, []);

  const tutorialSteps = [
    {
      icon: '🎵',
      title: '楽器練習アプリへ\nようこそ!',
      description: '楽器練習を楽しく継続しましょう。このアプリがあなたの練習を全力でサポートします。',
    },
        {
      icon: '📱',
      title: '練習記録',
      description: '練習時間を記録し、練習の習慣化を促します。クイック記録で簡単に今日の記録ができます。また、演奏録音で上達の過程を記録として残せるので、成長を実感しやすくなります。',
    },
    {
      icon: '',
      title: '基礎練メニュー',
      description: '基礎練は上達するために最も重要な練習です。この機能ではユーザーに適切なメニューを提供します。初心者の悩みを解決します。',
    },
    {
      icon: '🔧',
      title: '便利なツール',
      description: 'チューナー、メトロノーム、タイマー、\n出欠・練習日程・課題管理など\n楽器練習に必要な機能がすべて揃っています',
    },
    {
      icon: '🔔',
      title: '通知設定',
      description: '通知を受け取ることで、継続的な練習をサポートします。',
    },
    {
      icon: '🎼',
      title: '楽器選択',
      description: '練習する楽器を選択してください。',
    },
  ];

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

  /**
   * 【楽器選択開始】チュートリアル完了後の楽器選択画面への遷移
   */
  const handleInstrumentSelection = async () => {
    if (isNavigating) {
      logger.debug('既に遷移中です');
      return;
    }
    
    logger.debug('楽器選択ボタンが押されました');
    setIsNavigating(true);
    
    try {
      logger.debug('楽器選択画面に遷移開始');
      
      // シンプルな遷移処理
      await router.push('/(tabs)/instrument-selection');
      logger.debug('楽器選択画面への遷移完了');
      
    } catch (error) {
      ErrorHandler.handle(error, '楽器選択画面への遷移', false);
      
      // フォールバック: 直接URLを変更
      if (typeof window !== 'undefined') {
        logger.debug('フォールバック: window.location を使用');
        navigateWithBasePath('/instrument-selection');
      }
    } finally {
      setIsNavigating(false);
    }
  };

  const handleComplete = async () => {
    try {
      logger.debug('チュートリアル完了ボタンが押されました');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        logger.debug('ユーザー情報なし - ログイン画面に遷移');
        router.replace('/auth/login');
        return;
      }

      // チュートリアル完了状況をデータベースに保存
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          tutorial_completed: true,
          tutorial_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) {
        logger.error('❌ チュートリアル完了状況の保存エラー:', updateError);
        ErrorHandler.handle(updateError, 'チュートリアル完了状況の保存', false);
      } else {
        logger.debug('✅ チュートリアル完了状況を保存しました');
      }

      logger.debug('🔍 楽器選択状況を確認中...');
      // 楽器選択済みか確認
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('selected_instrument_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (profile?.selected_instrument_id) {
        logger.debug('✅ 楽器選択済み - メイン画面に遷移');
        logger.debug('🎵 選択済み楽器ID:', profile.selected_instrument_id);
        
        // 確実な遷移のため、少し遅延してから実行
        setTimeout(() => {
          try {
            router.replace('/(tabs)/' as any);
            logger.debug('✅ メイン画面への遷移完了');
          } catch (navError) {
            logger.error('❌ メイン画面への遷移エラー:', navError);
            ErrorHandler.handle(navError, 'メイン画面への遷移', false);
            // フォールバック: 直接URLを変更
            if (typeof window !== 'undefined') {
              navigateWithBasePath('/');
            }
          }
        }, 100);
      } else {
        logger.debug('🎓 楽器未選択 - 楽器選択画面に遷移');
        
        // 確実な遷移のため、少し遅延してから実行
        setTimeout(() => {
          try {
            router.replace('/(tabs)/instrument-selection');
            logger.debug('✅ 楽器選択画面への遷移完了');
          } catch (navError) {
            logger.error('❌ 楽器選択画面への遷移エラー:', navError);
            ErrorHandler.handle(navError, '楽器選択画面への遷移', false);
            // フォールバック: 直接URLを変更
            if (typeof window !== 'undefined') {
              navigateWithBasePath('/instrument-selection');
            }
          }
        }, 100);
      }
    } catch (error) {
      logger.error('❌ 完了処理エラー:', error);
      ErrorHandler.handle(error, 'チュートリアル完了処理', false);
      // 失敗時も選択画面へフォールバック
      setTimeout(() => {
        try {
          router.replace('/(tabs)/instrument-selection');
        } catch (fallbackError) {
          logger.error('❌ フォールバック遷移エラー:', fallbackError);
          ErrorHandler.handle(fallbackError, 'フォールバック遷移', false);
          if (typeof window !== 'undefined') {
            navigateWithBasePath('/instrument-selection');
          }
        }
      }, 100);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <SafeView style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.title}>チュートリアル</Text>
        <View style={styles.headerSpacer} />
      </SafeView>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <SafeView style={styles.stepIndicator}>
          {tutorialSteps.map((_, index) => 
            React.createElement(View, {
              key: index,
              style: [
                styles.stepDot,
                {
                  width: index === currentStep ? 12 : 8,
                  height: index === currentStep ? 12 : 8,
                  backgroundColor: index === currentStep ? '#1976D2' : '#E0E0E0',
                },
              ]
            })
          )}
        </SafeView>

        <View style={styles.currentStep}>
          <View style={styles.stepIcon}>
            <Text style={styles.stepIconText}>{tutorialSteps[currentStep].icon}</Text>
          </View>
          <Text style={styles.stepTitle}>{tutorialSteps[currentStep].title}</Text>
          <Text style={styles.stepDescription}>{tutorialSteps[currentStep].description}</Text>
        </View>

        {currentStep === 4 && (
          <View style={styles.notificationSection}>
            <View style={styles.notificationToggleContainer}>
              <TouchableOpacity
                style={[
                  styles.notificationToggle,
                  notificationEnabled && styles.notificationToggleActive
                ]}
                onPress={() => setNotificationEnabled(!notificationEnabled)}
              >
                <View style={[
                  styles.notificationToggleKnob,
                  notificationEnabled && styles.notificationToggleKnobActive
                ]} />
              </TouchableOpacity>
              <Text style={styles.notificationToggleLabel}>通知をオンにする</Text>
            </View>
            <Text style={styles.notificationDescription}>
              {notificationEnabled 
                ? '✅ 練習リマインダーや目標達成通知を受け取れます' 
                : '通知をオンにすると練習の継続に役立ちます'
              }
            </Text>
          </View>
        )}

        <View style={styles.navigationButtons}>
          {currentStep > 0 && (
            <TouchableOpacity style={[styles.navButton, styles.prevButton]} onPress={handlePrevious}>
              <ArrowLeft size={20} color="#333333" />
              <Text style={styles.prevButtonText}>前へ</Text>
            </TouchableOpacity>
          )}

          {currentStep < tutorialSteps.length - 1 && (
            <TouchableOpacity style={[styles.navButton, styles.nextButton]} onPress={handleNext}>
              <Text style={styles.nextButtonText}>次へ</Text>
              <ArrowRight size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>

        {currentStep === tutorialSteps.length - 1 && (
          <TouchableOpacity 
            style={[
              styles.instrumentSelectionButton,
              isNavigating && styles.instrumentSelectionButtonDisabled
            ]} 
            onPress={handleInstrumentSelection}
            disabled={isNavigating}
          >
            <Text style={styles.instrumentSelectionButtonText}>
              {isNavigating ? '🔄 遷移中...' : '🎵 楽器選択を開始'}
            </Text>
            {!isNavigating && <ArrowRight size={20} color="#FFFFFF" />}
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  backButton: {
    padding: 8,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    alignItems: 'center',
    paddingBottom: 40,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 30,
  },
  stepDot: {
    borderRadius: 6,
  },
  currentStep: {
    alignItems: 'center',
    marginBottom: 30,
    paddingHorizontal: 12,
  },
  stepIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1976D2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    
    
    
    elevation: 8,
  },
  stepIconText: {
    fontSize: 40,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
    color: '#333333',
  },
  stepDescription: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    color: '#666666',
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 20,
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
    borderColor: '#E0E0E0',
  },
  prevButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  nextButton: {
    marginLeft: 'auto',
    backgroundColor: '#1976D2',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  instrumentSelectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    gap: 12,
    marginTop: 20,
    backgroundColor: '#1976D2',
    
    
    
    elevation: 8,
  },
  instrumentSelectionButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  instrumentSelectionButtonDisabled: {
    backgroundColor: '#CCCCCC',
    opacity: 0.7,
  },
  notificationSection: {
    marginTop: 2,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  notificationToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  notificationToggleLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
  },
  notificationToggle: {
    width: 50,
    height: 28,
    backgroundColor: '#E0E0E0',
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
  },
  notificationToggleActive: {
    backgroundColor: '#1976D2',
  },
  notificationToggleKnob: {
    width: 24,
    height: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    alignSelf: 'flex-start',
    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.2)',
    elevation: 2,
  },
  notificationToggleKnobActive: {
    alignSelf: 'flex-end',
  },
  notificationDescription: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
}); 
