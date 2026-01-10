/**
 * 機能アクセス制限チェックのヘルパー関数
 * 
 * 目的:
 * - Alert表示の重複コードを削減
 * - 複数の制限チェックを順次実行するパターンを統一
 * - 既存の制限チェックロジックは維持（デバッグしやすさを保持）
 * 
 * 特徴:
 * - 最小限の抽象化（既存コードへの影響を最小化）
 * - 柔軟性を保持（特殊ケースに対応可能）
 * - 段階的な移行が可能
 */

import { Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import logger from './logger';

/**
 * 制限チェック結果の型定義
 */
export interface LimitCheckResult {
  canAccess: boolean;
  reason?: string;
  currentCount?: number;
  limit?: number;
  title?: string; // カスタムタイトル（オプション）
}

/**
 * Alert表示オプション
 */
export interface ShowLimitAlertOptions {
  result: LimitCheckResult;
  defaultTitle?: string;
  defaultMessage?: string;
  upgradeButtonText?: string;
  onCancel?: () => void;
  onUpgrade?: () => void;
  router?: ReturnType<typeof useRouter>;
  // プレミアムユーザー向けのカスタムボタンテキスト
  premiumButtonText?: string;
  isPremium?: boolean;
}

/**
 * 制限に達している場合のAlertを表示（統一ヘルパー）
 * 
 * 既存の制限チェック関数の結果を受け取り、
 * Alert表示のみを統一化します。
 * 
 * @param options Alert表示オプション
 */
export const showFeatureLimitAlert = (options: ShowLimitAlertOptions): void => {
  const {
    result,
    defaultTitle = '制限に達しました',
    defaultMessage,
    upgradeButtonText = 'プレミアムを見る',
    onCancel,
    onUpgrade,
    router,
    premiumButtonText = '了解',
    isPremium = false,
  } = options;

  if (result.canAccess) {
    // アクセス可能な場合は何もしない
    return;
  }

  // タイトルを決定（result.title > defaultTitle）
  const title = result.title || defaultTitle;

  // メッセージを決定（result.reason > defaultMessage）
  const message = result.reason || defaultMessage || '制限に達しています。';

  // ボタンテキストを決定（プレミアムユーザーの場合はカスタムテキスト）
  const buttonText = isPremium && premiumButtonText 
    ? premiumButtonText 
    : upgradeButtonText;

  // Web環境での確認ダイアログ対応
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const confirmed = window.confirm(`${title}\n\n${message}\n\n${buttonText}をクリックしてアップグレードページに移動しますか？`);
    if (confirmed && onUpgrade) {
      onUpgrade();
    } else if (!confirmed && onCancel) {
      onCancel();
    }
    return;
  }

  // React Native環境でのAlert
  Alert.alert(
    title,
    message,
    [
      {
        text: 'キャンセル',
        style: 'cancel',
        onPress: onCancel,
      },
      {
        text: buttonText,
        onPress: () => {
          if (isPremium) {
            // プレミアムユーザーの場合はキャンセルのみ
            if (onCancel) {
              onCancel();
            }
          } else {
            // 通常ユーザーの場合はアップグレードページへ
            if (onUpgrade) {
              onUpgrade();
            } else if (router) {
              router.push('/(tabs)/pricing-plans');
            }
          }
        },
      },
    ]
  );
};

/**
 * 複数の制限チェックを順次実行する（統一ヘルパー）
 * 
 * 各機能で同じパターンが繰り返されるのを防ぎます。
 * 最初の失敗で終了し、その結果を返します。
 * 
 * @param checks 制限チェック関数の配列
 * @returns 最初に失敗したチェック結果、またはすべて成功した場合はnull
 */
export const checkMultipleLimits = async (
  checks: Array<() => Promise<LimitCheckResult>>
): Promise<LimitCheckResult | null> => {
  for (const check of checks) {
    try {
      const result = await check();
      if (!result.canAccess) {
        logger.debug('制限チェック失敗:', result);
        return result;
      }
    } catch (error) {
      logger.error('制限チェックエラー:', error);
      // エラー時は許可（フォールバック）
      // 既存の動作を維持
      return null;
    }
  }

  // すべてのチェックが成功
  return null;
};

/**
 * 制限チェック結果を標準化する（統一ヘルパー）
 * 
 * 既存の制限チェック関数の結果を標準形式に変換します。
 * これにより、異なる関数の結果を統一的な方法で扱えます。
 * 
 * @param result 既存の制限チェック結果
 * @param featureType 機能タイプ（デバッグ用）
 * @returns 標準化された結果
 */
export const normalizeLimitResult = (
  result: any,
  featureType: string
): LimitCheckResult => {
  // 様々な形式の結果を標準形式に変換
  if (result.canRecord !== undefined) {
    return {
      canAccess: result.canRecord,
      reason: result.reason,
      currentCount: result.currentCount,
      limit: result.limit,
    };
  }

  if (result.canCreate !== undefined) {
    return {
      canAccess: result.canCreate,
      reason: result.reason,
      currentCount: result.currentCount,
      limit: result.limit,
    };
  }

  if (result.canAdd !== undefined) {
    return {
      canAccess: result.canAdd,
      reason: result.reason,
      currentCount: result.currentCount,
      limit: result.limit,
    };
  }

  if (result.canSave !== undefined) {
    return {
      canAccess: result.canSave,
      reason: result.reason,
    };
  }

  // 既存の形式に合わせて変換
  return {
    canAccess: result.canAccess ?? true, // デフォルトは許可
    reason: result.reason,
    currentCount: result.currentCount,
    limit: result.limit,
  };
};

/**
 * 機能タイプに応じたデフォルトAlert設定を取得
 */
export const getDefaultAlertConfig = (featureType: string): {
  defaultTitle: string;
  upgradeButtonText: string;
} => {
  const configs: Record<string, { defaultTitle: string; upgradeButtonText: string }> = {
    record_daily: {
      defaultTitle: '1日の録音数制限に達しました',
      upgradeButtonText: 'プレミアムを見る',
    },
    record_monthly: {
      defaultTitle: '月間録音数制限に達しました',
      upgradeButtonText: 'プレミアムを見る',
    },
    goal_create: {
      defaultTitle: '上限に達しました',
      upgradeButtonText: 'アップグレードしましょう',
    },
    library_add: {
      defaultTitle: '上限に達しました',
      upgradeButtonText: 'プレミアムを見る',
    },
    instrument_new: {
      defaultTitle: 'アップグレードが必要です',
      upgradeButtonText: 'プレミアムを見る',
    },
    record_date_limit: {
      defaultTitle: '録音できません',
      upgradeButtonText: 'プレミアムを見る',
    },
  };

  return configs[featureType] || {
    defaultTitle: '制限に達しました',
    upgradeButtonText: 'プレミアムを見る',
  };
};
