/**
 * offlineStorage.ts のテスト
 * オフライン機能の信頼性を保証
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { OfflineStorage, isOnline, getDataOffline } from '@/lib/offlineStorage';

// AsyncStorageのモックをクリア
beforeEach(() => {
  jest.clearAllMocks();
});

describe('OfflineStorage.savePracticeRecord', () => {
  it('練習記録をローカルに保存できる', async () => {
    const record = {
      user_id: 'test-user-id',
      practice_date: '2025-10-14',
      duration_minutes: 60,
      content: 'テスト練習',
    };

    const result = await OfflineStorage.savePracticeRecord(record);

    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();
    expect(AsyncStorage.setItem).toHaveBeenCalled();
  });

  it('保存時にis_syncedフラグをfalseに設定する', async () => {
    const record = {
      user_id: 'test-user-id',
      practice_date: '2025-10-14',
      duration_minutes: 60,
    };

    await OfflineStorage.savePracticeRecord(record);

    const savedData = (AsyncStorage.setItem as jest.Mock).mock.calls[0][1];
    const parsedData = JSON.parse(savedData);
    expect(parsedData.is_synced).toBe(false);
  });

  it('エラー時にsuccessをfalseで返す', async () => {
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('Storage error'));

    const record = {
      user_id: 'test-user-id',
      practice_date: '2025-10-14',
      duration_minutes: 60,
    };

    const result = await OfflineStorage.savePracticeRecord(record);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('OfflineStorage.getPracticeRecords', () => {
  it('保存された練習記録を取得できる', async () => {
    const mockRecords = [
      ['practice_1', JSON.stringify({ id: 'practice_1', duration_minutes: 30 })],
      ['practice_2', JSON.stringify({ id: 'practice_2', duration_minutes: 60 })],
    ];

    (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValueOnce([
      'practice_1',
      'practice_2',
      'goal_1',
    ]);
    (AsyncStorage.multiGet as jest.Mock).mockResolvedValueOnce(mockRecords);

    const records = await OfflineStorage.getPracticeRecords();

    expect(records).toHaveLength(2);
    expect(records[0].duration_minutes).toBe(30); // モックデータの順序
    expect(records[1].duration_minutes).toBe(60);
  });

  it('空の配列を返す（記録が無い場合）', async () => {
    (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValueOnce([]);
    (AsyncStorage.multiGet as jest.Mock).mockResolvedValueOnce([]);

    const records = await OfflineStorage.getPracticeRecords();

    expect(records).toHaveLength(0);
  });
});

describe('OfflineStorage.markAsSynced', () => {
  it('同期済みフラグを更新できる', async () => {
    const mockRecord = { id: 'practice_1', is_synced: false };
    (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValueOnce(['practice_1']);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(mockRecord));

    const result = await OfflineStorage.markAsSynced('practice_1');

    expect(result.success).toBe(true);
    expect(AsyncStorage.setItem).toHaveBeenCalled();
    
    const savedData = (AsyncStorage.setItem as jest.Mock).mock.calls[0][1];
    const parsedData = JSON.parse(savedData);
    expect(parsedData.is_synced).toBe(true);
  });
});

describe('OfflineStorage.saveGoal', () => {
  it('目標をローカルに保存できる', async () => {
    const goal = {
      user_id: 'test-user-id',
      title: 'テスト目標',
      target_date: '2025-12-31',
    };

    const result = await OfflineStorage.saveGoal(goal);

    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();
    expect(AsyncStorage.setItem).toHaveBeenCalled();
  });

  it('保存時にis_syncedフラグをfalseに設定する', async () => {
    const goal = {
      user_id: 'test-user-id',
      title: 'テスト目標',
    };

    await OfflineStorage.saveGoal(goal);

    const savedData = (AsyncStorage.setItem as jest.Mock).mock.calls[0][1];
    const parsedData = JSON.parse(savedData);
    expect(parsedData.is_synced).toBe(false);
  });

  it('エラー時にsuccessをfalseで返す', async () => {
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('Storage error'));

    const goal = {
      user_id: 'test-user-id',
      title: 'テスト目標',
    };

    const result = await OfflineStorage.saveGoal(goal);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('OfflineStorage.getGoals', () => {
  it('保存された目標を取得できる', async () => {
    const mockGoals = [
      ['goal_1', JSON.stringify({ id: 'goal_1', title: '目標1' })],
      ['goal_2', JSON.stringify({ id: 'goal_2', title: '目標2' })],
    ];

    (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValueOnce([
      'goal_1',
      'goal_2',
      'practice_1',
    ]);
    (AsyncStorage.multiGet as jest.Mock).mockResolvedValueOnce(mockGoals);

    const goals = await OfflineStorage.getGoals();

    expect(goals).toHaveLength(2);
    expect(goals[0].title).toBe('目標1');
  });

  it('空の配列を返す（目標が無い場合）', async () => {
    (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValueOnce([]);
    (AsyncStorage.multiGet as jest.Mock).mockResolvedValueOnce([]);

    const goals = await OfflineStorage.getGoals();

    expect(goals).toHaveLength(0);
  });
});

describe('OfflineStorage.saveRecording', () => {
  it('録音データをローカルに保存できる', async () => {
    const recording = {
      user_id: 'test-user-id',
      title: 'テスト録音',
      file_path: '/path/to/recording.wav',
    };

    const result = await OfflineStorage.saveRecording(recording);

    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();
    expect(AsyncStorage.setItem).toHaveBeenCalled();
  });

  it('エラー時にsuccessをfalseで返す', async () => {
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('Storage error'));

    const recording = {
      user_id: 'test-user-id',
      title: 'テスト録音',
    };

    const result = await OfflineStorage.saveRecording(recording);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('OfflineStorage.getRecordings', () => {
  it('保存された録音データを取得できる', async () => {
    const mockRecordings = [
      ['recording_1', JSON.stringify({ id: 'recording_1', title: '録音1' })],
    ];

    (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValueOnce(['recording_1']);
    (AsyncStorage.multiGet as jest.Mock).mockResolvedValueOnce(mockRecordings);

    const recordings = await OfflineStorage.getRecordings();

    expect(recordings).toHaveLength(1);
    expect(recordings[0].title).toBe('録音1');
  });
});

describe('OfflineStorage.saveSettings', () => {
  it('設定を保存できる', async () => {
    const settings = { theme: 'dark', language: 'ja' };

    const result = await OfflineStorage.saveSettings(settings);

    expect(result.success).toBe(true);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('user_settings', JSON.stringify(settings));
  });

  it('エラー時にsuccessをfalseで返す', async () => {
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('Storage error'));

    const result = await OfflineStorage.saveSettings({});

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('OfflineStorage.getSettings', () => {
  it('保存された設定を取得できる', async () => {
    const mockSettings = { theme: 'dark', language: 'ja' };
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(mockSettings));

    const settings = await OfflineStorage.getSettings();

    expect(settings).toEqual(mockSettings);
  });

  it('設定が無い場合は空オブジェクトを返す', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

    const settings = await OfflineStorage.getSettings();

    expect(settings).toEqual({});
  });
});

describe('OfflineStorage.getUnsyncedData', () => {
  it('未同期データを取得できる', async () => {
    const mockRecords = [
      ['practice_1', JSON.stringify({ id: 'practice_1', is_synced: false })],
      ['goal_1', JSON.stringify({ id: 'goal_1', is_synced: false })],
    ];

    (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue(['practice_1', 'goal_1']);
    (AsyncStorage.multiGet as jest.Mock).mockResolvedValue(mockRecords);

    const unsyncedData = await OfflineStorage.getUnsyncedData();

    expect(unsyncedData.length).toBeGreaterThan(0);
    expect(unsyncedData.every((record: any) => !record.is_synced)).toBe(true);
  });
});

describe('OfflineStorage.clearLocalData', () => {
  it('ローカルデータをクリアできる', async () => {
    (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValueOnce([
      'practice_1',
      'goal_1',
      'recording_1',
      'other_key',
    ]);

    const result = await OfflineStorage.clearLocalData();

    expect(result.success).toBe(true);
    expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(['practice_1', 'goal_1', 'recording_1']);
  });

  it('エラー時にsuccessをfalseで返す', async () => {
    (AsyncStorage.getAllKeys as jest.Mock).mockRejectedValueOnce(new Error('Storage error'));

    const result = await OfflineStorage.clearLocalData();

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('isOnline', () => {
  it('navigator.onLineがtrueの場合にtrueを返す', () => {
    Object.defineProperty(global.navigator, 'onLine', {
      value: true,
      configurable: true,
    });

    expect(isOnline()).toBe(true);
  });

  it('navigator.onLineがfalseの場合にfalseを返す', () => {
    Object.defineProperty(global.navigator, 'onLine', {
      value: false,
      configurable: true,
    });

    expect(isOnline()).toBe(false);
  });

  it('navigatorが未定義の場合にtrueを返す（デフォルト）', () => {
    const originalNavigator = global.navigator;
    delete (global as any).navigator;

    expect(isOnline()).toBe(true);

    (global as any).navigator = originalNavigator;
  });
});

describe('getDataOffline', () => {
  it('オフライン時にローカルデータを取得できる', async () => {
    const mockData = { key: 'value' };
    Object.defineProperty(global.navigator, 'onLine', {
      value: false,
      configurable: true,
    });
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(mockData));

    const result = await getDataOffline('test_key');

    expect(result).toEqual(mockData);
  });

  it('オンライン時はnullを返す', async () => {
    Object.defineProperty(global.navigator, 'onLine', {
      value: true,
      configurable: true,
    });

    const result = await getDataOffline('test_key');

    expect(result).toBeNull();
  });

  it('データが無い場合はフォールバックを返す', async () => {
    Object.defineProperty(global.navigator, 'onLine', {
      value: false,
      configurable: true,
    });
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

    const result = await getDataOffline('test_key', 'fallback');

    expect(result).toBe('fallback');
  });
});

