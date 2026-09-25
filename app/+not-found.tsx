/**
 * 存在しない URL 用。起動復帰の本体は app/index.tsx + useAppRouteGuard。
 * ここでは1回だけ安全な既知ルートへ戻す。
 */
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter, useRootNavigationState } from 'expo-router';
import { useAuthAdvanced } from '@/hooks/useAuthAdvanced';
import { resolveAppEntryHref } from '@/lib/navigation/appRoutePolicy';
import { BootScreen } from '@/components/app/BootScreen';
import logger from '@/lib/logger';

const FALLBACK_HREFS = ['/(tabs)', '/auth/login'] as const;

export default function NotFoundScreen() {
  const router = useRouter();
  const isNavReady = !!useRootNavigationState()?.key;
  const { isAuthenticated, isInitialized, getOnboardingRoute } = useAuthAdvanced();
  const attemptedRef = useRef(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  useEffect(() => {
    if (!isInitialized || !isNavReady || attemptedRef.current) return;

    const primary = resolveAppEntryHref({
      isAuthenticated,
      onboardingRoute: getOnboardingRoute(),
    });

    attemptedRef.current = true;
    const targets = [primary, ...FALLBACK_HREFS.filter((href) => href !== primary)];

    logger.warn('[NotFound] 既知ルートへ復帰を試行', { targets });

    let cancelled = false;
    (async () => {
      for (const href of targets) {
        if (cancelled) return;
        try {
          router.replace(href as never);
          return;
        } catch (error) {
          logger.error('[NotFound] replace 失敗', { href, error });
          attemptedRef.current = false;
        }
      }
      if (!cancelled) {
        setRecoveryError('画面を開けませんでした。アプリを再起動してください。');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isInitialized, isNavReady, getOnboardingRoute, router]);

  if (recoveryError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{recoveryError}</Text>
      </View>
    );
  }

  return <BootScreen message="画面を読み込んでいます…" />;
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 14,
    color: '#B00020',
    textAlign: 'center',
    lineHeight: 20,
  },
});
