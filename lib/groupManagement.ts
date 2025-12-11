/**
 * @deprecated このファイルは後方互換性のためのみ存在します
 * 
 * 新しいコードでは以下のサービスを使用してください:
 * - organizationService: 組織管理
 * - adminCodeService: 管理者コード管理
 * - scheduleService: 練習日程管理
 * - attendanceService: 出欠管理
 * - taskService: タスク管理
 * 
 * 移行ガイド:
 * - OrganizationManager.createOrganization() → organizationService.createOrganization()
 * - OrganizationManager.joinOrganization() → organizationService.joinOrganization()
 * - OrganizationManager.getUserOrganizations() → organizationService.getUserOrganizations()
 * - OrganizationManager.setAdminCode() → adminCodeService.setAdminCode()
 * - OrganizationManager.becomeAdminByCode() → adminCodeService.becomeAdminByCode()
 * - PracticeScheduleManager.getMonthlySchedules() → scheduleService.getMonthlySchedules()
 * - PracticeScheduleManager.createSchedule() → scheduleService.createSchedule()
 * - AttendanceManager.getAttendanceRecords() → attendanceService.getByScheduleId()
 * - AttendanceManager.registerAttendance() → attendanceService.registerAttendance()
 * - TaskManager.getOrganizationTasks() → taskService.getByOrganizationId()
 * - TaskManager.createTask() → taskService.createTask()
 * - TaskManager.updateTaskProgress() → taskService.updateTaskProgress()
 * - TaskManager.deleteTask() → taskService.deleteTask()
 * 
 * @module lib/groupManagement
 */

// 型定義は types/organization.ts から再エクスポート
export type {
  Organization,
  PracticeSchedule,
  AttendanceRecord,
  Task,
  UserGroupMembership,
} from '@/types/organization';

// サービスをインポート
import { organizationService } from '@/services/organizationService';
import { adminCodeService } from '@/services/adminCodeService';
import { scheduleService } from '@/services/scheduleService';
import { attendanceService } from '@/services/attendanceService';
import { taskService } from '@/services/taskService';
import { membershipService } from '@/services/membershipService';
import type {
  Organization,
  PracticeSchedule,
  AttendanceRecord,
  Task,
} from '@/types/organization';

/**
 * 組織管理マネージャー（後方互換性ラッパー）
 * 
 * @deprecated organizationService を使用してください
 */
