import React, { useEffect, useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import mobileAds, {
  BannerAd,
  BannerAdSize,
  MaxAdContentRating,
  TestIds,
} from 'react-native-google-mobile-ads';
import { useSubscription } from '@/hooks/useSubscription';
import logger from '@/lib/logger';

// 既存UIがタブバー分のpaddingBottom(65)を持っているため、まずはこの値に合わせる
const TAB_BAR_HEIGHT = 65;

// アプリID（Android）は app.config.ts の config plugin に設定済み
const ANDROID_BANNER_UNIT_ID = 'ca-app-pub-4701955364298598/9604942480';
// iOS用は環境変数で注入（未設定なら本番で広告を出さない）
const IOS_BANNER_UNIT_ID = process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_UNIT_ID || '';

let initPromise: Promise<void> | null = null;
const ensureAdsInitialized = async (): Promise<void> => {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      // 子ども向け（COPPA/年齢同意） + コンテンツレーティングを厳しめに
      await mobileAds().setRequestConfiguration({
        maxAdContentRating: MaxAdContentRating.G,
        tagForChildDirectedTreatment: true,
        tagForUnderAgeOfConsent: true,
        testDeviceIdentifiers: __DEV__ ? ['EMULATOR'] : [],
      });
      await mobileAds().initialize();
    } catch (e) {
      logger.warn('AdMob初期化に失敗しました（続行）:', e);
    }
  })();
  return initPromise;
};

/**
 * タブバーの上に固定表示するバナー広告（Android/iOS）。
 * - プレミアムユーザーには表示しない（広告を出さない想定）
 */
export const BottomBannerAd: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { entitlement, loading } = useSubscription();

  const shouldShow = useMemo(() => {
    if (loading) return false;
    return !entitlement.isEntitled;
  }, [entitlement.isEntitled, loading]);

  useEffect(() => {
    if (!shouldShow) return;
    ensureAdsInitialized().catch(() => {});
  }, [shouldShow]);

  if (!shouldShow) return null;

  const adUnitId = (() => {
    if (__DEV__) return TestIds.BANNER;
    if (Platform.OS === 'android') return ANDROID_BANNER_UNIT_ID;
    if (Platform.OS === 'ios') return IOS_BANNER_UNIT_ID;
    return '';
  })();

  if (!adUnitId) {
    // iOSの本番ユニットID未設定など。クラッシュは避けて非表示にする。
    logger.warn('AdMobバナーのunitIdが未設定のため非表示にします', { platform: Platform.OS });
    return null;
  }

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.container,
        {
          bottom: TAB_BAR_HEIGHT + (insets.bottom || 0),
        },
      ]}
    >
      <View style={styles.inner}>
        <BannerAd
          unitId={adUnitId}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999,
  },
  inner: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

