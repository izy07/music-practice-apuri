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
  logger.debug('SignupScreen component initialized');
  
  const router = useRouter();
  const { user, isAuthenticated, isInitialized, fetchUserProfile } = useAuthAdvanced();
  
  // 新規登録画面では独立した認証処理を実装（世に出回っているアプリの一般的なパターン）
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 独立した認証処理関数（世に出回っているアプリの一般的なパターン）
  const signUp = async (formData: any): Promise<{ success: boolean; error?: string }> => {
    logger.debug('新規登録処理（簡素化版）:', formData.email);
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
        // エラーの詳細をログに記録（デバッグ用）
        logger.debug('新規登録エラー詳細:', {
          code: error.code,
          message: error.message,
          status: (error as any).status,
          fullError: JSON.stringify(error, Object.getOwnPropertyNames(error))
        });
        
        // ユーザーが既に存在する場合の処理（根本的に厳密なチェック）
        const errorMessage = error.message || '';
        const errorCode = error.code || '';
        const errorStatus = (error as any).status;
        
        // 根本的に厳密な判定：Supabaseの公式エラーコードのみをチェック
        // Supabaseの公式ドキュメントによると、既存ユーザーのエラーコードは 'user_already_exists'
        // エラーメッセージの文字列マッチングは、完全一致または特定のパターンのみ（誤判定を防ぐ）
        const isUserAlreadyExists = 
          errorCode === 'user_already_exists' ||
          errorCode === 'user_already_registered'; // 後方互換性のため残す
        
        // signup_disabledは「登録済み」ではなく「新規登録が無効」なので別扱い
        const isSignupDisabled = errorCode === 'signup_disabled';
        
        // エラーメッセージの文字列マッチング（完全一致パターンのみ、誤判定を防ぐ）
        const lowerMessage = errorMessage.toLowerCase();
        const hasExactAlreadyRegisteredMessage = 
          lowerMessage === 'user already registered' ||
          lowerMessage === 'email address is already registered' ||
          lowerMessage === 'user already exists' ||
          lowerMessage.includes('user already registered') && !lowerMessage.includes('not') && !lowerMessage.includes('cannot');
        
        // 最終判定：エラーコードが明確な場合のみ「登録済み」と判定
        const isUserAlreadyRegistered = isUserAlreadyExists || (hasExactAlreadyRegisteredMessage && errorCode);
        
        if (isUserAlreadyRegistered) {
          logger.debug('✅ ユーザーが既に存在します（厳密な判定）:', {
            code: errorCode,
            message: errorMessage,
            isUserAlreadyExists,
            hasExactAlreadyRegisteredMessage
          });
          setIsLoading(false);
          
          const userMessage = 'このメールアドレスは既に登録されています。\n\nメール確認が済んでいない場合は、Inbucket（http://127.0.0.1:54324）でメールを確認するか、ログイン画面から再度ログインしてください。';
          setError(userMessage);
          
          return { success: false, error: userMessage };
        }
        
        if (isSignupDisabled) {
          logger.debug('⚠️ 新規登録が無効化されています:', {
            code: errorCode,
            message: errorMessage
          });
          setIsLoading(false);
          const disabledMessage = '新規登録は現在無効になっています。管理者にお問い合わせください。';
          setError(disabledMessage);
          return { success: false, error: disabledMessage };
        }
        
        // その他のエラーの場合は、エラーメッセージをそのまま表示（「登録済み」と誤判定しない）
        const genericErrorMessage = errorMessage || '新規登録に失敗しました';
        logger.warn('⚠️ 新規登録エラー（既存ユーザー以外）:', {
          code: errorCode,
          status: errorStatus,
          message: errorMessage,
          isUserAlreadyExists,
          hasExactAlreadyRegisteredMessage
        });
        setError(genericErrorMessage);
        setIsLoading(false);
        return { success: false, error: genericErrorMessage };
      }
      
      if (!data.user) {
        logger.error('❌ ユーザー情報が取得できません');
        const errorMessage = 'ユーザー情報の取得に失敗しました。もう一度お試しください。';
        setError(errorMessage);
        setIsLoading(false);
        return { success: false, error: errorMessage };
      }
      
      logger.debug('✅ 新規登録成功:', { 
        userId: data.user.id, 
        hasSession: !!data.session,
        email: data.user.email 
      });
      
      // プロフィール作成はデータベーストリガー（handle_new_user）で自動的に行われる
      // トリガーはauth.usersにINSERTされたときに発火し、user_profilesを自動作成する
      // 手動でのプロフィール作成処理は削除（トリガーと重複する可能性があるため）
      // プロフィールが存在しない場合は、handleAuthenticatedUser関数でフォールバック処理が行われる
      logger.debug('✅ プロフィール作成はデータベーストリガーで自動処理されます');
      
      // セッションが確立されている場合は成功
      // セッションがない場合は、onAuthStateChangeで検出されるまで待つ
      if (data.session) {
        logger.debug('✅ セッション確立済み - onAuthStateChangeで処理されます');
        setIsLoading(false);
        return { success: true };
      } else if (data.user) {
        logger.debug('⏳ セッション未確立 - onAuthStateChangeで検出されるまで待機');
        // セッションが確立されるまで少し待つ（onAuthStateChangeで検出される）
        // 新規登録画面では手動でナビゲーションしない（_layout.tsxで処理）
        setIsLoading(false);
        return { success: true };
      } else {
        logger.error('❌ ユーザー情報が取得できません');
        const errorMessage = 'ユーザー情報の取得に失敗しました。もう一度お試しください。';
        setError(errorMessage);
        setIsLoading(false);
        return { success: false, error: errorMessage };
      }
    } catch (err) {
      // エラーは既にAlertで表示済み
      const errorMessage = '新規登録に失敗しました';
      setError(errorMessage);
      setIsLoading(false);
      return { success: false, error: errorMessage };
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

  // 新規登録成功時の処理
  const [signupSuccess, setSignupSuccess] = useState(false);
  
  // 注意: 新規登録成功後は、handleSignup内で即座にチュートリアル画面に遷移するため、
  // ここでの自動画面遷移は不要（削除済み）
  
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
      const result = await signUp(formData);
      logger.debug('📊 新規登録結果:', result);
      
      if (result.success) {
        logger.debug('✅ 新規登録成功 - 認証状態を更新してからチュートリアル画面に遷移します');
        setSignupSuccess(true);
        
        // 認証状態を更新してから画面遷移する（_layout.tsxの認証チェックと競合しないようにする）
        try {
          // セッションを確認
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData.session?.user) {
            logger.debug('✅ セッション確認成功 - 認証状態を更新', {
              userId: sessionData.session.user.id,
              email: sessionData.session.user.email,
            });
            // 認証状態を更新（同期的に待つ）
            await fetchUserProfile();
            logger.debug('✅ 認証状態更新完了 - チュートリアル画面に遷移');
          } else {
            // セッションが存在しない場合は、ポーリングで確認（指数バックオフ）
            logger.debug('⏳ セッション未確立 - ポーリングで確認を開始');
            let retryCount = 0;
            const maxRetries = 5;
            const baseDelay = 200; // ベース遅延時間（ms）
            
            while (retryCount < maxRetries) {
              // 指数バックオフ: 200ms, 400ms, 800ms, 1600ms, 3200ms
              const delay = baseDelay * Math.pow(2, retryCount);
              await new Promise(resolve => setTimeout(resolve, delay));
              
              const { data: retrySessionData } = await supabase.auth.getSession();
              if (retrySessionData.session?.user) {
                await fetchUserProfile();
                logger.debug(`✅ 認証状態更新完了（${retryCount + 1}回目の試行後） - チュートリアル画面に遷移`);
                break;
              }
              
              retryCount++;
              if (retryCount < maxRetries) {
                logger.debug(`⏳ セッション未確立 - ${delay}ms後に再試行（${retryCount + 1}/${maxRetries}）`);
              }
            }
            
            if (retryCount >= maxRetries) {
              logger.warn('⚠️ セッション確立を待機しましたが、タイムアウトしました。続行します。');
            }
          }
          
          // 認証状態更新後にチュートリアル画面に遷移
          logger.debug('🔄 チュートリアル画面への遷移を開始');
          router.replace('/(tabs)/tutorial');
          logger.debug('✅ チュートリアル画面への遷移完了');
        } catch (navError) {
          logger.error('❌ チュートリアル画面への遷移エラー:', navError);
          // フォールバック: 直接URLを変更
          if (typeof window !== 'undefined') {
            navigateWithBasePath('/(tabs)/tutorial');
          }
        }
      } else {
        logger.debug('❌ 新規登録失敗');
        const errorMessage = result.error || '登録に失敗しました。入力内容を確認してください。';
        
        // 既に登録されているユーザーの場合はログイン画面への誘導（根本的に厳密なチェック）
        // エラーメッセージの文字列マッチングは、完全一致または特定のパターンのみ（誤判定を防ぐ）
        const lowerErrorMessage = errorMessage.toLowerCase();
        const isAlreadyRegisteredMessage = 
          errorMessage.includes('既に登録されています') ||
          lowerErrorMessage === 'user already registered' ||
          lowerErrorMessage === 'email address is already registered' ||
          lowerErrorMessage === 'user already exists' ||
          (lowerErrorMessage.includes('user already registered') && !lowerErrorMessage.includes('not') && !lowerErrorMessage.includes('cannot'));
        
        if (isAlreadyRegisteredMessage) {
          // 既存ユーザーの場合のみ、エラーメッセージを設定
          setError(errorMessage);
          setUiError(errorMessage);
          
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
          // その他のエラーの場合は新規登録画面に留まる
          logger.debug('⚠️ 新規登録失敗（既存ユーザー以外のエラー） - 新規登録画面に留まります', {
            errorMessage
          });
          
          // error変数とuiError変数の両方に設定して確実に表示
          setError(errorMessage);
          setUiError(errorMessage);
          
          // 画面下のフィールドにも明示的にエラー表示（パスワード関連エラーのみ）
          setFormErrors(prev => ({
            ...prev,
            email: errorMessage.toLowerCase().includes('email') ? errorMessage : prev.email,
            password: errorMessage.toLowerCase().includes('password') ? errorMessage : prev.password,
          }));
        }
      }
    } catch (error) {
      logger.error('💥 新規登録処理エラー:', error);
      // エラーは既にAlertで表示済み
      setError('新規登録に失敗しました。もう一度お試しください。');
      Alert.alert('エラー', '新規登録に失敗しました。もう一度お試しください。');
    } finally {
      // 確実にisLoadingをfalseにする
      setIsLoading(false);
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
            {(error || uiError) && (
              <Animated.View
                style={[
                  styles.errorContainer,
                  { transform: [{ scale: pulseAnim }] },
                ]}
              >
                <Text style={styles.errorText}>⚠️ {error || uiError}</Text>
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
                    nativeID="signup-name-input"
                    accessibilityLabel="ニックネーム"
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
                    nativeID="signup-email-input"
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
                    nativeID="signup-password-input"
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
                    nativeID="signup-confirm-password-input"
                    accessibilityLabel="パスワード確認"
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
    ...createShadowStyle({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    }),
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
    ...createShadowStyle({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 1,
    }),
  },
  inputFocus: {
    elevation: 2,
    ...createShadowStyle({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.15,
      shadowRadius: 0,
      elevation: 2,
    }),
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
    ...createShadowStyle({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    }),
  },
  signupButtonDisabled: {
    backgroundColor: colors.textSecondary,
    elevation: 0,
    ...createShadowStyle({
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    }),
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