export const OrganizationManager = {
  /**
   * ユーザーが参加している組織一覧を取得
   */
  async getUserOrganizations() {
    const result = await organizationService.getUserOrganizations();
    if (!result.success) {
      return { success: false, error: result.error };
    }
    return { success: true, organizations: result.data || [] };
  },

  /**
   * 組織を作成
   */
  async createOrganization(
    name: string,
    description?: string,
    customPassword?: string,
    isSolo: boolean = false
  ) {
    const result = await organizationService.createOrganization({
      name,
      description,
      customPassword,
      isSolo,
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      organization: result.data.organization,
      password: result.data.password,
      inviteCode: result.data.inviteCode,
    };
  },

  /**
   * パスワードで組織に参加
   */
  async joinOrganization(organizationId: string, password: string) {
    const result = await organizationService.joinOrganization({
      organizationId,
      password,
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      message: '組織に参加しました',
      organization: result.data,
    };
  },

  /**
   * 招待コードで組織に参加
   */
  async joinOrganizationByInviteCode(inviteCode: string) {
    const result = await organizationService.joinByInviteCode(inviteCode);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      message: '組織に参加しました',
      organization: result.data,
    };
  },

  /**
   * 組織名で組織を検索
   */
  async searchOrganizationByName(name: string) {
    const result = await organizationService.searchByName(name);
    if (!result.success) {
      return { success: false, error: result.error };
    }
    return { success: true, organizations: result.data || [] };
  },

  /**
   * 組織を更新
   */
  async updateOrganization(
    organizationId: string,
    name: string,
    description?: string
  ) {
    const result = await organizationService.updateOrganization(organizationId, {
      name,
      description,
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true };
  },

  /**
   * 組織を削除
   */
  async deleteOrganization(organizationId: string) {
    const result = await organizationService.deleteOrganization(organizationId);
    if (!result.success) {
      return { success: false, error: result.error };
    }
    return { success: true };
  },

  /**
   * 管理者コードを設定（組織作成者のみ）
   */
  async setAdminCode(organizationId: string, adminCode: string) {
    const result = await adminCodeService.setAdminCode({
      organizationId,
      adminCode,
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, message: '管理者コードが設定されました' };
  },

  /**
   * 管理者コードで管理者になる
   */
  async becomeAdminByCode(organizationId: string, adminCode: string) {
    const result = await adminCodeService.becomeAdminByCode({
      organizationId,
      adminCode,
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, message: '管理者になりました' };
  },

  /**
   * メンバーを削除
   */
  async removeMember(organizationId: string, memberId: string) {
    // memberIdはmembershipIdとして扱う
    const result = await membershipService.removeMember(memberId);
    if (!result.success) {
      return { success: false, error: result.error };
    }
    return { success: true, message: 'メンバーを削除しました' };
  },

  /**
   * 招待コード生成（後方互換性のため残す）
   * 
   * @deprecated lib/security/codeGenerator.generateInviteCode() を使用してください
   */
  generateInviteCode(): string {
    const { generateInviteCode } = require('@/lib/security/codeGenerator');
    return generateInviteCode();
  },

  /**
   * パスワードハッシュ化（後方互換性のため残す）
   * 
   * @deprecated lib/security/passwordHasher.hashPassword() を使用してください
   */
  async hashPassword(password: string): Promise<string> {
    const { hashPassword } = await import('@/lib/security/passwordHasher');
    return hashPassword(password);
  },

  /**
   * パスワード検証（後方互換性のため残す）
   * 
   * @deprecated lib/security/passwordHasher.verifyPassword() を使用してください
   */
  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    const { verifyPassword } = await import('@/lib/security/passwordHasher');
    return verifyPassword(password, hashedPassword);
  },
};


/**
 * 練習日程管理マネージャー（後方互換性ラッパー）
 * 
 * @deprecated scheduleService を使用してください
 */
export const PracticeScheduleManager = {
  /**
   * 組織の月次練習日程を取得
   */
  async getMonthlySchedules(
    organizationId: string,
    year: number,
    month: number
  ) {
    const result = await scheduleService.getMonthlySchedules(
      organizationId,
      year,
      month
    );
    if (!result.success) {
      return { success: false, error: result.error };
    }
    return { success: true, schedules: result.data || [] };
  },

  /**
   * 練習日程を作成
   */
  async createSchedule(schedule: Omit<PracticeSchedule, 'id' | 'created_at'>, addToCalendar?: boolean) {
    const result = await scheduleService.createSchedule(schedule, addToCalendar);
    if (!result.success) {
      return { success: false, error: result.error };
    }
    return { success: true, schedule: result.data };
  },
};

/**
 * 出欠管理マネージャー（後方互換性ラッパー）
 * 
 * @deprecated attendanceService を使用してください
 */
export const AttendanceManager = {
  /**
   * 練習日程の出欠記録一覧を取得
   */
  async getAttendanceRecords(scheduleId: string) {
    const result = await attendanceService.getByScheduleId(scheduleId);
    if (!result.success) {
      return { success: false, error: result.error };
    }
    return { success: true, records: result.data || [] };
  },

  /**
   * 出欠を登録
   */
  async registerAttendance(
    scheduleId: string,
    status: 'present' | 'absent' | 'late',
    notes?: string
  ) {
    const result = await attendanceService.registerAttendance(
      scheduleId,
      status,
      notes
    );
    if (!result.success) {
      return { success: false, error: result.error };
    }
    return { success: true, record: result.data };
  },

  /**
   * 出欠登録が可能かどうかを判定
   */
  canRegisterAttendance(practiceDate: string): boolean {
    return attendanceService.canRegisterAttendance(practiceDate);
  },
};

/**
 * タスク管理マネージャー（後方互換性ラッパー）
 * 
 * @deprecated taskService を使用してください
 */
export const TaskManager = {
  /**
   * 組織のタスク一覧を取得
   */
  async getOrganizationTasks(organizationId: string) {
    const result = await taskService.getByOrganizationId(organizationId);
    if (!result.success) {
      return { success: false, error: result.error };
    }
    return { success: true, tasks: result.data || [] };
  },

  /**
   * タスクを作成
   */
  async createTask(
    organizationId: string,
    title: string,
    description?: string,
    assignedTo?: string,
    priority: 'low' | 'medium' | 'high' = 'medium',
    dueDate?: string
  ) {
    const result = await taskService.createTask({
      organizationId,
      title,
      description,
      assignedTo,
      priority,
      dueDate,
    });
    if (!result.success) {
      return { success: false, error: result.error };
    }
    return { success: true, task: result.data };
  },

  /**
   * タスクの進捗を更新
   */
  async updateTaskProgress(
    taskId: string,
    status: 'pending' | 'in_progress' | 'completed'
  ) {
    const result = await taskService.updateTaskProgress(taskId, status);
    if (!result.success) {
      return { success: false, error: result.error };
    }
    return { success: true, task: result.data };
  },

  /**
   * タスクを削除
   */
  async deleteTask(taskId: string) {
    const result = await taskService.deleteTask(taskId);
    if (!result.success) {
      return { success: false, error: result.error };
    }
    return { success: true };
  },
};
