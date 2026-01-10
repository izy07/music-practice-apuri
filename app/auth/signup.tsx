/**
 * 新規登録画面 - 世に出回っているアプリの一般的なパターン
 * 
 * 特徴:
 * - 認証状態に依存しない独立した画面
 * - 新規登録成功時は認証状態の変更を待つ
 * - 認証成功時は自動的にメインアプリに遷移
 * - 無限ループを回避
 */

import React, { useState, useEffect, useRef } from 'react';
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
import { useSegments } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COMMON_STYLES, APP_COLORS } from '@/lib/appStyles';
import logger from '@/lib/logger';
import { createShadowStyle } from '@/lib/shadowStyles';
import { useAuthAdvanced } from '@/hooks/useAuthAdvanced';
import { navigateWithBasePath } from '@/lib/navigationUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: screenWidth } = Dimensions.get('window');

// 落ち着いたカラーパレット
const colors = {
  primary: '#4A5568',      // 落ち着いたグレー
  primaryLight: '#718096', // ライトグレー
  secondary: '#8B7355',    // 落ち着いたブラウン
  background: APP_COLORS.BACKGROUND,   // 薄いグレー
  surface: APP_COLORS.SURFACE,      // 白
  text: APP_COLORS.TEXT,         // ダークグレー
  textSecondary: APP_COLORS.TEXT_SECONDARY, // ミディアムグレー
  border: '#E2E8F0',       // ソフトグレー
  error: '#E53E3E',        // ソフトレッド
  success: '#38A169',      // ソフトグリーン
  gradient: ['#4A5568', '#718096'], // 落ち着いたグラデーション
};

