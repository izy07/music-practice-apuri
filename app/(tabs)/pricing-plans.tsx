import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CheckCircle2, Crown, ChevronRight } from 'lucide-react-native';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { useSubscription } from '@/hooks/useSubscription';
import { mockPurchase } from '@/lib/subscriptionService';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';

export default function PricingPlansScreen() {
  const router = useRouter();
  const { currentTheme } = useInstrumentTheme();
  const { entitlement } = useSubscription();
  
  const daysLeft = entitlement?.isTrial && typeof entitlement?.daysLeftOnTrial === 'number'
    ? Math.max(0, entitlement.daysLeftOnTrial)
    : 0;
  const handlePurchase = async (plan: 'premium_monthly' | 'premium_yearly') => {
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('エラー', 'ログインしてください');
        return;
      }
      await mockPurchase(user.id, plan);
      Alert.alert('完了', 'プレミアムが有効になりました。アプリを再起動してください。');
    } catch (e) {
      ErrorHandler.handle(e, '購入処理', true);
      Alert.alert('エラー', '購入処理に失敗しました');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} edges={[]}>
      {/* ヘッダー */}
      <View style={[styles.header, { borderBottomColor: currentTheme.secondary }]}>
        <TouchableOpacity onPress={() => router.push('/(tabs)/settings')} style={styles.backButton}>
          <Text style={[styles.backButtonText, { color: currentTheme.text }]}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: currentTheme.text }]}>料金プラン</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* ヒーロー */}
        <View style={[styles.hero, { backgroundColor: currentTheme.surface }]}>
          <Crown size={28} color={currentTheme.primary} />
          <Text style={[styles.heroTitle, { color: currentTheme.text }]}>あなたの練習を、もっと効率的に</Text>
          <Text style={[styles.heroSubtitle, { color: currentTheme.textSecondary }]}>最初の21日間は無料体験。以降は月額¥380 または年額¥4,000。</Text>
        </View>

        {/* プラン比較 */}
        <View style={styles.plansRow}>
          {/* Free / Trial */}
          <View style={[styles.planCard, { backgroundColor: currentTheme.surface, borderColor: currentTheme.secondary }]}> 
            <Text style={[styles.planName, { color: currentTheme.text }]}>{entitlement.isTrial ? 'トライアル（Free）' : 'Free'}</Text>
            <Text style={[styles.price, { color: currentTheme.text }]}> 
              ¥0<span style={{ fontSize: 12 }}>/月</span>
            </Text>
            <View style={styles.featureList}>
              {[
                '練習カレンダーの利用',
                '演奏録音機能（21日間のみ無料）',
                'タイマー機能',
                'チューナー機能',
                '共有機能',
                '音楽用語辞典',
              ].map((f) => (
                <View key={f} style={styles.featureItem}>
                  <CheckCircle2 size={16} color={currentTheme.primary} />
                  <Text style={[styles.featureText, { color: currentTheme.text }]}>{f}</Text>
                </View>
              ))}
            </View>
            <View style={[styles.ctaButton, { backgroundColor: currentTheme.secondary }]}>
              <Text style={[styles.ctaText, { color: currentTheme.primary }]}>
                {daysLeft > 0 ? `体験残り ${daysLeft} 日` : '無料で利用中'}
              </Text>
              <ChevronRight size={18} color={currentTheme.primary} />
            </View>
          </View>

          {/* Premium */}
          <View style={[styles.planCard, styles.planCardFeatured, { backgroundColor: currentTheme.surface, borderColor: currentTheme.primary }]}> 
            <Text style={[styles.planName, { color: currentTheme.text }]}>Premium</Text>
            <Text style={[styles.price, { color: currentTheme.primary }]}>
              ¥380<span style={{ fontSize: 12 }}>/月</span>
            </Text>
            <View style={styles.featureList}>
              {[
                '演奏録音機能無制限',
                '自動譜読み・スクロール機能',
                'マイライブラリ',
                '目標設定',
                'グラフ・統計分析',
              ].map((f) => (
                <View key={f} style={styles.featureItem}>
                  <CheckCircle2 size={16} color={currentTheme.primary} />
                  <Text style={[styles.featureText, { color: currentTheme.text }]}>{f}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity
              onPress={() => handlePurchase('premium_monthly')}
              style={[styles.ctaButton, { backgroundColor: currentTheme.primary }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.ctaText, { color: '#FFFFFF' }]}>プレミアムにアップグレード</Text>
              <ChevronRight size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 年額プラン */}
        <View style={[styles.planCard, { backgroundColor: currentTheme.surface, borderColor: currentTheme.primary, marginTop: 12 }]}> 
          <Text style={[styles.planName, { color: currentTheme.text }]}>Premium 年額</Text>
          <Text style={[styles.price, { color: currentTheme.primary }]}> 
            ¥4,000<span style={{ fontSize: 12 }}>/年</span>
          </Text>
          <View style={styles.featureList}>
            {['月額よりお得', '機能は月額と同じ'].map((f) => (
              <View key={f} style={styles.featureItem}>
                <CheckCircle2 size={16} color={currentTheme.primary} />
                <Text style={[styles.featureText, { color: currentTheme.text }]}>{f}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity
            onPress={() => handlePurchase('premium_yearly')}
            style={[styles.ctaButton, { backgroundColor: currentTheme.primary }]}
            activeOpacity={0.8}
          >
            <Text style={[styles.ctaText, { color: '#FFFFFF' }]}>年額でアップグレード</Text>
            <ChevronRight size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* 備考 */}
        <View style={[styles.noteBox, { backgroundColor: currentTheme.surface, borderColor: currentTheme.secondary }]}>
          <Text style={[styles.noteText, { color: currentTheme.textSecondary }]}>価格は税込・予告なく変更される場合があります。現在は開発用の模擬購入を使用しています。</Text>
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
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 60,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  hero: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  refreshBadge: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  refreshText: {
    fontSize: 12,
    fontWeight: '600',
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  plansRow: {
    flexDirection: 'row',
    gap: 12,
  },
  planCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  planCardFeatured: {
    borderWidth: 2,
  },
  planName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  price: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 12,
  },
  featureList: {
    gap: 8,
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 14,
  },
  ctaButton: {
    marginTop: 4,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '700',
  },
  noteBox: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  noteText: {
    fontSize: 12,
    lineHeight: 18,
  },
});


