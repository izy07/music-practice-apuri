/**
 * 練習記録機能の統合テスト
 * 実際のユーザーシナリオをテスト
 */

import { formatLocalDate } from '@/lib/dateUtils';
import { OfflineStorage } from '@/lib/offlineStorage';

describe('練習記録の統合テスト', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('練習記録の保存と取得', () => {
    it('練習記録を保存し、正しい日付で取得できる', async () => {
      // 1. 練習記録を保存
      const practiceDate = new Date(2025, 9, 14); // 2025年10月14日
      const record = {
        user_id: 'test-user',
        practice_date: formatLocalDate(practiceDate),
        duration_minutes: 60,
        content: 'スケール練習',
      };

      const saveResult = await OfflineStorage.savePracticeRecord(record);
      expect(saveResult.success).toBe(true);

      // 2. 保存された日付が正しいことを確認
      const formattedDate = formatLocalDate(practiceDate);
      expect(formattedDate).toBe('2025-10-14');

      // 3. 日付文字列から日にちを取得（カレンダー表示で使用）
      const day = parseInt(formattedDate.split('-')[2]);
      expect(day).toBe(14);
    });

    it('複数の練習記録を保存し、降順で取得できる', async () => {
      // 古い記録
      const oldRecord = {
        user_id: 'test-user',
        practice_date: '2025-10-10',
        duration_minutes: 30,
      };
      await OfflineStorage.savePracticeRecord(oldRecord);

      // 新しい記録（少し待つ）
      await new Promise(resolve => setTimeout(resolve, 10));
      const newRecord = {
        user_id: 'test-user',
        practice_date: '2025-10-14',
        duration_minutes: 60,
      };
      await OfflineStorage.savePracticeRecord(newRecord);

      // モックデータを設定
      const mockStoredRecords = [
        ['practice_1', JSON.stringify({ ...oldRecord, id: 'practice_1', created_at: '2025-10-10T10:00:00Z' })],
        ['practice_2', JSON.stringify({ ...newRecord, id: 'practice_2', created_at: '2025-10-14T10:00:00Z' })],
      ];
      require('@react-native-async-storage/async-storage').getAllKeys.mockResolvedValueOnce(['practice_1', 'practice_2']);
      require('@react-native-async-storage/async-storage').multiGet.mockResolvedValueOnce(mockStoredRecords);

      const records = await OfflineStorage.getPracticeRecords();
      
      // 新しい記録が最初に来る
      expect(records[0].duration_minutes).toBe(60);
      expect(records[1].duration_minutes).toBe(30);
    });
  });

  describe('オフライン時の動作', () => {
    it('オフライン時もローカルに保存できる', async () => {
      const record = {
        user_id: 'test-user',
        practice_date: '2025-10-14',
        duration_minutes: 45,
        content: 'オフライン練習',
      };

      const result = await OfflineStorage.savePracticeRecord(record);

      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();
    });

    it('未同期のデータを取得できる', async () => {
      const mockRecords = [
        { id: 'practice_1', is_synced: false, duration_minutes: 30 },
        { id: 'practice_2', is_synced: true, duration_minutes: 60 },
        { id: 'goal_1', is_synced: false, title: 'テスト目標' },
      ];

      jest.spyOn(OfflineStorage, 'getPracticeRecords').mockResolvedValueOnce([mockRecords[0], mockRecords[1]]);
      jest.spyOn(OfflineStorage, 'getGoals').mockResolvedValueOnce([mockRecords[2]]);
      jest.spyOn(OfflineStorage, 'getRecordings').mockResolvedValueOnce([]);

      const unsyncedData = await OfflineStorage.getUnsyncedData();

      expect(unsyncedData).toHaveLength(2);
      expect(unsyncedData.some(d => d.id === 'practice_1')).toBe(true);
      expect(unsyncedData.some(d => d.id === 'goal_1')).toBe(true);
      expect(unsyncedData.some(d => d.id === 'practice_2')).toBe(false); // 同期済みは含まれない
    });
  });

  describe('データの同期', () => {
    it('同期済みフラグを正しく更新できる', async () => {
      const mockRecord = { id: 'practice_1', is_synced: false };
      require('@react-native-async-storage/async-storage').getAllKeys.mockResolvedValueOnce(['practice_1']);
      require('@react-native-async-storage/async-storage').getItem.mockResolvedValueOnce(JSON.stringify(mockRecord));

      const result = await OfflineStorage.markAsSynced('practice_1');

      expect(result.success).toBe(true);
    });
  });
});

