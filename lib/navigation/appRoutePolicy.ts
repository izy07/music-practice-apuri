/**
 * アプリ全体のルーティングポリシー（単一ソース）。
 *
 * 責務:
 * - 冷起動（app/index.tsx）の遷移先決定
 * - 深いリンク・直接 URL アクセス時のガード（_layout）
 * - +not-found からの復帰先決定
 *
 * 画面遷移の実行（router.replace）はここでは行わない。
 */

import type { OnboardingRoute } from '@/lib/onboardingRoute';
import { parseRouteSegments } from './parseRouteSegments';

export type AppHref = '/auth/login' | OnboardingRoute;

export type RouteGuardInput = {
  platform: 'web' | 'ios' | 'android' | 'windows' | 'macos';
  isReady: boolean;
  isRouterReady: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  isAuthenticated: boolean;
  hasInstrumentSelected: boolean;
  onboardingRoute: OnboardingRoute;
  segments: readonly string[];
  /** 設定画面からチュートorial を見返す場合は true */
  tutorialFromSettings?: boolean;
  /** 設定・ヘッダーから楽器を変更する場合は true（オンボーディング誤復帰を防ぐ） */
  instrumentFromChange?: boolean;
};

export type RouteDecision =
  | { type: 'stay'; reason: string }
  | { type: 'redirect'; href: string; reason: string };

const PUBLIC_LEGAL_SCREENS = new Set(['terms-of-service', 'privacy-policy']);
const ONBOARDING_TABS = new Set(['tutorial', 'instrument-selection']);
const AUTH_SELF_MANAGED = new Set(['login', 'signup']);

/** 冷起動・404 復帰の共通遷移先（常に具体ルートを返す） */
export function resolveAppEntryHref(input: {
  isAuthenticated: boolean;
  onboardingRoute: OnboardingRoute;
}): '/auth/login' | OnboardingRoute {
  if (!input.isAuthenticated) {
    return '/auth/login';
  }
  return input.onboardingRoute;
}

function onboardingTargetWithoutInstrument(route: OnboardingRoute): string {
  if (route === '/(tabs)') return '/(tabs)/instrument-selection';
  return route;
}

/**
 * 認証済みユーザーの保護ルート判定。
 * app/index.tsx（冷起動）と +not-found はここでは触らない。
 */
export function evaluateRouteGuard(input: RouteGuardInput): RouteDecision {
  const route = parseRouteSegments(input.segments);

  if (!input.isRouterReady) {
    return { type: 'stay', reason: 'router-not-ready' };
  }

  if (!input.isReady) {
    if (input.platform === 'web' && (route.isInTabsGroup || route.isInAuthGroup)) {
      return { type: 'stay', reason: 'web-optimistic-before-ready' };
    }
    return { type: 'stay', reason: 'framework-not-ready' };
  }

  if (route.firstSegment && PUBLIC_LEGAL_SCREENS.has(route.firstSegment)) {
    return { type: 'stay', reason: 'public-legal' };
  }

  if (route.isInAuthGroup && route.authChild && AUTH_SELF_MANAGED.has(route.authChild)) {
    return { type: 'stay', reason: 'auth-self-managed' };
  }

  if (route.isBootEntry) {
    return { type: 'stay', reason: 'boot-entry-delegated-to-index' };
  }

  if (route.isNotFoundScreen) {
    return { type: 'stay', reason: 'not-found-delegated' };
  }

  if (input.platform === 'web' && (input.isLoading || !input.isInitialized)) {
    if (route.isInAuthGroup && input.isAuthenticated) {
      // 認証済みなら下の本処理へ
    } else if (route.isInAuthGroup) {
      return { type: 'stay', reason: 'web-auth-init' };
    } else if (route.isInTabsGroup) {
      return { type: 'stay', reason: 'web-optimistic-tabs' };
    } else if (route.firstSegment && PUBLIC_LEGAL_SCREENS.has(route.firstSegment)) {
      return { type: 'stay', reason: 'web-legal-init' };
    } else {
      return { type: 'stay', reason: 'web-init-other' };
    }
  }

  if (input.isLoading || !input.isInitialized) {
    return { type: 'stay', reason: 'auth-init' };
  }

  if (input.isAuthenticated && input.hasInstrumentSelected) {
    if (route.currentTab === 'tutorial' && !input.tutorialFromSettings) {
      return { type: 'redirect', href: '/(tabs)', reason: 'tutorial-already-onboarded' };
    }
    if (
      route.currentTab === 'instrument-selection' &&
      input.onboardingRoute === '/(tabs)' &&
      !input.instrumentFromChange
    ) {
      return {
        type: 'redirect',
        href: '/(tabs)',
        reason: 'instrument-already-selected',
      };
    }
  }

  if (
    input.platform === 'web' &&
    input.isAuthenticated &&
    route.isInTabsGroup &&
    input.hasInstrumentSelected
  ) {
    return { type: 'stay', reason: 'web-reload-maintain' };
  }

  if (
    input.platform === 'web' &&
    !input.isAuthenticated &&
    route.isInTabsGroup
  ) {
    return { type: 'redirect', href: '/auth/login', reason: 'web-unauthenticated-app' };
  }

  if (!input.isAuthenticated) {
    return { type: 'redirect', href: '/auth/login', reason: 'unauthenticated' };
  }

  if (!input.hasInstrumentSelected) {
    const target = onboardingTargetWithoutInstrument(input.onboardingRoute);

    if (route.currentTab && ONBOARDING_TABS.has(route.currentTab)) {
      if (
        (route.currentTab === 'tutorial' && target === '/(tabs)/instrument-selection') ||
        (route.currentTab === 'instrument-selection' && target === '/(tabs)/tutorial')
      ) {
        return { type: 'redirect', href: target, reason: 'onboarding-step-correction' };
      }
      return { type: 'stay', reason: 'onboarding-tab-ok' };
    }

    if (route.isInTabsGroup && input.segments.length <= 1) {
      return { type: 'stay', reason: 'tabs-transition' };
    }

    return { type: 'redirect', href: target, reason: 'onboarding-required' };
  }

  if (input.platform === 'web' && route.isInTabsGroup) {
    return { type: 'stay', reason: 'web-authenticated-ok' };
  }

  if (route.isInAuthGroup) {
    if (!input.hasInstrumentSelected) {
      const target = onboardingTargetWithoutInstrument(input.onboardingRoute);
      const href =
        target === '/(tabs)/instrument-selection' || target === '/(tabs)'
          ? '/(tabs)/instrument-selection'
          : '/(tabs)/tutorial';
      return { type: 'redirect', href, reason: 'auth-callback-onboarding' };
    }
    return { type: 'redirect', href: '/(tabs)', reason: 'auth-callback-main' };
  }

  return { type: 'stay', reason: 'no-guard-needed' };
}
