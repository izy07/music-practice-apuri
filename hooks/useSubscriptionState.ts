/**
 * サブスクリプション状態の実体（Provider 内でのみ使用）
 *
 * 各画面からは hooks/useSubscription → Context 経由で参照する。
 * ここで状態を持つのはアプリ全体で1インスタンスに限定する。
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { supabase } from '@/lib/supabase';
import { computeEntitlement, ensureSubscription, UserSubscription } from '@/lib/subscriptionService';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';

const getFallbackEntitlement = () => ({
  isEntitled: false,
  isTrial: false,
  isPremiumActive: false,
  daysLeftOnTrial: 0,
});

export type SubscriptionEntitlement = ReturnType<typeof getFallbackEntitlement>;

export const useSubscriptionState = () => {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [entitlement, setEntitlement] = useState(getFallbackEntitlement());
  const [error, setError] = useState<Error | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const previousEntitlementRef = useRef<{ isEntitled: boolean } | null>(null);
  const isRefreshingRef = useRef(false);
  /** 同時実行を1本にまとめ、認証・購読の多重取得を防ぐ */
  const loadInFlightRef = useRef<Promise<void> | null>(null);

  const loadSubscription = useCallback(async () => {
    if (loadInFlightRef.current) {
      await loadInFlightRef.current;
      return;
    }

    const run = (async () => {
      try {
        setError(null);
        setErrorMessage(null);

        // getSession はローカル優先で、不要な auth ネットワークを増やさない
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user ?? null;

        if (!user) {
          setSubscription(null);
          setEntitlement(getFallbackEntitlement());
          previousEntitlementRef.current = { isEntitled: false };
          return;
        }

        const forceRefresh = isRefreshingRef.current;
        const sub = await ensureSubscription(user.id, forceRefresh);
        isRefreshingRef.current = false;
        setSubscription(sub);

        const computedEntitlement = await computeEntitlement(sub);

        const previousEntitlement = previousEntitlementRef.current;
        if (previousEntitlement?.isEntitled === true && computedEntitlement.isEntitled === false) {
          logger.info('プレミアム解約を検知しました。全データを調整します。');
          try {
            const { adjustAllDataOnDowngrade } = await import('@/lib/subscriptionLimits');
            adjustAllDataOnDowngrade(user.id, computedEntitlement).catch((adjustError) => {
              logger.error('解約時の全データ調整中にエラーが発生しました（続行）:', adjustError);
            });
          } catch (adjustError) {
            logger.error('解約時の全データ調整の呼び出し中にエラーが発生しました（続行）:', adjustError);
          }
        }

        if (previousEntitlement?.isEntitled === false && computedEntitlement.isEntitled === true) {
          logger.info('プレミアム再課金を検知しました。非表示の曲を復元します。');
          try {
            const { restoreHiddenSongsOnUpgrade } = await import('@/lib/subscriptionLimits');
            restoreHiddenSongsOnUpgrade(user.id, computedEntitlement).catch((restoreError) => {
              logger.error('再課金時の曲復元中にエラーが発生しました（続行）:', restoreError);
            });
          } catch (restoreError) {
            logger.error('再課金時の曲復元の呼び出し中にエラーが発生しました（続行）:', restoreError);
          }
        }

        previousEntitlementRef.current = { isEntitled: computedEntitlement.isEntitled };
        setEntitlement(computedEntitlement);
      } catch (e: unknown) {
        isRefreshingRef.current = false;
        const errorObj = e instanceof Error ? e : new Error(String(e));
        logger.error('サブスクリプション情報の取得に失敗しました:', {
          error: errorObj,
          message: errorObj.message,
          stack: errorObj.stack,
        });
        ErrorHandler.handle(e, 'ensureSubscription', false);
        setError(errorObj);
        setErrorMessage(errorObj.message || 'サブスクリプション情報の取得に失敗しました');
        setSubscription(null);
        setEntitlement(getFallbackEntitlement());
      }
    })();

    loadInFlightRef.current = run;
    try {
      await run;
    } finally {
      loadInFlightRef.current = null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let timeoutId: ReturnType<typeof setTimeout>;
    
    (async () => {
      try {
        setLoading(true);
        
        // タイムアウトを設定（5秒）
        timeoutId = setTimeout(() => {
          if (mounted) {
            logger.warn('サブスクリプション読み込みがタイムアウトしました。フォールバックします。');
            setLoading(false);
            setSubscription(null);
            setEntitlement(getFallbackEntitlement());
          }
        }, 5000);
        
        await loadSubscription();
        
        // 成功した場合はタイムアウトをクリア
        clearTimeout(timeoutId);
      } catch (error) {
        logger.error('サブスクリプション読み込み中にエラーが発生しました:', error);
        // エラーが発生してもloadingをfalseにして起動を継続
      } finally {
        if (mounted) {
          clearTimeout(timeoutId);
          setLoading(false);
        }
      }
    })();
    
    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [loadSubscription]);

  const refresh = useCallback(async () => {
    try {
      isRefreshingRef.current = true;
      setLoading(true);
      await loadSubscription();
      logger.debug('サブスクリプション状態をリフレッシュしました');
    } catch (e: unknown) {
      isRefreshingRef.current = false;
      logger.error('サブスクリプション状態の更新中にエラーが発生しました', e);
      ErrorHandler.handle(e, 'refreshSubscription', false);
    } finally {
      setLoading(false);
    }
  }, [loadSubscription]);

  useEffect(() => {
    if (typeof AppState === 'undefined') return;

    const sub = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        logger.debug('アプリがフォアグラウンドに戻りました。サブスクリプション状態をリフレッシュします。');
        refresh().catch((err) => {
          logger.warn('フォアグラウンド復帰時のサブスクリプション状態リフレッシュに失敗しました（続行）:', err);
        });
      }
    });

    return () => sub.remove();
  }, [refresh]);

  return {
    subscription,
    entitlement,
    loading,
    refresh,
    error,
    errorMessage,
  };
};
