import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import InstrumentHeader from '@/components/InstrumentHeader';
import { safeGoBack } from '@/lib/navigationUtils';
import {
  DEFAULT_A4_FREQUENCY,
} from '@/lib/tunerUtils';
import { saveTunerSettings } from '@/lib/database';
import { getCurrentUser } from '@/lib/authService';
import { getUserProfile } from '@/repositories/userRepository';
import { getUserSettings } from '@/repositories/userSettingsRepository';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import { TunerSettings } from '@/components/main-settings/TunerSettings';
import { InstrumentSettings } from '@/components/main-settings/InstrumentSettings';
import { LevelSettings } from '@/components/main-settings/LevelSettings';
import { AppearanceSettings } from '@/components/main-settings/AppearanceSettings';

export default function MainSettingsScreen() {
  const router = useRouter();
  const { 
    currentTheme, 
    selectedInstrument,
    isCustomTheme, 
    setCustomTheme, 
    resetToInstrumentTheme,
  } = useInstrumentTheme();
  
  // currentThemeが存在しない場合のフォールバック
  if (!currentTheme) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>テーマの読み込み中...</Text>
      </SafeAreaView>
    );
  }
  
  const [mode, setMode] = useState<'tuner' | 'instrument' | 'level' | 'appearance'>('tuner');
  
  // チューナー関連の状態
  const [a4Frequency, setA4Frequency] = useState<number>(DEFAULT_A4_FREQUENCY);
  const [sensitivity, setSensitivity] = useState<number>(0.1);
  const [responseSpeed, setResponseSpeed] = useState<number>(0.8);
  const [smoothing, setSmoothing] = useState<number>(0.3);
  const [toleranceRange, setToleranceRange] = useState<number>(10);
  const [referenceToneVolume, setReferenceToneVolume] = useState<number>(0.5);

  // 演奏レベル
  const [practiceLevel, setPracticeLevel] = useState('beginner');
  
  // 外観設定関連の状態
  const [useCustomTheme, setUseCustomTheme] = useState(isCustomTheme);
  const [customColors, setCustomColors] = useState({
    id: 'custom',
    name: 'カスタム',
    nameEn: 'Custom',
    background: currentTheme?.background || '#F7FAFC',
    surface: currentTheme?.surface || '#FFFFFF',
    primary: currentTheme?.primary || '#4A5568',
    secondary: currentTheme?.secondary || '#E2E8F0',
    accent: currentTheme?.accent || '#2D3748',
    text: currentTheme?.text || '#2D3748',
    textSecondary: currentTheme?.textSecondary || '#718096',
  });

  // currentThemeが変更されたらcustomColorsを同期（カスタムテーマでない場合のみ）
  useEffect(() => {
    if (!isCustomTheme && currentTheme) {
      setCustomColors({
        id: 'custom',
        name: 'カスタム',
        nameEn: 'Custom',
        background: currentTheme.background || '#F7FAFC',
        surface: currentTheme.surface || '#FFFFFF',
        primary: currentTheme.primary || '#4A5568',
        secondary: currentTheme.secondary || '#E2E8F0',
        accent: currentTheme.accent || '#2D3748',
        text: currentTheme.text || '#2D3748',
        textSecondary: currentTheme.textSecondary || '#718096',
      });
    }
  }, [currentTheme, isCustomTheme]);

  // 設定読み込み
  useEffect(() => {
    let cancelled = false;
    
    const load = async () => {
      try {
        // ユーザー情報を1回だけ取得（サービス層経由）
        const { user, error: userError } = await getCurrentUser();
        if (userError || !user || cancelled) {
          if (!user) {
            logger.warn('ユーザーが認証されていません。設定を読み込めません。');
          }
          return;
        }

        // チューナー設定読み込み（リポジトリ層経由）
        const settingsResult = await getUserSettings(user.id);
        
        if (cancelled) return;
        
        if (settingsResult.error) {
          const error = settingsResult.error;
          const errorCode = 'code' in error ? (error as { code?: string }).code : undefined;
          const errorStatus = 'status' in error ? (error as { status?: number }).status : undefined;
          const errorMessage = error.message || '';
          if (errorCode === 'PGRST116' || errorCode === 'PGRST205') {
            logger.info('user_settingsテーブルが存在しないか、データがありません。デフォルト値を使用します。');
          } else if (errorMessage.includes('406') || errorStatus === 406) {
            logger.warn('user_settingsテーブルへのアクセスが拒否されました（406エラー）。RLSポリシーを確認してください。');
          } else {
            ErrorHandler.handle(settingsResult.error, 'チューナー設定読み込み', false);
          }
        } else if (settingsResult.data?.tuner_settings) {
          const settings = settingsResult.data.tuner_settings;
          if (!cancelled) {
            setA4Frequency(settings.a4Frequency || settings.reference_pitch || DEFAULT_A4_FREQUENCY);
            setSensitivity(settings.sensitivity || 0.1);
            setResponseSpeed(settings.responseSpeed || 0.8);
            setSmoothing(settings.smoothing || 0.3);
            setToleranceRange(settings.toleranceRange || 10);
            setReferenceToneVolume(settings.referenceToneVolume || settings.volume || 0.5);
          }
        }

        // 演奏レベルをプロフィールから読み込み（リポジトリ層経由）
        if (cancelled) return;
        
        try {
          const profileResult = await getUserProfile(user.id);
          
          if (!cancelled && !profileResult.error && profileResult.data?.practice_level) {
            setPracticeLevel(profileResult.data.practice_level as 'beginner' | 'intermediate' | 'advanced');
          }
        } catch (profileError) {
          ErrorHandler.handle(profileError, 'プロフィール読み込み', false);
        }
      } catch (error) {
        if (!cancelled) {
          ErrorHandler.handle(error, '設定読み込み', false);
        }
      }
    };

    load();
    
    return () => {
      cancelled = true;
    };
  }, []);

  // 設定保存
  useEffect(() => {
    const saveSettings = async () => {
      try {
        const { user, error: userError } = await getCurrentUser();
        if (userError || !user) return;

        if (mode === 'tuner') {
          await saveTunerSettings(user.id, {
            reference_pitch: a4Frequency,
            temperament: 'equal',
            volume: referenceToneVolume,
          });
        }
      } catch (error) {
        ErrorHandler.handle(error, '設定保存', false);
      }
    };

    saveSettings();
  }, [mode, a4Frequency, sensitivity, responseSpeed, smoothing, toleranceRange, referenceToneVolume]);

  const goBack = () => {
    safeGoBack('/(tabs)/settings', true);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} >
      <InstrumentHeader />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: currentTheme?.surface || '#FFFFFF', borderBottomColor: currentTheme?.secondary || '#E2E8F0' }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={goBack}
          activeOpacity={0.6}
        >
          <ArrowLeft size={24} color={currentTheme?.text || '#2D3748'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: currentTheme?.text || '#2D3748' }]}>主要機能設定</Text>
        <View style={styles.placeholder} />
      </View>

      {/* モード切り替えタブ */}
      <View style={[styles.tabContainer, { backgroundColor: currentTheme?.background || '#F7FAFC' }]}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScrollContent}
        >
          <TouchableOpacity
            style={[
              styles.tabButton,
              { 
                backgroundColor: mode === 'tuner' ? currentTheme?.primary || '#4A5568' : currentTheme?.surface || '#FFFFFF',
                borderColor: currentTheme?.primary || '#4A5568'
              }
            ]}
            onPress={() => setMode('tuner')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="チューナー設定タブ"
          >
            <Text style={[
              styles.tabButtonText,
              { color: mode === 'tuner' ? currentTheme?.surface || '#FFFFFF' : currentTheme?.text || '#2D3748' }
            ]}>
              チューナー
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.tabButton,
              { 
                backgroundColor: mode === 'instrument' ? currentTheme?.primary || '#4A5568' : currentTheme?.surface || '#FFFFFF',
                borderColor: currentTheme?.primary || '#4A5568'
              }
            ]}
            onPress={() => setMode('instrument')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="楽器選択タブ"
          >
            <Text style={[
              styles.tabButtonText,
              { color: mode === 'instrument' ? currentTheme?.surface || '#FFFFFF' : currentTheme?.text || '#2D3748' }
            ]}>
              楽器選択
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              { 
                backgroundColor: mode === 'level' ? currentTheme?.primary || '#4A5568' : currentTheme?.surface || '#FFFFFF',
                borderColor: currentTheme?.primary || '#4A5568'
              }
            ]}
            onPress={() => setMode('level')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="演奏レベルタブ"
          >
            <Text style={[
              styles.tabButtonText,
              { color: mode === 'level' ? currentTheme?.surface || '#FFFFFF' : currentTheme?.text || '#2D3748' }
            ]}>
              演奏レベル
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              { 
                backgroundColor: mode === 'appearance' ? currentTheme?.primary || '#4A5568' : currentTheme?.surface || '#FFFFFF',
                borderColor: currentTheme?.primary || '#4A5568'
              }
            ]}
            onPress={() => setMode('appearance')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="外観設定タブ"
          >
            <Text style={[
              styles.tabButtonText,
              { color: mode === 'appearance' ? currentTheme?.surface || '#FFFFFF' : currentTheme?.text || '#2D3748' }
            ]}>
              外観設定
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {mode === 'tuner' && (
          <TunerSettings
            currentTheme={currentTheme}
            a4Frequency={a4Frequency}
            setA4Frequency={setA4Frequency}
            responseSpeed={responseSpeed}
            setResponseSpeed={setResponseSpeed}
            smoothing={smoothing}
            setSmoothing={setSmoothing}
            toleranceRange={toleranceRange}
            setToleranceRange={setToleranceRange}
            referenceToneVolume={referenceToneVolume}
            setReferenceToneVolume={setReferenceToneVolume}
          />
        )}

        {mode === 'instrument' && (
          <InstrumentSettings currentTheme={currentTheme} />
        )}

        {mode === 'level' && (
          <LevelSettings
            currentTheme={currentTheme}
            practiceLevel={practiceLevel}
            setPracticeLevel={setPracticeLevel}
          />
        )}

        {mode === 'appearance' && (
          <AppearanceSettings
            currentTheme={currentTheme}
            useCustomTheme={useCustomTheme}
            setUseCustomTheme={setUseCustomTheme}
            customColors={customColors}
            setCustomColors={setCustomColors}
            selectedInstrument={selectedInstrument}
            setCustomTheme={setCustomTheme}
            resetToInstrumentTheme={resetToInstrumentTheme}
          />
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  tabContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabScrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  tabButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
});

