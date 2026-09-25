/**
 * アプリ起動時のエントリポイント（白画面防止）
 * Expo Router に初期ルートが無いと Stack が空のまま白く見えるため、
 * ローディングを表示し _layout / 認証状態に応じて遷移する。
 */
import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthAdvanced } from '@/hooks/useAuthAdvanced';
import { redirectToLogin } from '@/lib/navigationUtils';

export default function RootIndex() {
  const router = useRouter();
  const { isAuthenticated, isInitialized, getOnboardingRoute } = useAuthAdvanced();

  useEffect(() => {
    if (!isInitialized) return;

    if (!isAuthenticated) {
      redirectToLogin(router, 'index:未認証');
      return;
    }

    const target = getOnboardingRoute();
    if (target === 'pending') return;

    router.replace(target);
  }, [isAuthenticated, isInitialized, getOnboardingRoute, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#1976D2" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});
