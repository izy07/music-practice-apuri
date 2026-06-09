/**
 * subscriptionLimits.ts のテスト
 * サブスクリプション制限チェックの正確性を保証
 */

import {
  FREE_PLAN_LIMITS,
  checkGoalLimit,
  canSaveDataForInstrument,
  checkMonthlyRecordingLimit,
  isCurrentMonth,
  getUserInstrumentCount,
  isExistingInstrument,
  getActiveInstrumentIds,
  adjustGoalsOnDowngrade,
  checkMyLibraryLimit,
  type Entitlement
} from '@/lib/subscriptionLimits';
import { goalRepository } from '@/repositories/goalRepository';
import { listRecordingsByMonth } from '@/lib/database';
import { supabase } from '@/lib/supabase';

// モックの設定
jest.mock('@/repositories/goalRepository');
jest.mock('@/lib/database');
jest.mock('@/lib/supabase');
jest.mock('@/repositories/common/instrumentFilter', () => ({
  filterByInstrumentIdInMemory: jest.fn(<T>(data: T[], _instrumentId?: string | null, _includeLegacyNull?: boolean): T[] => {
    if (_instrumentId === undefined) return data;
    if (_instrumentId === null) return (data as any[]).filter((row: any) => row.instrument_id == null) as T[];
    return (data as any[]).filter((row: any) => row.instrument_id === _instrumentId) as T[];
  }),
}));
jest.mock('@/lib/logger', () => ({
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }
}));
jest.mock('@/lib/errorHandler', () => ({
  ErrorHandler: {
    handle: jest.fn(),
  }
}));

