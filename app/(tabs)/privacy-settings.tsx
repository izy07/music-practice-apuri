/**
 * プライバシー設定画面
 * - 個人情報保護法に基づく設定項目
 * - 個人情報保護管理者の連絡先
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Mail, Shield, FileText, Trash2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import InstrumentHeader from '@/components/InstrumentHeader';
import { safeGoBack } from '@/lib/navigationUtils';
import { createShadowStyle } from '@/lib/shadowStyles';
import { supabase } from '@/lib/supabase';
import { useAuthAdvanced } from '@/hooks/useAuthAdvanced';
import logger from '@/lib/logger';

export default function PrivacySettingsScreen() {
  const router = useRouter();
  const { currentTheme } = useInstrumentTheme();
  const { signOut } = useAuthAdvanced();
  const [isDeleting, setIsDeleting] = useState(false);

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
    logger.info('[PrivacySettings] アカウント削除ボタンが押されました');
    
    // Web環境ではconfirmを使用
    if (typeof window !== 'undefined' && window.confirm) {
      const firstConfirm = window.confirm(
        'アカウントを削除すると、すべてのデータが永久に削除されます。\n\nこの操作は取り消せません。本当に削除しますか？'
      );
      
      if (!firstConfirm) {
        logger.info('[PrivacySettings] 1回目の確認でキャンセルされました');
        return;
      }
      
      const secondConfirm = window.confirm(
        '最終確認\n\nアカウントを削除すると、以下のデータがすべて永久に削除されます：\n\n• プロフィール情報\n• 練習記録\n• 目標設定\n• 録音データ\n• その他すべてのデータ\n\nこの操作は取り消せません。本当に削除しますか？'
      );
      
      if (!secondConfirm) {
        logger.info('[PrivacySettings] 2回目の確認でキャンセルされました');
        return;
      }
      
      logger.info('[PrivacySettings] 2回の確認が完了、削除処理を開始');
      performAccountDeletion();
      return;
    }
    
    // ネイティブ環境ではAlertを使用
    // 1回目の確認
    Alert.alert(
      'アカウント削除の確認',
      'アカウントを削除すると、すべてのデータが永久に削除されます。\n\nこの操作は取り消せません。本当に削除しますか？',
      [
        { 
          text: 'キャンセル', 
          style: 'cancel',
          onPress: () => {
            logger.info('[PrivacySettings] 1回目の確認でキャンセルされました');
          }
        },
        { 
          text: '削除する', 
          style: 'destructive',
          onPress: () => {
            logger.info('[PrivacySettings] 1回目の確認で削除が選択されました');
            // 2回目の確認
            Alert.alert(
              '最終確認',
              'アカウントを削除すると、以下のデータがすべて永久に削除されます：\n\n• プロフィール情報\n• 練習記録\n• 目標設定\n• 録音データ\n• その他すべてのデータ\n\nこの操作は取り消せません。本当に削除しますか？',
              [
                { 
                  text: 'キャンセル', 
                  style: 'cancel',
                  onPress: () => {
                    logger.info('[PrivacySettings] 2回目の確認でキャンセルされました');
                  }
                },
                { 
                  text: 'はい、削除します', 
                  style: 'destructive',
                  onPress: () => {
                    logger.info('[PrivacySettings] 2回目の確認で削除が選択されました、削除処理を開始');
                    performAccountDeletion();
                  }
                }
              ]
            );
          }
        }
      ]
    );
  };

  const performAccountDeletion = async () => {
    if (isDeleting) return;
    
    setIsDeleting(true);
    
    try {
      logger.info('[PrivacySettings] アカウント削除処理を開始');
      
      // データベース関数を呼び出してユーザーデータを削除
      const { error: deleteError } = await supabase.rpc('delete_user_account');
      
      if (deleteError) {
        logger.error('[PrivacySettings] アカウント削除エラー:', deleteError);
        Alert.alert(
          'エラー',
          'アカウント削除中にエラーが発生しました。\n\nお問い合わせ先までご連絡ください。',
          [
            { text: 'OK', onPress: () => handleContactPrivacyManager() }
          ]
        );
        setIsDeleting(false);
        return;
      }
      
      logger.info('[PrivacySettings] ユーザーデータの削除が完了');
      
      // ログアウト処理
      await signOut();
      
      // 成功メッセージを表示（ログアウト後は表示されない可能性があるため、先に表示）
      Alert.alert(
        'アカウント削除完了',
        'アカウントとすべてのデータが削除されました。\n\nご利用ありがとうございました。',
        [
          { 
            text: 'OK', 
            onPress: () => {
              // ログアウト後は自動的に認証画面に遷移する
            }
          }
        ]
      );
      
    } catch (error: any) {
      logger.error('[PrivacySettings] アカウント削除例外:', error);
      Alert.alert(
        'エラー',
        'アカウント削除中にエラーが発生しました。\n\nお問い合わせ先までご連絡ください。',
        [
          { text: 'OK', onPress: () => handleContactPrivacyManager() }
        ]
      );
      setIsDeleting(false);
    }
  };


  if (!currentTheme) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} >
        <Text>テーマの読み込み中...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} >
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
        keyboardShouldPersistTaps="handled"
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
            style={[
              styles.actionButton, 
              { 
                backgroundColor: isDeleting ? '#999999' : '#F44336',
                opacity: isDeleting ? 0.6 : 1
              }
            ]}
            onPress={() => {
              logger.info('[PrivacySettings] アカウント削除ボタンがタップされました');
              handleDeleteAccount();
            }}
            disabled={isDeleting}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {isDeleting ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.actionButtonText}>削除中...</Text>
              </>
            ) : (
              <>
                <Trash2 size={16} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>アカウントを削除</Text>
              </>
            )}
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
    ...createShadowStyle({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    }),
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
    minHeight: 44, // タッチしやすい最小サイズ
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