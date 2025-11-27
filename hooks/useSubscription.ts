import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { computeEntitlement, ensureSubscription, getSubscription, UserSubscription } from '@/lib/subscriptionService';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';

export const useSubscription = () => {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [entitlement, setEntitlement] = useState(() => computeEntitlement(null));

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (mounted) {
            setSubscription(null);
            setEntitlement(computeEntitlement(null));
          }
          return;
        }
        try {
          const sub = await ensureSubscription(user.id);
          if (mounted) {
            setSubscription(sub);
            const entitlement = computeEntitlement(sub);
            setEntitlement(entitlement);
          }
        } catch (e: unknown) {
          ErrorHandler.handle(e, 'ensureSubscription', false);
          // Fallback: テーブル未作成(PGRST205)などで失敗した場合は、サインアップ日からの暫定トライアルを表示
          const createdAt = user?.created_at ? new Date(user.created_at) : new Date();
          const now = new Date();
          const trialEnd = new Date(createdAt.getTime() + (21 * 24 * 60 * 60 * 1000)); // 21日後
          const isTrial = now <= trialEnd;
          const daysLeftOnTrial = isTrial ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0;
          if (mounted) {
            setSubscription(null);
            setEntitlement({ isEntitled: isTrial, isTrial, isPremiumActive: false, daysLeftOnTrial });
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const refresh = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    try {
      const sub = await ensureSubscription(user.id);
      setSubscription(sub);
      setEntitlement(computeEntitlement(sub));
    } catch (e: any) {
      // Fallback: サインアップ日ベース
      const createdAt = user?.created_at ? new Date(user.created_at) : new Date();
      const now = new Date();
      const trialEnd = new Date(createdAt.getTime() + (21 * 24 * 60 * 60 * 1000)); // 21日後
      const isTrial = now <= trialEnd;
      const daysLeftOnTrial = isTrial ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0;
      setSubscription(null);
      setEntitlement({ isEntitled: isTrial, isTrial, isPremiumActive: false, daysLeftOnTrial });
    }
  };

  return { subscription, entitlement, loading, refresh };
};


