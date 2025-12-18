import { Link, Stack, useRouter, useSegments } from 'expo-router';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { useEffect, useRef } from 'react';
import logger from '@/lib/logger';
import { getBasePath } from '@/lib/navigationUtils';

export default function NotFoundScreen() {
  const router = useRouter();
  const segments = useSegments();
  const hasRedirectedRef = useRef(false); // リダイレクト済みフラグ
  
  // GitHub Pagesのベースパスを考慮したリダイレクト処理
  useEffect(() => {
    // 既にリダイレクト済みの場合は何もしない
    if (hasRedirectedRef.current) {
      return;
    }
    
    // 認証画面（auth/login, auth/signupなど）にいる場合はリダイレクトしない
    if (segments.includes('auth')) {
      logger.debug('NotFoundScreen: 認証画面にいるためリダイレクトをスキップ', { segments });
      return;
    }
    
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const basePath = getBasePath();
      const currentPath = window.location.pathname;
      const pathWithoutBase = currentPath.startsWith(basePath) 
        ? currentPath.replace(basePath, '') || '/' 
        : currentPath;
      
      // 認証画面のパスをチェック
      if (pathWithoutBase.startsWith('/auth/')) {
        logger.debug('NotFoundScreen: 認証画面パスにいるためリダイレクトをスキップ', { pathWithoutBase });
        return;
      }
      
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
        hasRedirectedRef.current = true;
        
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
        hasRedirectedRef.current = true;
        sessionStorage.removeItem('expo-router-redirect-path');
        
        const newPath = basePath + normalizedPath;
        window.history.replaceState({}, '', newPath + window.location.search + window.location.hash);
        
        setTimeout(() => {
          router.replace(normalizedPath as any);
        }, 100);
      } else if (pathWithoutBase !== '/' && pathWithoutBase !== '/index.html' && !pathWithoutBase.startsWith('/auth/')) {
        // パスが存在する場合は、Expo Routerに伝える（認証画面以外）
        logger.debug('NotFoundScreen: パスをExpo Routerに伝達', pathWithoutBase);
        hasRedirectedRef.current = true;
        setTimeout(() => {
          router.replace(pathWithoutBase as any);
        }, 100);
      } else if (pathWithoutBase === '/' || pathWithoutBase === '/index.html') {
        // ルートパスの場合は、_layout.tsxのロジックに任せる（リダイレクトしない）
        logger.debug('NotFoundScreen: ルートパスのため、_layout.tsxのロジックに任せる');
        hasRedirectedRef.current = true;
        // 何もしない（_layout.tsxが適切に処理する）
      }
    } else {
      // Web環境以外の場合
      // 認証画面にいる場合はリダイレクトしない
      if (segments.includes('auth')) {
        logger.debug('NotFoundScreen: 認証画面にいるためリダイレクトをスキップ（非Web環境）');
        return;
      }
      
      // ルートパスの場合は何もしない（_layout.tsxのロジックに任せる）
      if (segments.length === 0 || (segments.length === 1 && segments[0] === 'index')) {
        logger.debug('NotFoundScreen: ルートパスのため、_layout.tsxのロジックに任せる（非Web環境）');
        hasRedirectedRef.current = true;
        return;
      }
      
      logger.debug('NotFoundScreen: ルートパスに遷移（非Web環境）');
      hasRedirectedRef.current = true;
      setTimeout(() => {
        try {
          router.replace('/' as any);
        } catch (error) {
          logger.error('NotFoundScreen: ルートパスへの遷移エラー', error);
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
