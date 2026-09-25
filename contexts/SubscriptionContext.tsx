/**
 * サブスクリプション状態の一元管理
 *
 * - 状態取得は Provider 内の useSubscriptionState のみ
 * - 各画面は useSubscription / useSubscriptionContext で同じ状態を参照
 * - 購入後の refresh は全画面に同時反映（画面ごとの二重取得なし）
 */

import React, { createContext, useContext, useMemo } from 'react';
import {
  useSubscriptionState,
  type SubscriptionEntitlement,
} from '@/hooks/useSubscriptionState';
import { UserSubscription } from '@/lib/subscriptionService';

export type EntitlementType = SubscriptionEntitlement;

export interface SubscriptionContextType {
  subscription: UserSubscription | null;
  entitlement: EntitlementType;
  loading: boolean;
  error: Error | null;
  errorMessage: string | null;
  refresh: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const subscriptionData = useSubscriptionState();

  const value = useMemo<SubscriptionContextType>(
    () => ({
      subscription: subscriptionData.subscription,
      entitlement: subscriptionData.entitlement,
      loading: subscriptionData.loading,
      error: subscriptionData.error,
      errorMessage: subscriptionData.errorMessage,
      refresh: subscriptionData.refresh,
    }),
    [
      subscriptionData.subscription,
      subscriptionData.entitlement,
      subscriptionData.loading,
      subscriptionData.error,
      subscriptionData.errorMessage,
      subscriptionData.refresh,
    ]
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscriptionContext = (): SubscriptionContextType => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscriptionContext must be used within a SubscriptionProvider');
  }
  return context;
};
