import { useRouter, useSegments } from 'expo-router';
import { useEffect, useRef } from 'react';
import logger from '@/lib/logger';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function NotFoundScreen() {
  const router = useRouter();
  const segments = useSegments();
  const hasRedirectedRef = useRef(false);
  
  useEffect(() => {
    // 既にリダイレクト済みの場合は何もしない
    if (hasRedirectedRef.current) {
      return;
    }
    
    hasRedirectedRef.current = true;
    
    // _layout.tsxが自動的に認証チェックとリダイレクトを行うため、ここではルートパスに遷移するだけ
    // 認証画面へのアクセスやルートパスの場合は、_layout.tsxが適切に処理する
    
    // その他の場合はルートパスに遷移（_layout.tsxが適切に処理する）
    logger.debug('NotFoundScreen: ルートパスに遷移', { segments });
    setTimeout(() => {
      try {
        router.replace('/' as any);
      } catch (error) {
        logger.error('NotFoundScreen: ルートパスへの遷移エラー', error);
      }
    }, 50);
  }, [router, segments]);
  
  // リダイレクト中はローディング表示
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#007AFF" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});