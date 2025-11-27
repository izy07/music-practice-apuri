/**
 * userRepositoryのテスト
 */

import { getUserProfile, upsertUserProfile, updatePracticeLevel } from '@/repositories/userRepository';
import { supabase } from '@/lib/supabase';

// モック
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  default: {
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

describe('userRepository', () => {
  const mockSelect = jest.fn();
  const mockEq = jest.fn();
  const mockMaybeSingle = jest.fn();
  const mockUpsert = jest.fn();
  const mockUpdate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockEq.mockReturnThis();
    mockMaybeSingle.mockReturnThis();
    mockSelect.mockReturnValue({
      eq: mockEq,
      maybeSingle: mockMaybeSingle,
    });
    
    mockUpsert.mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn(),
      }),
    });
    
    mockUpdate.mockReturnThis();
    
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
      upsert: mockUpsert,
      update: mockUpdate,
      eq: mockEq,
    });
  });

  describe('getUserProfile', () => {
    it('正常にプロフィールを取得できる', async () => {
      const mockProfile = {
        user_id: 'test-user-id',
        display_name: 'テストユーザー',
        practice_level: 'beginner',
      };

      mockMaybeSingle.mockResolvedValue({
        data: mockProfile,
        error: null,
      });

      const result = await getUserProfile('test-user-id');

      expect(result.error).toBeNull();
      expect(result.data).toEqual(mockProfile);
      expect(supabase.from).toHaveBeenCalledWith('user_profiles');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('user_id', 'test-user-id');
    });

    it('エラーが発生した場合はエラーを返す', async () => {
      const mockError = new Error('Database error');
      mockMaybeSingle.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const result = await getUserProfile('test-user-id');

      expect(result.error).toBeTruthy();
      expect(result.data).toBeNull();
    });
  });

  describe('upsertUserProfile', () => {
    it('正常にプロフィールを更新できる', async () => {
      const mockProfile = {
        user_id: 'test-user-id',
        display_name: '更新されたユーザー',
      };

      mockUpsert.mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
        }),
      });

      const result = await upsertUserProfile(mockProfile);

      expect(result.error).toBeNull();
      expect(result.data).toEqual(mockProfile);
      expect(supabase.from).toHaveBeenCalledWith('user_profiles');
    });

    it('エラーが発生した場合はエラーを返す', async () => {
      const mockError = new Error('Update error');
      mockUpsert.mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: mockError,
          }),
        }),
      });

      const result = await upsertUserProfile({ user_id: 'test-user-id' });

      expect(result.error).toBeTruthy();
      expect(result.data).toBeNull();
    });
  });

  describe('updatePracticeLevel', () => {
    it('正常に練習レベルを更新できる', async () => {
      mockUpdate.mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          error: null,
        }),
      });

      const result = await updatePracticeLevel('test-user-id', 'intermediate');

      expect(result.error).toBeNull();
      expect(supabase.from).toHaveBeenCalledWith('user_profiles');
    });

    it('エラーが発生した場合はエラーを返す', async () => {
      const mockError = new Error('Update error');
      mockUpdate.mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          error: mockError,
        }),
      });

      const result = await updatePracticeLevel('test-user-id', 'intermediate');

      expect(result.error).toBeTruthy();
    });
  });
});

