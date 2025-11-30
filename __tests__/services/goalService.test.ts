/**
 * goalService.ts のテスト
 * 目標サービスの正確性を保証
 */

import { GoalService } from '@/services/goalService';
import { goalRepository } from '@/repositories/goalRepository';

jest.mock('@/repositories/goalRepository');

describe('GoalService', () => {
  let goalService: GoalService;

  beforeEach(() => {
    goalService = new GoalService();
    jest.clearAllMocks();
  });

  it('getGoalsが目標一覧を取得できる', async () => {
    const mockGoals = [{ id: 'goal-1', title: 'Test Goal' }];
    (goalRepository.getGoals as jest.Mock).mockResolvedValue(mockGoals);

    const result = await goalService.getGoals('user-1');

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockGoals);
  });

  it('createGoalがバリデーションエラーを返す（タイトルが空）', async () => {
    const result = await goalService.createGoal('user-1', {
      title: '',
      goal_type: 'personal_short',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('タイトルは必須です');
  });

  it('createGoalがバリデーションエラーを返す（タイトルが長すぎる）', async () => {
    const result = await goalService.createGoal('user-1', {
      title: 'a'.repeat(201),
      goal_type: 'personal_short',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('タイトルは200文字以内で入力してください');
  });

  it('createGoalが目標を作成できる', async () => {
    (goalRepository.createGoal as jest.Mock).mockResolvedValue({
      success: true,
      data: { id: 'goal-1' },
    });

    const result = await goalService.createGoal('user-1', {
      title: 'Test Goal',
      goal_type: 'personal_short',
    });

    expect(result.success).toBe(true);
  });
});
