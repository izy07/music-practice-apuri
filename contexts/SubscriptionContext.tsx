/**
 * サブスクリプション状態の一元管理
 * 
 * 特徴:
 * - サブスクリプション状態を一元管理
 * - 各画面での重複取得を削減
 * - パフォーマンス向上（状態の共有）
 * - テスト容易性の向上（Contextをモック可能）
 * 
 * 使用方法:
 * ```typescript
 * import { useSubscriptionContext } from '@/contexts/SubscriptionContext';
 * 
 * const { entitlement, loading, refresh } = useSubscriptionContext();
 * ```
 */

import React, { createContext, useContext } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { UserSubscription } from '@/lib/subscriptionService';

/**
 * エンタイトルメントの型定義
 * useSubscriptionフックが返すentitlementの実際の構造に合わせています
 */
export interface EntitlementType {
  isEntitled: boolean;
  isTrial: boolean;
  isPremiumActive: boolean;
  daysLeftOnTrial: number;
}

export interface SubscriptionContextType {
  subscription: UserSubscription | null;
  entitlement: EntitlementType;
  loading: boolean;
  error: Error | null;
  errorMessage: string | null;
  refresh: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

/**
 * サブスクリプション状態を提供するプロバイダー
 * 
 * アプリのルートレイアウト（app/_layout.tsx）で使用してください。
 */
export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const subscriptionData = useSubscription();
  
  const value: SubscriptionContextType = {
    subscription: subscriptionData.subscription,
    entitlement: subscriptionData.entitlement,
    loading: subscriptionData.loading,
    error: subscriptionData.error,
    errorMessage: subscriptionData.errorMessage,
    refresh: subscriptionData.refresh,
  };
  
  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

/**
 * サブスクリプション状態を取得するカスタムフック
 * 
 * @throws {Error} SubscriptionProviderの外で使用された場合
 * @returns サブスクリプション状態と操作関数
 * 
 * 使用例:
 * ```typescript
 * const { entitlement, loading, refresh } = useSubscriptionContext();
 * 
 * if (entitlement.isEntitled) {
 *   // プレミアム機能にアクセス可能
 * }
 * ```
 */
export const useSubscriptionContext = (): SubscriptionContextType => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscriptionContext must be used within a SubscriptionProvider');
  }
  return context;
};
