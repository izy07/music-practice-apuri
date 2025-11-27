import React, { useState, useRef, memo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
// アイコンはテキストで代替

interface AuthFormProps {
  mode: 'login' | 'signup';
  onSubmit: (data: AuthFormData) => Promise<boolean | void>;
  onGoogleAuth: () => Promise<boolean | void>;
  loading?: boolean;
  googleLoading?: boolean;
}

interface AuthFormData {
  email: string;
  password: string;
  confirmPassword?: string;
}

// スタイルを先に定義（下のメモ化子コンポーネントで参照するため）
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  form: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  formContainer: {
    gap: 12,
  },
  inputContainer: {
    marginBottom: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 48,
  },
  inputFocused: {
    backgroundColor: '#FFFFFF',

    
    
    
    elevation: 2,
  },
  inputError: {
    backgroundColor: '#FFF8F8',
  },
  inputIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  passwordToggleText: {
    fontSize: 16,
  },
  submitButtonIcon: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    borderWidth: 0,
    // webの警告回避: outline指定は使わない
  },
  passwordToggle: {
    padding: 4,
  },
  errorText: {
    color: '#F44336',
    fontSize: 14,
    marginTop: 4,
    marginLeft: 4,
  },
  submitButton: {
    backgroundColor: '#8B4513',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,

    
    
    
    elevation: 6,
  },
  submitButtonDisabled: {
    backgroundColor: '#CCC',
    
    elevation: 0,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
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
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    
    
    
    elevation: 2,
  },
  googleButtonDisabled: {
    backgroundColor: '#F5F5F5',
    borderColor: '#CCC',
  },
  googleButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
  },
});

type InputFieldProps = {
  field: keyof AuthFormData;
  placeholder: string;
  iconText: string;
  value: string;
  onChangeText: (text: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  isFocused: boolean;
  error?: string;
  secureTextEntry?: boolean;
  showToggle?: boolean;
  showPassword?: boolean;
  showConfirmPassword?: boolean;
  keyboardType?: 'default' | 'email-address';
};

const InputField = memo(({
  field,
  placeholder,
  iconText,
  value,
  onChangeText,
  onFocus,
  onBlur,
  isFocused,
  error,
  secureTextEntry = false,
  showToggle = false,
  showPassword = false,
  showConfirmPassword = false,
  keyboardType = 'default',
}: InputFieldProps) => {
  const hasError = !!error;
  const isPasswordField = field === 'password' || field === 'confirmPassword';
  const showPasswordToggle = showToggle && isPasswordField;

  return (
    <View style={styles.inputContainer}>
      <View style={[
        styles.inputWrapper,
        isFocused && styles.inputFocused,
        hasError && styles.inputError,
      ]}>
        <Text style={[styles.inputIcon, { color: isFocused ? '#8B4513' : hasError ? '#F44336' : '#666' }]}>
          {iconText}
        </Text>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#999"
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onBlur={onBlur}
          secureTextEntry={secureTextEntry && !(field === 'password' ? showPassword : showConfirmPassword)}
          keyboardType={keyboardType}
          autoCapitalize={field === 'email' ? 'none' : (isPasswordField ? 'none' : 'words')}
          autoCorrect={false}
          nativeID={`input-${field}`}
          accessibilityLabel={placeholder}
        />
        {showPasswordToggle && (
          <TouchableOpacity
            onPress={() => {}}
            style={styles.passwordToggle}
            disabled
          >
            <Text style={styles.passwordToggleText}>
              {field === 'password' ? (showPassword ? '👁️' : '👁️‍🗨️') : (showConfirmPassword ? '👁️' : '👁️‍🗨️')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      {hasError && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
});

export const AuthForm: React.FC<AuthFormProps> = ({
  mode,
  onSubmit,
  onGoogleAuth,
  loading = false,
  googleLoading = false,
}) => {
  logger.debug('AuthForm component initialized, mode:', mode);
  const [formData, setFormData] = useState<AuthFormData>({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Partial<AuthFormData>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  React.useEffect(() => {
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

  const validateForm = (): boolean => {
    const newErrors: Partial<AuthFormData> = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = 'メールアドレスを入力してください';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '有効なメールアドレスを入力してください';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'パスワードを入力してください';
    } else if (formData.password.length < 8) {
      newErrors.password = 'パスワードは8文字以上で入力してください';
    } else if (!/(?=.*[a-z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'パスワードは小文字・数字を含む必要があります';
    }

    // Signup specific validations
    if (mode === 'signup') {
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'パスワード確認を入力してください';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'パスワードが一致しません';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    logger.debug('AuthForm handleSubmit called, mode:', mode);
    logger.debug('Form data:', formData);
    
    if (!validateForm()) {
      logger.debug('Form validation failed');
      return;
    }
    logger.debug('Form validation passed');

    try {
      logger.debug('Calling onSubmit...');
      const result = await onSubmit(formData);
      logger.debug('onSubmit result:', result);
      if (result === false) {
        // 認証失敗の場合は何もしない（エラーはuseAuthAdvancedで処理済み）
        logger.debug('Authentication failed');
        return;
      }
      logger.debug('Authentication successful');
    } catch (error) {
      ErrorHandler.handle(error, 'AuthForm handleSubmit', true);
      Alert.alert('エラー', '認証に失敗しました。もう一度お試しください。');
    }
  };

  const updateField = (field: keyof AuthFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const renderInput = (
    cfg: Omit<InputFieldProps, 'value' | 'onChangeText' | 'onFocus' | 'onBlur' | 'isFocused' | 'error' | 'showPassword' | 'showConfirmPassword'>
  ) => (
    <InputField
      {...cfg}
      value={formData[cfg.field] as string}
      onChangeText={value => updateField(cfg.field, value)}
      onFocus={() => setFocusedField(cfg.field)}
      onBlur={() => setFocusedField(null)}
      isFocused={focusedField === cfg.field}
      error={errors[cfg.field] as string | undefined}
      showPassword={showPassword}
      showConfirmPassword={showConfirmPassword}
    />
  );

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <Animated.View 
        style={[
          styles.form,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.title}>
            {mode === 'login' ? 'ログイン' : '新規会員登録'}
          </Text>
          <Text style={styles.subtitle}>
            {mode === 'login' 
              ? 'アカウントにログインしてください' 
              : '新しいアカウントを作成してください'
            }
          </Text>
        </View>

        <View style={styles.formContainer}>
          {renderInput({ field: 'email', placeholder: 'メールアドレス', iconText: '📧', keyboardType: 'email-address' })}

          {renderInput({ field: 'password', placeholder: 'パスワード', iconText: '🔒', secureTextEntry: true, showToggle: true })}

          {mode === 'signup' && renderInput({ field: 'confirmPassword', placeholder: 'パスワード確認', iconText: '🔒', secureTextEntry: true, showToggle: true })}

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={() => {
              logger.debug('Submit button pressed, loading:', loading);
              handleSubmit();
            }}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? '処理中...' : mode === 'login' ? 'ログイン' : '会員登録'}
            </Text>
            <Text style={styles.submitButtonIcon}>→</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>または</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[styles.googleButton, googleLoading && styles.googleButtonDisabled]}
            onPress={onGoogleAuth}
            disabled={googleLoading}
          >
            <Text style={styles.googleButtonText}>
              {googleLoading ? '処理中...' : 'Googleで続行'}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
};
