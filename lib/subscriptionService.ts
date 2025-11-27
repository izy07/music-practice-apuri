import { supabase } from '@/lib/supabase';
import logger from './logger';
import { ErrorHandler } from './errorHandler';

export type SubscriptionPlan = 'free' | 'premium_monthly' | 'premium_yearly';

export interface UserSubscription {
  id: string;
  user_id: string;
  plan: SubscriptionPlan;
  is_active: boolean;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
}

const addMonths = (date: Date, months: number) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

const addYears = (date: Date, years: number) => {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return d;
};

export const getSubscription = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error && error.code !== 'PGRST116') throw error;
  return data as UserSubscription | null;
};

export const ensureSubscription = async (userId: string) => {
  const sub = await getSubscription(userId);
  // 既存レコードがあるがトライアル未設定の場合は、初回ログイン扱いで1ヶ月トライアルを付与
  if (sub) {
    const notActive = !sub.is_active;
    const now = new Date();

    // サインアップ日時を基準に21日間トライアルを確実に付与
    let signupAt: Date | null = null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.created_at) {
        signupAt = new Date(user.created_at);
      }
    } catch (e) {
      ErrorHandler.handle(e, 'ユーザー情報取得', false);
    }

    const trialStartBase = signupAt ?? now;
    const trialEndBySignup = new Date(trialStartBase.getTime() + (21 * 24 * 60 * 60 * 1000)); // 21日後

    const missingTrial = !sub.trial_started_at || !sub.trial_ends_at;
    const trialExpired = !!sub.trial_ends_at && new Date(sub.trial_ends_at) < now;
    const withinSignupTrialWindow = now <= trialEndBySignup;
    
    // 既存のトライアル期間が間違っている場合（未来の日付など）も修正対象とする
    const invalidTrial = !!sub.trial_started_at && new Date(sub.trial_started_at) > now;

    if (notActive && withinSignupTrialWindow && (missingTrial || trialExpired || invalidTrial)) {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .upsert({
          user_id: userId,
          trial_started_at: trialStartBase.toISOString(),
          trial_ends_at: trialEndBySignup.toISOString(),
        }, { onConflict: 'user_id' })
        .select('*')
        .single();
      if (error) throw error;
      return data as UserSubscription;
    }
    return sub;
  }
  const now = new Date();
  const trialEnd = new Date(now.getTime() + (21 * 24 * 60 * 60 * 1000)); // 21日後
  const { data, error } = await supabase
    .from('user_subscriptions')
    .upsert({
      user_id: userId,
      plan: 'free',
      is_active: false,
      trial_started_at: now.toISOString(),
      trial_ends_at: trialEnd.toISOString(),
    }, { onConflict: 'user_id' })
    .select('*')
    .single();
  if (error) throw error;
  return data as UserSubscription;
};

export const mockPurchase = async (userId: string, plan: SubscriptionPlan) => {
  const now = new Date();
  const currentPeriodEnd = plan === 'premium_monthly' ? addMonths(now, 1) : addYears(now, 1);
  const { data, error } = await supabase
    .from('user_subscriptions')
    .upsert({
      user_id: userId,
      plan,
      is_active: true,
      current_period_end: currentPeriodEnd.toISOString(),
    }, { onConflict: 'user_id' })
    .select('*')
    .single();
  if (error) throw error;
  return data as UserSubscription;
};

export const cancelSubscription = async (userId: string) => {
  const now = new Date();
  const { data, error } = await supabase
    .from('user_subscriptions')
    .upsert({
      user_id: userId,
      is_active: false,
      canceled_at: now.toISOString(),
    }, { onConflict: 'user_id' })
    .select('*')
    .single();
  if (error) throw error;
  return data as UserSubscription;
};

export const computeEntitlement = (sub: UserSubscription | null) => {
  const now = new Date();
  const isTrial = !!sub?.trial_ends_at && new Date(sub.trial_ends_at) >= now;
  const isPremiumActive = !!sub?.is_active && !!sub.current_period_end && new Date(sub.current_period_end) >= now;
  const isEntitled = isTrial || isPremiumActive;
  let daysLeftOnTrial = 0;
  if (isTrial && sub?.trial_ends_at) {
    const diffMs = new Date(sub.trial_ends_at).getTime() - now.getTime();
    daysLeftOnTrial = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }
  return { isEntitled, isTrial, isPremiumActive, daysLeftOnTrial };
};

export const canAccessFeature = (feature: string, entitlement: { isEntitled: boolean }) => {
  if (entitlement.isEntitled) return true;
  const freeFeatures = ['calendar', 'tuner', 'timer'];
  return freeFeatures.includes(feature);
};

export const computeTrialDaysLeft = async (): Promise<number> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;
    // まず user_subscriptions を取得
    const sub = await getSubscription(user.id);
    if (sub?.trial_ends_at) {
      const now = new Date();
      const left = Math.ceil((new Date(sub.trial_ends_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (left > 0) return left;
    }
    // フォールバック: サインアップから21日間
    if (user.created_at) {
      const created = new Date(user.created_at);
      const trialEnd = new Date(created.getTime() + (21 * 24 * 60 * 60 * 1000)); // 21日後
      const now = new Date();
      const left = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      return left;
    }
  } catch {}
  return 0;
};


