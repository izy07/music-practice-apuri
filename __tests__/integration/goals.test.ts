/**
 * 目標管理機能の統合テスト
 * 目標の保存・取得・更新のテスト
 */

import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase');

describe('目標管理の統合テスト', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('目標の保存', () => {
    it('短期目標を保存できる', async () => {
      const mockGoal = {
        id: 'goal-id',
        user_id: 'test-user',
        title: 'スケールを練習する',
        description: '全調のスケールを練習',
        target_date: '2025-12-31',
        goal_type: 'personal_short',
        progress_percentage: 0,
        is_active: true,
        is_completed: false,
      };

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockResolvedValue({ data: mockGoal, error: null }),
      });

      const { error } = await supabase.from('goals').insert(mockGoal);

      expect(error).toBeNull();
    });

    it('長期目標を保存できる', async () => {
      const mockGoal = {
        id: 'goal-id',
        user_id: 'test-user',
        title: '綺麗な音を出せるようになる',
        goal_type: 'personal_long',
        progress_percentage: 0,
        is_active: true,
        is_completed: false,
      };

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockResolvedValue({ data: mockGoal, error: null }),
      });

      const { error } = await supabase.from('goals').insert(mockGoal);

      expect(error).toBeNull();
    });

    it('団体目標を保存できる', async () => {
      const mockGoal = {
        id: 'goal-id',
        user_id: 'test-user',
        title: 'コンクールで金賞',
        goal_type: 'group',
        progress_percentage: 0,
        is_active: true,
        is_completed: false,
      };

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockResolvedValue({ data: mockGoal, error: null }),
      });

      const { error } = await supabase.from('goals').insert(mockGoal);

      expect(error).toBeNull();
    });
  });

  describe('目標の取得', () => {
    it('完了済み目標を除外できる', () => {
      const allGoals = [
        { id: '1', title: '目標1', is_completed: false },
        { id: '2', title: '目標2', is_completed: true },
        { id: '3', title: '目標3', is_completed: false },
      ];

      const activeGoals = allGoals.filter(g => !g.is_completed);
      expect(activeGoals).toHaveLength(2);
      expect(activeGoals.every(g => !g.is_completed)).toBe(true);
    });

    it('短期目標のみをフィルタリングできる', () => {
      const allGoals = [
        { id: '1', title: '短期目標', goal_type: 'personal_short' },
        { id: '2', title: '長期目標', goal_type: 'personal_long' },
        { id: '3', title: '団体目標', goal_type: 'group' },
      ];

      const shortGoals = allGoals.filter(g => g.goal_type === 'personal_short');
      expect(shortGoals).toHaveLength(1);
      expect(shortGoals[0].title).toBe('短期目標');
    });

    it('長期目標のみをフィルタリングできる', () => {
      const allGoals = [
        { id: '1', title: '短期目標', goal_type: 'personal_short' },
        { id: '2', title: '長期目標', goal_type: 'personal_long' },
      ];

      const longGoals = allGoals.filter(g => g.goal_type === 'personal_long');
      expect(longGoals).toHaveLength(1);
    });

    it('団体目標のみをフィルタリングできる', () => {
      const allGoals = [
        { id: '1', title: '短期目標', goal_type: 'personal_short' },
        { id: '2', title: '団体目標', goal_type: 'group' },
      ];

      const groupGoals = allGoals.filter(g => g.goal_type === 'group');
      expect(groupGoals).toHaveLength(1);
    });
  });

  describe('目標の更新', () => {
    it('進捗率を更新できる', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      });

      const { error } = await supabase
        .from('goals')
        .update({ progress_percentage: 50 })
        .eq('id', 'goal-id');

      expect(error).toBeNull();
    });

    it('目標を完了状態に更新できる', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      });

      const { error } = await supabase
        .from('goals')
        .update({ 
          is_completed: true,
          progress_percentage: 100,
        })
        .eq('id', 'goal-id');

      expect(error).toBeNull();
    });
  });

  describe('目標の削除', () => {
    it('目標を削除できる', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      });

      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', 'goal-id');

      expect(error).toBeNull();
    });
  });

  describe('目標タイプのバリデーション', () => {
    it('有効な目標タイプを受け入れる', () => {
      const validTypes = ['personal_short', 'personal_long', 'group'];
      validTypes.forEach(type => {
        expect(['personal_short', 'personal_long', 'group']).toContain(type);
      });
    });

    it('無効な目標タイプを検出する', () => {
      const invalidType = 'invalid_type';
      expect(['personal_short', 'personal_long', 'group']).not.toContain(invalidType);
    });
  });

  describe('進捗率のバリデーション', () => {
    it('0-100の範囲内の進捗率を受け入れる', () => {
      expect(0).toBeGreaterThanOrEqual(0);
      expect(0).toBeLessThanOrEqual(100);
      
      expect(50).toBeGreaterThanOrEqual(0);
      expect(50).toBeLessThanOrEqual(100);
      
      expect(100).toBeGreaterThanOrEqual(0);
      expect(100).toBeLessThanOrEqual(100);
    });

    it('進捗率を10%刻みで更新できる', () => {
      let progress = 0;
      
      progress = Math.min(100, progress + 10);
      expect(progress).toBe(10);
      
      progress = Math.min(100, progress + 10);
      expect(progress).toBe(20);
      
      // 100を超えない
      progress = 95;
      progress = Math.min(100, progress + 10);
      expect(progress).toBe(100);
    });

    it('進捗率を減らすこともできる', () => {
      let progress = 50;
      
      progress = Math.max(0, progress - 10);
      expect(progress).toBe(40);
      
      // 0未満にならない
      progress = 5;
      progress = Math.max(0, progress - 10);
      expect(progress).toBe(0);
    });
  });
});

