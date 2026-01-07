import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { computeEntitlement, ensureSubscription, getSubscription, UserSubscription } from '@/lib/subscriptionService';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';

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
      const sub = await ensureSubscription(user.id);
      setSubscription(sub);
      
      // エンタイトルメントを計算
      const computedEntitlement = await computeEntitlement(sub);
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
      setLoading(true);
      await loadSubscription();
    } catch (e: unknown) {
      logger.error('サブスクリプション状態の更新中にエラーが発生しました', e);
      ErrorHandler.handle(e, 'refreshSubscription', false);
    } finally {
      setLoading(false);
    }
  }, [loadSubscription]);

  return { 
    subscription, 
    entitlement, 
    loading, 
    refresh,
    error, // エラーオブジェクト
    errorMessage // ユーザー向けエラーメッセージ
  };
};


