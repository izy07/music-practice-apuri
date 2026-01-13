import { useEffect, useState, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { supabase } from '@/lib/supabase';
import { computeEntitlement, ensureSubscription, getSubscription, UserSubscription } from '@/lib/subscriptionService';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
// adjustAllDataOnDowngradeは動的インポートで使用（解約検知時のみ）

/**
 * サブスクリプション機能のフォールバック（エラー時でもアプリが動作するように）
 */
const getFallbackEntitlement = () => {
  return { isEntitled: false, isTrial: false, isPremiumActive: false, daysLeftOnTrial: 0 };
};

/**
 * サブスクリプション状態を管理するフック
 * 
 * エラー時は適切にエラーを表示し、ユーザーに再試行を促す
 */
export const useSubscription = () => {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [entitlement, setEntitlement] = useState({ isEntitled: false, isTrial: false, isPremiumActive: false, daysLeftOnTrial: 0 });
  const [error, setError] = useState<Error | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // 前回のentitlement状態を保持（解約検知用）
  const previousEntitlementRef = useRef<{ isEntitled: boolean } | null>(null);
  // リフレッシュフラグ（強制的に最新データを取得するかどうか）
  const isRefreshingRef = useRef<boolean>(false);

  const loadSubscription = useCallback(async () => {
    try {
      setError(null);
      setErrorMessage(null);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // 未認証ユーザーはデフォルトのエンタイトルメント（アクセス不可）
        setSubscription(null);
        setEntitlement({ isEntitled: false, isTrial: false, isPremiumActive: false, daysLeftOnTrial: 0 });
        return;
      }

      // サブスクリプション情報を取得（エラー時は適切にスローされる）
      // refreshが呼ばれた場合は、強制的に最新データを取得
      const sub = await ensureSubscription(user.id, isRefreshingRef.current);
      if (isRefreshingRef.current) {
        isRefreshingRef.current = false; // フラグをリセット
      }
      setSubscription(sub);
      
      // エンタイトルメントを計算
      const computedEntitlement = await computeEntitlement(sub);
      
      // 解約を検知（プレミアムからフリープランに変更された場合）
      const previousEntitlement = previousEntitlementRef.current;
      if (previousEntitlement?.isEntitled === true && computedEntitlement.isEntitled === false) {
        logger.info('プレミアム解約を検知しました。全データを調整します。');
        try {
          // 解約時の全データ調整を実行（非同期、エラーは無視）
          // 目標、録音、楽曲を並列で調整
          const { adjustAllDataOnDowngrade } = await import('@/lib/subscriptionLimits');
          adjustAllDataOnDowngrade(user.id, computedEntitlement).catch((adjustError) => {
            logger.error('解約時の全データ調整中にエラーが発生しました（続行）:', adjustError);
          });
        } catch (adjustError) {
          logger.error('解約時の全データ調整の呼び出し中にエラーが発生しました（続行）:', adjustError);
        }
      }
      
      // 前回の状態を更新
      previousEntitlementRef.current = { isEntitled: computedEntitlement.isEntitled };
      
      setEntitlement(computedEntitlement);
    } catch (e: unknown) {
      // エラーを適切に記録し、ユーザーに表示する
      const errorObj = e instanceof Error ? e : new Error(String(e));
      logger.error('サブスクリプション情報の取得に失敗しました:', {
        error: errorObj,
        message: errorObj.message,
        stack: errorObj.stack
      });
      ErrorHandler.handle(e, 'ensureSubscription', false);
      
      // エラー状態を設定（UIで表示される）
      setError(errorObj);
      setErrorMessage(errorObj.message || 'サブスクリプション情報の取得に失敗しました');
      
      // フォールバック: エラー時はアクセス不可
      const fallbackEntitlement = getFallbackEntitlement();
      setSubscription(null);
      setEntitlement(fallbackEntitlement);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    
    (async () => {
      try {
        setLoading(true);
        await loadSubscription();
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();
    
    return () => { mounted = false; };
  }, [loadSubscription]);

  const refresh = useCallback(async () => {
    try {
      isRefreshingRef.current = true; // リフレッシュフラグを設定
      setLoading(true);
      await loadSubscription();
      logger.debug('サブスクリプション状態をリフレッシュしました');
    } catch (e: unknown) {
      isRefreshingRef.current = false; // エラー時もフラグをリセット
      logger.error('サブスクリプション状態の更新中にエラーが発生しました', e);
      ErrorHandler.handle(e, 'refreshSubscription', false);
    } finally {
      setLoading(false);
    }
  }, [loadSubscription]);

  // アプリがフォアグラウンドに戻った時にサブスクリプション状態を自動リフレッシュ
  useEffect(() => {
    // Web環境ではAppStateが利用できない場合があるため、チェックする
    if (typeof AppState === 'undefined') {
      return;
    }

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      // バックグラウンドからフォアグラウンドに戻った時のみリフレッシュ
      if (nextAppState === 'active') {
        logger.debug('アプリがフォアグラウンドに戻りました。サブスクリプション状態をリフレッシュします。');
        refresh().catch((error) => {
          logger.warn('フォアグラウンド復帰時のサブスクリプション状態リフレッシュに失敗しました（続行）:', error);
        });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [refresh]);

  return { 
    subscription, 
    entitlement, 
    loading, 
    refresh,
    error, // エラーオブジェクト
    errorMessage // ユーザー向けエラーメッセージ
  };
};


