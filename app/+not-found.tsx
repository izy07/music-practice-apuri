import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useAuthAdvanced } from '@/hooks/useAuthAdvanced';
import logger from '@/lib/logger';

const RECOVERY_TARGETS = ['/(tabs)', '/auth/login'] as const;

/**
 * 一致しない URL 用。_layout のガードと協調して1回だけ復帰を試みる。
 */
export default function NotFoundScreen() {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isInitialized, getOnboardingRoute } = useAuthAdvanced();
  const attemptedRef = useRef(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  useEffect(() => {
    if (!isInitialized || attemptedRef.current) return;

    const primary = isAuthenticated ? getOnboardingRoute() : '/auth/login';
    if (primary === 'pending') return;

    attemptedRef.current = true;
    const targets = [primary, ...RECOVERY_TARGETS.filter((t) => t !== primary)];

    logger.warn('+not-found: 画面復帰を試行します', { segments, targets });

    let cancelled = false;
    (async () => {
      for (const target of targets) {
        if (cancelled) return;
        try {
          router.replace(target as never);
          return;
        } catch (error) {
          logger.error('+not-found: replace 失敗', { target, error });
        }
      }
      if (!cancelled) {
        setRecoveryError(
          '画面を開けませんでした。開発サーバーを npx expo start --web --clear で再起動してください。'
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isInitialized, getOnboardingRoute, router, segments]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#007AFF" />
      {recoveryError ? (
        <Text style={styles.errorText}>{recoveryError}</Text>
      ) : (
        <Text style={styles.hintText}>画面を読み込んでいます…</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    gap: 16,
  },
  hintText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#B00020',
    textAlign: 'center',
    lineHeight: 20,
  },
});
