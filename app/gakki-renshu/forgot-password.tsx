import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Mail, ArrowLeft } from 'lucide-react-native';
import { useAuthAdvanced } from '@/hooks/useAuthAdvanced';
import { createShadowStyle } from '@/lib/shadowStyles';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { resetPassword } = useAuthAdvanced();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailFocused, setEmailFocused] = useState(false);

  const validateEmail = (): boolean => {
    const mail = email.trim().toLowerCase();
    if (!mail) {
      setError('メールアドレスを入力してください');
      return false;
    }
    const okEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail);
    if (!okEmail) {
      setError('メールアドレスの形式が正しくありません');
      return false;
    }
    return true;
  };

  const handleSendResetEmail = async () => {
    setError(null);
    if (!validateEmail()) {
      return;
    }

    setLoading(true);
    try {
      const success = await resetPassword(email.trim().toLowerCase());
      
      if (success) {
        setEmailSent(true);
        Alert.alert(
          'メールを送信しました',
          'パスワードリセット用のメールを送信しました。メール内のリンクからパスワードを再設定してください。',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        // エラーはuseAuthAdvancedから取得される
        setError('メールの送信に失敗しました。メールアドレスを確認してください。');
      }
    } catch (e: any) {
      setError(e.message || 'メールの送信に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 戻るボタン */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            disabled={loading}
          >
            <ArrowLeft size={24} color="#4A5568" />
          </TouchableOpacity>

          {/* ヘッダー */}
          <View style={styles.header}>
            <Text style={styles.title}>パスワードを忘れた方</Text>
            <Text style={styles.subtitle}>
              登録済みのメールアドレスを入力してください{'\n'}
              パスワードリセット用のメールを送信します
            </Text>
          </View>

          {/* フォーム */}
          <View style={styles.formContainer}>
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {emailSent ? (
              <View style={styles.successContainer}>
                <Text style={styles.successText}>
                  メールを送信しました。{'\n'}
                  メール内のリンクからパスワードを再設定してください。
                </Text>
              </View>
            ) : (
              <>
                {/* メールアドレス入力 */}
                <View style={styles.inputWrapper}>
                  <View style={[
                    styles.inputContainer,
                    emailFocused && styles.inputFocused,
                    error && styles.inputError
                  ]}>
                    <Mail
                      size={20}
                      color={emailFocused ? '#4A5568' : '#9CA3AF'}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="メールアドレス"
                      placeholderTextColor="#9CA3AF"
                      autoCapitalize="none"
                      keyboardType="email-address"
                      autoComplete="email"
                      value={email}
                      onChangeText={(text) => {
                        setEmail(text);
                        setError(null);
                      }}
                      onFocus={() => setEmailFocused(true)}
                      onBlur={() => setEmailFocused(false)}
                      editable={!loading}
                    />
                  </View>
                </View>

                {/* 送信ボタン */}
                <TouchableOpacity
                  style={[
                    styles.button,
                    (loading || !email.trim()) && styles.buttonDisabled
                  ]}
                  onPress={handleSendResetEmail}
                  disabled={loading || !email.trim()}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.buttonText}>リセットメールを送信</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* ログイン画面に戻る */}
            <TouchableOpacity
              style={styles.backToLoginButton}
              onPress={() => router.back()}
              disabled={loading}
            >
              <Text style={styles.backToLoginText}>ログイン画面に戻る</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    ...createShadowStyle({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    }),
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    textAlign: 'center',
  },
  successContainer: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  successText: {
    color: '#166534',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  inputWrapper: {
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    minHeight: 48,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    paddingVertical: 0,
  },
  inputFocused: {
    borderColor: '#4A5568',
    backgroundColor: '#FFFFFF',
  },
  inputError: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  button: {
    backgroundColor: '#4A5568',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginTop: 4,
    ...createShadowStyle({
      shadowColor: '#4A5568',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 3,
    }),
  },
  buttonDisabled: {
    backgroundColor: '#D1D5DB',
    ...createShadowStyle({
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    }),
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  backToLoginButton: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  backToLoginText: {
    fontSize: 14,
    color: '#4A5568',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

