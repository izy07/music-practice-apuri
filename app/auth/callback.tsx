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
          
          // エラー付きリダイレクトを検出
          const oauthError = params.get('error') || params.get('error_code');
          
          if (oauthError) {
            logger.error('❌ OAuthエラー:', oauthError, Object.fromEntries(params.entries()));
            
            // server_errorの場合は認証状態を再確認
            if (oauthError === 'server_error') {
              logger.debug('🔄 server_error検出 - 認証状態を再確認');
              // 少し待ってから認証状態を再確認
              setTimeout(async () => {
                const { data: sessionData } = await supabase.auth.getSession();
                if (sessionData.session) {
                  logger.debug('✅ セッションが存在 - 認証成功');
                  // 認証状態監視に任せる
                } else {
                  logger.debug('❌ セッションなし - 強制的に認証状態を更新');
                  // 最後の手段：強制的に認証状態を更新
                  // forceAuthUpdateは存在しないため、ログイン画面に遷移
                  const success = false;
                  if (success) {
                    logger.debug('✅ 認証状態更新成功 - チュートリアル画面に遷移');
                    // 少し待ってからチュートリアル画面に遷移
                    setTimeout(() => {
                      logger.debug('🔄 チュートリアル画面への遷移を開始');
                      try {
                        router.replace('/(tabs)/tutorial');
                        logger.debug('✅ チュートリアル画面への遷移完了');
                      } catch (error) {
                        logger.error('❌ チュートリアル画面への遷移エラー:', error);
                        ErrorHandler.handle(error, 'チュートリアル画面への遷移', false);
                        // フォールバック: 直接URLを変更
                        const { navigateWithBasePath } = require('@/lib/navigationUtils');
                        navigateWithBasePath('/tutorial');
                      }
                    }, 500);
                  } else {
                    logger.debug('❌ 認証状態更新失敗 - ログイン画面に遷移');
                    setTimeout(() => {
                      router.replace('/auth/login');
                    }, 1000);
                  }
                }
              }, 1000);
            }
            return;
          }

          // PKCEコードをセッションに交換（Webではこれが必須）
          const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(window.location.href);
          if (exchangeError) {
            logger.error('❌ セッション交換エラー:', exchangeError);
            ErrorHandler.handle(exchangeError, 'セッション交換', false);
            
            // セッション交換エラーでも認証状態を再確認
            setTimeout(async () => {
              const { data: sessionData } = await supabase.auth.getSession();
              if (sessionData.session) {
                logger.debug('✅ セッションが存在 - 認証成功');
              }
            }, 1000);
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
          logger.debug('✅ 認証成功 - 状態更新完了');
          // 認証状態の更新を待ってからRootLayoutで遷移処理
          setTimeout(() => {
            try {
              router.replace('/(tabs)/tutorial');
            } catch (navError) {
              logger.error('❌ ナビゲーションエラー:', navError);
              ErrorHandler.handle(navError, 'ナビゲーション', false);
            }
          }, 1000);
        } else {
          logger.debug('❌ 認証失敗 - ログイン画面に戻る');
          setTimeout(() => {
            try {
              router.replace('/auth/login');
            } catch (navError) {
              logger.error('❌ ナビゲーションエラー:', navError);
              ErrorHandler.handle(navError, 'ナビゲーション', false);
            }
          }, 500);
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
