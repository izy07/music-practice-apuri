import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import mobileAds, { RewardedAd, RewardedAdEventType, TestIds, MaxAdContentRating } from 'react-native-google-mobile-ads';
import logger from '@/lib/logger';

// リワード広告ユニットID（Android）
const ANDROID_REWARDED_UNIT_ID = 'ca-app-pub-4701955364298598/4929903134';
// iOS用は環境変数で注入（未設定なら本番で広告を出さない）
const IOS_REWARDED_UNIT_ID = process.env.EXPO_PUBLIC_ADMOB_IOS_REWARDED_UNIT_ID || '';

// AdMob初期化（リワード広告用）
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
      logger.debug('AdMob初期化が完了しました（リワード広告用）');
    } catch (e) {
      logger.warn('AdMob初期化に失敗しました（続行）:', e);
    }
  })();
  return initPromise;
};

interface RewardedAdModalProps {
  visible: boolean;
  onRewardEarned: () => void;
  onClose: () => void;
  onError?: (error: Error) => void;
}

/**
 * リワード広告モーダル（ネイティブ専用）
 * 
 * 使用例:
 * ```tsx
 * const [showAd, setShowAd] = useState(false);
 * 
 * <RewardedAdModal
 *   visible={showAd}
 *   onRewardEarned={() => {
 *     // 報酬を付与
 *     recordRewardedAdRecording(userId, instrumentId);
 *     setShowAd(false);
 *   }}
 *   onClose={() => setShowAd(false)}
 * />
 * ```
 */
export const RewardedAdModal: React.FC<RewardedAdModalProps> = ({
  visible,
  onRewardEarned,
  onClose,
  onError
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [rewardedAd, setRewardedAd] = useState<RewardedAd | null>(null);

  const adUnitId = (() => {
    if (__DEV__) return TestIds.REWARDED;
    if (Platform.OS === 'android') return ANDROID_REWARDED_UNIT_ID;
    if (Platform.OS === 'ios') return IOS_REWARDED_UNIT_ID;
    return '';
  })();

  useEffect(() => {
    if (!visible || !adUnitId) {
      return;
    }

    // リワード広告を読み込む
    const loadRewardedAd = async () => {
      try {
        setIsLoading(true);

        // AdMobの初期化を確実に行う
        await ensureAdsInitialized();

        const rewarded = RewardedAd.createForAdRequest(adUnitId, {
          requestNonPersonalizedAdsOnly: true,
        });

        // 広告読み込み完了
        rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
          logger.debug('リワード広告の読み込みが完了しました');
          setIsLoading(false);
        });

        // 広告エラー
        rewarded.addAdEventListener(RewardedAdEventType.ERROR, (error) => {
          logger.error('リワード広告エラー:', error);
          setIsLoading(false);
          if (onError) {
            onError(new Error(error.message || '広告の読み込みに失敗しました'));
          }
          onClose();
        });

        // 報酬獲得
        rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward) => {
          logger.info('リワード広告の報酬を獲得しました:', {
            type: reward.type,
            amount: reward.amount
          });
          onRewardEarned();
        });

        // 広告を表示
        rewarded.load();

        setRewardedAd(rewarded);

        // 広告が読み込まれたら自動的に表示
        const unsubscribeLoaded = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
          rewarded.show().catch((showError) => {
            logger.error('リワード広告の表示に失敗しました:', showError);
            setIsLoading(false);
            if (onError) {
              onError(new Error('広告の表示に失敗しました'));
            }
            onClose();
          });
        });

        return () => {
          unsubscribeLoaded();
          rewarded.removeAllListeners();
        };
      } catch (error) {
        logger.error('リワード広告の初期化エラー:', error);
        setIsLoading(false);
        if (onError) {
          onError(error instanceof Error ? error : new Error('広告の初期化に失敗しました'));
        }
        onClose();
      }
    };

    loadRewardedAd();
  }, [visible, adUnitId, onRewardEarned, onClose, onError]);

  // 広告ユニットIDが未設定の場合は非表示
  if (!adUnitId) {
    logger.warn('AdMobリワード広告のunitIdが未設定のため非表示にします', { platform: Platform.OS });
    return null;
  }

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {isLoading ? (
            <>
              <ActivityIndicator size="large" color="#1976D2" />
              <Text style={styles.loadingText}>広告を読み込んでいます...</Text>
            </>
          ) : (
            <>
              <Text style={styles.title}>広告を視聴中</Text>
              <Text style={styles.description}>広告を最後までご視聴いただくと、追加の録音が可能になります。</Text>
            </>
          )}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            disabled={isLoading}
          >
            <Text style={styles.closeButtonText}>閉じる</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 400,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  closeButton: {
    backgroundColor: '#E0E0E0',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
  },
});
