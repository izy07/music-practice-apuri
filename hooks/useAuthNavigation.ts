/**
 * 認証状態に基づく画面遷移フック
 * 
 * useAuthAdvanced.tsから画面遷移ロジックを分離して、認証状態管理を簡素化
 * 
 * 機能:
 * - 認証状態に基づいた画面遷移判定
 * - 楽器選択状態に基づいた画面遷移
 * - チュートリアル状態に基づいた画面遷移
 * 
 * 注意: このフックは認証状態を監視するだけで、認証状態の管理は行わない
 */

import { useCallback } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { Platform } from 'react-native';
import logger from '@/lib/logger';
import { AuthUser } from './useAuthAdvanced';

export interface NavigationOptions {
  user: AuthUser | null;
  hasInstrumentSelected: () => boolean;
  needsTutorial: () => boolean;
  canAccessMainApp: () => boolean;
}

export interface NavigationDecision {
  shouldNavigate: boolean;
  targetPath?: string;
  reason?: string;
}

/**
 * 認証状態に基づいて画面遷移先を決定
 * 
 * @param options ナビゲーションオプション
 * @param currentSegments 現在のセグメント
 * @returns 画面遷移の決定結果
 */
export function decideNavigationTarget(
  options: NavigationOptions,
  currentSegments: readonly string[]
): NavigationDecision {
  const { user, hasInstrumentSelected, needsTutorial, canAccessMainApp } = options;

  // セグメントの解析
  const firstSegment = currentSegments[0];
  const isInAuthGroup = firstSegment === 'auth';
  const isInTabsGroup = firstSegment === '(tabs)';
  const isInOrgGroup = firstSegment === 'organization-dashboard' || firstSegment === 'organization-settings';
  const currentTab = isInTabsGroup && currentSegments.length > 1 ? currentSegments[1] : null;
  const isAtRoot = currentSegments.length === 0;

  // 利用規約・プライバシーポリシー画面は許可（認証チェックをスキップ）
  if (firstSegment === 'terms-of-service' || firstSegment === 'privacy-policy') {
    return { shouldNavigate: false };
  }

  // 認証済みユーザーの処理
  if (user) {
    // 認証画面（ログイン/新規登録）にいる場合は、各画面のuseEffectで処理されるためスキップ
    if (isInAuthGroup) {
      const authChild = currentSegments.length > 1 ? currentSegments[1] : undefined;
      if (authChild === 'login' || authChild === 'signup') {
        return { shouldNavigate: false, reason: '認証画面のuseEffectで処理されるためスキップ' };
      }
    }

    // 楽器未選択の場合の処理
    if (!hasInstrumentSelected()) {
      // チュートリアル画面または楽器選択画面にいる場合は許可
      if (currentTab === 'tutorial' || currentTab === 'instrument-selection') {
        return { shouldNavigate: false };
      }

      // チュートリアルが必要な場合はチュートリアル画面に遷移
      if (needsTutorial()) {
        return {
          shouldNavigate: true,
          targetPath: '/(tabs)/tutorial',
          reason: '新規登録直後のため、チュートリアル画面にリダイレクト',
        };
      }

      // その他の場合は楽器選択画面に遷移
      return {
        shouldNavigate: true,
        targetPath: '/(tabs)/instrument-selection',
        reason: '楽器未選択のため、楽器選択画面にリダイレクト',
      };
    }

    // 認証済み + 楽器選択済み
    // チュートリアル画面にいる場合はカレンダー画面に遷移
    if (currentTab === 'tutorial') {
      return {
        shouldNavigate: true,
        targetPath: '/(tabs)/index',
        reason: '楽器選択済みのため、チュートリアル画面からカレンダー画面にリダイレクト',
      };
    }

    // Web環境: 既に適切な画面にいる場合は維持
    if (Platform.OS === 'web' && (isInTabsGroup || isInOrgGroup)) {
      return { shouldNavigate: false };
    }

    // ルートパスの場合はカレンダー画面に遷移
    if (isAtRoot) {
      return {
        shouldNavigate: true,
        targetPath: '/(tabs)/index',
        reason: 'ルートパスのため、カレンダー画面に遷移',
      };
    }

    // その他の認証画面（callback、reset-passwordなど）の処理
    if (isInAuthGroup) {
      const targetPath = hasInstrumentSelected()
        ? '/(tabs)/index'
        : '/(tabs)/instrument-selection';
      return {
        shouldNavigate: true,
        targetPath,
        reason: '認証画面から適切な画面に遷移',
      };
    }

    return { shouldNavigate: false };
  }

  // 未認証ユーザーの処理
  // 認証画面にいる場合は許可
  if (isInAuthGroup) {
    const authChild = currentSegments.length > 1 ? currentSegments[1] : undefined;
    if (authChild === 'signup') {
      return { shouldNavigate: false, reason: '新規登録画面を維持（新規登録処理中）' };
    }
    return { shouldNavigate: false, reason: '認証画面を維持' };
  }

  // ルートパスまたはその他の画面にアクセスした場合は、ログイン画面にリダイレクト
  return {
    shouldNavigate: true,
    targetPath: '/auth/login',
    reason: '未認証ユーザーのため、ログイン画面にリダイレクト',
  };
}

/**
 * 認証状態に基づく画面遷移フック
 * 
 * @param options ナビゲーションオプション
 * @returns 画面遷移を実行する関数
 */
export function useAuthNavigation(options: NavigationOptions) {
  const router = useRouter();
  const segments = useSegments();

  const navigate = useCallback(() => {
    const decision = decideNavigationTarget(options, segments);
    
    if (!decision.shouldNavigate || !decision.targetPath) {
      return;
    }

    try {
      logger.debug('[useAuthNavigation] 画面遷移実行', {
        targetPath: decision.targetPath,
        reason: decision.reason,
        currentSegments: segments,
      });

      router.replace(decision.targetPath as any);
    } catch (error) {
      logger.error('[useAuthNavigation] 画面遷移エラー:', error);
    }
  }, [options, segments, router]);

  return { navigate, decideNavigationTarget };
}
