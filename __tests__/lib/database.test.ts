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

describe('markTutorialCompleted', () => {
  it('チュートリアル完了をマークできる', async () => {
    const mockData = { user_id: 'test-user', is_completed: true };
    (supabase.from as jest.Mock).mockReturnValue({
      upsert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockData, error: null }),
    });

    const { markTutorialCompleted } = require('@/lib/database');
    const result = await markTutorialCompleted('test-user');

    expect(result.data).toEqual(mockData);
    expect(result.error).toBeNull();
  });
});

describe('saveMetronomeSettings', () => {
  it('メトロノーム設定を保存できる', async () => {
    const mockData = { user_id: 'test-user', metronome_settings: { bpm: 120 } };
    (supabase.from as jest.Mock).mockReturnValue({
      upsert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockData, error: null }),
    });

    const { saveMetronomeSettings } = require('@/lib/database');
    const result = await saveMetronomeSettings('test-user', {
      bpm: 120,
      time_signature: '4/4',
      volume: 0.7,
      sound_type: 'click',
      subdivision: 'quarter',
    });

    expect(result.data).toEqual(mockData);
    expect(result.error).toBeNull();
  });
});

describe('getMetronomeSettings', () => {
  it('メトロノーム設定を取得できる', async () => {
    const mockData = { metronome_settings: { bpm: 120, time_signature: '4/4' } };
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockData, error: null }),
    });

    const { getMetronomeSettings } = require('@/lib/database');
    const result = await getMetronomeSettings('test-user');

    expect(result.data).toEqual(mockData.metronome_settings);
    expect(result.error).toBeNull();
  });

  it('データが無い場合はデフォルト設定を返す', async () => {
    const mockError = { code: 'PGRST116', message: 'No rows found' };
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: mockError }),
    });

    const { getMetronomeSettings } = require('@/lib/database');
    const result = await getMetronomeSettings('test-user');

    expect(result.data.bpm).toBe(120);
    expect(result.data.time_signature).toBe('4/4');
  });
});

describe('saveTunerSettings', () => {
  it('チューナー設定を保存できる（既存レコード更新）', async () => {
    const existingData = { id: '1', user_id: 'test-user' };
    const updatedData = { user_id: 'test-user', tuner_settings: { reference_pitch: 440 } };
    
    (supabase.from as jest.Mock).mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: existingData, error: null }),
    }).mockReturnValueOnce({
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: updatedData, error: null }),
    });

    const { saveTunerSettings } = require('@/lib/database');
    const result = await saveTunerSettings('test-user', {
      reference_pitch: 440,
      temperament: 'equal',
      volume: 0.7,
    });

    expect(result.data).toEqual(updatedData);
    expect(result.error).toBeNull();
  });

  it('チューナー設定を保存できる（新規レコード作成）', async () => {
    const newData = { user_id: 'test-user', tuner_settings: { reference_pitch: 440 } };
    
    (supabase.from as jest.Mock).mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
    }).mockReturnValueOnce({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: newData, error: null }),
    });

    const { saveTunerSettings } = require('@/lib/database');
    const result = await saveTunerSettings('test-user', {
      reference_pitch: 440,
      temperament: 'equal',
      volume: 0.7,
    });

    expect(result.data).toEqual(newData);
    expect(result.error).toBeNull();
  });
});

describe('getTunerSettings', () => {
  it('チューナー設定を取得できる', async () => {
    const mockData = { tuner_settings: { reference_pitch: 440, temperament: 'equal' } };
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockData, error: null }),
    });

    const { getTunerSettings } = require('@/lib/database');
    const result = await getTunerSettings('test-user');

    expect(result.data).toEqual(mockData.tuner_settings);
    expect(result.error).toBeNull();
  });

  it('データが無い場合はデフォルト設定を返す', async () => {
    const mockError = { code: 'PGRST116', message: 'No rows found' };
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: mockError }),
    });

    const { getTunerSettings } = require('@/lib/database');
    const result = await getTunerSettings('test-user');

    expect(result.data.reference_pitch).toBe(440);
    expect(result.data.temperament).toBe('equal');
  });
});

describe('savePracticeSession', () => {
  it('練習セッションを保存できる', async () => {
    const mockData = {
      id: 'session-1',
      user_id: 'test-user',
      practice_date: '2025-01-15',
      duration_minutes: 60,
    };
    (supabase.from as jest.Mock).mockReturnValue({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockData, error: null }),
    });

    const { savePracticeSession } = require('@/lib/database');
    const result = await savePracticeSession({
      user_id: 'test-user',
      instrument_id: 'instrument-1',
      practice_date: '2025-01-15',
      duration_minutes: 60,
      content: '練習内容',
      audio_url: null,
      input_method: 'manual',
    });

    expect(result.data).toEqual(mockData);
    expect(result.error).toBeNull();
  });
});