describe('subscriptionLimits', () => {
  const mockUserId = 'user-123';
  const mockInstrumentId = 'instrument-456';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('FREE_PLAN_LIMITS', () => {
    it('制限値が正しく定義されている', () => {
      expect(FREE_PLAN_LIMITS.RECORDINGS_PER_MONTH_PER_INSTRUMENT).toBe(3);
      expect(FREE_PLAN_LIMITS.GOALS_COUNT_PER_INSTRUMENT).toBe(4);
      expect(FREE_PLAN_LIMITS.MY_LIBRARY_SONGS_PER_INSTRUMENT).toBe(10);
      expect(FREE_PLAN_LIMITS.MAX_INSTRUMENTS).toBe(2);
    });
  });

  describe('checkGoalLimit', () => {
    const mockEntitlement: Entitlement = {
      isEntitled: false,
      isTrial: false,
      isPremiumActive: false,
    };

    it('Premiumユーザーは無制限', async () => {
      const premiumEntitlement: Entitlement = {
        isEntitled: true,
        isTrial: false,
        isPremiumActive: true,
      };

      const result = await checkGoalLimit(mockUserId, mockInstrumentId, premiumEntitlement);

      expect(result.canCreate).toBe(true);
      expect(result.limit).toBe(Infinity);
    });

    it('Freeプランで目標数が制限以下の場合は作成可能', async () => {
      (goalRepository.getExistingGoalsCount as jest.Mock).mockResolvedValue(1);

      const result = await checkGoalLimit(mockUserId, mockInstrumentId, mockEntitlement);

      expect(result.canCreate).toBe(true);
      expect(result.currentCount).toBe(1);
      expect(result.limit).toBe(2);
    });

    it('Freeプランで目標数が制限に達している場合は作成不可', async () => {
      (goalRepository.getExistingGoalsCount as jest.Mock).mockResolvedValue(2);

      const result = await checkGoalLimit(mockUserId, mockInstrumentId, mockEntitlement);

      expect(result.canCreate).toBe(false);
      expect(result.currentCount).toBe(2);
      expect(result.limit).toBe(2);
    });

    it('楽器IDがnullの場合でも動作する', async () => {
      (goalRepository.getExistingGoalsCount as jest.Mock).mockResolvedValue(1);

      const result = await checkGoalLimit(mockUserId, null, mockEntitlement);

      expect(result.canCreate).toBe(true);
      expect(goalRepository.getExistingGoalsCount).toHaveBeenCalledWith(mockUserId, null);
    });

    it('エラー時は許可を返す（フォールバック）', async () => {
      (goalRepository.getExistingGoalsCount as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await checkGoalLimit(mockUserId, mockInstrumentId, mockEntitlement);

      expect(result.canCreate).toBe(true);
      expect(result.limit).toBe(2);
    });
  });

  describe('canSaveDataForInstrument', () => {
    const mockEntitlement: Entitlement = {
      isEntitled: false,
      isTrial: false,
      isPremiumActive: false,
    };

    it('Premiumユーザーは無制限', async () => {
      const premiumEntitlement: Entitlement = {
        isEntitled: true,
        isTrial: false,
        isPremiumActive: true,
      };

      const result = await canSaveDataForInstrument(mockUserId, mockInstrumentId, premiumEntitlement);

      expect(result.canSave).toBe(true);
    });

    it('楽器IDがnullの場合は許可', async () => {
      const result = await canSaveDataForInstrument(mockUserId, null, mockEntitlement);

      expect(result.canSave).toBe(true);
    });

    it('既存の楽器の場合は保存可能', async () => {
      // isExistingInstrumentをモックするために、supabase.fromをモック
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ count: 1, error: null }),
      });

      const result = await canSaveDataForInstrument(mockUserId, mockInstrumentId, mockEntitlement);

      expect(result.canSave).toBe(true);
    });

    it('新しい楽器で楽器数が制限未満の場合は保存可能', async () => {
      // 既存楽器がないことをモック
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ count: 0, error: null }),
      });

      // getUserInstrumentCountをモック（楽器数が1個）
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockResolvedValue({ data: [{ instrument_id: 'other-instrument' }], error: null }),
      });

      const result = await canSaveDataForInstrument(mockUserId, mockInstrumentId, mockEntitlement);

      expect(result.canSave).toBe(true);
    });

    it('新しい楽器で楽器数が制限に達している場合は保存不可', async () => {
      // 既存楽器がないことをモック
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ count: 0, error: null }),
      });

      // getUserInstrumentCountをモック（楽器数が2個で制限に達している）
      const mockData = [
        { instrument_id: 'instrument-1' },
        { instrument_id: 'instrument-2' },
      ];
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockResolvedValue({ data: mockData, error: null }),
      });

      const result = await canSaveDataForInstrument(mockUserId, mockInstrumentId, mockEntitlement);

      expect(result.canSave).toBe(false);
      expect(result.reason).toContain('Freeプランでは楽器を2個まで記録できます');
    });
  });

  describe('isCurrentMonth', () => {
    it('現在の日付が今月であることを正しく判定する', () => {
      const today = new Date();
      const result = isCurrentMonth(today);
      expect(result).toBe(true);
    });

    it('先月の日付を正しく判定する', () => {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const result = isCurrentMonth(lastMonth);
      expect(result).toBe(false);
    });

    it('来月の日付を正しく判定する', () => {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const result = isCurrentMonth(nextMonth);
      expect(result).toBe(false);
    });

    it('日付文字列を受け入れる', () => {
      const today = new Date().toISOString();
      const result = isCurrentMonth(today);
      expect(result).toBe(true);
    });

    it('nullの場合はtrueを返す（現在日時を使用するため）', () => {
      const result = isCurrentMonth(null);
      expect(result).toBe(true);
    });
  });

  describe('checkMonthlyRecordingLimit', () => {
    const mockEntitlement: Entitlement = {
      isEntitled: false,
      isTrial: false,
      isPremiumActive: false,
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('Premiumユーザーは無制限', async () => {
      const premiumEntitlement: Entitlement = {
        isEntitled: true,
        isTrial: false,
        isPremiumActive: true,
      };

      const result = await checkMonthlyRecordingLimit(mockUserId, premiumEntitlement);

      expect(result.canRecord).toBe(true);
      expect(result.limit).toBe(Infinity);
    });

    it('Freeプランで今月の日付の場合、録音数をチェック', async () => {
      const today = new Date();
      (listRecordingsByMonth as jest.Mock).mockResolvedValue({
        data: [
          { id: 'recording-1' },
          { id: 'recording-2' },
        ],
        error: null,
      });

      // getUserInstrumentCountをモック（楽器数が1個）
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockResolvedValue({ data: [{ instrument_id: 'instrument-1' }], error: null }),
      });

      const result = await checkMonthlyRecordingLimit(mockUserId, mockEntitlement, today);

      expect(result.canRecord).toBe(true);
      expect(result.currentCount).toBe(2);
      expect(result.limit).toBe(3); // 楽器1個 × 3回
    });

    it('Freeプランで先月の日付の場合は録音不可', async () => {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      // getUserInstrumentCountをモック（楽器数が1個）
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockResolvedValue({ data: [{ instrument_id: 'instrument-1' }], error: null }),
      });

      const result = await checkMonthlyRecordingLimit(mockUserId, mockEntitlement, lastMonth);

      expect(result.canRecord).toBe(false);
      expect(result.reason).toContain('Freeプランでは当月のみ録音可能です');
    });

    it('Freeプランで録音数が制限に達している場合は録音不可', async () => {
      const today = new Date();
      (listRecordingsByMonth as jest.Mock).mockResolvedValue({
        data: [
          { id: 'recording-1' },
          { id: 'recording-2' },
          { id: 'recording-3' },
        ],
        error: null,
      });

      // getUserInstrumentCountをモック（楽器数が1個）
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockResolvedValue({ data: [{ instrument_id: 'instrument-1' }], error: null }),
      });

      const result = await checkMonthlyRecordingLimit(mockUserId, mockEntitlement, today);

      expect(result.canRecord).toBe(false);
      expect(result.currentCount).toBe(3);
      expect(result.limit).toBe(3);
    });
  });

  describe('checkMyLibraryLimit', () => {
    const mockEntitlement: Entitlement = {
      isEntitled: false,
      isTrial: false,
      isPremiumActive: false,
    };

    it('Premiumユーザーは無制限', async () => {
      const premiumEntitlement: Entitlement = {
        isEntitled: true,
        isTrial: false,
        isPremiumActive: true,
      };

      const result = await checkMyLibraryLimit(mockUserId, premiumEntitlement, mockInstrumentId);

      expect(result.canAdd).toBe(true);
      expect(result.limit).toBe(Infinity);
    });

    it('Freeプランで曲数が制限以下の場合は追加可能', async () => {
      const twoSongs = [
        { id: 'song-1', instrument_id: mockInstrumentId },
        { id: 'song-2', instrument_id: mockInstrumentId },
      ];
      (supabase.from as jest.Mock).mockImplementation(() => ({
        select: () => ({
          eq: () => ({
            is: () => Promise.resolve({ data: twoSongs, error: null }),
          }),
        }),
      }));

      const result = await checkMyLibraryLimit(mockUserId, mockEntitlement, mockInstrumentId);

      expect(result.canAdd).toBe(true);
      expect(result.currentCount).toBe(2);
      expect(result.limit).toBe(10);
    });

    it('Freeプランで曲数が制限に達している場合は追加不可', async () => {
      const mockSongs = Array.from({ length: 10 }, (_, i) => ({
        id: `song-${i + 1}`,
        instrument_id: mockInstrumentId,
      }));
      (supabase.from as jest.Mock).mockImplementation(() => ({
        select: () => ({
          eq: () => ({
            is: () => Promise.resolve({ data: mockSongs, error: null }),
          }),
        }),
      }));

      const result = await checkMyLibraryLimit(mockUserId, mockEntitlement, mockInstrumentId);

      expect(result.canAdd).toBe(false);
      expect(result.currentCount).toBe(10);
      expect(result.limit).toBe(10);
    });
  });
});

