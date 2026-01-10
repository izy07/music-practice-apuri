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
  
  // 【修正】認証成功後の画面遷移を確実に実行
  // 画面フォーカス時と認証状態変更時の両方で処理を実行
  useFocusEffect(
    useCallback(() => {
      logger.debug('[ログイン画面 useFocusEffect] 実行開始（画面フォーカス時）', {
        isAuthenticated,
        isLoading,
        hasUser: !!user,
      });
      
      // 認証済みかつローディング完了の場合のみ処理
      if (!isAuthenticated || isLoading || !user) {
        logger.debug('[ログイン画面 useFocusEffect] 条件を満たさないため処理をスキップ');
        return;
      }
      
      // ログイン処理完了
      if (isLoggingIn) {
        setIsLoggingIn(false);
      }
      
      logger.debug('[ログイン画面 useFocusEffect] 認証成功 - 画面遷移を実行', {
        hasInstrument: hasInstrumentSelected(),
        needsTutorial: needsTutorial(),
        canAccessMain: canAccessMainApp(),
        userSelectedInstrumentId: user.selected_instrument_id,
      });
      
      // 画面遷移を実行
      const navigateToScreen = () => {
        try {
          const hasInstrument = hasInstrumentSelected();
          const needsTut = needsTutorial();
          const canAccess = canAccessMainApp();
          
          logger.debug('[ログイン画面 useFocusEffect] 画面遷移判定', {
            hasInstrument,
            needsTut,
            canAccess,
            userSelectedInstrumentId: user.selected_instrument_id,
          });
          
          if (hasInstrument || canAccess) {
            logger.debug('[ログイン画面 useFocusEffect] → カレンダー画面に遷移');
            router.replace('/(tabs)/index');
          } else if (needsTut) {
            logger.debug('[ログイン画面 useFocusEffect] → チュートリアル画面に遷移');
            router.replace('/(tabs)/tutorial');
          } else {
            logger.debug('[ログイン画面 useFocusEffect] → 楽器選択画面に遷移');
            router.replace('/(tabs)/instrument-selection');
          }
        } catch (navError) {
          logger.error('[ログイン画面 useFocusEffect] 画面遷移エラー:', navError);
          try {
            router.replace('/(tabs)/instrument-selection');
          } catch (fallbackError) {
            logger.error('[ログイン画面 useFocusEffect] フォールバックも失敗:', fallbackError);
          }
        }
      };
      
      // 少し遅延して実行（_layout.tsxとの競合を避ける）
      const timeoutId = setTimeout(navigateToScreen, 100);
      return () => clearTimeout(timeoutId);
    }, [isAuthenticated, isLoading, user, router, isLoggingIn, hasInstrumentSelected, needsTutorial, canAccessMainApp])
  );

  // 【修正】認証状態変更時の画面遷移（useEffectで確実に実行）
  useEffect(() => {
    logger.debug('[ログイン画面 useEffect] 実行開始（認証状態監視）', {
      isAuthenticated,
      isLoading,
      hasUser: !!user,
      segments: Array.isArray(segments) ? segments : [segments],
      isLoggingIn,
    });
    
    // 現在の画面が新規登録画面の場合は処理をスキップ
    const segmentsArray = Array.isArray(segments) ? segments : [segments];
    const isInSignupScreen = segmentsArray.length >= 2 && segmentsArray[0] === 'auth' && segmentsArray[1] === 'signup';
    if (isInSignupScreen) {
      logger.debug('[ログイン画面 useEffect] 新規登録画面にいるため処理をスキップ');
      return;
    }
    
    // ログイン画面にいることを確認
    const isInLoginScreen = segmentsArray.length >= 2 && segmentsArray[0] === 'auth' && segmentsArray[1] === 'login';
    if (!isInLoginScreen) {
      logger.debug('[ログイン画面 useEffect] ログイン画面にいないため処理をスキップ', { segments: segmentsArray });
      return;
    }
    
    // 認証済みかつローディング完了の場合のみ処理
    if (!isAuthenticated || isLoading || !user) {
      logger.debug('[ログイン画面 useEffect] 条件を満たさないため処理をスキップ', {
        isAuthenticated,
        isLoading,
        hasUser: !!user,
      });
      return;
    }
    
    // ログイン処理完了
    if (isLoggingIn) {
      setIsLoggingIn(false);
    }
    
    logger.debug('[ログイン画面 useEffect] 認証成功 - 画面遷移を実行', {
      hasInstrument: hasInstrumentSelected(),
      needsTutorial: needsTutorial(),
      canAccessMain: canAccessMainApp(),
      userSelectedInstrumentId: user.selected_instrument_id,
    });
    
    // ログイン成功時: カレンダーの日付を今日にリセット
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem('home_calendar_view_date');
        window.localStorage.setItem('login_success_reset_calendar', 'true');
      } catch (error) {
        // エラーは無視
      }
    }
    
    // 画面遷移を実行
    const navigateToScreen = () => {
      try {
        const hasInstrument = hasInstrumentSelected();
        const needsTut = needsTutorial();
        const canAccess = canAccessMainApp();
        
        logger.debug('[ログイン画面 useEffect] 画面遷移判定', {
          hasInstrument,
          needsTut,
          canAccess,
          userSelectedInstrumentId: user.selected_instrument_id,
        });
        
        if (hasInstrument || canAccess) {
          logger.debug('[ログイン画面 useEffect] → カレンダー画面に遷移');
          router.replace('/(tabs)/index');
        } else if (needsTut) {
          logger.debug('[ログイン画面 useEffect] → チュートリアル画面に遷移');
          router.replace('/(tabs)/tutorial');
        } else {
          logger.debug('[ログイン画面 useEffect] → 楽器選択画面に遷移');
          router.replace('/(tabs)/instrument-selection');
        }
      } catch (navError) {
        logger.error('[ログイン画面 useEffect] 画面遷移エラー:', navError);
        try {
          router.replace('/(tabs)/instrument-selection');
        } catch (fallbackError) {
          logger.error('[ログイン画面 useEffect] フォールバックも失敗:', fallbackError);
        }
      }
    };
    
    // 少し遅延して実行（_layout.tsxとの競合を避ける）
    const timeoutId = setTimeout(navigateToScreen, 100);
    return () => clearTimeout(timeoutId);
  }, [isAuthenticated, isLoading, user, router, isLoggingIn, segments, hasInstrumentSelected, needsTutorial, canAccessMainApp]);
  
  // タイムアウト時のフォールバック: isLoggingInがtrueのままになっている場合の安全装置
  useEffect(() => {
    if (isLoggingIn) {
      const timeoutId = setTimeout(() => {
        logger.warn('ログイン処理が長時間実行中のため、isLoggingInをリセットします');
        setIsLoggingIn(false);
        // エラーメッセージを表示（ただし、認証が成功している可能性もあるため、警告のみ）
        // プロフィール取得がタイムアウトした場合でも、ログイン自体は成功している可能性がある
        if (!isAuthenticated) {
          Alert.alert(
            'ログインタイムアウト',
            'ログイン処理がタイムアウトしました。ネットワーク接続を確認して再度お試しください。'
          );
        }
      }, 15000); // 15秒後にフォールバック（プロフィール取得のタイムアウト10秒 + 余裕5秒）
      
      return () => clearTimeout(timeoutId);
    }
  }, [isLoggingIn, isAuthenticated]);

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

              {/* Googleログインボタン */}
              <TouchableOpacity
                style={styles.googleButton}
                onPress={async () => {
                  setIsLoggingIn(true);
                  try {
                    await signInWithGoogle();
                  } catch (error) {
                    logger.error('Googleログインエラー:', error);
                    setIsLoggingIn(false);
                  }
                }}
                disabled={isLoggingIn}
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