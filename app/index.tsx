/**
 * 冷起動エントリ（`/`）
 *
 * 認証初期化 + ナビ準備完了後、resolveAppEntryHref で決まった画面へ replace する。
 * pending で遷移を止めない（オンボーディング方針は lib/onboardingRoute.ts）。
 */
import React, { useEffect, useRef } from 'react';
import { useRouter, useRootNavigationState } from 'expo-router';
import { useAuthAdvanced } from '@/hooks/useAuthAdvanced';
import { resolveAppEntryHref } from '@/lib/navigation/appRoutePolicy';
import { BootScreen } from '@/components/app/BootScreen';
import logger from '@/lib/logger';
import { setStartupPhase } from '@/lib/startupDiagnostics';

export default function RootIndex() {
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const isNavReady = !!rootNavigationState?.key;
  const { isAuthenticated, isInitialized, getOnboardingRoute } = useAuthAdvanced();
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    setStartupPhase('auth-init');
  }, []);

  useEffect(() => {
    if (!isInitialized || !isNavReady || hasNavigatedRef.current) return;

    const href = resolveAppEntryHref({
      isAuthenticated,
      onboardingRoute: getOnboardingRoute(),
    });

    hasNavigatedRef.current = true;
    setStartupPhase('nav-ready');
    logger.debug('[RootIndex] 冷起動遷移', { href });

    try {
      router.replace(href);
      setStartupPhase('routed');
    } catch (error) {
      hasNavigatedRef.current = false;
      logger.error('[RootIndex] 冷起動遷移に失敗（再試行します）:', error);
    }
  }, [isAuthenticated, isInitialized, isNavReady, getOnboardingRoute, router]);

  const message = !isInitialized
    ? '読み込み中…'
    : !isNavReady
      ? '画面を準備しています…'
      : '移動しています…';

  return <BootScreen message={message} />;
}
