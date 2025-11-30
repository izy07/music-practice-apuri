/**
 * authSecurity.ts のテスト
 * セキュリティ機能の正確性を保証
 */

import { validatePassword, validateEmail, sanitizeInput } from '@/lib/authSecurity';

describe('validatePassword', () => {
  it('有効なパスワードを承認する', () => {
    const result = validatePassword('Test1234');
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('短すぎるパスワードを拒否する', () => {
    const result = validatePassword('Test1');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('パスワードは8文字以上で入力してください');
  });

  it('大文字が無いパスワードを拒否する', () => {
    const result = validatePassword('test1234');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('大文字を含めてください');
  });

  it('小文字が無いパスワードを拒否する', () => {
    const result = validatePassword('TEST1234');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('小文字を含めてください');
  });

  it('数字が無いパスワードを拒否する', () => {
    const result = validatePassword('TestPass');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('数字を含めてください');
  });

  it('複数のエラーを同時に返す', () => {
    const result = validatePassword('test');
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });
});

describe('validateEmail', () => {
  it('有効なメールアドレスを承認する', () => {
    expect(validateEmail('test@example.com')).toBe(true);
    expect(validateEmail('user.name+tag@example.co.jp')).toBe(true);
  });

  it('無効なメールアドレスを拒否する', () => {
    expect(validateEmail('invalid')).toBe(false);
    expect(validateEmail('invalid@')).toBe(false);
    expect(validateEmail('@example.com')).toBe(false);
    expect(validateEmail('test@')).toBe(false);
  });

  it('スペースを含むメールアドレスを拒否する', () => {
    expect(validateEmail('test @example.com')).toBe(false);
  });
});

describe('sanitizeInput', () => {
  it('通常の文字列をそのまま返す', () => {
    expect(sanitizeInput('Hello World')).toBe('Hello World');
  });

  it('前後の空白を削除する', () => {
    expect(sanitizeInput('  test  ')).toBe('test');
  });

  it('XSS攻撃の可能性がある文字を削除する', () => {
    expect(sanitizeInput('<script>alert("XSS")</script>')).toBe('scriptalert("XSS")/script');
    expect(sanitizeInput('Hello<>World')).toBe('HelloWorld');
  });

  it('日本語を正しく処理する', () => {
    expect(sanitizeInput('こんにちは')).toBe('こんにちは');
    expect(sanitizeInput('  テスト  ')).toBe('テスト');
  });
});

describe('isStrongPassword', () => {
  it('有効なパスワードをtrueで返す', () => {
    const { isStrongPassword } = require('@/lib/authSecurity');
    expect(isStrongPassword('test1234')).toBe(true);
  });

  it('無効なパスワードをfalseで返す', () => {
    const { isStrongPassword } = require('@/lib/authSecurity');
    expect(isStrongPassword('test')).toBe(false);
  });
});

describe('getPasswordStrength', () => {
  it('弱いパスワードを判定する', () => {
    const { getPasswordStrength } = require('@/lib/authSecurity');
    expect(getPasswordStrength('test')).toBe('weak');
    expect(getPasswordStrength('test1')).toBe('weak');
  });

  it('中程度のパスワードを判定する', () => {
    const { getPasswordStrength } = require('@/lib/authSecurity');
    expect(getPasswordStrength('test1234')).toBe('medium');
    expect(getPasswordStrength('Test1234')).toBe('medium');
  });

  it('強いパスワードを判定する', () => {
    const { getPasswordStrength } = require('@/lib/authSecurity');
    expect(getPasswordStrength('Test1234!@#')).toBe('strong');
    expect(getPasswordStrength('VeryLongPassword123!')).toBe('strong');
  });
});

describe('createRateLimiter', () => {
  it('新しいキーはブロックされていない', () => {
    const { createRateLimiter } = require('@/lib/authSecurity');
    const limiter = createRateLimiter();
    expect(limiter.isBlocked('new-key')).toBe(false);
  });

  it('最大試行回数を超えるとブロックされる', () => {
    const { createRateLimiter } = require('@/lib/authSecurity');
    const limiter = createRateLimiter();
    
    // 最大試行回数（3回）を超える
    limiter.recordAttempt('test-key');
    limiter.recordAttempt('test-key');
    limiter.recordAttempt('test-key');
    const blocked = limiter.recordAttempt('test-key');
    
    expect(blocked).toBe(false);
    expect(limiter.isBlocked('test-key')).toBe(true);
  });

  it('残り試行回数を正しく返す', () => {
    const { createRateLimiter } = require('@/lib/authSecurity');
    const limiter = createRateLimiter();
    
    limiter.recordAttempt('test-key');
    expect(limiter.getRemainingAttempts('test-key')).toBe(2);
    
    limiter.recordAttempt('test-key');
    expect(limiter.getRemainingAttempts('test-key')).toBe(1);
  });

  it('ブロック時間の残り時間を返す', () => {
    const { createRateLimiter } = require('@/lib/authSecurity');
    const limiter = createRateLimiter();
    
    // ブロック状態にする
    limiter.recordAttempt('test-key');
    limiter.recordAttempt('test-key');
    limiter.recordAttempt('test-key');
    limiter.recordAttempt('test-key');
    
    const remaining = limiter.getBlockTimeRemaining('test-key');
    expect(remaining).toBeGreaterThan(0);
  });

  it('ブロックされていないキーの残り時間は0', () => {
    const { createRateLimiter } = require('@/lib/authSecurity');
    const limiter = createRateLimiter();
    
    expect(limiter.getBlockTimeRemaining('new-key')).toBe(0);
  });
});

