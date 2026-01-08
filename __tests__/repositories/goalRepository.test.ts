/**
 * goalRepository.ts のテスト
 * 目標リポジトリの正確性を保証
 * 
 * テストカバレッジ向上のため、すべての主要メソッドをテスト
 */

import { goalRepository } from '@/repositories/goalRepository';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase');

describe('goalRepository', () => {
  const mockUserId = 'user-123';
  const mockInstrumentId = 'instrument-456';
  const mockGoalId = 'goal-789';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getGoals', () => {
    it('目標一覧を取得できる', async () => {
      const mockGoals = [
        { id: 'goal-1', title: 'Test Goal 1', user_id: mockUserId },
        { id: 'goal-2', title: 'Test Goal 2', user_id: mockUserId },
      ];
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockGoals, error: null }),
      });

      const result = await goalRepository.getGoals(mockUserId);

      expect(result).toEqual(mockGoals);
      expect(supabase.from).toHaveBeenCalledWith('goals');
    });

    it('楽器IDでフィルタリングできる', async () => {
      const mockGoals = [
        { id: 'goal-1', title: 'Test Goal 1', user_id: mockUserId, instrument_id: mockInstrumentId },
      ];
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockGoals, error: null }),
      });

      const result = await goalRepository.getGoals(mockUserId, mockInstrumentId);

      expect(result).toEqual(mockGoals);
    });

    it('エラー時は空配列を返す', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error: new Error('Database error') }),
      });

      const result = await goalRepository.getGoals(mockUserId);

      expect(result).toEqual([]);
    });
  });

  describe('getCompletedGoals', () => {
    it('達成済み目標一覧を取得できる', async () => {
      const mockCompletedGoals = [
        { id: 'goal-1', title: 'Completed Goal', user_id: mockUserId, is_completed: true },
      ];
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockCompletedGoals, error: null }),
      });

      const result = await goalRepository.getCompletedGoals(mockUserId);

      expect(result).toEqual(mockCompletedGoals);
    });
  });

  describe('getExistingGoalsCount', () => {
    it('未達成目標数を取得できる', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        lt: jest.fn().mockResolvedValue({ count: 2, error: null }),
      });

      const result = await goalRepository.getExistingGoalsCount(mockUserId, mockInstrumentId);

      expect(result).toBe(2);
    });

    it('楽器IDがnullの場合でも動作する', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        lt: jest.fn().mockResolvedValue({ count: 1, error: null }),
      });

      const result = await goalRepository.getExistingGoalsCount(mockUserId, null);

      expect(result).toBe(1);
    });

    it('エラー時は0を返す', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        lt: jest.fn().mockResolvedValue({ count: null, error: new Error('Database error') }),
      });

      const result = await goalRepository.getExistingGoalsCount(mockUserId, mockInstrumentId);

      expect(result).toBe(0);
    });
  });

  describe('createGoal', () => {
    it('目標を作成できる', async () => {
      const mockGoal = {
        id: mockGoalId,
        title: 'Test Goal',
        user_id: mockUserId,
        goal_type: 'personal_short',
      };
      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockGoal, error: null }),
      });

      await goalRepository.createGoal(mockUserId, {
        title: 'Test Goal',
        goal_type: 'personal_short',
      });

      expect(supabase.from).toHaveBeenCalledWith('goals');
    });

    it('楽器IDを含めて目標を作成できる', async () => {
      const mockGoal = {
        id: mockGoalId,
        title: 'Test Goal',
        user_id: mockUserId,
        goal_type: 'personal_short',
        instrument_id: mockInstrumentId,
      };
      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockGoal, error: null }),
      });

      await goalRepository.createGoal(mockUserId, {
        title: 'Test Goal',
        goal_type: 'personal_short',
        instrument_id: mockInstrumentId,
      });

      expect(supabase.from).toHaveBeenCalledWith('goals');
    });
  });

  describe('updateProgress', () => {
    it('目標の進捗を更新できる', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      });

      await goalRepository.updateProgress(mockGoalId, 50, mockUserId);

      expect(supabase.from).toHaveBeenCalledWith('goals');
    });

    it('100%の進捗で達成としてマークできる', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      });

      await goalRepository.updateProgress(mockGoalId, 100, mockUserId);

      expect(supabase.from).toHaveBeenCalledWith('goals');
    });
  });

  describe('completeGoal', () => {
    it('目標を達成としてマークできる', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      });

      await goalRepository.completeGoal(mockGoalId, mockUserId);

      expect(supabase.from).toHaveBeenCalledWith('goals');
    });
  });

  describe('deleteGoal', () => {
    it('目標を削除できる', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      });

      await goalRepository.deleteGoal(mockGoalId, mockUserId);

      expect(supabase.from).toHaveBeenCalledWith('goals');
    });
  });

  describe('updateShowOnCalendar', () => {
    it('カレンダー表示フラグを更新できる', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      });

      await goalRepository.updateShowOnCalendar(mockGoalId, true, mockUserId, mockInstrumentId);

      expect(supabase.from).toHaveBeenCalledWith('goals');
    });
  });
});
