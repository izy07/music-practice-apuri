/**
 * パスワードリセット画面 - メールリンク経由でパスワードを再設定
 * 
 * 要件:
 * - メールリンクから遷移したユーザーのみアクセス可能
 * - 新しいパスワードを入力して更新
 * - 更新完了後はログイン画面に遷移
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
import { Eye, EyeOff, Lock, Check } from 'lucide-react-native';

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

export default function ResetPasswordScreen() {
  const router = useRouter();
  
  // フォーム状態
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  
  // アニメーション状態
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [successAnim] = useState(new Animated.Value(0));

  // セッション確認
  useEffect(() => {
    checkSession();
  }, []);

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

  // セッション確認
  const checkSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        Alert.alert(
          'セッションエラー',
          'パスワードリセットリンクが無効または期限切れです。',
          [
            {
              text: 'ログイン画面に戻る',
              onPress: () => router.replace('/auth/login'),
            },
          ]
        );
        return;
      }

      setIsValidSession(true);
    } catch (error) {
      console.error('セッション確認エラー:', error);
      router.replace('/auth/login');
    }
  };

  // フォームバリデーション
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.password) {
      errors.password = 'パスワードを入力してください';
    } else if (formData.password.length < 8) {
      errors.password = 'パスワードは8文字以上で入力してください';
    } else if (!/(?=.*[a-z])(?=.*\d)/.test(formData.password)) {
      errors.password = 'パスワードは小文字・数字を含む必要があります';
    }
    
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'パスワード確認を入力してください';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'パスワードが一致しません';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // パスワード更新処理
  const handleResetPassword = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: formData.password,
      });

      if (error) {
        console.error('パスワード更新エラー:', error);
        throw error;
      }
      
      // 成功アニメーション
      Animated.timing(successAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: false,
      }).start();

      // 成功メッセージ表示
      Alert.alert(
        'パスワード更新完了',
        '新しいパスワードでログインしてください。',
        [
          {
            text: 'ログイン画面に戻る',
            onPress: () => {
              // ログアウトしてからログイン画面に遷移
              supabase.auth.signOut().then(() => {
                router.replace('/auth/login');
              });
            },
          },
        ]
      );
      
    } catch (error) {
      console.error('パスワードリセット処理エラー:', error);
      Alert.alert(
        'エラー',
        'パスワードの更新に失敗しました。もう一度お試しください。'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ログイン画面への遷移
  const goToLogin = () => {
    router.replace('/auth/login');
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
  };

  if (!isValidSession) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} >
        <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
          <Text style={styles.loadingText}>セッションを確認中...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
              <Text style={styles.title}>新しいパスワード</Text>
              <Text style={styles.subtitle}>
                新しいパスワードを設定してください
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
              <Check size={24} color={colors.success} />
              <Text style={styles.successText}>パスワード更新完了！</Text>
            </Animated.View>

            {/* フォーム */}
            <View style={styles.form}>
              {/* 新しいパスワード */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>新しいパスワード</Text>
                <View style={[
                  styles.inputWrapper,
                  formErrors.password ? styles.inputError : null,
                ]}>
                  <Lock size={16} color={colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={formData.password}
                    onChangeText={(value) => updateField('password', value)}
                    placeholder="8文字以上（小文字・数字を含む）"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                    selectionColor={colors.primary}
                    nativeID="reset-password-input"
                    accessibilityLabel="新しいパスワード"
                  />
                  <TouchableOpacity
                    style={styles.passwordToggle}
                    onPress={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff size={16} color={colors.textSecondary} />
                    ) : (
                      <Eye size={16} color={colors.textSecondary} />
                    )}
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
                  formErrors.confirmPassword ? styles.inputError : null,
                ]}>
                  <Lock size={16} color={colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={formData.confirmPassword}
                    onChangeText={(value) => updateField('confirmPassword', value)}
                    placeholder="パスワードを再入力"
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    nativeID="reset-confirm-password-input"
                    accessibilityLabel="パスワード確認"
                    autoCorrect={false}
                    editable={!isLoading}
                    selectionColor={colors.primary}
                  />
                  <TouchableOpacity
                    style={styles.passwordToggle}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={16} color={colors.textSecondary} />
                    ) : (
                      <Eye size={16} color={colors.textSecondary} />
                    )}
                  </TouchableOpacity>
                </View>
                {formErrors.confirmPassword && (
                  <Text style={styles.fieldErrorText}>{formErrors.confirmPassword}</Text>
                )}
              </View>

              {/* パスワード更新ボタン */}
              <TouchableOpacity
                style={[
                  styles.resetButton,
                  isLoading ? styles.resetButtonDisabled : null,
                ]}
                onPress={handleResetPassword}
                disabled={isLoading}
              >
                <Text style={styles.resetButtonText}>
                  {isLoading ? '更新中...' : 'パスワードを更新'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* ログインリンク */}
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>ログイン画面に戻る</Text>
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
    paddingVertical: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  successContainer: {
    backgroundColor: '#E8F5E8',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  successText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
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
    paddingVertical: 12,
  },
  inputError: {
    borderColor: colors.error,
    backgroundColor: '#FFEBEE',
  },
  inputIcon: {
    marginRight: 10,
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
  fieldErrorText: {
    color: colors.error,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  resetButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  resetButtonDisabled: {
    backgroundColor: colors.textSecondary,
    elevation: 0,
  },
  resetButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
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
    fontSize: 14,
    fontWeight: '600',
  },
});
