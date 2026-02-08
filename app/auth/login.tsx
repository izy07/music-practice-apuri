/**
 * ログイン画面 - 徹底的に設計し直した認証システム
 * 
 * 要件:
 * - ログイン成功 + 楽器選択済み → メイン画面
 * - ログイン成功 + 楽器未選択 → チュートリアル画面
 * - ログイン失敗（未登録） → 新規登録画面への誘導
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { useRouter, useSegments, useFocusEffect } from 'expo-router';
import { useAuthAdvanced } from '@/hooks/useAuthAdvanced';
import { supabase } from '@/lib/supabase';
import logger from '@/lib/logger';
import { getBasePath, navigateToAppropriateScreen } from '@/lib/navigationUtils';
import { ErrorHandler } from '@/lib/errorHandler';
import { signIn as signInService } from '@/lib/authService';
import { getAuthErrorInfo, AuthErrorType } from '@/lib/authHelpers';

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
  // 初回のみログを出力（再レンダリング時のログ出力を防ぐ）
  const hasLoggedRef = useRef(false);
  if (!hasLoggedRef.current) {
    logger.debug('LoginScreen component initialized');
    hasLoggedRef.current = true;
  }
  
  const router = useRouter();
  const segments = useSegments();
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
  const [isLoggingIn, setIsLoggingIn] = useState(false); // ログイン処理中のローカル状態
  const [errorType, setErrorType] = useState<AuthErrorType | null>(null); // エラーの種類
  
  // アニメーション状態
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [pulseAnim] = useState(new Animated.Value(1));
  
  // 認証成功後の画面遷移（根本的な修正版）
  // 【修正】useFocusEffectで認証状態を監視し、画面がフォーカスされているときのみ画面遷移を実行
  // これにより、Root Layoutがマウントされる前にナビゲーションが実行されることを防ぐ
  useFocusEffect(
    useCallback(() => {
      // ログイン画面にいることを確認（最初に確認）
      const segmentsArray = Array.isArray(segments) ? segments : [segments];
      const isInLoginScreen = segmentsArray.length >= 2 && segmentsArray[0] === 'auth' && segmentsArray[1] === 'login';
      if (!isInLoginScreen) {
        return;
      }

      // 認証済みかつローディング完了の場合のみ処理
      if (!isAuthenticated || isLoading || !user) {
        return;
      }
        
      // ログイン処理完了
      if (isLoggingIn) {
        setIsLoggingIn(false);
      }
        
      // ログイン成功時: カレンダーの日付を今日にリセット
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          window.localStorage.removeItem('home_calendar_view_date');
          window.localStorage.setItem('login_success_reset_calendar', 'true');
        } catch (error) {
          // エラーは無視
        }
      }

      // 既存ユーザーの判定: last_sign_in_atが存在し、created_atと異なる場合
      const isExistingUser = user.last_sign_in_at && user.created_at && 
        new Date(user.last_sign_in_at).getTime() > new Date(user.created_at).getTime() + 60000;
      
      // 既存ユーザーで楽器IDが取得できていない場合、カレンダー画面に遷移（楽器情報は後で取得される）
      if (isExistingUser && !user.selected_instrument_id) {
        logger.debug('[ログイン画面] 既存ユーザー → カレンダー画面に遷移', { userId: user.id });
        // ナビゲーションを次のフレームで実行して、Root Layoutが確実にマウントされるようにする
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            router.replace('/(tabs)/index');
          });
        });
        return;
      }

      // 通常の画面遷移ロジック
      const hasInstrument = hasInstrumentSelected();
      const needsTut = needsTutorial();
      const canAccess = canAccessMainApp();

      const targetPath = hasInstrument || canAccess
        ? '/(tabs)/index'
        : needsTut
        ? '/(tabs)/tutorial'
        : '/(tabs)/instrument-selection';

      logger.debug('[ログイン画面] 認証成功 → 画面遷移:', targetPath);
      // ナビゲーションを次のフレームで実行して、Root Layoutが確実にマウントされるようにする
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          router.replace(targetPath as any);
        });
      });
    }, [isAuthenticated, isLoading, user, router, isLoggingIn, segments, hasInstrumentSelected, needsTutorial, canAccessMainApp])
  );

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
    setErrorType(null);
    
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
      
      // useAuthAdvancedのsignInを使用（認証状態の更新を確実に行うため）
      // エラー情報を取得するため、エラーが発生した場合はsignInServiceを使用してエラー情報を取得
      const success = await signIn(formData);
      
      logger.debug('ログイン結果確認:', { 
        success, 
        isAuthenticated, 
        isLoading,
        error: error || 'なし',
        hasUser: !!user
      });
      
      if (success) {
        logger.debug('ログイン成功 - 認証状態の更新を待機中');
        setFormErrors({});
        setErrorType(null);
        
        // ログイン処理が完了したので、isLoggingInをリセット
        setIsLoggingIn(false);
        
        logger.debug('ログイン成功 - 認証状態の更新と画面遷移は自動的に処理されます');
      } else {
        // ログイン失敗時は即座にフラグをリセット
        setIsLoggingIn(false);
        
        // エラー情報を取得（error stateから）
        // error stateはuseAuthAdvancedのsignInで設定されたエラーメッセージ（文字列）
        // エラーメッセージからエラー種別を判定
        const errorInfo = getAuthErrorInfo(error || 'ログインに失敗しました');
        setErrorType(errorInfo.type);
        
        logger.debug('ログイン失敗', { 
          success, 
          errorType: errorInfo.type,
          errorMessage: errorInfo.userFriendlyMessage,
          isAuthenticated,
          errorFromState: error
        });
        
        // エラーメッセージを設定（エラー種別に応じたメッセージを使用）
        const errorMessage = errorInfo.userFriendlyMessage || error || 'ログインに失敗しました';
        
        // Webでも確実に視認できるようフィールドエラーも表示
        setFormErrors(prev => ({
          ...prev,
          password: errorMessage,
        }));

        // エラーの種類に応じたAlert表示
        let alertTitle = 'ログイン失敗';
        if (errorInfo.type === 'network') {
          alertTitle = 'ネットワークエラー';
        } else if (errorInfo.type === 'authentication') {
          alertTitle = '認証エラー';
        } else if (errorInfo.type === 'rate_limit') {
          alertTitle = 'リクエスト制限';
        } else if (errorInfo.type === 'email_not_confirmed') {
          alertTitle = 'メール確認が必要です';
        }
        
        Alert.alert(
          alertTitle,
          errorMessage,
          [{ text: 'OK' }]
        );

        // 認証エラーの場合は新規登録画面への誘導を表示
        if (errorInfo.type === 'authentication' || errorInfo.type === 'email_not_confirmed') {
          setTimeout(() => {
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
          }, 500);
        }
      }
    } catch (error) {
      logger.error('ログイン処理で例外が発生:', error);
      // 例外が発生した場合も確実にisLoggingInをリセット
      setIsLoggingIn(false);
      
      // エラー情報を取得
      const errorInfo = getAuthErrorInfo(error);
      setErrorType(errorInfo.type);
      
      const errorMessage = errorInfo.userFriendlyMessage || (error instanceof Error ? error.message : 'ログインに失敗しました。もう一度お試しください。');
      
      // エラーの種類に応じたAlert表示
      let alertTitle = 'エラー';
      if (errorInfo.type === 'network') {
        alertTitle = 'ネットワークエラー';
      } else if (errorInfo.type === 'authentication') {
        alertTitle = '認証エラー';
      }
      
      // 例外エラーはuseAuthAdvancedのerrorに設定されないため、Alertで表示
      Alert.alert(alertTitle, errorMessage);
      
      // フィールドエラーも表示
      setFormErrors(prev => ({
        ...prev,
        password: errorMessage,
      }));
    } finally {
      // 念のため、finallyブロックでもisLoggingInをリセット（上記のsetIsLoggingIn(false)が実行されない場合に備える）
      setIsLoggingIn(false);
    }
  };


  // パスワード再設定（未実装・テスト中）
  const handleResetPassword = () => {
    Alert.alert(
      '未実装です',
      'パスワード再設定はテスト中です。現在は動きません。',
      [{ text: 'OK' }]
    );
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
            {(error || errorType) && (
              <Animated.View
                style={[
                  styles.errorContainer,
                  { 
                    transform: [{ scale: pulseAnim }],
                    backgroundColor: errorType === 'network' ? '#FFF3E0' : errorType === 'authentication' ? '#FFEBEE' : '#FFEBEE',
                    borderLeftColor: errorType === 'network' ? '#FF9800' : errorType === 'authentication' ? '#F44336' : '#F44336',
                  },
                ]}
              >
                <View style={styles.errorHeader}>
                  {errorType === 'network' && <Text style={styles.errorIcon}>📡</Text>}
                  {errorType === 'authentication' && <Text style={styles.errorIcon}>🔒</Text>}
                  {errorType === 'rate_limit' && <Text style={styles.errorIcon}>⏱️</Text>}
                  {errorType === 'email_not_confirmed' && <Text style={styles.errorIcon}>✉️</Text>}
                  {!errorType && <Text style={styles.errorIcon}>⚠️</Text>}
                  <Text style={[styles.errorTitle, { color: errorType === 'network' ? '#E65100' : '#D32F2F' }]}>
                    {errorType === 'network' && 'ネットワークエラー'}
                    {errorType === 'authentication' && '認証エラー'}
                    {errorType === 'rate_limit' && 'リクエスト制限'}
                    {errorType === 'email_not_confirmed' && 'メール確認が必要です'}
                    {!errorType && 'エラー'}
                  </Text>
                </View>
                <Text style={[styles.errorText, { color: errorType === 'network' ? '#E65100' : '#D32F2F' }]}>
                  {error || 'ログインに失敗しました'}
                </Text>
                {error && !errorType && (
                  <Text style={styles.errorHint}>
                    💡 もう一度お試しください。
                  </Text>
                )}
                {errorType === 'network' && (
                  <Text style={styles.errorHint}>
                    💡 インターネット接続を確認してから、もう一度お試しください。
                  </Text>
                )}
                {errorType === 'authentication' && (
                  <Text style={styles.errorHint}>
                    💡 メールアドレスまたはパスワードが正しくない可能性があります。入力内容を確認してください。
                  </Text>
                )}
                {errorType === 'rate_limit' && (
                  <Text style={styles.errorHint}>
                    💡 しばらく待ってから、もう一度お試しください。
                  </Text>
                )}
                {errorType === 'email_not_confirmed' && (
                  <Text style={styles.errorHint}>
                    💡 登録時に送信されたメールを確認して、メールアドレスを認証してください。
                  </Text>
                )}
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
                    editable={!isLoggingIn}
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
                    editable={!isLoggingIn}
                    selectionColor={colors.primary}
                    nativeID="login-password-input"
                    accessibilityLabel="パスワード"
                  />
                  <TouchableOpacity
                    style={styles.passwordToggle}
                    onPress={() => setShowPassword(!showPassword)}
                    disabled={isLoggingIn}
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
                  isLoggingIn && styles.loginButtonDisabled,
                ]}
                onPress={handleLogin}
                disabled={isLoggingIn}
              >
                <Text style={styles.loginButtonText}>
                  {isLoggingIn ? 'ログイン中...' : 'ログイン'}
                </Text>
                <Text style={styles.loginButtonIcon}>→</Text>
              </TouchableOpacity>

              {/* 分割線 */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>または</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Googleログインボタン（未実装・テスト中） */}
              <TouchableOpacity
                style={styles.googleButton}
                onPress={() => {
                  Alert.alert(
                    'テスト中です',
                    'Googleでログインは未実装です。現在は動きません。',
                    [{ text: 'OK' }]
                  );
                }}
              >
                <Text style={styles.googleIcon}>🔍</Text>
                <Text style={styles.googleButtonText}>Googleでログイン</Text>
              </TouchableOpacity>

              {/* パスワード再設定リンク */}
              <TouchableOpacity onPress={handleResetPassword} disabled={isLoggingIn} style={{ alignSelf: 'center', marginTop: 8, marginBottom: 8 }}>
                <Text style={{ color: colors.primary }}>パスワードをお忘れですか？</Text>
              </TouchableOpacity>

            </View>

            {/* 新規登録リンク */}
            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>アカウントをお持ちでない方は</Text>
              <TouchableOpacity onPress={goToSignup} disabled={isLoggingIn}>
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
    paddingTop: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  errorIcon: {
    fontSize: 18,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D32F2F',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  errorHint: {
    color: '#757575',
    fontSize: 12,
    marginTop: 8,
    lineHeight: 18,
  },
  form: {
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 16,
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
    marginVertical: 16,
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
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginTop: 8,
    elevation: 2,
  },
  googleIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  googleButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
  },
});