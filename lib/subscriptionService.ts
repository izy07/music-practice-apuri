import { supabase } from '@/lib/supabase';
import logger from './logger';
import { ErrorHandler } from './errorHandler';

export type SubscriptionPlan = 'free' | 'premium_monthly' | 'premium_yearly';

export interface UserSubscription {
  id: string;
  user_id: string;
  plan: SubscriptionPlan;
  is_active: boolean;
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

/**
 * サブスクリプション情報を取得
 * 
 * エラー時は適切にエラーをスローし、呼び出し側で処理できるようにする
 */
export const getSubscription = async (userId: string): Promise<UserSubscription | null> => {
  try {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    // レコードが見つからない場合（PGRST116）はnullを返す（これは正常）
    if (error && error.code === 'PGRST116') {
      logger.debug('サブスクリプション情報が見つかりませんでした（新規ユーザーの可能性）');
      return null;
    }
    
    // その他のエラーは適切にスローする
    if (error) {
      logger.error('サブスクリプション情報の取得に失敗しました:', {
        error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      throw new Error(`サブスクリプション情報の取得に失敗しました: ${error.message || '不明なエラー'}`);
    }
    
    return data as UserSubscription | null;
  } catch (error) {
    // 既にErrorオブジェクトの場合はそのまま再スロー
    if (error instanceof Error) {
      throw error;
    }
    // それ以外の場合はErrorオブジェクトに変換
    logger.error('サブスクリプション情報の取得中に予期しないエラーが発生しました:', error);
    throw new Error(`サブスクリプション情報の取得中に予期しないエラーが発生しました: ${String(error)}`);
  }
};

/**
 * サブスクリプション情報を確保
 * 
 * エラー時は適切にエラーをスローし、呼び出し側で処理できるようにする
 */
export const ensureSubscription = async (userId: string): Promise<UserSubscription> => {
  try {
    const sub = await getSubscription(userId);
    
    // 既存レコードがある場合はそのまま返す
    if (sub) {
      return sub;
    }
    
    // 新規ユーザーの場合、サブスクリプションレコードを作成
    const { data, error } = await supabase
      .from('user_subscriptions')
      .upsert({
        user_id: userId,
        plan: 'free',
        is_active: false,
      }, { onConflict: 'user_id' })
      .select('*')
      .single();
    
    if (error) {
      logger.error('サブスクリプションレコードの作成に失敗しました:', {
        error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      throw new Error(`サブスクリプションレコードの作成に失敗しました: ${error.message || '不明なエラー'}`);
    }
    
    if (!data) {
      throw new Error('サブスクリプションレコードの作成が完了しましたが、サブスクリプション情報が取得できませんでした');
    }
    
    return data as UserSubscription;
  } catch (error) {
    // 既にErrorオブジェクトの場合はそのまま再スロー
    if (error instanceof Error) {
      throw error;
    }
    // それ以外の場合はErrorオブジェクトに変換
    logger.error('ensureSubscription中に予期しないエラーが発生しました:', error);
    throw new Error(`サブスクリプション情報の確保中に予期しないエラーが発生しました: ${String(error)}`);
  }
};

/**
 * 購入処理（依存関係を緩和）
 * 
 * 現在: mockPurchase（開発用）
 * 将来: 実際のIAP実装に置き換え可能なインターフェース
 * 
 * 特徴:
 * - エラー時でもアプリが動作し続ける
 * - IAP実装が失敗しても、フォールバック機能を提供
 */
export const mockPurchase = async (userId: string, plan: SubscriptionPlan): Promise<UserSubscription> => {
  try {
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
    
    if (error) {
      logger.error('購入処理エラー:', error);
      throw error;
    }
    
    if (!data) {
      throw new Error('購入処理が完了しましたが、サブスクリプション情報が取得できませんでした');
    }
    
    return data as UserSubscription;
  } catch (error) {
    logger.error('購入処理中にエラーが発生しました:', error);
    throw error;
  }
};

/**
 * 実際のIAP実装（将来実装用のプレースホルダー）
 * 
 * TODO: expo-in-app-purchasesまたはreact-native-purchasesを実装
 * 
 * 実装時の注意:
 * - IAPが失敗してもアプリが動作し続けるようにする
 * - エラーハンドリングを強化
 * - フォールバック機能を提供
 */
export const purchaseSubscription = async (
  userId: string, 
  plan: SubscriptionPlan
): Promise<UserSubscription> => {
  // 現在はmockPurchaseを使用
  // 将来: 実際のIAP実装に置き換え
  logger.debug('購入処理: mockPurchaseを使用（開発用）');
  return await mockPurchase(userId, plan);
  
  /* 将来の実装例:
  try {
    // expo-in-app-purchasesまたはreact-native-purchasesを使用
    const productId = plan === 'premium_monthly' ? 'premium_monthly' : 'premium_yearly';
    const purchase = await purchaseProduct(productId);
    
    // 購入成功後、サーバーに反映
    const sub = await mockPurchase(userId, plan);
    return sub;
  } catch (error) {
    logger.error('IAP購入処理エラー:', error);
    throw error;
  }
  */
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

/**
 * エンタイトルメントを計算
 * 
 * エラー時は適切にエラーをスローし、呼び出し側で処理できるようにする
 */
export const computeEntitlement = async (sub: UserSubscription | null) => {
  const now = new Date();
  
  const isPremiumActive = !!sub?.is_active && !!sub.current_period_end && new Date(sub.current_period_end) >= now;
  const isEntitled = isPremiumActive;
  
  return { isEntitled, isTrial: false, isPremiumActive, daysLeftOnTrial: 0 };
};

/**
 * 機能へのアクセス権をチェック（依存関係を緩和）
 * 
 * 特徴:
 * - entitlementがnull/undefinedでも動作する（フォールバック）
 * - エラー時でも基本的な機能は利用可能
 * - サブスクリプション機能が失敗しても、アプリが動作し続ける
 * - フリープランでも制限内であれば機能を使用可能（制限チェックは別途実施）
 */
export const canAccessFeature = (
  feature: string, 
  entitlement: { isEntitled: boolean } | null | undefined
): boolean => {
  // GitHub Pages環境では常にアクセス可能（開発・デモ用）
  if (typeof window !== 'undefined' && window.location.hostname.includes('github.io')) {
    return true;
  }
  
  // エンタイトルされている場合はすべての機能にアクセス可能
  if (entitlement?.isEntitled) {
    return true;
  }
  
  // フリープランでも使用可能な機能（制限は別途チェック）
  // my-library, recordings, goals はフリープランでも制限内で使用可能
  const freeAccessibleFeatures = [
    'calendar', 
    'tuner', 
    'timer',
    'my-library',  // フリープランでも制限内で使用可能（各楽器10曲まで）
    'recordings',   // フリープランでも制限内で使用可能（月3回まで）
    'goals'         // フリープランでも制限内で使用可能（楽器数×2個まで）
  ];
  
  return freeAccessibleFeatures.includes(feature);
};

export const computeTrialDaysLeft = async (): Promise<number> => {
  // トライアル期間機能は削除されました
  return 0;
};


