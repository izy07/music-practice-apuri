/**
 * ログイン画面 - 徹底的に設計し直した認証システム
 * 
 * 要件:
 * - ログイン成功 + 楽器選択済み → メイン画面
 * - ログイン成功 + 楽器未選択 → チュートリアル画面
 * - ログイン失敗（未登録） → 新規登録画面への誘導
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthAdvanced } from '@/hooks/useAuthAdvanced';
import { supabase } from '@/lib/supabase';
import logger from '@/lib/logger';
import { getBasePath } from '@/lib/navigationUtils';

const { width: screenWidth } = Dimensions.get('window');

// ブランドカラーパレット
const colors = {
  primary: '#2E7D32',      // 深い緑
  primaryLight: '#4CAF50', // 明るい緑
  secondary: '#FF6F00',    // オレンジ
  background: '#FAFAFA',   // 薄いグレー
  surface: '#FFFFFF',      // 白
  text: '#212121',         // ダークグレー
  textSecondary: '#757575', // ミディアムグレー
  border: '#E0E0E0',       // ライトグレー
  error: '#D32F2F',        // レッド
  success: '#388E3C',      // グリーン
};

export default function LoginScreen() {
  logger.debug('LoginScreen component initialized');
  
  const router = useRouter();
  const {
    signIn,
    isLoading,
    error,
    clearError,
    isAuthenticated,
    user,
    hasInstrumentSelected,
    needsTutorial,
    canAccessMainApp,
  } = useAuthAdvanced();
  
  // フォーム状態
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false); // ログイン処理中のローカル状態
  
  // アニメーション状態
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [pulseAnim] = useState(new Animated.Value(1));
  
  logger.debug('LoginScreen state:', {
    isAuthenticated,
    isLoading,
    hasInstrument: hasInstrumentSelected(),
    needsTutorial: needsTutorial(),
    canAccessMain: canAccessMainApp(),
  });

  // 認証状態に応じた自動遷移（ログイン成功後の画面遷移）
  useEffect(() => {
    // ログイン画面にいる間は、認証状態が更新されたら適切な画面に遷移
    if (isAuthenticated && !isLoading && isLoggingIn) {
      logger.debug('ログイン成功 - 認証状態検出、画面遷移を実行', {
        isAuthenticated,
        isLoading,
        isLoggingIn,
        hasInstrument: hasInstrumentSelected(),
        needsTutorial: needsTutorial(),
        canAccessMain: canAccessMainApp()
      });
      
      // ログイン処理完了
      setIsLoggingIn(false);
      
      // 一般的なアプリと同様に、すぐに画面遷移を実行（遅延なし）
      logger.debug('認証状態更新完了 - 画面遷移を実行');
      
      // 適切な画面に遷移
      if (canAccessMainApp()) {
        logger.debug('メイン画面に遷移');
        router.replace('/(tabs)/');
      } else if (needsTutorial()) {
        logger.debug('チュートリアル画面に遷移');
        router.replace('/(tabs)/tutorial');
      } else {
        logger.debug('楽器選択画面に遷移');
        router.replace('/(tabs)/instrument-selection');
      }
    }
  }, [isAuthenticated, isLoading, isLoggingIn, hasInstrumentSelected, needsTutorial, canAccessMainApp, router]);

  // アニメーション開始
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: false,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: false,
      }),
    ]).start();
  }, []);

  // エラーが変更された時のアニメーション
  useEffect(() => {
    if (error) {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 150,
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [error]);

  // フォームバリデーション
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.email.trim()) {
      errors.email = 'メールアドレスを入力してください';
    } else if (!/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(formData.email)) {
      errors.email = '有効なメールアドレスを入力してください';
    }
    
    // ログイン時はパスワードの形式チェックを緩和（既存アカウントのパスワードを考慮）
    if (!formData.password) {
      errors.password = 'パスワードを入力してください';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ログイン処理
  const handleLogin = async () => {
    logger.debug('ログイン処理開始');
    
    // エラーをクリア
    setFormErrors({});
    clearError();
    
    if (!validateForm()) {
      logger.debug('フォームバリデーション失敗', formErrors);
      // バリデーションエラーを明確に表示
      const validationErrors = Object.values(formErrors);
      if (validationErrors.length > 0) {
        Alert.alert('入力エラー', validationErrors.join('\n'));
      }
      return;
    }
    
    // ログイン処理開始
    setIsLoggingIn(true);
    
    logger.debug('フォームバリデーション成功');
    logger.debug('ログインデータ:', { email: formData.email, passwordLength: formData.password.length });
    
    try {
      logger.debug('signIn関数を呼び出し中...', { email: formData.email });
      const success = await signIn(formData);
      
      // エラー状態を確認（非同期処理の完了を待つ）
      await new Promise(resolve => setTimeout(resolve, 200));
      
      logger.debug('ログイン結果確認:', { 
        success, 
        isAuthenticated, 
        isLoading,
        error: error || 'なし' 
      });
      
      if (success) {
        logger.debug('ログイン成功 - 認証状態の更新を待機中');
        setFormErrors({});
        
        // 認証状態の更新と画面遷移は、useEffect（88-123行）で自動的に処理される
        // useAuthAdvancedのsignIn関数がupdateAuthStateを呼び出し、
        // 認証状態が更新されるとuseEffectが検知して適切な画面に遷移する
        // フラグは使用せず、認証状態のみで判定する
        logger.debug('ログイン成功 - 認証状態の更新と画面遷移は自動的に処理されます');
      } else {
        setIsLoggingIn(false);
        logger.debug('ログイン失敗', { success, isAuthenticated, error });
        const fallbackMsg = error || 'メールアドレスまたはパスワードが正しくありません';
        // Webでも確実に視認できるようフィールドエラーも表示
        setFormErrors(prev => ({
          ...prev,
          password: fallbackMsg,
        }));

        // エラーメッセージをアラートでも表示
        Alert.alert(
          'ログイン失敗',
          fallbackMsg,
          [{ text: 'OK' }]
        );

        // 未登録ユーザーの場合は新規登録画面への誘導
        const errorLower = (error || '').toLowerCase();
        if (errorLower.includes('登録されていません') || 
            errorLower.includes('not found') || 
            errorLower.includes('user not found') || 
            errorLower.includes('invalid login credentials') ||
            errorLower.includes('invalid credentials') ||
            errorLower.includes('email not confirmed')) {
          Alert.alert(
            'ログインできません',
            'メールアドレスまたはパスワードが正しくない可能性があります。\n\n新規登録を行いますか？',
            [
              { text: 'キャンセル', style: 'cancel' },
              {
                text: '新規登録',
                onPress: () => {
                  logger.debug('新規登録画面に遷移');
                  router.push('/auth/signup');
                },
              },
            ]
          );
        }
      }
    } catch (error) {
      setIsLoggingIn(false);
      logger.error('ログイン処理で例外が発生:', error);
      // エラーは既にAlertで表示済み
      const errorMessage = error instanceof Error ? error.message : 'ログインに失敗しました。もう一度お試しください。';
      // 例外エラーはuseAuthAdvancedのerrorに設定されないため、Alertで表示
      Alert.alert('エラー', errorMessage);
    }
  };


  // パスワード再設定メール送信
  const handleResetPassword = async () => {
    try {
      const email = formData.email.trim().toLowerCase();
      if (!email) {
        Alert.alert(
          'メールアドレスが必要です',
          'パスワードリセットメールを送信するために、メールアドレスを入力してください。',
          [
            { text: 'キャンセル', style: 'cancel' },
            {
              text: 'メールアドレスを入力',
              onPress: () => {
                // メールアドレスフィールドにフォーカス
                logger.debug('メールアドレスフィールドにフォーカス');
              },
            },
          ]
        );
        return;
      }

      logger.debug('パスワードリセットメール送信開始:', email);
      
      const redirectTo = Platform.OS === 'web'
        ? `${window.location.origin}${getBasePath()}/auth/callback`
        : 'exp+bolt-expo-nativewind://auth/callback';
        
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { 
        redirectTo,
      });
      
      if (resetError) {
        ErrorHandler.handle(resetError, 'パスワードリセットメール送信', true);
        // パスワードリセットエラーはuseAuthAdvancedのerrorに含まれないため、Alertで表示
        Alert.alert('エラー', resetError.message || 'メール送信に失敗しました');
        return;
      }

      logger.debug('パスワードリセットメール送信成功');
      Alert.alert(
        'メール送信完了',
        'パスワード再設定用のメールを送信しました。\n\n受信箱をご確認いただき、メール内のリンクをクリックしてパスワードを再設定してください。',
        [{ text: 'OK' }]
      );
    } catch (e: any) {
      ErrorHandler.handle(e, 'パスワードリセット処理', true);
      // パスワードリセット例外はuseAuthAdvancedのerrorに含まれないため、Alertで表示
      Alert.alert('エラー', e?.message || 'メール送信に失敗しました');
    }
  };

  // 新規登録画面への遷移
  const goToSignup = () => {
    logger.debug('新規登録画面に遷移');
    router.push('/auth/signup');
  };

  // フィールド更新
  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // エラーをクリア
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    
    // 全体的なエラーをクリア
    if (error) {
      clearError();
    }
  };

  return (
    <SafeAreaView style={styles.container} >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* ヘッダー */}
            <View style={styles.header}>
              <Text style={styles.title}>ログイン</Text>
              <Text style={styles.subtitle}>
                アカウントにログインして練習を続けましょう
              </Text>
            </View>

            {/* エラー表示（上部バナー） */}
            {error && (
              <Animated.View
                style={[
                  styles.errorContainer,
                  { transform: [{ scale: pulseAnim }] },
                ]}
              >
                <Text style={styles.errorText}>⚠️ {error}</Text>
              </Animated.View>
            )}

            {/* フォーム */}
            <View style={styles.form}>
              {/* メールアドレス */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>メールアドレス</Text>
                <View style={[
                  styles.inputWrapper,
                  formErrors.email ? styles.inputError : null,
                ]}>
                  <Text style={styles.inputIcon}>📧</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.email}
                    onChangeText={(value) => updateField('email', value)}
                    placeholder="your@email.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading && !isLoggingIn}
                    selectionColor={colors.primary}
                    nativeID="login-email-input"
                    accessibilityLabel="メールアドレス"
                  />
                </View>
                {formErrors.email && (
                  <Text style={styles.fieldErrorText}>{formErrors.email}</Text>
                )}
              </View>

              {/* パスワード */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>パスワード</Text>
                <View style={[
                  styles.inputWrapper,
                  formErrors.password ? styles.inputError : null,
                ]}>
                  <Text style={styles.inputIcon}>✳️</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.password}
                    onChangeText={(value) => updateField('password', value)}
                    placeholder="パスワード"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading && !isLoggingIn}
                    selectionColor={colors.primary}
                    nativeID="login-password-input"
                    accessibilityLabel="パスワード"
                  />
                  <TouchableOpacity
                    style={styles.passwordToggle}
                    onPress={() => setShowPassword(!showPassword)}
                    disabled={isLoading || isLoggingIn}
                  >
                  <Text style={styles.passwordToggleText}>
                    {showPassword ? '👀' : '🔒'}
                  </Text>
                  </TouchableOpacity>
                </View>
                {formErrors.password && (
                  <Text style={styles.fieldErrorText}>{formErrors.password}</Text>
                )}
              </View>

              {/* ログインボタン */}
              <TouchableOpacity
                style={[
                  styles.loginButton,
                  (isLoading || isLoggingIn) && styles.loginButtonDisabled,
                ]}
                onPress={handleLogin}
                disabled={isLoading || isLoggingIn}
              >
                <Text style={styles.loginButtonText}>
                  {(isLoading || isLoggingIn) ? 'ログイン中...' : 'ログイン'}
                </Text>
                <Text style={styles.loginButtonIcon}>→</Text>
              </TouchableOpacity>

              {/* 分割線 */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>または</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* パスワード再設定リンク */}
              <TouchableOpacity onPress={handleResetPassword} disabled={isLoading} style={{ alignSelf: 'center', marginBottom: 12 }}>
                <Text style={{ color: colors.primary }}>パスワードをお忘れですか？</Text>
              </TouchableOpacity>

            </View>

            {/* 新規登録リンク */}
            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>アカウントをお持ちでない方は</Text>
              <TouchableOpacity onPress={goToSignup} disabled={isLoading}>
                <Text style={styles.signupLink}>新規登録</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingTop: 60,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  errorText: {
    color: '#F44336',
    fontSize: 14,
    fontWeight: '500',
  },
  form: {
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputError: {
    borderColor: colors.error,
    backgroundColor: '#FFEBEE',
  },
  inputIcon: {
    fontSize: 16,
    marginRight: 10,
    color: colors.textSecondary,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: 0,
  },
  passwordToggle: {
    padding: 4,
  },
  passwordToggleText: {
    fontSize: 16,
  },
  fieldErrorText: {
    color: '#F44336',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  loginButton: {
    backgroundColor: '#8B4513',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    elevation: 4,
  },
  loginButtonDisabled: {
    backgroundColor: '#CCC',
    elevation: 0,
    boxShadow: 'none',
  },
  loginButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  loginButtonIcon: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    color: '#666',
    fontSize: 14,
    marginHorizontal: 16,
  },
  devNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  devNoticeIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  devNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#1976D2',
    lineHeight: 18,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    color: '#666',
    fontSize: 14,
    marginRight: 8,
  },
  signupLink: {
    color: '#8B4513',
    fontSize: 14,
    fontWeight: '600',
  },
});