export default function SignupScreen() {
  // 初回のみログを出力（再レンダリング時のログ出力を防ぐ）
  const hasLoggedRef = useRef(false);
  if (!hasLoggedRef.current) {
    logger.debug('SignupScreen component initialized');
    hasLoggedRef.current = true;
  }
  
  const router = useRouter();
  const segments = useSegments();
  const { user, isAuthenticated, isLoading, isInitialized, signUp: signUpFromHook, signInWithGoogle, error: authError } = useAuthAdvanced();
  
  // 新規登録画面のローカル状態（UI用）
  const [localError, setLocalError] = useState<string | null>(null);
  
  // 画面遷移済みフラグ（無限ループを防ぐ）
  const hasNavigatedRef = useRef(false);
  
  
  const clearError = () => setLocalError(null);
  
  // フォーム状態
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [uiError, setUiError] = useState<string | null>(null);
  
  // アニメーション状態
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [pulseAnim] = useState(new Animated.Value(1));

  // コンポーネントマウント時の初期化
  useEffect(() => {
    // エラー状態をクリア
    setLocalError(null);
    
    // アニメーション開始
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
  }, []); // 依存配列を空にしてマウント時のみ実行

  // 認証状態が更新された時に画面遷移を実行（新規登録成功時の処理）
  useEffect(() => {
    // 既に遷移済みの場合はスキップ（無限ループを防ぐ）
    if (hasNavigatedRef.current) {
      return;
    }
    
    // 新規登録画面にいない場合はスキップ（他の画面では実行しない）
    const segmentsArray = Array.isArray(segments) ? segments : [segments];
    const isInSignupScreen = segmentsArray.length >= 2 && segmentsArray[0] === 'auth' && segmentsArray[segmentsArray.length - 1] === 'signup';
    if (!isInSignupScreen) {
      return;
    }
    
    // 認証状態が更新された場合のみ実行
    if (isAuthenticated && !isLoading) {
      logger.debug('新規登録成功 - 認証状態検出、画面遷移を実行', {
        isAuthenticated,
        isLoading,
        hasInstrument: user?.selected_instrument_id,
        needsTutorial: !user?.tutorial_completed,
      });
      
      // 遷移済みフラグを設定（無限ループを防ぐ）
      hasNavigatedRef.current = true;
      
      // エラー状態をクリア
      setLocalError(null);
      setUiError(null);
      
      // 新規登録成功時はチュートリアル画面に遷移
      // ログイン画面と同じパターンで画面遷移を実行
      logger.debug('新規登録成功 - チュートリアル画面に遷移');
      try {
        router.replace('/(tabs)/tutorial');
      } catch (navError) {
        logger.error('チュートリアル画面への遷移エラー:', navError);
        // フォールバック: 少し遅延してから再試行
        setTimeout(() => {
          try {
            router.replace('/(tabs)/tutorial');
          } catch (retryError) {
            logger.error('チュートリアル画面への遷移再試行エラー:', retryError);
          }
        }, 500);
      }
    }
  }, [isAuthenticated, isLoading, user, router, segments]);

  // エラーが変更された時のアニメーション
  useEffect(() => {
    const errorToShow = localError || authError || uiError;
    if (errorToShow) {
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
  }, [localError, authError, uiError]);

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
      errors.password = 'パスワードは小文字と数字を含む必要があります';
    }
    
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'パスワード確認を入力してください';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'パスワードが一致しません';
    }
    
    if (!formData.name.trim()) {
      errors.name = 'ニックネームを入力してください';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'ニックネームは2文字以上で入力してください';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 新規登録処理
  const handleSignup = async () => {
    logger.debug('📝 新規登録処理開始');
    
    if (!validateForm()) {
      logger.debug('❌ フォームバリデーション失敗');
      return;
    }
    
    logger.debug('✅ フォームバリデーション成功');
    logger.debug('📝 登録データ:', { 
      email: formData.email, 
      name: formData.name 
    });
    
    try {
      // useAuthAdvancedのsignUp関数を使用（認証状態の更新を統一管理）
      const success = await signUpFromHook({
        email: formData.email,
        password: formData.password,
        name: formData.name,
      });
      
      if (success) {
        logger.debug('✅ 新規登録成功 - 認証状態が更新されるのを待ちます');
        // 認証状態の更新を待つ（useEffectで画面遷移を実行）
        // isLoadingは認証状態が更新された時にuseEffectでfalseになる
        return; // 成功時はここで終了
      } else {
        logger.debug('❌ 新規登録失敗');
        const errorMessage = authError || '登録に失敗しました。入力内容を確認してください。';
        setLocalError(errorMessage);
        setUiError(errorMessage);
        
        // 既に登録されているユーザーの場合はログイン画面への誘導
        const lowerErrorMessage = errorMessage.toLowerCase();
        const isAlreadyRegisteredMessage = 
          errorMessage.includes('既に登録されています') ||
          lowerErrorMessage === 'user already registered' ||
          lowerErrorMessage === 'email address is already registered' ||
          lowerErrorMessage === 'user already exists' ||
          (lowerErrorMessage.includes('user already registered') && !lowerErrorMessage.includes('not') && !lowerErrorMessage.includes('cannot'));
        
        if (isAlreadyRegisteredMessage) {
          // 画面下のフィールドにも明示的にエラー表示
          setFormErrors(prev => ({
            ...prev,
            email: errorMessage,
          }));
          // 少し遅延してからアラートを表示（UI更新を待つ）
          setTimeout(() => {
            Alert.alert(
              'アカウントが既に存在します',
              'このメールアドレスは既に登録されています。ログインしますか？',
              [
                { text: 'キャンセル', style: 'cancel' },
                {
                  text: 'ログイン',
                  onPress: () => {
                    logger.debug('🎯 ログイン画面に遷移');
                    router.push('/auth/login');
                  },
                },
              ]
            );
          }, 100);
        } else {
          // 画面下のフィールドにも明示的にエラー表示
          setFormErrors(prev => ({
            ...prev,
            email: errorMessage.toLowerCase().includes('email') ? errorMessage : prev.email,
            password: errorMessage.toLowerCase().includes('password') ? errorMessage : prev.password,
          }));
        }
      }
    } catch (error) {
      logger.error('💥 新規登録処理エラー:', error);
      const errorMessage = error instanceof Error ? error.message : '新規登録に失敗しました。もう一度お試しください。';
      setLocalError(errorMessage);
      setUiError(errorMessage);
      Alert.alert('エラー', errorMessage);
    }
  };


  // ログイン画面への遷移
  const goToLogin = () => {
    logger.debug('🎯 ログイン画面に遷移');
    router.push('/auth/login');
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={styles.title}>新規登録</Text>
            
            {uiError && (
              <Animated.View style={[styles.errorContainer, { transform: [{ scale: pulseAnim }] }]}>
                <Text style={styles.errorText}>{uiError}</Text>
              </Animated.View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>メールアドレス</Text>
              <TextInput
                style={[styles.input, formErrors.email && styles.inputError]}
                placeholder="メールアドレスを入力"
                placeholderTextColor={colors.primaryLight}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
              />
              {formErrors.email && <Text style={styles.errorTextSmall}>{formErrors.email}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>パスワード</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={[styles.passwordInput, formErrors.password && styles.inputError]}
                  placeholder="8文字以上（小文字と数字を含む）"
                  placeholderTextColor={colors.primaryLight}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={formData.password}
                  onChangeText={(text) => setFormData({ ...formData, password: text })}
                />
                <TouchableOpacity 
                  style={styles.togglePassword} 
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text style={styles.togglePasswordText}>{showPassword ? '非表示' : '表示'}</Text>
                </TouchableOpacity>
              </View>
              {formErrors.password && <Text style={styles.errorTextSmall}>{formErrors.password}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>パスワード確認</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={[styles.passwordInput, formErrors.confirmPassword && styles.inputError]}
                  placeholder="パスワードを再入力"
                  placeholderTextColor={colors.primaryLight}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={formData.confirmPassword}
                  onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
                />
                <TouchableOpacity 
                  style={styles.togglePassword} 
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Text style={styles.togglePasswordText}>{showConfirmPassword ? '非表示' : '表示'}</Text>
                </TouchableOpacity>
              </View>
              {formErrors.confirmPassword && <Text style={styles.errorTextSmall}>{formErrors.confirmPassword}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>ニックネーム</Text>
              <TextInput
                style={[styles.input, formErrors.name && styles.inputError]}
                placeholder="表示名を入力"
                placeholderTextColor={colors.primaryLight}
                autoCapitalize="words"
                autoCorrect={false}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
              />
              {formErrors.name && <Text style={styles.errorTextSmall}>{formErrors.name}</Text>}
            </View>

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleSignup}
              disabled={isLoading}
            >
              {isLoading ? (
                <Text style={styles.buttonText}>登録中...</Text>
              ) : (
                <Text style={styles.buttonText}>新規登録</Text>
              )}
            </TouchableOpacity>

            {/* 分割線 */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>または</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google新規登録ボタン */}
            <TouchableOpacity
              style={styles.googleButton}
              onPress={async () => {
                try {
                  await signInWithGoogle();
                } catch (error) {
                  logger.error('Google新規登録エラー:', error);
                }
              }}
              disabled={isLoading}
            >
              <Text style={styles.googleIcon}>🔍</Text>
              <Text style={styles.googleButtonText}>Googleで新規登録</Text>
            </TouchableOpacity>

            <View style={styles.loginLinkContainer}>
              <Text style={styles.loginText}>
                既にアカウントをお持ちですか？
              </Text>
              <TouchableOpacity onPress={goToLogin} style={styles.loginLinkButton}>
                <Text style={styles.loginLinkText}>ログイン</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.termsContainer}>
              <View style={styles.termsTextContainer}>
                <Text style={styles.termsText}>新規登録すると</Text>
                <TouchableOpacity onPress={() => router.push('/terms-of-service')}>
                  <Text style={styles.termsLink}>利用規約</Text>
                </TouchableOpacity>
                <Text style={styles.termsText}>と</Text>
              </View>
              <View style={styles.termsTextContainer}>
                <TouchableOpacity onPress={() => router.push('/privacy-policy')}>
                  <Text style={styles.termsLink}>プライバシーポリシー</Text>
                </TouchableOpacity>
                <Text style={styles.termsText}>に同意したことになります</Text>
              </View>
            </View>
          </Animated.View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingVertical: 5,
    minHeight: '100%',
  },
  container: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    padding: 10,
  },
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    ...createShadowStyle({
      shadowColor: colors.primary,
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 8,
    }),
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 16,
  },
  inputGroup: {
    width: '100%',
    marginBottom: 10,
  },
  label: {
    fontSize: 15,
    color: colors.text,
    marginBottom: 5,
    fontWeight: '600',
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  passwordInput: {
    flex: 1,
    height: 50,
    paddingHorizontal: 15,
    fontSize: 16,
    color: colors.text,
  },
  togglePassword: {
    padding: 10,
  },
  togglePasswordText: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  inputError: {
    borderColor: colors.error,
    borderWidth: 2,
  },
  errorContainer: {
    width: '100%',
    backgroundColor: '#FED7D7',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.error,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  errorTextSmall: {
    color: colors.error,
    fontSize: 12,
    marginTop: 5,
    marginLeft: 5,
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: colors.secondary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    ...createShadowStyle({
      shadowColor: colors.secondary,
      shadowOpacity: 0.2,
      shadowRadius: 5,
      elevation: 5,
    }),
  },
  buttonDisabled: {
    backgroundColor: colors.primaryLight,
  },
  buttonText: {
    color: colors.surface,
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginLinkContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  loginText: {
    color: colors.textSecondary,
    fontSize: 15,
    marginBottom: 6,
  },
  loginLinkButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  loginLinkText: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 15,
  },
  termsContainer: {
    width: '100%',
    marginTop: 12,
    paddingHorizontal: 5,
  },
  termsTextContainer: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 1,
  },
  termsText: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 18,
    marginHorizontal: 1,
  },
  termsLink: {
    color: colors.primary,
    textDecorationLine: 'underline',
    fontWeight: '600',
    fontSize: 11,
    marginHorizontal: 1,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginHorizontal: 16,
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
    ...createShadowStyle({
      shadowColor: colors.primary,
      shadowOpacity: 0.1,
      shadowRadius: 5,
      elevation: 3,
    }),
  },
  googleIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  googleButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
