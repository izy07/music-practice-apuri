import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Mic, Volume2, Play, Pause, Settings, Eye, EyeOff, Check, Palette } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import InstrumentHeader from '@/components/InstrumentHeader';
import { safeGoBack } from '@/lib/navigationUtils';
import {
  getInstrumentStartNote,
  getInstrumentScales,
  getFrequency,
  DEFAULT_A4_FREQUENCY,
} from '../../lib/tunerUtils';
import { saveTunerSettings } from '@/lib/database';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/lib/storageKeys';
import { userRepository } from '@/repositories/userRepository';
import { COMMON_STYLES } from '@/lib/styles';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import { createShadowStyle } from '@/lib/shadowStyles';

const { width, height } = Dimensions.get('window');

export default function MainSettingsScreen() {
  const router = useRouter();
  const { currentTheme, selectedInstrument, setSelectedInstrument, isCustomTheme, setCustomTheme, resetToInstrumentTheme, dbInstruments } = useInstrumentTheme();
  
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
        // ユーザー情報を1回だけ取得
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) {
          if (!user) {
            logger.warn('ユーザーが認証されていません。設定を読み込めません。');
          }
          return;
        }

        // チューナー設定読み込み
        const { data: tunerData, error: tunerError } = await supabase
          .from('user_settings')
          .select('tuner_settings')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (cancelled) return;
        
        if (tunerError) {
          if (tunerError.code === 'PGRST116' || tunerError.code === 'PGRST205') {
            logger.info('user_settingsテーブルが存在しないか、データがありません。デフォルト値を使用します。');
          } else if (tunerError.message?.includes('406')) {
            logger.warn('user_settingsテーブルへのアクセスが拒否されました（406エラー）。RLSポリシーを確認してください。');
          } else {
            ErrorHandler.handle(tunerError, 'チューナー設定読み込み', false);
          }
        } else if (tunerData?.tuner_settings) {
          const settings = tunerData.tuner_settings;
          if (!cancelled) {
            setA4Frequency(settings.a4Frequency || settings.reference_pitch || DEFAULT_A4_FREQUENCY);
            setSensitivity(settings.sensitivity || 0.1);
            setResponseSpeed(settings.responseSpeed || 0.8);
            setSmoothing(settings.smoothing || 0.3);
            setToleranceRange(settings.toleranceRange || 10);
            setReferenceToneVolume(settings.referenceToneVolume || settings.volume || 0.5);
          }
        }

        // 演奏レベルをプロフィールから読み込み
        if (cancelled) return;
        
        try {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('practice_level')
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (!cancelled && profile?.practice_level) {
            setPracticeLevel(profile.practice_level as 'beginner' | 'intermediate' | 'advanced');
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
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

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




  // 演奏レベル
  const practiceLevels = [
    { id: 'beginner', name: '初級', description: '' },
    { id: 'intermediate', name: '中級', description: '' },
    { id: 'advanced', name: 'マスター', description: '' },
  ];

  // プリセットカラーパレット
  const presetPalettes = [
    {
      id: 'ocean',
      name: 'オーシャン',
      colors: {
        background: '#E9F2FA',
        surface: '#FFFFFF',
        primary: '#5B7FA3',
        secondary: '#D5E7F9',
        accent: '#4A6B8A',
        text: '#4A5C75',
        textSecondary: '#6B7F9A',
      }
    },
    {
      id: 'sunset',
      name: 'サンセット',
      colors: {
        background: '#FFF4E8',
        surface: '#FFFFFF',
        primary: '#B8946A',
        secondary: '#FFE3C2',
        accent: '#9A7A5A',
        text: '#6B5A4A',
        textSecondary: '#8B7A6A',
      }
    },
    {
      id: 'forest',
      name: 'フォレスト',
      colors: {
        background: '#EEF6EE',
        surface: '#FFFFFF',
        primary: '#6B8A6A',
        secondary: '#D7EAD7',
        accent: '#5A7A5A',
        text: '#4A5D4A',
        textSecondary: '#6B8A6A',
      }
    },
    {
      id: 'lavender',
      name: 'ラベンダー',
      colors: {
        background: '#F5F1FA',
        surface: '#FFFFFF',
        primary: '#9B8AA3',
        secondary: '#E6DAF2',
        accent: '#7A6A8A',
        text: '#5E4A6B',
        textSecondary: '#7A6A8A',
      }
    },
    {
      id: 'midnight',
      name: 'ミッドナイト',
      colors: {
        // 高コントラストのダークテーマ（WCAGに配慮）
        background: '#0F141A',   // ほぼ黒に近い群青
        surface: '#1B2430',      // カード/パネル用に少し明るい面
        primary: '#2F81F7',      // 視認性の高い青（ボタン等）
        secondary: '#2A2F3A',    // 枠・タブ背景用の控えめな濃色
        accent: '#1F6FEB',       // アクセント（リンク/強調）
        text: '#E6EDF3',         // メインテキスト（高コントラスト）
        textSecondary: '#9BA9B4',// サブテキスト（十分な明度）
      }
    },
    {
      id: 'coral',
      name: 'コーラル',
      colors: {
        background: '#FFF0F2',
        surface: '#FFFFFF',
        primary: '#B88A9A',
        secondary: '#F4C8D6',
        accent: '#9A7A8A',
        text: '#6B5A6A',
        textSecondary: '#8B7A8A',
      }
    },
    {
      id: 'teal',
      name: 'ティール',
      colors: {
        background: '#EEF6F6',
        surface: '#FFFFFF',
        primary: '#6B8A8A',
        secondary: '#D6EAEA',
        accent: '#5A7A7A',
        text: '#4A5D5D',
        textSecondary: '#6B8A8A',
      }
    },
    {
      id: 'sage',
      name: 'セージ',
      colors: {
        background: '#F1F5F0',
        surface: '#FFFFFF',
        primary: '#9CAF88',
        secondary: '#D4E4C5',
        accent: '#7A9570',
        text: '#4A5D3E',
        textSecondary: '#6B8A5A',
      }
    },
    {
      id: 'vibrant-pink',
      name: 'ビビッドピンク',
      colors: {
        background: '#FFF5F8',
        surface: '#FFFFFF',
        primary: '#B88A9A',
        secondary: '#F0D4E0',
        accent: '#9A7A8A',
        text: '#6B5A6A',
        textSecondary: '#8B7A8A',
      }
    },
    {
      id: 'sunshine',
      name: 'サンシャイン',
      colors: {
        background: '#FFF9E6',
        surface: '#FFFFFF',
        primary: '#B8A08A',
        secondary: '#F5E6B3',
        accent: '#9A8A7A',
        text: '#6B5A4A',
        textSecondary: '#8B7A6A',
      }
    },
    {
      id: 'emerald',
      name: 'エメラルド',
      colors: {
        background: '#F0F8F5',
        surface: '#FFFFFF',
        primary: '#6B8A7A',
        secondary: '#D4E6D3',
        accent: '#5A7A6A',
        text: '#4A5D4A',
        textSecondary: '#6B8A7A',
      }
    },
    {
      id: 'royal-blue',
      name: 'ロイヤルブルー',
      colors: {
        background: '#F0F4FA',
        surface: '#FFFFFF',
        primary: '#6B7A9A',
        secondary: '#D4E0F0',
        accent: '#5A6A8A',
        text: '#4A5A7A',
        textSecondary: '#6B7A9A',
      }
    },
    {
      id: 'amethyst',
      name: 'アメジスト',
      colors: {
        background: '#F3E8FF',
        surface: '#FFFFFF',
        primary: '#9B8AA3',
        secondary: '#E1C4FF',
        accent: '#7A6A8A',
        text: '#5E4A6B',
        textSecondary: '#7A6A8A',
      }
    },
    {
      id: 'navy',
      name: 'ネイビー',
      colors: {
        background: '#F0F2F5',
        surface: '#FFFFFF',
        primary: '#4A5A7A',
        secondary: '#D4DCE8',
        accent: '#3A4A6A',
        text: '#2A3A5A',
        textSecondary: '#5A6A8A',
      }
    },
    {
      id: 'rose-gold',
      name: 'ローズゴールド',
      colors: {
        background: '#FFF5F0',
        surface: '#FFFFFF',
        primary: '#C8A89A',
        secondary: '#F8E0D4',
        accent: '#A88A7A',
        text: '#6B5A4A',
        textSecondary: '#8B7A6A',
      }
    },
    {
      id: 'turquoise',
      name: 'ターコイズ',
      colors: {
        background: '#F0F9FA',
        surface: '#FFFFFF',
        primary: '#6B8A8A',
        secondary: '#D4EDEA',
        accent: '#5A7A7A',
        text: '#4A5D5D',
        textSecondary: '#6B8A8A',
      }
    },
    {
      id: 'vibrant-sunshine',
      name: 'ビビッドサンシャイン',
      colors: {
        background: '#F0FBBC',
        surface: '#FFFFFF',
        primary: '#C8A8B8',
        secondary: '#FCE4EC',
        accent: '#A88A9A',
        text: '#6B5A6A',
        textSecondary: '#8B7A8A',
      }
    },
    {
      id: 'sage-rose',
      name: 'セージローズ',
      colors: {
        background: '#F1F5F0',
        surface: '#FFFFFF',
        primary: '#E8B4B8',
        secondary: '#F5E6E8',
        accent: '#C8969A',
        text: '#4A5D3E',
        textSecondary: '#6B8A5A',
      }
    },
    {
      id: 'dusty-blue',
      name: 'ダスティブルー',
      colors: {
        background: '#F0F4F8',
        surface: '#FFFFFF',
        primary: '#8B9DC3',
        secondary: '#E8EDF5',
        accent: '#6B7A9A',
        text: '#4A5A7A',
        textSecondary: '#6B7A9A',
      }
    },
    {
      id: 'warm-grey',
      name: 'ウォームグレー',
      colors: {
        background: '#F5F5F0',
        surface: '#FFFFFF',
        primary: '#A89B9B',
        secondary: '#E8E5E5',
        accent: '#8A7A7A',
        text: '#5A4A4A',
        textSecondary: '#7A6A6A',
      }
    },
    {
      id: 'muted-lavender',
      name: 'ミュートラベンダー',
      colors: {
        background: '#F5F1FA',
        surface: '#FFFFFF',
        primary: '#B8A8C8',
        secondary: '#E8E0F0',
        accent: '#9A8AA8',
        text: '#5E4A6B',
        textSecondary: '#7A6A8A',
      }
    },
    {
      id: 'soft-peach',
      name: 'ソフトピーチ',
      colors: {
        background: '#FFF8F0',
        surface: '#FFFFFF',
        primary: '#D4B8A8',
        secondary: '#F5E8E0',
        accent: '#B89A8A',
        text: '#6B5A4A',
        textSecondary: '#8B7A6A',
      }
    },
    {
      id: 'dusty-rose',
      name: 'ダスティローズ',
      colors: {
        background: '#FAF5F5',
        surface: '#FFFFFF',
        primary: '#C8A8A8',
        secondary: '#F0E8E8',
        accent: '#A88A8A',
        text: '#6B5A5A',
        textSecondary: '#8B7A7A',
      }
    },
    {
      id: 'muted-mint',
      name: 'ミュートミント',
      colors: {
        background: '#F0F8F5',
        surface: '#FFFFFF',
        primary: '#A8C8B8',
        secondary: '#E0F0E8',
        accent: '#8AA89A',
        text: '#4A5D4A',
        textSecondary: '#6B8A7A',
      }
    },
    {
      id: 'violin-brown',
      name: 'バイオリン茶色',
      colors: {
        background: '#F5EDE0', // 温かみのあるアイボリー背景
        surface: '#FFFFFF',
        primary: '#8B6F47', // バイオリンらしい優雅な茶色（ダークゴールドブラウン）
        secondary: '#D4C4B0', // 優雅なライトベージュ
        accent: '#6B4E3D', // ダークブラウン（ニス仕上げの深み）
        text: '#3D2F1F',
        textSecondary: '#6B4E3D',
      }
    }
  ];

  const goBack = () => {
    safeGoBack('/(tabs)/settings', true); // 強制的にsettings画面に戻る
  };

  // 選択されたプリセットIDを追跡
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

  // 外観設定関連の関数
  const handlePresetSelect = async (palette: any) => {
    const newTheme = { ...customColors, ...palette.colors };
    setCustomColors(newTheme);
    setUseCustomTheme(true);
    setSelectedPresetId(palette.id); // 選択されたプリセットIDを保存
    await setCustomTheme(newTheme);
    Alert.alert('プリセット適用', `${palette.name}カラーパレットを適用しました`);
  };

  const handleSaveCustomTheme = async () => {
    await setCustomTheme(customColors);
    setUseCustomTheme(true);
    setSelectedPresetId(null); // 手動入力の場合はプリセットIDをクリア
    Alert.alert('保存完了', 'カスタムテーマを保存しました');
  };

  const handleResetTheme = async () => {
    setUseCustomTheme(false);
    await resetToInstrumentTheme();
    Alert.alert('リセット完了', '楽器の自動テーマに戻しました');
  };

  // 現在のカスタムカラーがどのプリセットと一致するかを判定
  const getCurrentPresetName = () => {
    if (!useCustomTheme) return null;
    
    // 手動で選択されたプリセットがある場合はそれを返す
    if (selectedPresetId) {
      const selectedPalette = presetPalettes.find(p => p.id === selectedPresetId);
      if (selectedPalette) {
        // 色が一致しているか確認
        const matches = 
          customColors.background === selectedPalette.colors.background &&
          customColors.surface === selectedPalette.colors.surface &&
          customColors.primary === selectedPalette.colors.primary &&
          customColors.secondary === selectedPalette.colors.secondary &&
          customColors.accent === selectedPalette.colors.accent &&
          customColors.text === selectedPalette.colors.text &&
          customColors.textSecondary === selectedPalette.colors.textSecondary;
        
        if (matches) {
          return selectedPalette.name;
        }
      }
    }
    
    // 手動入力で色が変更された場合はnullを返す
    return null;
  };

  const ColorPicker = ({ label, color, onColorChange, colorType }: any) => (
    <View style={styles.colorPickerContainer}>
      <Text style={[styles.colorPickerLabel, { color: currentTheme?.text || '#2D3748' }]}>{label}</Text>
      <View style={styles.colorPickerRow}>
        <View style={[styles.colorPreview, { backgroundColor: color }]} />
        <TouchableOpacity
          style={[styles.colorButton, { backgroundColor: color }]}
          onPress={() => {
            Alert.alert('カラーピッカー', 'カラーピッカー機能は準備中です');
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.colorButtonText}>変更</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} edges={[]}>
      <InstrumentHeader />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: currentTheme?.surface || '#FFFFFF', borderBottomColor: currentTheme?.secondary || '#E2E8F0' }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={goBack}
          activeOpacity={0.6}
        >
          <ArrowLeft size={24} color={currentTheme?.text || '#2D3748' } />
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
        {/* チューナー設定 */}
        {mode === 'tuner' && (
          <View style={styles.contentContainer}>
            <View style={[styles.settingsCard, { backgroundColor: currentTheme?.surface || '#FFFFFF' }]}>
              <View style={styles.cardHeader}>
                <Mic size={24} color={currentTheme?.primary || '#4A5568'} />
                <Text style={[styles.cardTitle, { color: currentTheme?.text || '#2D3748' }]}>
                  チューナー設定
                </Text>
              </View>
              <Text style={[styles.sectionDescription, { color: currentTheme?.textSecondary || '#718096' }]}>
                チューナー
              </Text>
              
              {/* A4基準周波数設定 */}
              <View style={[styles.settingCard, { backgroundColor: currentTheme?.background || '#F7FAFC' }]}>
                <View style={styles.settingHeader}>
                  <Text style={[styles.settingTitle, { color: currentTheme?.text || '#2D3748' }]}>
                    A4基準周波数
                  </Text>
                  <Text style={[styles.settingValue, { color: currentTheme?.primary || '#4A5568' }]}>
                    {a4Frequency} Hz
                  </Text>
                </View>
                <Text style={[styles.settingDescription, { color: currentTheme?.textSecondary || '#718096' }]}>
                  チューニングの基準となる周波数を設定します
                </Text>
                <View style={styles.settingControls}>
                  <TouchableOpacity
                    style={[styles.controlButton, { backgroundColor: currentTheme?.secondary || '#E2E8F0' }]}
                    onPress={() => setA4Frequency(prev => Math.max(440, prev - 1))}
                  >
                    <Text style={[styles.controlButtonText, { color: currentTheme?.text || '#2D3748' }]}>-</Text>
                  </TouchableOpacity>
                  <View style={[styles.valueDisplay, { backgroundColor: currentTheme?.surface || '#FFFFFF' }]}>
                    <Text style={[styles.valueText, { color: currentTheme?.primary || '#4A5568' }]}>{a4Frequency}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.controlButton, { backgroundColor: currentTheme?.secondary || '#E2E8F0' }]}
                    onPress={() => setA4Frequency(prev => Math.min(450, prev + 1))}
                  >
                    <Text style={[styles.controlButtonText, { color: currentTheme?.text || '#2D3748' }]}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 反応速度設定 */}
              <View style={[styles.settingCard, { backgroundColor: currentTheme?.background || '#F7FAFC' }]}>
                <View style={styles.settingHeader}>
                  <Text style={[styles.settingTitle, { color: currentTheme?.text || '#2D3748' }]}>
                    反応速度
                  </Text>
                  <Text style={[styles.settingValue, { color: currentTheme?.primary || '#4A5568' }]}>
                    {Math.round(responseSpeed * 100)}%
                  </Text>
                </View>
                <Text style={[styles.settingDescription, { color: currentTheme?.textSecondary || '#718096' }]}>
                  メーターの反応速度を調整します
                </Text>
                <View style={styles.settingControls}>
                  <TouchableOpacity
                    style={[styles.controlButton, { backgroundColor: currentTheme?.secondary || '#E2E8F0' }]}
                    onPress={() => setResponseSpeed(prev => Math.max(0.1, prev - 0.1))}
                  >
                    <Text style={[styles.controlButtonText, { color: currentTheme?.text || '#2D3748' }]}>-</Text>
                  </TouchableOpacity>
                  <View style={[styles.valueDisplay, { backgroundColor: currentTheme?.surface || '#FFFFFF' }]}>
                    <Text style={[styles.valueText, { color: currentTheme?.primary || '#4A5568' }]}>{Math.round(responseSpeed * 100)}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.controlButton, { backgroundColor: currentTheme?.secondary || '#E2E8F0' }]}
                    onPress={() => setResponseSpeed(prev => Math.min(1.0, prev + 0.1))}
                  >
                    <Text style={[styles.controlButtonText, { color: currentTheme?.text || '#2D3748' }]}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 平滑化設定 */}
              <View style={[styles.settingCard, { backgroundColor: currentTheme?.background || '#F7FAFC' }]}>
                <View style={styles.settingHeader}>
                  <Text style={[styles.settingTitle, { color: currentTheme?.text || '#2D3748' }]}>
                    平滑化
                  </Text>
                  <Text style={[styles.settingValue, { color: currentTheme?.primary || '#4A5568' }]}>
                    {Math.round(smoothing * 100)}%
                  </Text>
                </View>
                <Text style={[styles.settingDescription, { color: currentTheme?.textSecondary || '#718096' }]}>
                  周波数測定の平滑化レベルを調整します
                </Text>
                <View style={styles.settingControls}>
                  <TouchableOpacity
                    style={[styles.controlButton, { backgroundColor: currentTheme?.secondary || '#E2E8F0' }]}
                    onPress={() => setSmoothing(prev => Math.max(0.1, prev - 0.1))}
                  >
                    <Text style={[styles.controlButtonText, { color: currentTheme?.text || '#2D3748' }]}>-</Text>
                  </TouchableOpacity>
                  <View style={[styles.valueDisplay, { backgroundColor: currentTheme?.surface || '#FFFFFF' }]}>
                    <Text style={[styles.valueText, { color: currentTheme?.primary || '#4A5568' }]}>{Math.round(smoothing * 100)}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.controlButton, { backgroundColor: currentTheme?.secondary || '#E2E8F0' }]}
                    onPress={() => setSmoothing(prev => Math.min(0.9, prev + 0.1))}
                  >
                    <Text style={[styles.controlButtonText, { color: currentTheme?.text || '#2D3748' }]}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 許容範囲設定 */}
              <View style={[styles.settingCard, { backgroundColor: currentTheme?.background || '#F7FAFC' }]}>
                <View style={styles.settingHeader}>
                  <Text style={[styles.settingTitle, { color: currentTheme?.text || '#2D3748' }]}>
                    許容範囲
                  </Text>
                  <Text style={[styles.settingValue, { color: currentTheme?.primary || '#4A5568' }]}>
                    ±{toleranceRange}セント
                  </Text>
                </View>
                <Text style={[styles.settingDescription, { color: currentTheme?.textSecondary || '#718096' }]}>
                  チューニングの許容範囲を設定します
                </Text>
                <View style={styles.settingControls}>
                  <TouchableOpacity
                    style={[styles.controlButton, { backgroundColor: currentTheme?.secondary || '#E2E8F0' }]}
                    onPress={() => setToleranceRange(prev => Math.max(5, prev - 5))}
                  >
                    <Text style={[styles.controlButtonText, { color: currentTheme?.text || '#2D3748' }]}>-</Text>
                  </TouchableOpacity>
                  <View style={[styles.valueDisplay, { backgroundColor: currentTheme?.surface || '#FFFFFF' }]}>
                    <Text style={[styles.valueText, { color: currentTheme?.primary || '#4A5568' }]}>{toleranceRange}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.controlButton, { backgroundColor: currentTheme?.secondary || '#E2E8F0' }]}
                    onPress={() => setToleranceRange(prev => Math.min(50, prev + 5))}
                  >
                    <Text style={[styles.controlButtonText, { color: currentTheme?.text || '#2D3748' }]}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 基準音音量設定 */}
              <View style={[styles.settingCard, { backgroundColor: currentTheme?.background || '#F7FAFC' }]}>
                <View style={styles.settingHeader}>
                  <Text style={[styles.settingTitle, { color: currentTheme?.text || '#2D3748' }]}>
                    基準音音量
                  </Text>
                  <Text style={[styles.settingValue, { color: currentTheme?.primary || '#4A5568' }]}>
                    {Math.round(referenceToneVolume * 100)}%
                  </Text>
                </View>
                <Text style={[styles.settingDescription, { color: currentTheme?.textSecondary || '#718096' }]}>
                  基準音の音量を調整します
                </Text>
                <View style={styles.settingControls}>
                  <TouchableOpacity
                    style={[styles.controlButton, { backgroundColor: currentTheme?.secondary || '#E2E8F0' }]}
                    onPress={() => setReferenceToneVolume(prev => Math.max(0.1, prev - 0.1))}
                  >
                    <Text style={[styles.controlButtonText, { color: currentTheme?.text || '#2D3748' }]}>-</Text>
                  </TouchableOpacity>
                  <View style={[styles.valueDisplay, { backgroundColor: currentTheme?.surface || '#FFFFFF' }]}>
                    <Text style={[styles.valueText, { color: currentTheme?.primary || '#4A5568' }]}>{Math.round(referenceToneVolume * 100)}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.controlButton, { backgroundColor: currentTheme?.secondary || '#E2E8F0' }]}
                    onPress={() => setReferenceToneVolume(prev => Math.min(1.0, prev + 0.1))}
                  >
                    <Text style={[styles.controlButtonText, { color: currentTheme?.text || '#2D3748' }]}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* 楽器選択 */}
        {mode === 'instrument' && (
          <View style={[styles.settingsContainer, { backgroundColor: currentTheme?.surface || '#FFFFFF' }]}>
            <Text style={[styles.sectionTitle, { color: currentTheme?.text || '#2D3748' }]}>
              練習楽器
            </Text>
            <Text style={[styles.sectionDescription, { color: currentTheme?.textSecondary || '#718096' }]}>
              複数の楽器を練習している場合、楽器ごとにデータが分けられます
            </Text>

            <TouchableOpacity
              style={[styles.changeInstrumentButton, { 
                backgroundColor: currentTheme?.primary || '#4A5568',
                borderColor: currentTheme?.accent || '#2D3748'
              }]}
              onPress={() => router.push('/(tabs)/instrument-selection' as any)}
              activeOpacity={0.8}
            >
              <Text style={styles.changeInstrumentButtonText}>
                楽器を変更・追加
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 演奏レベル（演奏レベルモード） */}
        {mode === 'level' && (
          <View style={[styles.settingsContainer, { backgroundColor: currentTheme?.surface || '#FFFFFF' }]}>
            <Text style={[styles.sectionTitle, { color: currentTheme?.text || '#2D3748' }]}>
              演奏レベル
            </Text>
            <Text style={[styles.sectionDescription, { color: currentTheme?.textSecondary || '#718096' }]}>
              演奏レベル
            </Text>
            <View style={styles.levelContainer}>
              {practiceLevels.map((level) => 
                React.createElement(TouchableOpacity, {
                  key: level.id,
                  style: [
                    styles.levelItem,
                    {
                      backgroundColor: practiceLevel === level.id 
                        ? currentTheme?.primary || '#4A5568'
                        : currentTheme?.background || '#F7FAFC',
                      borderColor: practiceLevel === level.id 
                        ? currentTheme?.primary || '#4A5568'
                        : currentTheme?.secondary || '#E2E8F0',
                    }
                  ],
                  onPress: async () => {
                    try {
                      setPracticeLevel(level.id);
                      const { data: { user } } = await supabase.auth.getUser();
                      if (user) {
                        await userRepository.updatePracticeLevel(user.id, level.id);
                        try {
                          await AsyncStorage.setItem(STORAGE_KEYS.userPracticeLevel, level.id);
                        } catch (storageError) {
                          ErrorHandler.handle(storageError, 'ローカルストレージ保存', false);
                        }
                      }
                    } catch (e) {
                      ErrorHandler.handle(e, '演奏レベル保存', true);
                      Alert.alert('エラー', '演奏レベルの保存に失敗しました');
                    }
                  },
                  activeOpacity: 0.7
                },
                  React.createElement(View, { style: styles.levelContent },
                    React.createElement(Text, {
                      style: [
                        styles.levelName,
                        { color: practiceLevel === level.id 
                          ? currentTheme?.surface || '#FFFFFF'
                          : currentTheme?.text || '#2D3748'
                        }
                      ]
                    }, level.name)
                  ),
                  practiceLevel === level.id ? 
                    React.createElement(View, { 
                      style: [styles.levelCheckmark, { backgroundColor: currentTheme?.accent || '#2D3748' }] 
                    },
                      React.createElement(Text, { style: styles.checkmarkText }, '✓')
                    ) : null
                )
              )}
            </View>
            <Text style={[styles.sectionDescription, { color: currentTheme?.textSecondary || '#718096' }]}>基礎練では選択済みレベルのみ表示されます。変更はここで行えます。</Text>
          </View>
        )}

        {/* 外観設定 */}
        {mode === 'appearance' && (
          <View style={[styles.settingsContainer, { backgroundColor: currentTheme?.surface || '#FFFFFF' }]}>
            <View style={styles.sectionHeader}>
              <Palette size={24} color={currentTheme?.primary || '#4A5568' } />
              <Text style={[styles.sectionTitle, { color: currentTheme?.text || '#2D3748' }]}>外観設定</Text>
            </View>
            <Text style={[styles.sectionDescription, { color: currentTheme?.textSecondary || '#718096' }]}>
              外観設定
            </Text>
            
            {/* テーマモード選択 */}
            <View style={styles.themeModeContainer}>
              <View style={styles.themeModeRow}>
                <View style={styles.themeModeInfo}>
                  <Text style={[styles.themeModeTitle, { color: currentTheme?.text }]}>
                    {useCustomTheme ? (() => {
                      const presetName = getCurrentPresetName();
                      return presetName || 'カスタム';
                    })() : (selectedInstrument && currentTheme?.name ? currentTheme.name : '楽器の自動テーマ')}
                  </Text>
                  <Text style={[styles.themeModeDescription, { color: currentTheme?.textSecondary || '#718096' }]}>
                    選択した楽器に応じて自動的にカラーテーマが変更されます
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.themeModeToggle,
                    useCustomTheme && { backgroundColor: currentTheme?.primary || '#4A5568' }
                  ]}
                  onPress={async () => {
                    const newValue = !useCustomTheme;
                    setUseCustomTheme(newValue);
                    if (!newValue) {
                      await resetToInstrumentTheme();
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.themeModeToggleText,
                    { color: useCustomTheme ? currentTheme?.surface || '#FFFFFF' : currentTheme?.text || '#2D3748' }
                  ]}>
                    {useCustomTheme ? 'カスタム' : '自動'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* プリセットカラーパレット */}
            <View style={styles.presetSection}>
              <Text style={[styles.presetTitle, { color: currentTheme?.text || '#2D3748' }]}>プリセットカラーパレット</Text>
              <View style={styles.presetGrid}>
                {presetPalettes.map((palette) => {
                  const isSelected = selectedPresetId === palette.id && useCustomTheme;
                  return React.createElement(TouchableOpacity, {
                    key: palette.id,
                    style: [
                      styles.presetButton,
                      { 
                        borderColor: isSelected ? currentTheme?.primary || '#4A5568' : currentTheme?.secondary || '#E2E8F0',
                        borderWidth: isSelected ? 2 : 1
                      }
                    ],
                    onPress: () => handlePresetSelect(palette),
                    activeOpacity: 0.7
                  },
                    React.createElement(View, { style: styles.presetColors },
                      React.createElement(View, { 
                        style: [styles.presetColor, { backgroundColor: palette.colors.primary }] 
                      }),
                      React.createElement(View, { 
                        style: [styles.presetColor, { backgroundColor: palette.colors.secondary }] 
                      }),
                      React.createElement(View, { 
                        style: [styles.presetColor, { backgroundColor: palette.colors.accent }] 
                      })
                    ),
                    React.createElement(Text, {
                      style: [styles.presetName, { color: currentTheme?.text || '#2D3748' }]
                    }, palette.name),
                    isSelected ? React.createElement(Text, {
                      style: [styles.presetCheckmark, { color: currentTheme?.primary || '#4A5568' }]
                    }, '✓') : null
                  );
                })}
              </View>
            </View>

            {/* カスタムカラー設定 */}
            {useCustomTheme && (
              <View style={styles.customSection}>
                <Text style={[styles.customTitle, { color: currentTheme?.text || '#2D3748' }]}>カスタムカラー設定</Text>
                
                <ColorPicker label="背景色" color={customColors.background} colorType="background" />
                <ColorPicker label="表面色" color={customColors.surface} colorType="surface" />
                <ColorPicker label="プライマリ色" color={customColors.primary} colorType="primary" />
                <ColorPicker label="セカンダリ色" color={customColors.secondary} colorType="secondary" />
                <ColorPicker label="アクセント色" color={customColors.accent} colorType="accent" />
                <ColorPicker label="テキスト色" color={customColors.text} colorType="text" />
                <ColorPicker label="サブテキスト色" color={customColors.textSecondary} colorType="textSecondary" />
                
                <View style={styles.customActions}>
                  <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: currentTheme?.primary || '#4A5568' }]}
                    onPress={handleSaveCustomTheme}
                    activeOpacity={0.7}
                  >
                    <Check size={20} color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>カスタムテーマを保存</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* リセットボタン */}
            <TouchableOpacity
              style={[styles.resetButton, { borderColor: currentTheme?.secondary || '#E2E8F0' }]}
              onPress={handleResetTheme}
              activeOpacity={0.7}
            >
              <Text style={[styles.resetButtonText, { color: currentTheme?.textSecondary || '#718096' }]}>
                楽器の自動テーマに戻す
              </Text>
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
    backgroundColor: '#F8F9FA',
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  contentContainer: {
    flex: 1,
  },
  settingsCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    ...createShadowStyle({
    shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  settingCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...createShadowStyle({
    shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    }),
  },
  settingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  settingDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  settingControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...createShadowStyle({
    shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    }),
  },
  controlButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  valueDisplay: {
    minWidth: 60,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    ...createShadowStyle({
    shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    }),
  },
  valueText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  tabContainer: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  tabScrollContent: {
    paddingHorizontal: 2,
    gap: 4,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1.5,
    minWidth: 70,
    justifyContent: 'center',
    ...createShadowStyle({
    shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    }),
  },
  tabButtonText: {
    fontSize: 11,
    fontWeight: '600',
  },
  settingsContainer: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    
    
    
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  settingButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  bpmAdjustContainer: {
    marginBottom: 20,
  },
  bpmAdjustControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 12,
  },
  bpmAdjustButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bpmAdjustButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  bpmDisplay: {
    fontSize: 24,
    fontWeight: '700',
    marginHorizontal: 20,
  },
  timeSignatureSettingContainer: {
    marginBottom: 20,
  },
  timeSignatureSettingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  timeSignatureSettingButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  timeSignatureSettingButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  subdivisionSettingContainer: {
    marginBottom: 20,
  },
  subdivisionSettingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  subdivisionSettingButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  subdivisionSettingButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  scalesContainer: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    
    
    
    elevation: 4,
  },
  scalesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  scalesToggle: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  scalesContent: {
    marginTop: 16,
  },
  startNoteContainer: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  startNoteLabel: {
    fontSize: 14,
    textAlign: 'center',
  },
  scalesSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  scalesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  scaleButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 80,
  },
  scaleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  scaleButtonName: {
    fontSize: 12,
  },
  // 楽器選択と演奏レベル用のスタイル
  sectionDescription: {
    fontSize: 14,
    marginBottom: 16,
    color: '#666666',
  },
  instrumentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  instrumentItem: {
    width: '23%',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 2,
    minHeight: 80,
    justifyContent: 'center',
    
    
    
    elevation: 3,
  },
  instrumentContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  instrumentEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  instrumentName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
    textAlign: 'center',
  },
  // 外観設定用のスタイル
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  themeModeContainer: {
    marginBottom: 24,
  },
  themeModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  themeModeInfo: {
    flex: 1,
  },
  themeModeTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  themeModeDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  themeModeToggle: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#8B4513',
    minWidth: 80,
    alignItems: 'center',
  },
  themeModeToggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  presetSection: {
    marginBottom: 24,
  },
  presetTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  presetButton: {
    width: '30%',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    alignItems: 'center',
    
    
    
    elevation: 3,
  },
  presetColors: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 4,
  },
  presetColor: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  presetName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  presetCheckmark: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
  },
  customSection: {
    marginBottom: 24,
  },
  customTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  colorPickerContainer: {
    marginBottom: 16,
  },
  colorPickerLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  colorPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  colorPreview: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  colorButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  colorButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  customActions: {
    marginTop: 20,
    gap: 12,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  changeInstrumentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
    marginTop: 16,
  },
  changeInstrumentButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resetButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: 20,
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  colorPreviewSection: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  colorPreviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  colorPreviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  colorPreviewItem: {
    alignItems: 'center',
    width: '30%',
  },
  colorPreviewBox: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginBottom: 6,
  },
  colorPreviewLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  instrumentNameEn: {
    fontSize: 10,
    textAlign: 'center',
  },
  levelContainer: {
    gap: 8,
    alignItems: 'center',
  },
  levelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    width: '92%',
    alignSelf: 'center',
  },
  levelContent: {
    flex: 1,
  },
  levelName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 0,
  },
  levelDescription: {
    fontSize: 12,
  },
  levelCheckmark: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
