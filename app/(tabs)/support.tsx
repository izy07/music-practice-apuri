import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  Share,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ArrowLeft, 
  Heart, 
  Share2, 
  Star, 
  MessageSquare, 
  Twitter, 
  Instagram,
  Facebook,
  ChevronRight
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { safeGoBack } from '@/lib/navigationUtils';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import { createShadowStyle } from '@/lib/shadowStyles';

export default function SupportScreen() {
  const router = useRouter();
  const { currentTheme } = useInstrumentTheme();

  const goBack = () => {
    safeGoBack('/(tabs)/settings', true); // 強制的にsettings画面に戻る
  };

  const handleShare = async () => {
    try {
      const shareContent = {
        message: '楽器練習記録アプリで毎日の練習を記録しています！音楽の上達を実感できる素晴らしいアプリです。',
        url: 'https://music-practice.app', // 実際のアプリストアURLに変更
      };

      if (Platform.OS === 'web') {
        if (navigator.share) {
          await navigator.share(shareContent);
        } else {
          // Web環境でシェアがサポートされていない場合
          const text = `${shareContent.message} ${shareContent.url}`;
          await navigator.clipboard.writeText(text);
          Alert.alert('コピー完了', 'アプリの情報をクリップボードにコピーしました');
        }
      } else {
        await Share.share(shareContent);
      }
    } catch (error) {
      ErrorHandler.handle(error, 'シェア', true);
      Alert.alert('エラー', 'シェアに失敗しました');
    }
  };

  const handleReview = () => {
    const storeUrl = Platform.select({
      ios: 'https://apps.apple.com/app/id123456789', // 実際のApp Store URLに変更
      android: 'https://play.google.com/store/apps/details?id=com.musicpractice.app', // 実際のGoogle Play URLに変更
      web: 'https://apps.apple.com/app/id123456789', // Web環境ではApp Storeに誘導
    });

    if (storeUrl) {
      Linking.openURL(storeUrl).catch(() => {
        Alert.alert('エラー', 'ストアを開けませんでした');
      });
    }
  };

  const handleSNSShare = (platform: string) => {
    const message = encodeURIComponent('楽器練習記録アプリで毎日の練習を記録しています！音楽の上達を実感できる素晴らしいアプリです。');
    const url = encodeURIComponent('https://music-practice.app');
    
    let shareUrl = '';
    
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${message}&url=${url}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
        break;
      case 'instagram':
        // Instagramは直接リンクできないため、コピー機能を使用
        const instagramText = `楽器練習記録アプリで毎日の練習を記録しています！\n${url}`;
        if (Platform.OS === 'web' && navigator.clipboard) {
          navigator.clipboard.writeText(instagramText);
          Alert.alert('コピー完了', 'Instagramに投稿する内容をクリップボードにコピーしました');
        }
        return;
    }
    
    if (shareUrl) {
      Linking.openURL(shareUrl).catch(() => {
        Alert.alert('エラー', `${platform}を開けませんでした`);
      });
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} edges={[]}>
      {/* ヘッダー */}
      <View style={[styles.header, { borderBottomColor: currentTheme?.secondary || '#E0E0E0' }]}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <ArrowLeft size={24} color={currentTheme?.text || '#333333'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: currentTheme?.text || '#333333' }]}>
          フィードバックする
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* フィードバックする */}
        <View style={[styles.section, { backgroundColor: currentTheme?.surface || '#FFFFFF' }]}>
          <View style={styles.sectionHeader}>
            <MessageSquare size={20} color={currentTheme?.primary || '#1976D2'} />
            <Text style={[styles.sectionTitle, { color: currentTheme?.text || '#333333' }]}>
              フィードバックする
            </Text>
          </View>
          
          <TouchableOpacity
            style={[styles.actionButton, { borderColor: currentTheme?.primary || '#1976D2' }]}
            onPress={() => {
              const googleFormUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSeIhSRv5i5gHc7MZ8nLvS6hZtTQm7WEnE_ehgDbeP9XANJQ-A/viewform';
              Linking.openURL(googleFormUrl).catch(() => {
                Alert.alert('エラー', 'Googleフォームを開けませんでした');
              });
            }}
          >
            <MessageSquare size={20} color={currentTheme?.primary || '#1976D2'} />
            <View style={styles.actionButtonContent}>
              <Text style={[styles.actionButtonTitle, { color: currentTheme?.text || '#333333' }]}>
                フィードバックする
              </Text>
              <Text style={[styles.actionButtonSubtitle, { color: currentTheme?.textSecondary || '#666666' }]}>
                ご質問・ご要望をお聞かせください
              </Text>
            </View>
            <ChevronRight size={20} color={currentTheme?.textSecondary || '#999999'} />
          </TouchableOpacity>
        </View>

        {/* アプリを共有 */}
        <View style={[styles.section, { backgroundColor: currentTheme?.surface || '#FFFFFF' }]}>
          <View style={styles.sectionHeader}>
            <Share2 size={20} color={currentTheme?.primary || '#1976D2'} />
            <Text style={[styles.sectionTitle, { color: currentTheme?.text || '#333333' }]}>
              アプリを共有
            </Text>
          </View>
          
          <TouchableOpacity
            style={[styles.actionButton, { borderColor: currentTheme?.primary || '#1976D2' }]}
            onPress={handleShare}
          >
            <Share2 size={20} color={currentTheme?.primary || '#1976D2'} />
            <View style={styles.actionButtonContent}>
              <Text style={[styles.actionButtonTitle, { color: currentTheme?.text || '#333333' }]}>
                アプリをシェア
              </Text>
              <Text style={[styles.actionButtonSubtitle, { color: currentTheme?.textSecondary || '#666666' }]}>
                友達にアプリを紹介する
              </Text>
            </View>
            <ChevronRight size={20} color={currentTheme?.textSecondary || '#999999'} />
          </TouchableOpacity>

          <View style={styles.snsButtons}>
            <TouchableOpacity
              style={[styles.snsButton, { backgroundColor: '#1DA1F2' }]}
              onPress={() => handleSNSShare('twitter')}
            >
              <Twitter size={20} color="#FFFFFF" />
              <Text style={styles.snsButtonText}>Twitter</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.snsButton, { backgroundColor: '#4267B2' }]}
              onPress={() => handleSNSShare('facebook')}
            >
              <Facebook size={20} color="#FFFFFF" />
              <Text style={styles.snsButtonText}>Facebook</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.snsButton, { backgroundColor: '#E4405F' }]}
              onPress={() => handleSNSShare('instagram')}
            >
              <Instagram size={20} color="#FFFFFF" />
              <Text style={styles.snsButtonText}>Instagram</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* レビュー・ランキング */}
        <View style={[styles.section, { backgroundColor: currentTheme?.surface || '#FFFFFF' }]}>
          <View style={styles.sectionHeader}>
            <Star size={20} color={currentTheme?.primary || '#1976D2'} />
            <Text style={[styles.sectionTitle, { color: currentTheme?.text || '#333333' }]}>
              レビュー・ランキング
            </Text>
          </View>
          
          <TouchableOpacity
            style={[styles.actionButton, { borderColor: currentTheme?.primary || '#1976D2' }]}
            onPress={handleReview}
          >
            <Star size={20} color={currentTheme?.primary || '#1976D2'} />
            <View style={styles.actionButtonContent}>
              <Text style={[styles.actionButtonTitle, { color: currentTheme?.text || '#333333' }]}>
                App Storeでレビューする
              </Text>
              <Text style={[styles.actionButtonSubtitle, { color: currentTheme?.textSecondary || '#666666' }]}>
                5つ星評価をいただけると嬉しいです
              </Text>
            </View>
            <ChevronRight size={20} color={currentTheme?.textSecondary || '#999999'} />
          </TouchableOpacity>
        </View>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 16,
  },
  placeholder: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  messageSection: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 12,
    marginBottom: 16,
    ...createShadowStyle({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    }),
    elevation: 3,
  },
  messageTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  messageText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    borderRadius: 12,
    marginBottom: 16,
    ...createShadowStyle({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    }),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  actionButtonContent: {
    flex: 1,
  },
  actionButtonTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  actionButtonSubtitle: {
    fontSize: 14,
    lineHeight: 18,
  },
  snsButtons: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 8,
    gap: 12,
  },
  snsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  snsButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
