/**
 * offlineStorage.ts のテスト
 * オフライン機能の信頼性を保証
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { OfflineStorage, isOnline } from '@/lib/offlineStorage';

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

