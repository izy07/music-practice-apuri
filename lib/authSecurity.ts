// 認証セキュリティユーティリティ

export const PASSWORD_REQUIREMENTS = {
  minLength: 8,               // 最小長を8文字に変更
  requireUppercase: false,     // 大文字を不要に
  requireLowercase: true,      // 小文字は必須
  requireNumbers: true,        // 数字は必須
  requireSpecialChars: false,  // 特殊文字を不要に
};

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    errors.push(`パスワードは${PASSWORD_REQUIREMENTS.minLength}文字以上で入力してください`);
  }

  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('大文字を含めてください');
  }

  if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('小文字を含めてください');
  }

  if (PASSWORD_REQUIREMENTS.requireNumbers && !/\d/.test(password)) {
    errors.push('数字を含めてください');
  }

  if (PASSWORD_REQUIREMENTS.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('特殊文字を含めてください');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const validateEmail = (email: string): boolean => {
  return EMAIL_REGEX.test(email.trim());
};

export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '') // XSS対策: HTMLタグ除去
    .replace(/javascript:/gi, '') // JavaScript URL除去
    .replace(/on\w+=/gi, '') // イベントハンドラー除去
    .replace(/['"]/g, ''); // クォート除去
};

export const isStrongPassword = (password: string): boolean => {
  const validation = validatePassword(password);
  return validation.isValid;
};

export const getPasswordStrength = (password: string): 'weak' | 'medium' | 'strong' => {
  let score = 0;
  
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
  
  if (score <= 2) return 'weak';
  if (score <= 4) return 'medium';
  return 'strong';
};

export const rateLimitConfig = {
  maxAttempts: 3,                    // 最大試行回数を3回に削減
  windowMs: 15 * 60 * 1000,          // 15分
  blockDurationMs: 60 * 60 * 1000,  // ブロック時間を1時間に延長
  // パスワードリセット専用の設定
  resetPasswordMaxAttempts: 2,       // パスワードリセット: 2回/時間
  resetPasswordWindowMs: 60 * 60 * 1000, // 1時間
};

export const createRateLimiter = () => {
  const attempts = new Map<string, { count: number; firstAttempt: number; blockedUntil?: number }>();
  
  return {
    isBlocked: (key: string): boolean => {
      const record = attempts.get(key);
      if (!record) return false;
      
      const now = Date.now();
      
      // ブロック期間中
      if (record.blockedUntil && now < record.blockedUntil) {
        return true;
      }
      
      // ブロック期間が終了した場合、リセット
      if (record.blockedUntil && now >= record.blockedUntil) {
        attempts.delete(key);
        return false;
      }
      
      // ウィンドウ期間が過ぎた場合、リセット
      if (now - record.firstAttempt > rateLimitConfig.windowMs) {
        attempts.delete(key);
        return false;
      }
      
      return false;
    },
    
    recordAttempt: (key: string): boolean => {
      const now = Date.now();
      const record = attempts.get(key);
      
      if (!record) {
        attempts.set(key, { count: 1, firstAttempt: now });
        return true;
      }
      
      // ブロック期間中
      if (record.blockedUntil && now < record.blockedUntil) {
        return false;
      }
      
      // ウィンドウ期間が過ぎた場合、リセット
      if (now - record.firstAttempt > rateLimitConfig.windowMs) {
        attempts.set(key, { count: 1, firstAttempt: now });
        return true;
      }
      
      record.count += 1;
      
      // 最大試行回数を超えた場合、ブロック
      if (record.count > rateLimitConfig.maxAttempts) {
        record.blockedUntil = now + rateLimitConfig.blockDurationMs;
        return false;
      }
      
      return true;
    },
    
    getRemainingAttempts: (key: string): number => {
      const record = attempts.get(key);
      if (!record) return rateLimitConfig.maxAttempts;
      
      const now = Date.now();
      
      // ブロック期間中
      if (record.blockedUntil && now < record.blockedUntil) {
        return 0;
      }
      
      // ウィンドウ期間が過ぎた場合、リセット
      if (now - record.firstAttempt > rateLimitConfig.windowMs) {
        return rateLimitConfig.maxAttempts;
      }
      
      return Math.max(0, rateLimitConfig.maxAttempts - record.count);
    },
    
    getBlockTimeRemaining: (key: string): number => {
      const record = attempts.get(key);
      if (!record || !record.blockedUntil) return 0;
      
      const now = Date.now();
      return Math.max(0, record.blockedUntil - now);
    },
  };
};
