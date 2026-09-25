import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CheckCircle2, Crown, ChevronRight } from 'lucide-react-native';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { useSubscription } from '@/hooks/useSubscription';
import { purchaseSubscription, switchToFreePlan } from '@/lib/subscriptionService';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import { trackFeatureAction } from '@/lib/featureUsageService';
import { FEATURE_IDS } from '@/lib/featureUsageEvents';
import { getInstrumentId } from '@/lib/instrumentUtils';

export default function PricingPlansScreen() {
  const router = useRouter();
  const { currentTheme, selectedInstrument } = useInstrumentTheme();
  const { entitlement, refresh } = useSubscription();
  const [isSwitchingToFree, setIsSwitchingToFree] = useState(false);
  const isPremium = entitlement.isEntitled;

  const handleSwitchToFree = () => {
    Alert.alert(
      '無料プランに切り替え',
      'プレミアムの機能制限が再び適用されます（楽器数・録音回数・目標数など）。\n\n切り替えますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '無料プランに切り替え',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setIsSwitchingToFree(true);
              try {
                const { supabase } = await import('@/lib/supabase');
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                  Alert.alert('エラー', 'ログインしてください');
                  return;
                }

                await switchToFreePlan(user.id);

                void trackFeatureAction(
                  user.id,
                  FEATURE_IDS.pricingPlans,
                  'switch_to_free',
                  { platform: Platform.OS },
                  getInstrumentId(selectedInstrument)
                );

                await refresh();
                Alert.alert('無料プランに切り替わりました', 'フリープランの制限が適用されます。');
              } catch (e) {
                logger.error('無料プラン切り替えエラー:', e);
                ErrorHandler.handle(e, '無料プラン切り替え', true);
                Alert.alert('エラー', '無料プランへの切り替えに失敗しました。もう一度お試しください。');
              } finally {
                setIsSwitchingToFree(false);
              }
            })();
          },
        },
      ]
    );
  };

  const handlePurchase = async (plan: 'premium_monthly' | 'premium_yearly') => {
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('エラー', 'ログインしてください');
        return;
      }
      
      logger.debug('購入処理開始:', { plan, userId: user.id });
      await purchaseSubscription(user.id, plan);
      logger.debug('購入処理成功');

      void trackFeatureAction(
        user.id,
        FEATURE_IDS.pricingPlans,
        'purchase',
        { platform: Platform.OS, plan },
        getInstrumentId(selectedInstrument)
      );

      try {
        await refresh();
      } catch (refreshError) {
        logger.warn('サブスクリプション状態のリフレッシュに失敗しました（続行）:', refreshError);
      }
      Alert.alert('プレミアムに切り替わりました', '制限が解除されました。');
    } catch (e) {
      // エラーを適切に記録
      const errorMessage = e instanceof Error ? e.message : String(e);
      logger.error('購入処理エラー:', {
        error: e,
        message: errorMessage,
        plan
      });
      ErrorHandler.handle(e, '購入処理', true);
      
      // ユーザーに詳細なエラーメッセージを表示
      const userFriendlyMessage = e instanceof Error 
        ? (e.message || '購入処理に失敗しました')
        : '購入処理に失敗しました';
      
      Alert.alert(
        'エラー',
        `${userFriendlyMessage}\n\nもう一度お試しください。問題が続く場合は、アプリを再起動してください。`,
        [
          { text: '了解', style: 'default' },
          { 
            text: '再試行', 
            onPress: () => handlePurchase(plan),
            style: 'default'
          }
        ]
      );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} >
      {/* ヘッダー */}
      <View style={[styles.header, { borderBottomColor: currentTheme.secondary }]}>
        <TouchableOpacity onPress={() => router.push('/(tabs)/settings')} style={styles.backButton}>
          <Text style={[styles.backButtonText, { color: currentTheme.text }]}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: currentTheme.text }]}>料金プラン</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ヒーロー */}
        <View style={[styles.hero, { backgroundColor: currentTheme.surface }]}>
          <Crown size={28} color={currentTheme.primary} />
          <Text style={[styles.heroTitle, { color: currentTheme.text }]}>練習を、もっと効率的に</Text>
          <Text style={[styles.heroSubtitle, { color: currentTheme.textSecondary }]}>月額¥290（年額¥2,900）で全ての機能が無制限</Text>
        </View>

        {/* プラン比較 */}
        <View style={styles.plansRow}>
          {/* Free */}
          <View style={[styles.planCard, { backgroundColor: currentTheme.surface, borderColor: !isPremium ? currentTheme.primary : currentTheme.secondary, borderWidth: !isPremium ? 2 : 1 }]}> 
            <View style={styles.planNameRow}>
              <Text style={[styles.planName, { color: currentTheme.text, marginBottom: 0 }]}>Free</Text>
              {!isPremium ? (
                <View style={[styles.currentPlanBadge, { backgroundColor: `${currentTheme.primary}20` }]}>
                  <Text style={[styles.currentPlanBadgeText, { color: currentTheme.primary }]}>利用中</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.price, { color: currentTheme.text, marginBottom: 6 }]}> 
              ¥0<span style={{ fontSize: 12 }}>/月</span>
            </Text>
            <View style={[styles.featureList, { marginBottom: 4, gap: 6 }]}>
              {[
                '演奏録音機能（1日一回3分まで月3回）',
                '楽器データ（2個まで使用可能）',
                'マイライブラリ（10曲まで）',
                '目標設定（2つまで）',
              ].map((f) => (
                <View key={f} style={[styles.featureItem, { gap: 6 }]}>
                  <CheckCircle2 size={16} color={currentTheme.primary} />
                  <Text style={[styles.featureText, { color: currentTheme.text }]}>{f}</Text>
                </View>
              ))}
            </View>
            {isPremium ? (
              <TouchableOpacity
                onPress={handleSwitchToFree}
                disabled={isSwitchingToFree}
                style={[styles.secondaryCtaButton, { borderColor: currentTheme.textSecondary }]}
                activeOpacity={0.8}
              >
                {isSwitchingToFree ? (
                  <ActivityIndicator size="small" color={currentTheme.textSecondary} />
                ) : (
                  <Text style={[styles.secondaryCtaText, { color: currentTheme.textSecondary }]}>
                    無料プランに切り替え
                  </Text>
                )}
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Premium */}
          <View style={[styles.planCard, styles.planCardFeatured, { backgroundColor: currentTheme.surface, borderColor: currentTheme.primary }]}> 
            <View style={styles.planNameRow}>
              <Text style={[styles.planName, { color: currentTheme.text, marginBottom: 0 }]}>Premium</Text>
              {isPremium ? (
                <View style={[styles.currentPlanBadge, { backgroundColor: `${currentTheme.primary}20` }]}>
                  <Text style={[styles.currentPlanBadgeText, { color: currentTheme.primary }]}>利用中</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.price, { color: currentTheme.primary }]}>
              ¥290<span style={{ fontSize: 12 }}>/月</span>
            </Text>
            <View style={styles.featureList}>
              {[
                '全ての機能が無制限で利用可能',
                '演奏録音機能（一日に2個、60分まで）',
                '広告削除',
              ].map((f) => (
                <View key={f} style={styles.featureItem}>
                  <CheckCircle2 size={16} color={currentTheme.primary} />
                  <Text style={[styles.featureText, { color: currentTheme.text }]}>{f}</Text>
                </View>
              ))}
            </View>
            {!isPremium ? (
              <TouchableOpacity
                onPress={() => handlePurchase('premium_monthly')}
                style={[styles.ctaButton, { backgroundColor: currentTheme.primary }]}
                activeOpacity={0.8}
              >
                <Text style={[styles.ctaText, { color: '#FFFFFF' }]}>プレミアムにアップグレード</Text>
                <ChevronRight size={18} color="#FFFFFF" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* 年額プラン */}
        {!isPremium ? (
        <View style={[styles.planCard, { backgroundColor: currentTheme.surface, borderColor: currentTheme.primary, marginTop: 12 }]}> 
          <Text style={[styles.planName, { color: currentTheme.text }]}>Premium 年額</Text>
          <Text style={[styles.price, { color: currentTheme.primary }]}> 
            ¥2,900<span style={{ fontSize: 12 }}>/年</span>
            <Text style={{ fontSize: 12, color: currentTheme.textSecondary }}>（月額換算¥242）</Text>
          </Text>
          <View style={styles.featureList}>
            {[
              '全ての機能が無制限で利用可能',
              '演奏録音機能（一日に2個、60分まで）',
              '広告削除',
            ].map((f) => (
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
        ) : null}

        {isPremium ? (
          <TouchableOpacity
            onPress={handleSwitchToFree}
            disabled={isSwitchingToFree}
            style={[styles.freeSwitchButton, { borderColor: currentTheme.textSecondary, backgroundColor: currentTheme.surface }]}
            activeOpacity={0.8}
          >
            {isSwitchingToFree ? (
              <ActivityIndicator size="small" color={currentTheme.textSecondary} />
            ) : (
              <Text style={[styles.freeSwitchButtonText, { color: currentTheme.textSecondary }]}>
                無料プランに切り替える
              </Text>
            )}
          </TouchableOpacity>
        ) : null}

        {/* 重要事項 */}
        <View style={[styles.noteBox, { backgroundColor: `${currentTheme.primary}10`, borderColor: currentTheme.primary }]}>
          <Text style={[styles.noteTitle, { color: currentTheme.text }]}>重要事項</Text>
          <Text style={[styles.noteText, { color: currentTheme.textSecondary, marginTop: 8 }]}>
            • サブスクリプションは自動更新されます。{'\n'}
            • 自動更新を停止するには、購入後24時間以内にApp StoreまたはGoogle Playの設定からキャンセルできます。{'\n'}
            • 現在の期間終了の少なくとも24時間前までにキャンセルしない限り、サブスクリプションは自動的に更新されます。{'\n'}
            • キャンセル後も、現在の期間が終了するまでサービスをご利用いただけます。{'\n'}
            • 価格は税込・予告なく変更される場合があります。
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
  scrollContent: {
    paddingBottom: 165, // タブバーの高さ + 広告バナー分 + 余裕
  },
  hero: {
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
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
    overflow: 'hidden',
  },
  planCardFeatured: {
    borderWidth: 2,
  },
  planNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  planName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  currentPlanBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  currentPlanBadgeText: {
    fontSize: 11,
    fontWeight: '700',
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
    alignItems: 'flex-start',
    gap: 8,
    width: '100%',
  },
  featureText: {
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  ctaButton: {
    marginTop: 4,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    width: '100%',
    maxWidth: '100%',
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
  },
  secondaryCtaButton: {
    marginTop: 4,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  secondaryCtaText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  freeSwitchButton: {
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  freeSwitchButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  noteBox: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  noteText: {
    fontSize: 12,
    lineHeight: 18,
  },
});




