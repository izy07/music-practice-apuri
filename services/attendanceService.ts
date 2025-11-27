/**
 * 出欠管理サービスの実装
 * 
 * ビジネスロジックをリポジトリから分離し、UI層に提供
 * 単一責任の原則に従い、出欠管理関連のビジネスロジックのみを担当
 * 
 * @module services/attendanceService
 */

import { attendanceRepository } from '@/repositories/attendanceRepository';
import { safeServiceExecute, ServiceResult } from './baseService';
import logger from '@/lib/logger';
import type { AttendanceRecord, AttendanceStatus } from '@/types/organization';
import { supabase } from '@/lib/supabase';

const SERVICE_CONTEXT = 'attendanceService';

/**
 * 出欠管理サービス
 * 
 * リポジトリ層への依存を抽象化し、ビジネスロジックを提供
 */
export class AttendanceService {
  /**
   * 練習日程の出欠記録一覧を取得
   */
  async getByScheduleId(scheduleId: string): Promise<ServiceResult<AttendanceRecord[]>> {
    return safeServiceExecute(
      async () => {
        logger.debug(`[${SERVICE_CONTEXT}] getByScheduleId:start`, { scheduleId });

        const result = await attendanceRepository.getByScheduleId(scheduleId);
        if (result.error) {
          throw result.error;
        }

        logger.debug(`[${SERVICE_CONTEXT}] getByScheduleId:success`, {
          count: result.data?.length || 0,
        });

        return result.data || [];
      },
      `${SERVICE_CONTEXT}.getByScheduleId`,
      'ATTENDANCE_FETCH_ERROR'
    );
  }

  /**
   * 出欠を登録
   */
  async registerAttendance(
    scheduleId: string,
    status: AttendanceStatus,
    notes?: string
  ): Promise<ServiceResult<AttendanceRecord>> {
    return safeServiceExecute(
      async () => {
        logger.debug(`[${SERVICE_CONTEXT}] registerAttendance:start`, {
          scheduleId,
          status,
        });

        // 現在のユーザーを取得
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('認証が必要です');
        }

        const result = await attendanceRepository.upsert({
          schedule_id: scheduleId,
          user_id: user.id,
          status,
          notes,
        });

        if (result.error) {
          throw result.error;
        }
        if (!result.data) {
          throw new Error('出欠登録に失敗しました');
        }

        logger.info(`[${SERVICE_CONTEXT}] registerAttendance:success`, {
          recordId: result.data.id,
          scheduleId,
          userId: user.id,
        });

        return result.data;
      },
      `${SERVICE_CONTEXT}.registerAttendance`,
      'ATTENDANCE_REGISTER_ERROR'
    );
  }

  /**
   * 出欠登録が可能かどうかを判定
   * 
   * 練習日の前日から当日まで登録可能
   */
  canRegisterAttendance(practiceDate: string): boolean {
    return attendanceRepository.canRegisterAttendance(practiceDate);
  }

  /**
   * 出欠記録を削除
   */
  async deleteAttendance(id: string): Promise<ServiceResult<void>> {
    return safeServiceExecute(
      async () => {
        logger.debug(`[${SERVICE_CONTEXT}] deleteAttendance:start`, { id });

        const result = await attendanceRepository.delete(id);
        if (result.error) {
          throw result.error;
        }

        logger.info(`[${SERVICE_CONTEXT}] deleteAttendance:success`, { id });
      },
      `${SERVICE_CONTEXT}.deleteAttendance`,
      'ATTENDANCE_DELETE_ERROR'
    );
  }
}

// シングルトンインスタンスをエクスポート
export const attendanceService = new AttendanceService();

