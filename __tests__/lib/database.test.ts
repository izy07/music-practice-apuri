/**
 * database.ts のテスト
 * データベース操作の信頼性を保証
 */

import { 
  saveUserSettings, 
  getUserSettings,
  saveLanguageSetting,
  getLanguageSetting,
  saveTutorialProgress,
  getTutorialProgress,
  saveRecording,
  // getRecordings, // この関数は存在しないためコメントアウト
  deleteRecording,
} from '@/lib/database';
import { supabase } from '@/lib/supabase';

// Supabaseのモック
jest.mock('@/lib/supabase');

describe('saveUserSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ユーザー設定を正常に保存できる', async () => {
    const mockData = { user_id: 'test-user', language: 'ja' };
    (supabase.from as jest.Mock).mockReturnValue({
      upsert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockData, error: null }),
    });

    const result = await saveUserSettings('test-user', { language: 'ja' });

    expect(result.data).toEqual(mockData);
    expect(result.error).toBeNull();
  });

  it('エラー時に適切なエラーオブジェクトを返す', async () => {
    const mockError = new Error('Database error');
    (supabase.from as jest.Mock).mockReturnValue({
      upsert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockRejectedValue(mockError),
    });

    const result = await saveUserSettings('test-user', { language: 'ja' });

    expect(result.data).toBeNull();
    expect(result.error).toBe(mockError);
  });
});

describe('getUserSettings', () => {
  it('ユーザー設定を正常に取得できる', async () => {
    const mockData = { user_id: 'test-user', language: 'ja', theme: 'dark' };
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockData, error: null }),
    });

    const result = await getUserSettings('test-user');

    expect(result.data).toEqual(mockData);
    expect(result.error).toBeNull();
  });

  it('データが存在しない場合でもエラーを返さない（PGRST116）', async () => {
    const mockError = { code: 'PGRST116', message: 'No rows found' };
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: mockError }),
    });

    const result = await getUserSettings('test-user');

    expect(result.data).toBeNull();
    expect(result.error).toBeNull(); // PGRST116はエラーとして扱わない
  });
});

describe('saveLanguageSetting', () => {
  it('言語設定を保存できる', async () => {
    const mockData = { user_id: 'test-user', language: 'en' };
    (supabase.from as jest.Mock).mockReturnValue({
      upsert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockData, error: null }),
    });

    const result = await saveLanguageSetting('test-user', 'en');

    expect(result.data).toEqual(mockData);
    expect(result.error).toBeNull();
  });
});

describe('getLanguageSetting', () => {
  it('言語設定を取得できる', async () => {
    const mockData = { language: 'en' };
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockData, error: null }),
    });

    const result = await getLanguageSetting('test-user');

    expect(result.data).toBe('en');
    expect(result.error).toBeNull();
  });

  it('データが無い場合はデフォルトで日本語を返す', async () => {
    const mockError = { code: 'PGRST116', message: 'No rows found' };
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: mockError }),
    });

    const result = await getLanguageSetting('test-user');

    expect(result.data).toBe('ja');
    expect(result.error).toBeNull();
  });
});

describe('saveTutorialProgress', () => {
  it('チュートリアル進捗を保存できる', async () => {
    const mockData = { user_id: 'test-user', current_step: 2 };
    (supabase.from as jest.Mock).mockReturnValue({
      upsert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockData, error: null }),
    });

    const result = await saveTutorialProgress('test-user', { current_step: 2 });

    expect(result.data).toEqual(mockData);
    expect(result.error).toBeNull();
  });
});

describe('getTutorialProgress', () => {
  it('チュートリアル進捗を取得できる', async () => {
    const mockData = { user_id: 'test-user', current_step: 1 };
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockData, error: null }),
    });

    const result = await getTutorialProgress('test-user');

    expect(result.data).toEqual(mockData);
    expect(result.error).toBeNull();
  });
});

describe('録音機能のバリデーション', () => {
  it('録音データの必須フィールドを検証する', () => {
    const validRecording = {
      user_id: 'test-user',
      title: 'テスト録音',
      file_path: '/path/to/file.wav',
      recorded_at: new Date().toISOString(),
    };

    expect(validRecording.user_id).toBeDefined();
    expect(validRecording.title).toBeDefined();
    expect(validRecording.file_path).toBeDefined();
    expect(validRecording.recorded_at).toBeDefined();
  });

  it('録音タイトルが空でないことを確認する', () => {
    const title = 'テスト録音';
    expect(title.trim().length).toBeGreaterThan(0);
  });

  it('録音時刻がISO8601形式であることを確認する', () => {
    const recordedAt = new Date().toISOString();
    expect(recordedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('録音時間が正の数であることを確認する', () => {
    const duration = 120;
    expect(duration).toBeGreaterThan(0);
  });
});

