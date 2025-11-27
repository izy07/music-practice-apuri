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
import { ErrorHandler } from '@/lib/errorHandler';

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
    signInWithGoogle,
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
  const [uiError, setUiError] = useState<string | null>(null);
  
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

  // 認証状態に応じた自動遷移
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      logger.debug('ログイン成功 - 認証状態検出（遷移はRootLayoutに委譲）');
      // 画面遷移は`app/_layout.tsx`側の集中ロジックに任せる
    }
  }, [isAuthenticated, isLoading]);

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
      setUiError(error);
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
    
    if (!formData.password) {
      errors.password = 'パスワードを入力してください';
    } else if (formData.password.length < 8) {
      errors.password = 'パスワードは8文字以上で入力してください';
    } else if (!/(?=.*[a-z])(?=.*\d)/.test(formData.password)) {
      errors.password = 'パスワードは小文字・数字を含む必要があります';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ログイン処理
  const handleLogin = async () => {
    logger.debug('ログイン処理開始');
    
    if (!validateForm()) {
      logger.debug('フォームバリデーション失敗');
      return;
    }
    
    logger.debug('フォームバリデーション成功');
    logger.debug('ログインデータ:', { email: formData.email });
    
    try {
      const success = await signIn(formData);
      logger.debug('ログイン結果:', success);
      
      if (success) {
        logger.debug('ログイン成功 - 自動遷移を待機中');
        setUiError(null);
      } else {
        logger.debug('ログイン失敗');
        const fallbackMsg = error || 'メールアドレスまたはパスワードが正しくありません';
        setUiError(fallbackMsg);
        // Webでも確実に視認できるようフィールドエラーも表示
        setFormErrors(prev => ({
          ...prev,
          password: fallbackMsg,
        }));

        // 未登録ユーザーの場合は新規登録画面への誘導
        if (error?.includes('正しくありません') || error?.includes('not found')) {
          Alert.alert(
            'アカウントが見つかりません',
            'このメールアドレスは登録されていません。新規登録を行いますか？',
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
      ErrorHandler.handle(error, 'ログイン処理', true);
      Alert.alert('エラー', 'ログインに失敗しました。もう一度お試しください。');
    }
  };

  // Googleログイン処理
  const handleGoogleLogin = async () => {
    logger.debug('Googleログイン処理開始');
    
    try {
      const success = await signInWithGoogle();
      logger.debug('Googleログイン結果:', success);
      
      if (success) {
        logger.debug('Googleログイン成功 - 自動遷移を待機中');
        // useEffectで自動遷移が実行される
      } else {
        logger.debug('Googleログイン失敗');
        Alert.alert('エラー', 'Googleログインに失敗しました。もう一度お試しください。');
      }
    } catch (error) {
      ErrorHandler.handle(error, 'Googleログイン処理', true);
      Alert.alert('エラー', 'Googleログインに失敗しました。もう一度お試しください。');
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
        ? `${window.location.origin}/auth/callback`
        : 'exp+bolt-expo-nativewind://auth/callback';
        
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { 
        redirectTo,
      });
      
      if (resetError) {
        ErrorHandler.handle(resetError, 'パスワードリセットメール送信', true);
        setUiError(resetError.message || 'メール送信に失敗しました');
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
      setUiError(e?.message || 'メール送信に失敗しました');
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
    <SafeAreaView style={styles.container} edges={[]}>
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
            {(uiError || error) && (
              <Animated.View
                style={[
                  styles.errorContainer,
                  { transform: [{ scale: pulseAnim }] },
                ]}
              >
                <Text style={styles.errorText}>⚠️ {uiError || error}</Text>
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
                    editable={!isLoading}
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
                    editable={!isLoading}
                    selectionColor={colors.primary}
                    nativeID="login-password-input"
                    accessibilityLabel="パスワード"
                  />
                  <TouchableOpacity
                    style={styles.passwordToggle}
                    onPress={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
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
                  isLoading && styles.loginButtonDisabled,
                ]}
                onPress={handleLogin}
                disabled={isLoading}
              >
                <Text style={styles.loginButtonText}>
                  {isLoading ? 'ログイン中...' : 'ログイン'}
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

              {/* Googleログインボタン */}
              <TouchableOpacity
                style={[
                  styles.googleButton,
                  isLoading && styles.googleButtonDisabled,
                ]}
                onPress={handleGoogleLogin}
                disabled={isLoading}
              >
                <Text style={styles.googleButtonIcon}>🔍</Text>
                <Text style={styles.googleButtonText}>
                  {isLoading ? '処理中...' : (__DEV__ || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) ? 'Googleでログイン (開発版)' : 'Googleでログイン')}
                </Text>
              </TouchableOpacity>

              {/* ローカル開発環境の注意書き */}
              {(__DEV__ || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))) && (
                <View style={styles.devNotice}>
                  <Text style={styles.devNoticeIcon}>ℹ️</Text>
                  <Text style={styles.devNoticeText}>
                    開発環境: Googleログインはモック認証で動作します{'\n'}
                    本番環境では実際のGoogleアカウントでログインできます
                  </Text>
                </View>
              )}
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
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    elevation: 2,
  },
  googleButtonDisabled: {
    backgroundColor: '#F5F5F5',
    borderColor: '#CCC',
    elevation: 0,
    boxShadow: 'none',
  },
  googleButtonIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  googleButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
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