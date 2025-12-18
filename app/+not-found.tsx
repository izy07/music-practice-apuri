import { Link, Stack, useRouter, useSegments } from 'expo-router';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { useEffect } from 'react';
import logger from '@/lib/logger';
import { getBasePath } from '@/lib/navigationUtils';

export default function NotFoundScreen() {
  const router = useRouter();
  const segments = useSegments();
  
  // GitHub Pagesのベースパスを考慮したリダイレクト処理
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const basePath = getBasePath();
      const currentPath = window.location.pathname;
      const pathWithoutBase = currentPath.startsWith(basePath) 
        ? currentPath.replace(basePath, '') || '/' 
        : currentPath;
      
      // クエリパラメータからリダイレクトパスを取得
      const urlParams = new URLSearchParams(window.location.search);
      const redirectPath = urlParams.get('_redirect');
      
      // sessionStorageからリダイレクトパスを取得
      const storedRedirectPath = sessionStorage.getItem('expo-router-redirect-path');
      const originalPath = sessionStorage.getItem('expo-router-original-path');
      
      logger.debug('NotFoundScreen: パス情報', {
        currentPath,
        pathWithoutBase,
        segments,
        redirectPath,
        storedRedirectPath,
        originalPath,
      });
      
      // リダイレクトパスがある場合は、それをExpo Routerに伝える
      if (redirectPath) {
        const normalizedPath = redirectPath.startsWith('/') ? redirectPath : '/' + redirectPath;
        logger.debug('NotFoundScreen: リダイレクトパスを復元', normalizedPath);
        
        // URLを更新
        urlParams.delete('_redirect');
        const newSearch = urlParams.toString();
        const newPath = basePath + normalizedPath;
        const newUrl = newPath + (newSearch ? '?' + newSearch : '') + window.location.hash;
        window.history.replaceState({}, '', newUrl);
        
        // Expo Routerに遷移を指示
        setTimeout(() => {
          router.replace(normalizedPath as any);
        }, 100);
      } else if (storedRedirectPath) {
        const normalizedPath = storedRedirectPath.startsWith('/') ? storedRedirectPath : '/' + storedRedirectPath;
        logger.debug('NotFoundScreen: sessionStorageからリダイレクトパスを復元', normalizedPath);
        sessionStorage.removeItem('expo-router-redirect-path');
        
        const newPath = basePath + normalizedPath;
        window.history.replaceState({}, '', newPath + window.location.search + window.location.hash);
        
        setTimeout(() => {
          router.replace(normalizedPath as any);
        }, 100);
      } else if (pathWithoutBase !== '/' && pathWithoutBase !== '/index.html') {
        // パスが存在する場合は、Expo Routerに伝える
        logger.debug('NotFoundScreen: パスをExpo Routerに伝達', pathWithoutBase);
        setTimeout(() => {
          router.replace(pathWithoutBase as any);
        }, 100);
      } else {
        // ルートパスまたは存在しないパスの場合は、ログイン画面にリダイレクト
        logger.debug('NotFoundScreen: ログイン画面にリダイレクト');
        setTimeout(() => {
          try {
            router.replace('/auth/login' as any);
          } catch (error) {
            logger.error('NotFoundScreen: ログイン画面への遷移エラー', error);
            // フォールバック: ルートパスに遷移
            router.replace('/' as any);
          }
        }, 100);
      }
    } else {
      // Web環境以外の場合もログイン画面にリダイレクト
      logger.debug('NotFoundScreen: ログイン画面にリダイレクト（非Web環境）');
      setTimeout(() => {
        try {
          router.replace('/auth/login' as any);
        } catch (error) {
          logger.error('NotFoundScreen: ログイン画面への遷移エラー', error);
          router.replace('/' as any);
        }
      }, 100);
    }
  }, [router, segments]);
  
  const handleGoHome = () => {
    // ログイン画面に遷移
    try {
      router.replace('/auth/login' as any);
    } catch (error) {
      logger.error('NotFoundScreen: ログイン画面への遷移エラー', error);
      // フォールバック: ルートパスに遷移
      router.replace('/' as any);
    }
  };
  
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <Text style={styles.text}>ページが見つかりません</Text>
        <Text style={styles.subText}>ログイン画面にリダイレクト中...</Text>
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
