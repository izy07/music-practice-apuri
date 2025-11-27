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

