/**
 * authHelpers.ts のテスト
 * 認証ヘルパー関数の正確性を保証
 */

import { getAuthErrorMessage, signInWithRetry, createUserProfile } from '@/lib/authHelpers';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase');

describe('getAuthErrorMessage', () => {
  it('エラーコードに基づいて適切なメッセージを返す', () => {
    expect(getAuthErrorMessage({ code: 'signup_disabled' })).toBe('新規登録は現在無効になっています');
    expect(getAuthErrorMessage({ code: 'email_not_confirmed' })).toBe('メールアドレスの確認が必要です');
    expect(getAuthErrorMessage({ code: 'invalid_credentials' })).toBe('メールアドレスまたはパスワードが正しくありません');
    expect(getAuthErrorMessage({ code: 'too_many_requests' })).toBe('リクエストが多すぎます。しばらく待ってから再試行してください');
  });

  it('エラーメッセージから日本語メッセージを抽出する', () => {
    expect(getAuthErrorMessage({ message: 'User already registered' })).toBe('このメールアドレスは既に登録されています');
    expect(getAuthErrorMessage({ message: 'Password is incorrect' })).toBe('パスワードが正しくありません');
    expect(getAuthErrorMessage({ message: 'Email is invalid' })).toBe('メールアドレスが正しくありません');
  });

  it('エラーがnullの場合はデフォルトメッセージを返す', () => {
    expect(getAuthErrorMessage(null)).toBe('認証エラーが発生しました');
  });

  it('未知のエラーの場合は元のメッセージを返す', () => {
    expect(getAuthErrorMessage({ message: 'Unknown error' })).toBe('Unknown error');
  });
});

describe('signInWithRetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ログインに成功する', async () => {
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValueOnce({
      data: { user: { id: 'user-1', email: 'test@example.com' } },
      error: null,
    });

    const result = await signInWithRetry('test@example.com', 'password123');

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('リトライ不可なエラーの場合は即座に終了する', async () => {
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValueOnce({
      data: null,
      error: { code: 'invalid_credentials', message: 'Invalid credentials' },
    });

    const result = await signInWithRetry('test@example.com', 'wrongpassword');

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledTimes(1);
  });

  it('リトライ可能なエラーの場合は最大試行回数までリトライする', async () => {
    (supabase.auth.signInWithPassword as jest.Mock)
      .mockResolvedValueOnce({
        data: null,
        error: { code: 'network_error', message: 'Network error' },
      })
      .mockResolvedValueOnce({
        data: null,
        error: { code: 'network_error', message: 'Network error' },
      })
      .mockResolvedValueOnce({
        data: { user: { id: 'user-1' } },
        error: null,
      });

    const result = await signInWithRetry('test@example.com', 'password123', 3);

    expect(result.success).toBe(true);
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledTimes(3);
  });

  it('最大試行回数を超えると失敗を返す', async () => {
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: null,
      error: { code: 'network_error', message: 'Network error' },
    });

    const result = await signInWithRetry('test@example.com', 'password123', 2);

    expect(result.success).toBe(false);
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledTimes(2);
  });
});

describe('createUserProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ユーザープロフィールを作成できる', async () => {
    (supabase.from as jest.Mock).mockReturnValue({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: 'profile-1', user_id: 'user-1', display_name: 'Test User' },
        error: null,
      }),
    });

    const result = await createUserProfile('user-1', 'Test User');

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('既にプロフィールが存在する場合は成功として扱う', async () => {
    (supabase.from as jest.Mock).mockReturnValue({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { code: '23505', message: 'Unique violation' },
      }),
    });

    const result = await createUserProfile('user-1', 'Test User');

    expect(result.success).toBe(true);
  });

  it('データベーススキーマエラーの場合は適切なエラーメッセージを返す', async () => {
    (supabase.from as jest.Mock).mockReturnValue({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { code: '42703', message: 'column does not exist' },
      }),
    });

    const result = await createUserProfile('user-1', 'Test User');

    expect(result.success).toBe(false);
    expect(result.error).toContain('データベーススキーマ');
  });

  it('その他のエラーの場合はエラーメッセージを返す', async () => {
    (supabase.from as jest.Mock).mockReturnValue({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { code: '500', message: 'Internal server error' },
      }),
    });

    const result = await createUserProfile('user-1', 'Test User');

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

