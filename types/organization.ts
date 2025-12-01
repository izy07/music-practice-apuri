/**
 * 組織管理関連の型定義
 * 
 * このファイルには、組織、サブグループ、練習日程、出欠管理、タスク管理など、
 * 組織管理機能に関連するすべての型定義が含まれています。
 * 
 * @module types/organization
 */

import type { ID, Timestamp } from './common';

/**
 * 組織の役割
 */
export type OrganizationRole = 'admin' | 'leader' | 'member';


/**
 * 練習の種類
 */
export type PracticeType = 'ensemble' | 'part_practice' | 'individual_practice' | 'rehearsal' | 'lesson' | 'event';

/**
 * 出欠ステータス
 */
export type AttendanceStatus = 'present' | 'absent' | 'late';

/**
 * タスクのステータス
 */
export type TaskStatus = 'pending' | 'in_progress' | 'completed';

/**
 * タスクの優先度
 */
export type TaskPriority = 'low' | 'medium' | 'high';

/**
 * 組織
 * 
 * 音楽団体やグループを表すエンティティ
 */
export interface Organization {
  /** 組織の一意な識別子 */
  id: ID;
  
  /** 組織名 */
  name: string;
  
  /** 組織の説明 */
  description?: string;
  
  /** 参加パスワード（平文、表示用のみ） */
  password?: string;
  
  /** 参加パスワードのハッシュ値 */
  password_hash?: string;
  
  /** 招待コード（平文、表示用のみ） */
  invite_code?: string;
  
  /** 招待コードのハッシュ値 */
  invite_code_hash?: string;
  
  /** 招待コードの有効期限 */
  invite_code_expires_at?: Timestamp;
  
  /** 管理者コード（平文、表示用のみ） */
  admin_code?: string;
  
  /** 管理者コードのハッシュ値 */
  admin_code_hash?: string;
  
  /** 作成日時 */
  created_at?: Timestamp;
  
  /** 作成者のユーザーID */
  created_by?: ID;
  
  /** ソロモードかどうか */
  is_solo?: boolean;
}


/**
 * 練習日程
 * 
 * 組織の練習スケジュールを表す
 */
export interface PracticeSchedule {
  /** 練習日程の一意な識別子 */
  id: ID;
  
  /** 所属する組織のID */
  organization_id: ID;
  
  /** 練習のタイトル */
  title: string;
  
  /** 練習日（YYYY-MM-DD形式） */
  practice_date: string;
  
  /** 開始時刻（HH:mm形式） */
  start_time?: string;
  
  /** 終了時刻（HH:mm形式） */
  end_time?: string;
  
  /** 練習の種類 */
  practice_type: PracticeType;
  
  /** 練習場所 */
  location?: string;
  
  /** 備考 */
  notes?: string;
  
  /** 作成日時 */
  created_at?: Timestamp;
}

/**
 * 出欠記録
 * 
 * ユーザーの練習への出欠を記録する
 */
export interface AttendanceRecord {
  /** 出欠記録の一意な識別子 */
  id: ID;
  
  /** 関連する練習日程のID */
  schedule_id: ID;
  
  /** ユーザーのID */
  user_id: ID;
  
  /** 出欠ステータス */
  status: AttendanceStatus;
  
  /** 備考 */
  notes?: string;
  
  /** 作成日時 */
  created_at?: Timestamp;
  
  /** 更新日時 */
  updated_at?: Timestamp;
}

/**
 * タスク
 * 
 * 組織内で管理されるタスクや課題を表す
 */
export interface Task {
  /** タスクの一意な識別子 */
  id: ID;
  
  /** 所属する組織のID */
  organization_id: ID;
  
  /** タスクのタイトル */
  title: string;
  
  /** タスクの説明 */
  description?: string;
  
  /** 担当者のユーザーID */
  assigned_to?: ID;
  
  /** タスクのステータス */
  status: TaskStatus;
  
  /** タスクの優先度 */
  priority: TaskPriority;
  
  /** 期限日（YYYY-MM-DD形式） */
  due_date?: string;
  
  /** 作成日時 */
  created_at?: Timestamp;
  
  /** 更新日時 */
  updated_at?: Timestamp;
}

/**
 * ユーザーグループメンバーシップ
 * 
 * ユーザーと組織・サブグループの関連を表す
 */
export interface UserGroupMembership {
  /** メンバーシップの一意な識別子 */
  id: ID;
  
  /** ユーザーのID */
  user_id: ID;
  
  /** 所属する組織のID */
  organization_id: ID;
  
  /** ユーザーの役割 */
  role: OrganizationRole;
  
  /** 参加日時 */
  joined_at: Timestamp;
}

/**
 * 組織作成時の入力データ
 */
export interface CreateOrganizationInput {
  /** 組織名 */
  name: string;
  
  /** 組織の説明 */
  description?: string;
  
  /** カスタムパスワード（指定しない場合は自動生成） */
  customPassword?: string;
  
  /** ソロモードかどうか */
  isSolo?: boolean;
}

/**
 * 組織更新時の入力データ
 */
export interface UpdateOrganizationInput {
  /** 組織名 */
  name?: string;
  
  /** 組織の説明 */
  description?: string;
}


/**
 * 組織参加時の入力データ
 */
export interface JoinOrganizationInput {
  /** 組織のID */
  organizationId: ID;
  
  /** 参加パスワード */
  password: string;
}

/**
 * 管理者コード設定時の入力データ
 */
export interface SetAdminCodeInput {
  /** 組織のID */
  organizationId: ID;
  
  /** 管理者コード（4桁の数字） */
  adminCode: string;
}

/**
 * 型ガード関数
 */

/**
 * 値がOrganization型かどうかを判定
 */
export function isOrganization(value: unknown): value is Organization {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string'
  );
}

/**
 * 値がOrganization配列かどうかを判定
 */
export function isOrganizationArray(value: unknown): value is Organization[] {
  return Array.isArray(value) && value.every(isOrganization);
}


/**
 * 値がUserGroupMembership型かどうかを判定
 */
export function isUserGroupMembership(value: unknown): value is UserGroupMembership {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.user_id === 'string' &&
    typeof obj.organization_id === 'string' &&
    (obj.role === 'admin' || obj.role === 'leader' || obj.role === 'member')
  );
}

/**
 * 値がUserGroupMembership配列かどうかを判定
 */
export function isUserGroupMembershipArray(value: unknown): value is UserGroupMembership[] {
  return Array.isArray(value) && value.every(isUserGroupMembership);
}

