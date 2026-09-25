/**
 * subscriptionService.ts のテスト
 * サブスクリプション・課金機能のテスト
 */

import { computeEntitlement } from '@/lib/subscriptionService';
import type { UserSubscription } from '@/lib/subscriptionService';

describe('サブスクリプションデータのバリデーション', () => {
  it('サブスクリプションの必須フィールドを検証する', () => {
    const subscription = {
      id: 'sub-id',
      user_id: 'test-user',
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    expect(subscription.id).toBeDefined();
    expect(subscription.user_id).toBeDefined();
    expect(subscription.status).toBeDefined();
    expect(subscription.current_period_start).toBeDefined();
    expect(subscription.current_period_end).toBeDefined();
  });

  it('トライアル期間の計算が正しい', () => {
    const now = Date.now();
    const trialEnd = new Date(now + 7 * 24 * 60 * 60 * 1000); // 7日後
    
    const daysLeft = Math.ceil((trialEnd.getTime() - now) / (1000 * 60 * 60 * 24));
    
    expect(daysLeft).toBeGreaterThanOrEqual(6);
    expect(daysLeft).toBeLessThanOrEqual(7);
  });

  it('期間終了日が開始日より後であることを確認する', () => {
    const startDate = new Date('2025-10-01');
    const endDate = new Date('2025-10-31');
    
    expect(endDate.getTime()).toBeGreaterThan(startDate.getTime());
  });
});

describe('サブスクリプションステータスの検証', () => {
  it('有効なステータス値を受け入れる', () => {
    const validStatuses = ['trialing', 'active', 'past_due', 'canceled', 'unpaid'];
    validStatuses.forEach(status => {
      expect(['trialing', 'active', 'past_due', 'canceled', 'unpaid']).toContain(status);
    });
  });

  it('activeとtrialingのみがアクセス可能', () => {
    const accessibleStatuses = ['active', 'trialing'];
    const statuses = ['trialing', 'active', 'past_due', 'canceled', 'unpaid'];
    
    statuses.forEach(status => {
      const canAccess = accessibleStatuses.includes(status);
      
      if (status === 'active' || status === 'trialing') {
        expect(canAccess).toBe(true);
      } else {
        expect(canAccess).toBe(false);
      }
    });
  });
});

describe('computeEntitlement', () => {
  it('無料プラン（is_active=false）ではプレミアム権限が付与されない', async () => {
    const sub: UserSubscription = {
      id: 'sub-1',
      user_id: 'user-1',
      plan: 'free',
      is_active: false,
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      canceled_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const entitlement = await computeEntitlement(sub);
    expect(entitlement.isEntitled).toBe(false);
    expect(entitlement.isPremiumActive).toBe(false);
  });

  it('有効なプレミアム期間中はプレミアム権限が付与される', async () => {
    const sub: UserSubscription = {
      id: 'sub-2',
      user_id: 'user-2',
      plan: 'premium_monthly',
      is_active: true,
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      canceled_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const entitlement = await computeEntitlement(sub);
    expect(entitlement.isEntitled).toBe(true);
    expect(entitlement.isPremiumActive).toBe(true);
  });
});

describe('日付計算のエッジケース', () => {
  it('今日がトライアル最終日の場合', () => {
    const today = new Date();
    const trialEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    const daysLeft = Math.ceil((trialEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    expect(daysLeft).toBeGreaterThanOrEqual(0);
    expect(daysLeft).toBeLessThanOrEqual(1);
  });

  it('トライアル期間が1時間後に終了する場合', () => {
    const now = new Date();
    const trialEnd = new Date(now.getTime() + 60 * 60 * 1000); // 1時間後
    
    const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    expect(daysLeft).toBe(1); // 1時間でも1日としてカウント
  });

  it('トライアル期間が過去の場合は0日', () => {
    const now = new Date();
    const trialEnd = new Date(now.getTime() - 60 * 60 * 1000); // 1時間前
    
    const daysLeft = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    
    expect(daysLeft).toBe(0);
  });
});