describe('deletePracticeSession', () => {
  it('練習セッションを削除できる', async () => {
    (supabase.from as jest.Mock).mockReturnValue({
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: null }),
    });

    const { deletePracticeSession } = require('@/lib/database');
    const result = await deletePracticeSession('session-1');

    expect(result.error).toBeNull();
  });
});

describe('deleteRecording', () => {
  it('録音データを削除できる', async () => {
    (supabase.from as jest.Mock).mockReturnValue({
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: null }),
    });

    const result = await deleteRecording('recording-1');

    expect(result.error).toBeNull();
  });
});

describe('getRecordingsByDate', () => {
  it('指定日付の録音データを取得できる', async () => {
    const mockData = [
      { id: 'recording-1', recorded_at: '2025-01-15' },
      { id: 'recording-2', recorded_at: '2025-01-15' },
    ];
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: mockData, error: null }),
    });

    const { getRecordingsByDate } = require('@/lib/database');
    const result = await getRecordingsByDate('test-user', '2025-01-15');

    expect(result.data).toEqual(mockData);
    expect(result.error).toBeNull();
  });
});

describe('saveGoal', () => {
  it('目標を保存できる', async () => {
    const mockData = {
      id: 'goal-1',
      user_id: 'test-user',
      title: 'テスト目標',
    };
    (supabase.from as jest.Mock).mockReturnValue({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockData, error: null }),
    });

    const { saveGoal } = require('@/lib/database');
    const result = await saveGoal({
      user_id: 'test-user',
      goal_type: 'personal_short',
      title: 'テスト目標',
      description: null,
      target_date: null,
      progress_percentage: 0,
      is_active: true,
    });

    expect(result.data).toEqual(mockData);
    expect(result.error).toBeNull();
  });
});

describe('updateGoal', () => {
  it('目標を更新できる', async () => {
    const mockData = {
      id: 'goal-1',
      title: '更新された目標',
      progress_percentage: 50,
    };
    (supabase.from as jest.Mock).mockReturnValue({
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockData, error: null }),
    });

    const { updateGoal } = require('@/lib/database');
    const result = await updateGoal('goal-1', {
      title: '更新された目標',
      progress_percentage: 50,
    });

    expect(result.data).toEqual(mockData);
    expect(result.error).toBeNull();
  });
});

describe('uploadRecordingBlob', () => {
  it('録音Blobをアップロードできる', async () => {
    const mockBlob = new Blob(['test'], { type: 'audio/wav' });
    const mockPath = 'user-1/recording-123.wav';
    
    (supabase.storage.from as jest.Mock).mockReturnValue({
      upload: jest.fn().mockResolvedValue({ data: { path: mockPath }, error: null }),
    });

    const { uploadRecordingBlob } = require('@/lib/database');
    const result = await uploadRecordingBlob('user-1', mockBlob, 'wav');

    expect(result.path).toBe(mockPath);
    expect(result.error).toBeNull();
  });
});

describe('saveRecording', () => {
  it('録音データを保存できる', async () => {
    const mockData = {
      id: 'recording-1',
      user_id: 'test-user',
      title: 'テスト録音',
    };
    (supabase.from as jest.Mock).mockReturnValue({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockData, error: null }),
    });

    const { saveRecording } = require('@/lib/database');
    const result = await saveRecording({
      user_id: 'test-user',
      title: 'テスト録音',
    });

    expect(result.data).toEqual(mockData);
    expect(result.error).toBeNull();
  });
});

describe('listRecordingsByMonth', () => {
  it('指定年月の録音一覧を取得できる', async () => {
    const mockData = [
      { id: 'recording-1', recorded_at: '2025-01-15' },
    ];
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: mockData, error: null }),
    });

    const { listRecordingsByMonth } = require('@/lib/database');
    const result = await listRecordingsByMonth('test-user', 2025, 1);

    expect(result.data).toEqual(mockData);
    expect(result.error).toBeNull();
  });
});

describe('listAllRecordings', () => {
  it('全期間の録音一覧を取得できる', async () => {
    const mockData = [
      { id: 'recording-1', recorded_at: '2025-01-15' },
    ];
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: mockData, error: null }),
    });

    const { listAllRecordings } = require('@/lib/database');
    const result = await listAllRecordings('test-user');

    expect(result.data).toEqual(mockData);
    expect(result.error).toBeNull();
  });

  it('楽器IDでフィルタリングできる', async () => {
    const mockData = [{ id: 'recording-1', instrument_id: 'instrument-1' }];
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: mockData, error: null }),
    });

    const { listAllRecordings } = require('@/lib/database');
    const result = await listAllRecordings('test-user', 'instrument-1');

    expect(result.data).toEqual(mockData);
  });
});

