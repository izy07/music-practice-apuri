/**
 * 練習日程リポジトリ
 * 
 * 練習日程データへのアクセスを提供するリポジトリレイヤー
 * 
 * @module repositories/scheduleRepository
 */

import { supabase } from '@/lib/supabase';
import type { PracticeSchedule } from '@/types/organization';
import type { RepositoryResult } from '@/lib/database/interfaces';
import { safeExecute, isSupabaseTableNotFoundError } from '@/lib/database/baseRepository';
import logger from '@/lib/logger';

/**
 * 練習日程リポジトリ
 */
export const scheduleRepository = {
  /**
   * 組織の月次練習日程を取得
   */
  async getMonthlySchedules(
    organizationId: string,
    year: number,
    month: number
  ): Promise<RepositoryResult<PracticeSchedule[]>> {
    return safeExecute(async () => {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('practice_schedules')
        .select('*')
        .eq('organization_id', organizationId)
        .gte('practice_date', startDate)
        .lte('practice_date', endDate)
        .order('practice_date', { ascending: true });

      // 404エラー（テーブル不存在）の場合は空配列を返す
      if (error) {
        if (isSupabaseTableNotFoundError(error)) {
          logger.info('practice_schedulesテーブルが存在しないか、アクセス権限がありません。空配列を返します。');
          return [];
        }
        throw error;
      }

      return (data || []) as PracticeSchedule[];
    }, 'getMonthlySchedules');
  },

  /**
   * 練習日程IDで取得
   */
  async findById(id: string): Promise<RepositoryResult<PracticeSchedule>> {
    return safeExecute(async () => {
      const { data, error } = await supabase
        .from('practice_schedules')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) {
        throw new Error('Practice schedule not found');
      }

      return data as PracticeSchedule;
    }, 'findById');
  },

  /**
   * 練習日程を作成
   */
  async create(
    schedule: Omit<PracticeSchedule, 'id' | 'created_at'>
  ): Promise<RepositoryResult<PracticeSchedule>> {
    return safeExecute(async () => {
      const { data: result, error } = await supabase
        .from('practice_schedules')
        .insert(schedule)
        .select()
        .single();

      if (error) throw error;
      if (!result) {
        throw new Error('Failed to create practice schedule');
      }

      return result as PracticeSchedule;
    }, 'create');
  },

  /**
   * 練習日程を更新
   */
  async update(
    id: string,
    data: Partial<Omit<PracticeSchedule, 'id' | 'created_at' | 'organization_id'>>
  ): Promise<RepositoryResult<PracticeSchedule>> {
    return safeExecute(async () => {
      const { data: result, error } = await supabase
        .from('practice_schedules')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!result) {
        throw new Error('Failed to update practice schedule');
      }

      return result as PracticeSchedule;
    }, 'update');
  },

  /**
   * 練習日程を削除
   */
  async delete(id: string): Promise<RepositoryResult<void>> {
    return safeExecute(async () => {
      const { error } = await supabase
        .from('practice_schedules')
        .delete()
        .eq('id', id);

      if (error) throw error;
    }, 'delete');
  },
};

export default scheduleRepository;
