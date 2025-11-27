/**
 * プライバシー設定画面
 * - 個人情報保護法に基づく設定項目
 * - 個人情報保護管理者の連絡先
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Mail, Shield, FileText, Trash2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import InstrumentHeader from '@/components/InstrumentHeader';
import { safeGoBack } from '@/lib/navigationUtils';

export default function PrivacySettingsScreen() {
  const router = useRouter();
  const { currentTheme } = useInstrumentTheme();

  const goBack = () => {
    safeGoBack('/(tabs)/settings', true); // 強制的にsettings画面に戻る
  };

  const handlePrivacyPolicy = () => {
    router.push('/privacy-policy');
  };

  const handleTermsOfService = () => {
    router.push('/(tabs)/terms-of-service');
  };

  const handleContactPrivacyManager = () => {
    const email = 'app.gakki@gmail.com';
    const subject = '個人情報に関するお問い合わせ';
    const body = '個人情報に関するお問い合わせ内容をこちらにご記入ください。';
    
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert('エラー', 'メールアプリが利用できません');
      }
    });
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'アカウント削除',
      'アカウントを削除すると、すべてのデータが永久に削除されます。この操作は取り消せません。\n\n続行しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: '削除する', 
          style: 'destructive',
          onPress: () => {
            // アカウント削除の処理は問い合わせ先に誘導
            handleContactPrivacyManager();
          }
        }
      ]
    );
  };


  if (!currentTheme) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} edges={[]}>
        <Text>テーマの読み込み中...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} edges={[]}>
      <InstrumentHeader />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: currentTheme.surface, borderBottomColor: currentTheme.secondary }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={goBack}
          activeOpacity={0.6}
        >
          <ArrowLeft size={24} color={currentTheme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: currentTheme.text }]}>プライバシー設定</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* 法的情報 */}
        <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
          <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>法的情報</Text>
          
          <TouchableOpacity
            style={[styles.linkButton, { borderColor: currentTheme.secondary }]}
            onPress={handleTermsOfService}
          >
            <FileText size={20} color={currentTheme.primary} />
            <View style={styles.linkButtonContent}>
              <Text style={[styles.linkButtonTitle, { color: currentTheme.text }]}>利用規約</Text>
              <Text style={[styles.linkButtonDescription, { color: currentTheme.textSecondary }]}>
                サービス利用に関する規約
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.linkButton, { borderColor: currentTheme.secondary }]}
            onPress={handlePrivacyPolicy}
          >
            <Shield size={20} color={currentTheme.primary} />
            <View style={styles.linkButtonContent}>
              <Text style={[styles.linkButtonTitle, { color: currentTheme.text }]}>プライバシーポリシー</Text>
              <Text style={[styles.linkButtonDescription, { color: currentTheme.textSecondary }]}>
                個人情報の取り扱いについて
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* お問い合わせ */}
        <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
          <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>お問い合わせ</Text>
          <Text style={[styles.sectionDescription, { color: currentTheme.textSecondary }]}>
            プライバシーや個人情報に関するご質問・ご要望は、こちらからお問い合わせください。
          </Text>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: currentTheme.primary }]}
            onPress={handleContactPrivacyManager}
          >
            <Mail size={16} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>お問い合わせ</Text>
          </TouchableOpacity>
        </View>

        {/* データの管理 */}
        <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
          <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>データの管理</Text>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#F44336' }]}
            onPress={handleDeleteAccount}
          >
            <Trash2 size={16} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>アカウントを削除</Text>
          </TouchableOpacity>
          
          <Text style={[styles.sectionDescription, { color: currentTheme.textSecondary, marginTop: 12 }]}>
            アカウントを削除すると、すべてのデータが永久に削除されます。個人情報の開示・訂正・削除に関するご要望は、お問い合わせ先までご連絡ください。
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
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  linkButtonContent: {
    marginLeft: 12,
    flex: 1,
  },
  linkButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  linkButtonDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
});