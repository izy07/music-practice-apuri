/**
 * サブスクリプション状態フック
 *
 * 実装の実体は SubscriptionProvider 内の useSubscriptionState のみ。
 * ここは Context への薄いエントリポイントで、既存の
 * `import { useSubscription } from '@/hooks/useSubscription'` を壊さず
 * 全画面で同じ状態を共有する。
 */
export { useSubscriptionContext as useSubscription } from '@/contexts/SubscriptionContext';
export type { EntitlementType, SubscriptionContextType } from '@/contexts/SubscriptionContext';
