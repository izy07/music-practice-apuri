/**
 * deletionRepository の単体テスト
 * 削除の正式実装入口が正しく DB / Storage / RPC を呼ぶことを検証する
 */

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    storage: {
      from: jest.fn(),
    },
    rpc: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/errorHandler', () => ({
  ErrorHandler: {
    handle: jest.fn(),
  },
}));

jest.mock('@/repositories/userRepository', () => ({
  getInstrumentSpecificProfileData: jest.fn(),
  saveInstrumentSpecificProfileData: jest.fn(),
}));

import { supabase } from '@/lib/supabase';
import {
  deleteRecordingComplete,
  clearUserProfile,
  persistInstrumentCareerData,
  deleteInstrumentScopedData,
  deleteUserAccount,
} from '@/repositories/deletionRepository';
import {
  getInstrumentSpecificProfileData,
  saveInstrumentSpecificProfileData,
} from '@/repositories/userRepository';

describe('deletionRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('deleteRecordingComplete', () => {
    it('DB行とStorageを削除する', async () => {
      const maybeSingle = jest.fn().mockResolvedValue({
        data: { id: 'rec-1', file_path: 'user/rec-1.webm', user_id: 'u1' },
        error: null,
      });
      const eqSelect = jest.fn().mockReturnValue({ maybeSingle });
      const select = jest.fn().mockReturnValue({ eq: eqSelect });

      const eqDelete = jest.fn().mockResolvedValue({ error: null });
      const deleteFn = jest.fn().mockReturnValue({ eq: eqDelete });

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'recordings') {
          return { select, delete: deleteFn };
        }
        return {};
      });

      const remove = jest.fn().mockResolvedValue({ error: null });
      (supabase.storage.from as jest.Mock).mockReturnValue({ remove });

      const result = await deleteRecordingComplete('rec-1');

      expect(result.error).toBeNull();
      expect(result.data?.storageDeleted).toBe(true);
      expect(remove).toHaveBeenCalledWith(['user/rec-1.webm']);
    });

    it('録音が見つからない場合はエラーを返す', async () => {
      const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
      const eqSelect = jest.fn().mockReturnValue({ maybeSingle });
      const select = jest.fn().mockReturnValue({ eq: eqSelect });
      (supabase.from as jest.Mock).mockReturnValue({ select });

      const result = await deleteRecordingComplete('missing');

      expect(result.error).toBeTruthy();
      expect(result.error?.message).toContain('見つかりません');
    });

    it('Storage削除失敗時はエラーを返す（握りつぶさない）', async () => {
      const maybeSingle = jest.fn().mockResolvedValue({
        data: { id: 'rec-1', file_path: 'user/rec-1.webm', user_id: 'u1' },
        error: null,
      });
      const eqSelect = jest.fn().mockReturnValue({ maybeSingle });
      const select = jest.fn().mockReturnValue({ eq: eqSelect });
      const eqDelete = jest.fn().mockResolvedValue({ error: null });
      const deleteFn = jest.fn().mockReturnValue({ eq: eqDelete });
      (supabase.from as jest.Mock).mockReturnValue({ select, delete: deleteFn });

      const remove = jest.fn().mockResolvedValue({ error: { message: 'storage failed' } });
      (supabase.storage.from as jest.Mock).mockReturnValue({ remove });

      const result = await deleteRecordingComplete('rec-1');

      expect(result.error).toBeTruthy();
      expect(result.error?.message).toContain('音声ファイルの削除に失敗');
    });
  });

  describe('clearUserProfile', () => {
    it('プロフィール全カラムをクリアする', async () => {
      const eq = jest.fn().mockResolvedValue({ error: null });
      const update = jest.fn().mockReturnValue({ eq });
      (supabase.from as jest.Mock).mockReturnValue({ update });

      const result = await clearUserProfile('user-1');

      expect(result.error).toBeNull();
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          display_name: null,
          instrument_specific_data: {},
          birthday: null,
          organization: null,
          music_start_age: null,
        })
      );
    });
  });

  describe('persistInstrumentCareerData', () => {
    it('経歴を instrument_specific_data に保存する', async () => {
      (getInstrumentSpecificProfileData as jest.Mock).mockResolvedValue({
        data: { music_start_age: 10 },
        error: null,
      });
      (saveInstrumentSpecificProfileData as jest.Mock).mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await persistInstrumentCareerData('u1', 'inst-1', {
        pastOrganizationsUi: [{ name: 'A校', startYm: '2020-04' }],
        awardsUi: [{ title: '金賞' }],
        performancesUi: [{ title: '定期演奏会' }],
        breakPeriodsUi: [],
      });

      expect(result.error).toBeNull();
      expect(saveInstrumentSpecificProfileData).toHaveBeenCalledWith(
        'u1',
        'inst-1',
        expect.objectContaining({
          music_start_age: 10,
          career_data: expect.objectContaining({
            pastOrganizationsUi: [{ name: 'A校', startYm: '2020-04' }],
            awardsUi: [{ title: '金賞' }],
          }),
        })
      );
    });

    it('空の所属名はフィルタして保存する', async () => {
      (getInstrumentSpecificProfileData as jest.Mock).mockResolvedValue({
        data: {},
        error: null,
      });
      (saveInstrumentSpecificProfileData as jest.Mock).mockResolvedValue({
        data: null,
        error: null,
      });

      await persistInstrumentCareerData('u1', 'inst-1', {
        pastOrganizationsUi: [{ name: '  ' }, { name: '残す' }],
        awardsUi: [],
        performancesUi: [],
        breakPeriodsUi: [],
      });

      expect(saveInstrumentSpecificProfileData).toHaveBeenCalledWith(
        'u1',
        'inst-1',
        expect.objectContaining({
          career_data: expect.objectContaining({
            pastOrganizationsUi: [{ name: '残す' }],
          }),
        })
      );
    });
  });

  describe('deleteInstrumentScopedData', () => {
    it('楽器スコープのテーブルとStorageを削除する', async () => {
      const recordingsSelectEq = jest.fn().mockResolvedValue({
        data: [{ id: 'r1', file_path: 'u1/a.webm' }],
        error: null,
      });
      const recordingsSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: recordingsSelectEq,
        }),
      });

      const deleteEq = jest.fn().mockResolvedValue({ error: null });
      const deleteOr = jest.fn().mockResolvedValue({ error: null });
      const deleteChain = {
        eq: jest.fn().mockReturnValue({
          eq: deleteEq,
          or: deleteOr,
        }),
      };

      const profileMaybeSingle = jest.fn().mockResolvedValue({
        data: { instrument_specific_data: { 'inst-1': { x: 1 }, 'inst-2': { y: 2 } } },
        error: null,
      });
      const profileUpdateEq = jest.fn().mockResolvedValue({ error: null });
      const profileUpdate = jest.fn().mockReturnValue({ eq: profileUpdateEq });

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'recordings') {
          return {
            select: recordingsSelect,
            delete: jest.fn().mockReturnValue(deleteChain),
          };
        }
        if (table === 'user_profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({ maybeSingle: profileMaybeSingle }),
            }),
            update: profileUpdate,
          };
        }
        return {
          delete: jest.fn().mockReturnValue(deleteChain),
        };
      });

      const remove = jest.fn().mockResolvedValue({ error: null });
      (supabase.storage.from as jest.Mock).mockReturnValue({ remove });

      const result = await deleteInstrumentScopedData('u1', 'inst-1');

      expect(result.error).toBeNull();
      expect(remove).toHaveBeenCalledWith(['u1/a.webm']);
      expect(profileUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          instrument_specific_data: { 'inst-2': { y: 2 } },
        })
      );
    });
  });

  describe('deleteUserAccount', () => {
    it('delete_user_account RPC を呼ぶ', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({ error: null });

      const result = await deleteUserAccount();

      expect(result.error).toBeNull();
      expect(supabase.rpc).toHaveBeenCalledWith('delete_user_account');
    });

    it('RPC失敗時はエラーを返す', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        error: { message: 'Not authenticated' },
      });

      const result = await deleteUserAccount();

      expect(result.error).toBeTruthy();
      expect(result.error?.message).toContain('Not authenticated');
    });
  });
});
