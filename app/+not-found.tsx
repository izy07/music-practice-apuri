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
    
    // 認証画面へのアクセスを試みている場合は、ログイン画面にリダイレクト
    const isAuthSegment = segments.includes('auth');
    // TypeScript警告回避: 配列の長さを数値として扱う
    const segmentCount: number = Array.isArray(segments) ? segments.length : 0;
    const isEmptySegment: boolean = segmentCount === 0;
    if (isAuthSegment || isEmptySegment) {
      logger.debug('NotFoundScreen: 認証画面またはルートパス - ログイン画面にリダイレクト', { segments });
      setTimeout(() => {
        try {
          router.replace('/auth/login' as any);
        } catch (error) {
          logger.error('NotFoundScreen: ログイン画面への遷移エラー', error);
          // フォールバック: ルートパスに遷移
          router.replace('/' as any);
        }
      }, 50);
      return;
    }
    
    // Web環境での処理
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      
      // 認証画面のパスをチェック
      if (currentPath.includes('/auth/')) {
        logger.debug('NotFoundScreen: 認証画面パス - ログイン画面にリダイレクト', { currentPath });
        setTimeout(() => {
          try {
            router.replace('/auth/login' as any);
          } catch (error) {
            logger.error('NotFoundScreen: ログイン画面への遷移エラー', error);
          }
        }, 50);
        return;
      }
    }
    
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