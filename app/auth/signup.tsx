/**
 * 新規登録画面 - 世に出回っているアプリの一般的なパターン
 * 
 * 特徴:
 * - 認証状態に依存しない独立した画面
 * - 新規登録成功時は認証状態の変更を待つ
 * - 認証成功時は自動的にメインアプリに遷移
 * - 無限ループを回避
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
import { supabase } from '@/lib/supabase';
import { COMMON_STYLES, APP_COLORS } from '@/lib/appStyles';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';

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
  logger.debug('SignupScreen component initialized');
  
  const router = useRouter();
  
  // 新規登録画面では独立した認証処理を実装（世に出回っているアプリの一般的なパターン）
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 独立した認証処理関数（世に出回っているアプリの一般的なパターン）
  const signUp = async (formData: any) => {
    logger.debug('新規登録処理（一般的なパターン）:', formData.email);
    setIsLoading(true);
    setError(null);
    
    try {
      // Supabaseで直接新規登録処理（ニックネームをuser_metadataに含める）
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name.trim(), // ニックネームをuser_metadataに保存
            display_name: formData.name.trim(), // プロフィール用の表示名も設定
          }
        }
      });
      
      if (error) {
        ErrorHandler.handle(error, '新規登録', false);
        
        // ユーザーが既に存在する場合の処理
        if (error.message?.includes('User already registered') || 
            error.message?.includes('already exists') ||
            error.code === 'signup_disabled') {
          // メール確認待ちの可能性があるので、情報を表示
          logger.debug('ユーザーが既に存在します - メール確認状況を確認');
          setIsLoading(false);
          
          // エラーメッセージを更新
          const userMessage = 'このメールアドレスは既に登録されています。\n\nメール確認が済んでいない場合は、Inbucket（http://127.0.0.1:54324）でメールを確認するか、ログイン画面から再度ログインしてください。';
          setError(userMessage);
          
          return false;
        }
        
        setError(error.message || '新規登録に失敗しました');
        setIsLoading(false);
        return false;
      }
      
      logger.debug('新規登録成功:', data);
      logger.debug('ニックネーム設定:', formData.name.trim());
      
      logger.debug('セッションが確立されました');
      
      // セッションがない場合、自動的にサインインしてセッションを確立
      if (!data.session && data.user) {
        logger.debug('セッションなし - 自動サインイン開始');
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        
        if (signInError) {
          ErrorHandler.handle(signInError, '自動サインイン', false);
        } else {
          logger.debug('自動サインイン成功 - セッション確立');
        }
      }
      
      // プロフィール作成処理を追加
      if (data.user) {
        try {
          logger.debug('プロフィール作成開始');
          const { error: profileError } = await supabase
            .from('user_profiles')
            .insert({
              user_id: data.user.id,
              display_name: formData.name.trim(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          
          if (profileError) {
            ErrorHandler.handle(profileError, 'プロフィール作成', false);
            // プロフィール作成に失敗しても新規登録は成功とする
          } else {
            logger.debug('プロフィール作成成功');
          }
        } catch (profileErr) {
          ErrorHandler.handle(profileErr, 'プロフィール作成', false);
          // プロフィール作成に失敗しても新規登録は成功とする
        }
      }
      
      setIsLoading(false);
      return true;
    } catch (err) {
      ErrorHandler.handle(err, '新規登録', true);
      setError('新規登録に失敗しました');
      setIsLoading(false);
      return false;
    }
  };
  
  const signInWithGoogle = async () => {
    logger.debug('Google認証（一般的なパターン）');
    setIsLoading(true);
    setError(null);
    
    try {
      // Supabaseで直接Google認証処理
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      
      if (error) {
        ErrorHandler.handle(error, 'Google認証', true);
        setError(error.message || 'Google認証に失敗しました');
        setIsLoading(false);
        return false;
      }
      
      logger.debug('Google認証成功:', data);
      setIsLoading(false);
      return true;
    } catch (err) {
      ErrorHandler.handle(err, 'Google認証', true);
      setError('Google認証に失敗しました');
      setIsLoading(false);
      return false;
    }
  };
  
  const clearError = () => setError(null);
  
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
  const [successAnim] = useState(new Animated.Value(0));

  // 新規登録画面では認証状態チェックを完全に無効化（無限ループ完全停止）
  useEffect(() => {
    // 認証状態をリセット
    clearError();
  }, []); // 依存配列を空にして無限ループを完全に停止

  // 新規登録成功時の処理（認証状態の変更を待つ - 無限ループ完全停止）
  const [signupSuccess, setSignupSuccess] = useState(false);
  
  useEffect(() => {
    if (signupSuccess) {
      setUiError(null);
      
      // 成功アニメーションを表示
      Animated.timing(successAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: false,
      }).start();
      
      // アラートは表示せず、認証フローに任せる
      // _layout.tsx が認証状態を検知して自動的に適切な画面に遷移する
    }
  }, [signupSuccess, successAnim]); // 依存配列を適切に設定

  // 新規登録画面では認証状態をリセット（無限ループ完全停止）
  useEffect(() => {
    // 認証状態をクリア
    clearError();
    
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
  }, []); // 依存配列を空にして無限ループを完全に停止

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
      // 新規登録処理を実行
      const success = await signUp(formData);
      logger.debug('📊 新規登録結果:', success);
      
    if (success) {
        logger.debug('✅ 新規登録成功 - チュートリアル画面に遷移');
        setSignupSuccess(true);
        
        // 即座にチュートリアル画面に遷移（認証状態の更新を待たない）
        setTimeout(() => {
          logger.debug('🚀 チュートリアル画面に遷移');
          router.replace('/(tabs)/tutorial');
        }, 500); // アニメーション表示のために短い遅延
    } else {
      logger.debug('❌ 新規登録失敗');
        const fallbackMsg = error || '登録に失敗しました。メールが既に登録済みか、入力内容に誤りがあります。';
        setUiError(fallbackMsg);
        // 画面下のフィールドにも明示的にエラー表示
        setFormErrors(prev => ({
          ...prev,
          email: fallbackMsg,
          password: fallbackMsg.toLowerCase().includes('password') ? fallbackMsg : prev.password,
        }));
        
        // 既に登録されているユーザーの場合はログイン画面への誘導
        if (error?.includes('既に登録されています') || error?.includes('already exists') || error?.includes('User already registered')) {
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
        }
      }
    } catch (error) {
      logger.error('💥 新規登録処理エラー:', error);
      ErrorHandler.handle(error, '新規登録処理', true);
      Alert.alert('エラー', '新規登録に失敗しました。もう一度お試しください。');
    }
  };

  // Google新規登録処理
  const handleGoogleSignup = async () => {
    logger.debug('🔐 Google新規登録処理開始');
    
    try {
    const success = await signInWithGoogle();
      logger.debug('📊 Google新規登録結果:', success);
      
    if (success) {
        logger.debug('✅ Google新規登録成功 - 自動遷移を待機中');
        // useEffectで自動遷移が実行される
      } else {
        logger.debug('❌ Google新規登録失敗');
        Alert.alert('エラー', 'Google新規登録に失敗しました。もう一度お試しください。');
      }
    } catch (error) {
      logger.error('💥 Google新規登録処理エラー:', error);
      ErrorHandler.handle(error, 'Google新規登録処理', true);
      Alert.alert('エラー', 'Google新規登録に失敗しました。もう一度お試しください。');
    }
  };

  // ログイン画面への遷移
  const goToLogin = () => {
    logger.debug('🎯 ログイン画面に遷移');
    router.push('/auth/login');
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
              <View style={styles.logoContainer}>
                <Text style={styles.logoIcon}>🎵</Text>
              </View>
              <Text style={styles.title}>新規登録</Text>
              <Text style={styles.subtitle}>
                アカウントを作成して音楽練習を始めましょう
              </Text>
            </View>

            {/* 成功メッセージ */}
            <Animated.View
              style={[
                styles.successContainer,
                {
                  opacity: successAnim,
                  transform: [
                    {
                      scale: successAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={styles.successText}>🎉 登録完了！</Text>
              <Text style={styles.successSubtext}>
                チュートリアル画面に移動します...
              </Text>
            </Animated.View>

            {/* エラー表示 */}
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
              {/* ニックネーム */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>ニックネーム</Text>
                <View style={[
                  styles.inputWrapper,
                  formErrors.name ? styles.inputError : styles.inputFocus,
                ]}>
                  <View style={styles.inputIconContainer}>
                    <Text style={styles.inputIcon}>👤</Text>
                  </View>
                  <TextInput
                    style={styles.textInput}
                    value={formData.name}
                    onChangeText={(value) => updateField('name', value)}
                    placeholder="ニックネームを入力"
                    placeholderTextColor={colors.textSecondary}
                    autoCapitalize="words"
                    autoCorrect={false}
                    editable={!isLoading}
                    selectionColor={colors.primary}
                  />
                </View>
                {formErrors.name && (
                  <Text style={styles.fieldErrorText}>{formErrors.name}</Text>
                )}
              </View>

              {/* メールアドレス */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>メールアドレス</Text>
                <View style={[
                  styles.inputWrapper,
                  formErrors.email ? styles.inputError : styles.inputFocus,
                ]}>
                  <View style={styles.inputIconContainer}>
                    <Text style={styles.inputIcon}>✉️</Text>
                  </View>
                  <TextInput
                    style={styles.textInput}
                    value={formData.email}
                    onChangeText={(value) => updateField('email', value)}
                    placeholder="your@email.com"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                    selectionColor={colors.primary}
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
                  formErrors.password ? styles.inputError : styles.inputFocus,
                ]}>
                  <View style={styles.inputIconContainer}>
                    <Text style={styles.inputIcon}>✳️</Text>
                  </View>
                  <TextInput
                    style={styles.textInput}
                    value={formData.password}
                    onChangeText={(value) => updateField('password', value)}
                    placeholder="8文字以上（小文字と数字を含む）"
                    placeholderTextColor={colors.textSecondary}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                    selectionColor={colors.primary}
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

              {/* パスワード確認 */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>パスワード確認</Text>
                <View style={[
                  styles.inputWrapper,
                  formErrors.confirmPassword ? styles.inputError : styles.inputFocus,
                ]}>
                  <View style={styles.inputIconContainer}>
                    <Text style={styles.inputIcon}>✳️</Text>
                  </View>
                  <TextInput
                    style={styles.textInput}
                    value={formData.confirmPassword}
                    onChangeText={(value) => updateField('confirmPassword', value)}
                    placeholder="パスワードを再入力"
                    placeholderTextColor={colors.textSecondary}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                    selectionColor={colors.primary}
                  />
                  <TouchableOpacity
                    style={styles.passwordToggle}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isLoading}
                  >
                    <Text style={styles.passwordToggleText}>
                      {showConfirmPassword ? '👀' : '🔒'}
                    </Text>
                  </TouchableOpacity>
                </View>
                {formErrors.confirmPassword && (
                  <Text style={styles.fieldErrorText}>{formErrors.confirmPassword}</Text>
                )}
              </View>

              {/* 新規登録ボタン */}
              <TouchableOpacity
                style={[
                  styles.signupButton,
                  isLoading ? styles.signupButtonDisabled : null,
                ]}
                onPress={handleSignup}
                disabled={isLoading}
              >
                <View style={styles.buttonContent}>
                  <Text style={styles.signupButtonText}>
                    {isLoading ? '登録中...' : '新規登録'}
                  </Text>
                  <View style={styles.buttonIcon}>
                    <Text style={styles.signupButtonIcon}>→</Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* 分割線 */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>または</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Google新規登録ボタン */}
              <TouchableOpacity
                style={[
                  styles.googleButton,
                  isLoading ? styles.googleButtonDisabled : null,
                ]}
                onPress={handleGoogleSignup}
                disabled={isLoading}
              >
                <View style={styles.googleButtonContent}>
                  <View style={styles.googleIconContainer}>
                    <Text style={styles.googleButtonIcon}>G</Text>
                  </View>
                  <Text style={styles.googleButtonText}>
                    {isLoading ? '処理中...' : 'Googleで新規登録'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* 利用規約 */}
            <View style={styles.termsContainer}>
              <Text style={styles.termsText}>
                新規登録することで、
                <TouchableOpacity onPress={() => router.push('/terms-of-service')}>
                  <Text style={styles.linkText}>利用規約</Text>
                </TouchableOpacity>
                および
                <TouchableOpacity onPress={() => router.push('/privacy-policy')}>
                  <Text style={styles.linkText}>プライバシーポリシー</Text>
                </TouchableOpacity>
                に同意したものとみなされます。
              </Text>
            </View>

            {/* ログインリンク */}
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>既にアカウントをお持ちの方は</Text>
              <TouchableOpacity onPress={goToLogin} disabled={isLoading}>
                  <Text style={styles.loginLink}>ログイン</Text>
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
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  header: {
    alignItems: 'center',
    marginBottom: -20,
    marginTop: 0,
  },
  logoContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  logoIcon: {
    fontSize: 24,
    color: colors.primary,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 0,
  },
  successContainer: {
    backgroundColor: '#F0F9F0',
    borderRadius: 10,
    padding: 16,
    marginBottom: 0,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#38A169',
  },
  successText: {
    color: '#38A169',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  successSubtext: {
    color: '#38A169',
    fontSize: 14,
  },
  errorContainer: {
    backgroundColor: '#FEF5F5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 0,
    borderLeftWidth: 4,
    borderLeftColor: '#E53E3E',
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: '500',
  },
  form: {
    marginBottom: 8,
    marginTop: -40,
  },
  inputContainer: {
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  inputFocus: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 0,
  },
  inputError: {
    borderColor: colors.error,
    backgroundColor: '#FEF5F5',
  },
  inputIconContainer: {
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  inputIcon: {
    fontSize: 14,
    color: '#FF6B35', // 明るいオレンジ
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 0,
  },
  passwordToggle: {
    padding: 2,
  },
  passwordToggleText: {
    fontSize: 14,
    color: '#FF6B35', // 明るいオレンジ
  },
  fieldErrorText: {
    color: colors.error,
    fontSize: 13,
    marginTop: 6,
    marginLeft: 4,
    fontWeight: '500',
  },
  signupButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 6,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  signupButtonDisabled: {
    backgroundColor: colors.textSecondary,
    elevation: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signupButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
  buttonIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupButtonIcon: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
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
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  googleButtonDisabled: {
    backgroundColor: colors.background,
    borderColor: colors.textSecondary,
    elevation: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIconContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4A5568',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  googleButtonIcon: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  googleButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  termsContainer: {
    marginBottom: 8,
    marginHorizontal: 10, // 左右の余白を減らす
  },
  termsText: {
    color: colors.textSecondary,
    fontSize: 11, // フォントサイズを少し小さく
    textAlign: 'center',
    lineHeight: 16, // 行間を調整
  },
  linkText: {
    color: colors.primary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginRight: 8,
  },
  loginLink: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
});