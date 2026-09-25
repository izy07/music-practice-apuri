/**
 * 深いリンク・直接 URL アクセス時のルートガード。
 * 冷起動（`/`）は app/index.tsx が担当するため、ここでは触らない。
 */

import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { evaluateRouteGuard } from '@/lib/navigation/appRoutePolicy';
import type { OnboardingRoute } from '@/lib/onboardingRoute';
import logger from '@/lib/logger';

type UseAppRouteGuardOptions = {
  isReady: boolean;
  isRouterReady: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  isAuthenticated: boolean;
  hasInstrumentSelected: () => boolean;
  getOnboardingRoute: () => OnboardingRoute;
  tutorialFromSettings?: boolean;
};

export function useAppRouteGuard(options: UseAppRouteGuardOptions): void {
  const router = useRouter();
  const segments = useSegments();
  const segmentsRef = useRef(segments);

  useEffect(() => {
    segmentsRef.current = segments;
  }, [segments]);

  useEffect(() => {
    const currentSegments = Platform.OS === 'web' ? segmentsRef.current : segments;
    const decision = evaluateRouteGuard({
      platform: Platform.OS,
      isReady: options.isReady,
      isRouterReady: options.isRouterReady,
      isLoading: options.isLoading,
      isInitialized: options.isInitialized,
      isAuthenticated: options.isAuthenticated,
      hasInstrumentSelected: options.hasInstrumentSelected(),
      onboardingRoute: options.getOnboardingRoute(),
      segments: currentSegments,
      tutorialFromSettings: options.tutorialFromSettings,
    });

    if (decision.type === 'redirect') {
      logger.debug('[useAppRouteGuard]', decision.reason, { href: decision.href });
      router.replace(decision.href as never);
    }
  }, [
    options.isReady,
    options.isRouterReady,
    options.isLoading,
    options.isInitialized,
    options.isAuthenticated,
    options.hasInstrumentSelected,
    options.getOnboardingRoute,
    options.tutorialFromSettings,
    router,
    segments,
  ]);
}
