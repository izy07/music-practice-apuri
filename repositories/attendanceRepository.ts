/**
 * 出欠管理リポジトリ
 * 
 * 出欠記録データへのアクセスを提供するリポジトリレイヤー
 * 
 * @module repositories/attendanceRepository
 */

import { supabase } from '@/lib/supabase';
import type { AttendanceRecord, AttendanceStatus } from '@/types/organization';
import type { RepositoryResult } from '@/lib/database/interfaces';
import { safeExecute } from '@/lib/database/baseRepository';

/**
 * 出欠管理リポジトリ
 */
export const attendanceRepository = {
  /**
   * 練習日程の出欠記録一覧を取得
   */
  async getByScheduleId(scheduleId: string): Promise<RepositoryResult<AttendanceRecord[]>> {
    return safeExecute(async () => {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('schedule_id', scheduleId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []) as AttendanceRecord[];
    }, 'getByScheduleId');
  },

  /**
   * ユーザーの出欠記録を取得
   */
  async getByUserAndSchedule(
    userId: string,
    scheduleId: string
  ): Promise<RepositoryResult<AttendanceRecord | null>> {
    return safeExecute(async () => {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('user_id', userId)
        .eq('schedule_id', scheduleId)
        .maybeSingle();

      if (error) throw error;

      return (data as AttendanceRecord) || null;
    }, 'getByUserAndSchedule');
  },

  /**
   * 出欠記録を作成または更新
   */
  async upsert(data: {
    schedule_id: string;
    user_id: string;
    status: AttendanceStatus;
    notes?: string;
  }): Promise<RepositoryResult<AttendanceRecord>> {
    return safeExecute(async () => {
      // 既存の記録をチェック
      const existing = await this.getByUserAndSchedule(data.user_id, data.schedule_id);

      if (existing.data) {
        // 既存の記録を更新
        const { data: result, error } = await supabase
          .from('attendance_records')
          .update({
            status: data.status,
            notes: data.notes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.data.id)
          .select()
          .single();

        if (error) throw error;
        if (!result) {
          throw new Error('Failed to update attendance record');
        }

        return result as AttendanceRecord;
      } else {
        // 新しい記録を作成
        const { data: result, error } = await supabase
          .from('attendance_records')
          .insert(data)
          .select()
          .single();

        if (error) throw error;
        if (!result) {
          throw new Error('Failed to create attendance record');
        }

        return result as AttendanceRecord;
      }
    }, 'upsert');
  },

  /**
   * 出欠記録を削除
   */
  async delete(id: string): Promise<RepositoryResult<void>> {
    return safeExecute(async () => {
      const { error } = await supabase
        .from('attendance_records')
        .delete()
        .eq('id', id);

      if (error) throw error;
    }, 'delete');
  },

  /**
   * 出欠登録が可能かどうかを判定
   * 
   * 練習日の当日から5日後まで登録可能（事前登録）
   */
  canRegisterAttendance(practiceDate: string): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const practice = new Date(practiceDate);
    practice.setHours(0, 0, 0, 0);
    
    const diffTime = practice.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // 練習日の当日から5日後まで登録可能
    return diffDays >= 0 && diffDays <= 5;
  },

  /**
   * 出席管理に表示するかどうかを判定
   * 
   * 練習日の当日から5日後まで表示
   */
  shouldShowInAttendance(practiceDate: string): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const practice = new Date(practiceDate);
    practice.setHours(0, 0, 0, 0);
    
    const diffTime = practice.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // 練習日の当日から5日後まで表示
    return diffDays >= 0 && diffDays <= 5;
  },
};

export default attendanceRepository;


