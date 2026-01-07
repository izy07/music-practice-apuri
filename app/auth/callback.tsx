// Google認証コールバック画面 - 認証完了後の処理を行う
import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthAdvanced } from '@/hooks/useAuthAdvanced';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';

export default function AuthCallback() {
  const router = useRouter();
  const { signOut } = useAuthAdvanced();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        logger.debug('🔄 認証コールバック処理開始');

        // プラットフォーム判定
        if (Platform.OS === 'web') {
          // Web環境での処理
          if (typeof window === 'undefined') {
            logger.error('❌ Web環境でwindowが未定義');
            return;
          }

          // URLパラメータを取得
          const url = new URL(window.location.href);
          const hash = url.hash.startsWith('#') ? url.hash.substring(1) : '';
          const params = new URLSearchParams(hash || url.search);
          
          // パスワードリセット処理をチェック
          const type = params.get('type');
          if (type === 'recovery') {
            logger.debug('🔄 パスワードリセットコールバック検出');
            // パスワードリセットの場合はセッションを確認
            const { data: sessionData } = await supabase.auth.getSession();
            if (sessionData.session) {
              logger.debug('✅ パスワードリセットセッション確認済み');
              // パスワードリセット画面に遷移（実装予定）
              router.replace('/auth/reset-password');
              return;
            }
          }
          
          // Google OAuthエラー検出（一時的に無効化 - 後で再実装予定）
          // TODO: Google OAuth認証を再実装する際は、この部分を復元してください
          const oauthError = params.get('error') || params.get('error_code');
          
          if (oauthError && oauthError.includes('google')) {
            logger.warn('⚠️ Google OAuthエラー（機能は無効化されています）:', oauthError);
            // Google OAuthは無効化されているため、ログイン画面にリダイレクト
            router.replace('/auth/login');
            return;
          }
          
          // その他のOAuthエラーは無視（Google以外の認証プロバイダー用）
          if (oauthError) {
            logger.error('❌ OAuthエラー:', oauthError, Object.fromEntries(params.entries()));
            
            // server_errorの場合は認証状態を再確認
            if (oauthError === 'server_error') {
              logger.debug('🔄 server_error検出 - 認証状態を再確認');
              // 認証状態を再確認（認証状態監視に任せる）
              const { data: sessionData } = await supabase.auth.getSession();
              if (sessionData.session) {
                logger.debug('✅ セッションが存在 - 認証状態監視に任せます');
                // 認証状態監視に任せる（_layout.tsxが自動的に適切な画面に遷移）
              } else {
                logger.debug('❌ セッションなし - ログイン画面に遷移');
                router.replace('/auth/login');
              }
            }
            return;
          }

          // PKCEコードをセッションに交換（Webではこれが必須）
          const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(window.location.href);
          if (exchangeError) {
            logger.error('❌ セッション交換エラー:', exchangeError);
            ErrorHandler.handle(exchangeError, 'セッション交換', false);
            
            // セッション交換エラーでも認証状態を再確認（認証状態監視に任せる）
            const { data: sessionData } = await supabase.auth.getSession();
            if (sessionData.session) {
              logger.debug('✅ セッションが存在 - 認証状態監視に任せます');
              // 認証状態監視に任せる（_layout.tsxが自動的に適切な画面に遷移）
            } else {
              logger.debug('❌ セッションなし - ログイン画面に遷移');
              router.replace('/auth/login');
            }
            return;
          }

          logger.debug('🌐 Web環境 - 認証コールバック処理完了');
        } else {
          // React Native環境での処理
          logger.debug('📱 React Native環境での認証処理');
        }

        // セッション取得
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          logger.error('❌ 認証コールバックエラー:', error);
          ErrorHandler.handle(error, '認証コールバック', false);
          return;
        }

        logger.debug('📋 セッション情報:', data.session?.user?.email);

        if (data.session) {
          logger.debug('✅ 認証成功 - 認証状態監視に任せます（_layout.tsxが自動的に適切な画面に遷移します）');
          // 認証状態の更新は useAuthAdvanced の onAuthStateChange で監視されているため、
          // _layout.tsx が自動的に適切な画面に遷移します。
          // ここでは画面遷移を行わず、認証状態監視に任せます。
        } else {
          logger.debug('❌ 認証失敗 - ログイン画面に戻る');
          // 認証失敗時のみログイン画面に遷移
          router.replace('/auth/login');
        }
      } catch (error) {
        logger.error('💥 認証コールバック処理エラー:', error);
        ErrorHandler.handle(error, '認証コールバック処理', false);
        // エラー時は即座にリダイレクトせず、認証状態監視に任せる
      }
    };

    // 少し遅延させてRoot Layoutのマウントを待つ
    const timeoutId = setTimeout(handleAuthCallback, 100);
    
    return () => clearTimeout(timeoutId);
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.text}>認証を処理中...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#333',
  },
});
