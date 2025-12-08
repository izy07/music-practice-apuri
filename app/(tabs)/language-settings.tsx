import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Globe } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/components/LanguageContext';
import { safeGoBack } from '@/lib/navigationUtils';
import { saveLanguageSetting } from '@/lib/database';
import { supabase } from '@/lib/supabase';

// 多言語対応のテキスト
const getTexts = (lang: 'ja' | 'en') => ({
  title: lang === 'ja' ? '言語設定' : 'Language Settings',
  languageSelection: lang === 'ja' ? '言語選択' : 'Language Selection',
  languageDescription: lang === 'ja' ? 'アプリの表示言語を選択してください' : 'Select your preferred language',
  japanese: lang === 'ja' ? '日本語' : 'Japanese',
  english: lang === 'ja' ? 'English' : 'English',
  japaneseDesc: lang === 'ja' ? '日本語でアプリを使用' : 'Use app in Japanese',
  englishDesc: lang === 'ja' ? '英語でアプリを使用' : 'Use app in English',
  aboutTitle: lang === 'ja' ? '言語設定について' : 'About Language Settings',
  aboutText: lang === 'ja' 
    ? '言語を変更すると、アプリの表示言語が変更されます。設定は自動的に保存され、次回起動時にも適用されます。'
    : 'Changing the language will update the app\'s display language. Settings are automatically saved and will be applied on next launch.',
  error: lang === 'ja' ? 'エラー' : 'Error',
  warning: lang === 'ja' ? '警告' : 'Warning',
  success: lang === 'ja' ? '言語変更' : 'Language Changed',
  successMessage: lang === 'ja' ? '日本語に変更しました！' : 'Language changed to English!',
  errorMessages: {
    userNotFound: lang === 'ja' ? 'ユーザー情報が取得できませんでした' : 'Could not retrieve user information',
    saveFailed: lang === 'ja' ? 'データベースへの保存に失敗しましたが、言語は変更されます' : 'Failed to save to database, but language will be changed',
    changeFailed: lang === 'ja' ? '言語の変更に失敗しました' : 'Failed to change language'
  }
});

export default function LanguageSettingsScreen() {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [isLoading, setIsLoading] = useState(false);
  
  // フォールバックテーマを定義
  const fallbackTheme = {
    background: '#F7FAFC',
    surface: '#FFFFFF',
    primary: '#2D3748',
    secondary: '#E2E8F0',
    accent: '#2D3748',
    text: '#2D3748',
    textSecondary: '#718096',
  };

  const texts = getTexts(selectedLanguage);

  const languages = [
    { 
      id: 'ja' as const, 
      name: texts.japanese, 
      nameEn: 'Japanese', 
      description: texts.japaneseDesc 
    },
    { 
      id: 'en' as const, 
      name: texts.english, 
      nameEn: 'English', 
      description: texts.englishDesc 
    },
  ];

  const handleLanguageChange = useCallback(async (newLanguage: 'ja' | 'en') => {
    if (isLoading) return;
    
    setSelectedLanguage(newLanguage);
    setIsLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert(texts.error, texts.errorMessages.userNotFound);
        return;
      }

      const { error: dbError } = await saveLanguageSetting(user.id, newLanguage);
      if (dbError) {
        Alert.alert(texts.warning, texts.errorMessages.saveFailed);
      }

      await setLanguage(newLanguage);
    } catch (error) {
      Alert.alert(texts.error, texts.errorMessages.changeFailed);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, texts, setLanguage]);

  const goBack = useCallback(() => {
    safeGoBack('/(tabs)/settings', true); // 強制的にsettings画面に戻る
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: fallbackTheme.background }]} >
      
      <View style={[styles.header, { 
        borderBottomColor: fallbackTheme.secondary,
        backgroundColor: fallbackTheme.background 
      }]}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <ArrowLeft size={24} color={fallbackTheme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: fallbackTheme.text }]}>
          {texts.title}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Language Selection Section */}
        <View style={[styles.section, { backgroundColor: fallbackTheme.surface }]}>
          <View style={styles.sectionHeader}>
            <Globe size={20} color={fallbackTheme.primary} />
            <Text style={[styles.sectionTitle, { color: fallbackTheme.text }]}>
              {texts.languageSelection}
            </Text>
          </View>
          <Text style={[styles.sectionDescription, { color: fallbackTheme.textSecondary }]}>
            {texts.languageDescription}
          </Text>
          <View style={styles.languageContainer}>
            {languages.map((lang) => 
              React.createElement(TouchableOpacity, {
                key: lang.id,
                style: [
                  styles.languageItem,
                  {
                    backgroundColor: selectedLanguage === lang.id 
                      ? fallbackTheme.primary 
                      : fallbackTheme.background,
                    borderColor: selectedLanguage === lang.id 
                      ? fallbackTheme.primary 
                      : fallbackTheme.secondary,
                  }
                ],
                onPress: () => handleLanguageChange(lang.id),
                activeOpacity: 0.7
              },
                React.createElement(View, { style: styles.languageContent },
                  React.createElement(Text, {
                    style: [
                      styles.languageName,
                      { color: selectedLanguage === lang.id 
                        ? fallbackTheme.surface 
                        : fallbackTheme.text 
                      }
                    ]
                  }, lang.name),
                  React.createElement(Text, {
                    style: [
                      styles.languageNameEn,
                      { color: selectedLanguage === lang.id 
                        ? fallbackTheme.surface 
                        : fallbackTheme.textSecondary 
                      }
                    ]
                  }, lang.nameEn),
                  React.createElement(Text, {
                    style: [
                      styles.languageDescription,
                      { color: selectedLanguage === lang.id 
                        ? fallbackTheme.surface 
                        : fallbackTheme.textSecondary 
                      }
                    ]
                  }, lang.description)
                ),
                selectedLanguage === lang.id ? 
                  React.createElement(View, { 
                    style: [styles.languageCheckmark, { backgroundColor: fallbackTheme.accent }] 
                  },
                    React.createElement(Text, { style: styles.checkmarkText }, '✓')
                  ) : null
              )
            )}
          </View>
        </View>

        <View style={[styles.infoSection, { backgroundColor: fallbackTheme.surface }]}>
          <Text style={[styles.infoTitle, { color: fallbackTheme.text }]}>
            {texts.aboutTitle}
          </Text>
          <Text style={[styles.infoText, { color: fallbackTheme.textSecondary }]}>
            {texts.aboutText}
          </Text>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 16,
  },
  languageContainer: {
    gap: 12,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    minHeight: 80,
  },
  languageContent: {
    flex: 1,
  },
  languageName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  languageNameEn: {
    fontSize: 14,
    marginBottom: 4,
  },
  languageDescription: {
    fontSize: 14,
  },
  languageCheckmark: {
    width: 24,
   height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoSection: {
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    elevation: 4,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
