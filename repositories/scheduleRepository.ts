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

      // descriptionをnotesにマッピング
      const schedules = (data || []).map((item: any) => ({
        ...item,
        notes: item.notes || item.description || undefined,
      })) as PracticeSchedule[];

      return schedules;
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

      // descriptionをnotesにマッピング
      const schedule: PracticeSchedule = {
        ...data,
        notes: data.notes || data.description || undefined,
      } as PracticeSchedule;

      return schedule;
    }, 'findById');
  },

  /**
   * 練習日程を作成
   */
  async create(
    schedule: Omit<PracticeSchedule, 'id' | 'created_at'>
  ): Promise<RepositoryResult<PracticeSchedule>> {
    return safeExecute(async () => {
      // 現在のユーザーIDを取得
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('認証が必要です');
      }

      // notesとdescriptionの両方をサポート
      // テーブルにはdescriptionとnotesの両方がある可能性がある
      const insertData: Record<string, unknown> = {
        organization_id: schedule.organization_id,
        title: schedule.title,
        practice_date: schedule.practice_date,
        practice_type: schedule.practice_type,
        created_by: user.id,
      };

      // オプショナルフィールドを追加
      if (schedule.start_time) insertData.start_time = schedule.start_time;
      if (schedule.end_time) insertData.end_time = schedule.end_time;
      if (schedule.location) insertData.location = schedule.location;
      
      // notesとdescriptionの両方をサポート（notesを優先）
      if (schedule.notes) {
        insertData.notes = schedule.notes;
        insertData.description = schedule.notes; // 後方互換性のため
      } else if (schedule.description) {
        insertData.description = schedule.description;
      }

      const { data: result, error } = await supabase
        .from('practice_schedules')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      if (!result) {
        throw new Error('Failed to create practice schedule');
      }

      // 結果をPracticeSchedule型に変換（notesとdescriptionの両方をサポート）
      const practiceSchedule: PracticeSchedule = {
        ...result,
        notes: result.notes || result.description || undefined,
      } as PracticeSchedule;

      return practiceSchedule;
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
      // notesとdescriptionの両方をサポート
      const updateData: Record<string, unknown> = { ...data };
      
      // notesが指定されている場合、notesとdescriptionの両方を更新
      if (data.notes !== undefined) {
        updateData.notes = data.notes;
        updateData.description = data.notes; // 後方互換性のため
      } else if (data.description !== undefined) {
        updateData.description = data.description;
      }

      const { data: result, error } = await supabase
        .from('practice_schedules')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!result) {
        throw new Error('Failed to update practice schedule');
      }

      // descriptionをnotesにマッピング
      const schedule: PracticeSchedule = {
        ...result,
        notes: result.notes || result.description || undefined,
      } as PracticeSchedule;

      return schedule;
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
