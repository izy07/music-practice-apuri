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
        .eq('practice_schedule_id', scheduleId)
        .order('registered_at', { ascending: false });

      // テーブルが存在しない場合（404エラー）は空配列を返す
      if (error) {
        if (error.code === 'PGRST205' || error.code === '42P01' || error.message?.includes('does not exist')) {
          // テーブルが存在しない場合は空配列を返す（エラーとして扱わない）
          return [];
        }
        throw error;
      }

      // データベースのカラム名を型定義のプロパティ名にマッピング
      return (data || []).map((record: any) => ({
        id: record.id,
        schedule_id: record.practice_schedule_id,
        user_id: record.user_id,
        status: record.attendance_status,
        notes: undefined, // テーブルにnotesカラムがないため
        created_at: record.registered_at,
        updated_at: record.updated_at,
      })) as AttendanceRecord[];
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
        .eq('practice_schedule_id', scheduleId)
        .maybeSingle();

      // テーブルが存在しない場合（404エラー）はnullを返す
      if (error) {
        if (error.code === 'PGRST205' || error.code === '42P01' || error.message?.includes('does not exist')) {
          // テーブルが存在しない場合はnullを返す（エラーとして扱わない）
          return null;
        }
        throw error;
      }

      if (!data) return null;

      // データベースのカラム名を型定義のプロパティ名にマッピング
      return {
        id: data.id,
        schedule_id: data.practice_schedule_id,
        user_id: data.user_id,
        status: data.attendance_status,
        notes: undefined, // テーブルにnotesカラムがないため
        created_at: data.registered_at,
        updated_at: data.updated_at,
      } as AttendanceRecord;
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
            attendance_status: data.status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.data.id)
          .select()
          .single();

        // テーブルが存在しない場合（404エラー）の処理
        if (error) {
          if (error.code === 'PGRST205' || error.code === '42P01' || error.message?.includes('does not exist')) {
            throw new Error('attendance_recordsテーブルが存在しません。マイグレーションを実行してください。');
          }
          throw error;
        }
        if (!result) {
          throw new Error('Failed to update attendance record');
        }

        // データベースのカラム名を型定義のプロパティ名にマッピング
        return {
          id: result.id,
          schedule_id: result.practice_schedule_id,
          user_id: result.user_id,
          status: result.attendance_status,
          notes: result.notes,
          created_at: result.registered_at,
          updated_at: result.updated_at,
        } as AttendanceRecord;
      } else {
        // 新しい記録を作成
        const { data: result, error } = await supabase
          .from('attendance_records')
          .insert({
            practice_schedule_id: data.schedule_id,
            user_id: data.user_id,
            attendance_status: data.status,
          })
          .select()
          .single();

        // テーブルが存在しない場合（404エラー）の処理
        if (error) {
          if (error.code === 'PGRST205' || error.code === '42P01' || error.message?.includes('does not exist')) {
            throw new Error('attendance_recordsテーブルが存在しません。マイグレーションを実行してください。');
          }
          throw error;
        }
        if (!result) {
          throw new Error('Failed to create attendance record');
        }

        // データベースのカラム名を型定義のプロパティ名にマッピング
        return {
          id: result.id,
          schedule_id: result.practice_schedule_id,
          user_id: result.user_id,
          status: result.attendance_status,
          notes: result.notes,
          created_at: result.registered_at,
          updated_at: result.updated_at,
        } as AttendanceRecord;
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

      // テーブルが存在しない場合（404エラー）はエラーを無視（既に削除されているとみなす）
      if (error) {
        if (error.code === 'PGRST205' || error.code === '42P01' || error.message?.includes('does not exist')) {
          // テーブルが存在しない場合は成功として扱う（既に削除されているとみなす）
          return;
        }
        throw error;
      }
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


