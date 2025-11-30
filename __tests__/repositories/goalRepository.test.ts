/**
 * goalRepository.ts のテスト
 * 目標リポジトリの正確性を保証
 */

import { goalRepository } from '@/repositories/goalRepository';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase');

describe('goalRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getGoalsが目標一覧を取得できる', async () => {
    const mockGoals = [{ id: 'goal-1', title: 'Test Goal' }];
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: mockGoals, error: null }),
    });

    const result = await goalRepository.getGoals('user-1');

    expect(result).toEqual(mockGoals);
  });

  it('createGoalが目標を作成できる', async () => {
    const mockGoal = { id: 'goal-1', title: 'Test Goal' };
    (supabase.from as jest.Mock).mockReturnValue({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockGoal, error: null }),
    });

    const result = await goalRepository.createGoal({
      user_id: 'user-1',
      title: 'Test Goal',
      goal_type: 'personal_short',
    });

    expect(result).toEqual(mockGoal);
  });
});
