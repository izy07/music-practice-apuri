import { Stack, useRouter, useSegments } from 'expo-router';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { useEffect, useRef } from 'react';
import logger from '@/lib/logger';

export default function NotFoundScreen() {
  const router = useRouter();
  const segments = useSegments();
  const hasRedirectedRef = useRef(false);
  
  useEffect(() => {
    // 既にリダイレクト済みの場合は何もしない
    if (hasRedirectedRef.current) {
      return;
    }
    
    // 認証画面にいる場合は何もしない（_layout.tsxのロジックに任せる）
    if (segments.includes('auth')) {
      logger.debug('NotFoundScreen: 認証画面にいるため何もしない', { segments });
      hasRedirectedRef.current = true;
      return;
    }
    
    // Web環境での処理
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      
      // 認証画面のパスをチェック
      if (currentPath.includes('/auth/')) {
        logger.debug('NotFoundScreen: 認証画面パスにいるため何もしない', { currentPath });
        hasRedirectedRef.current = true;
        return;
      }
      
      // ルートパスの場合は_layout.tsxのロジックに任せる
      if (currentPath === '/' || currentPath.endsWith('/index.html')) {
        logger.debug('NotFoundScreen: ルートパスのため_layout.tsxのロジックに任せる');
        hasRedirectedRef.current = true;
        return;
      }
    }
    
    // その他の場合はルートパスに遷移（_layout.tsxが適切に処理する）
    logger.debug('NotFoundScreen: ルートパスに遷移', { segments });
    hasRedirectedRef.current = true;
    
    setTimeout(() => {
      try {
        router.replace('/' as any);
      } catch (error) {
        logger.error('NotFoundScreen: ルートパスへの遷移エラー', error);
      }
    }, 100);
  }, [router, segments]);
  
  const handleGoHome = () => {
    try {
      router.replace('/' as any);
    } catch (error) {
      logger.error('NotFoundScreen: ルートパスへの遷移エラー', error);
    }
  };
  
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <Text style={styles.text}>ページが見つかりません</Text>
        <Text style={styles.subText}>リダイレクト中...</Text>
        <TouchableOpacity onPress={handleGoHome} style={styles.link}>
          <Text style={styles.linkText}>Go to home screen!</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  text: {
    fontSize: 20,
    fontWeight: 600,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  linkText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  subText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
});
