/**
 * メンバーシップリポジトリ
 * 
 * ユーザーグループメンバーシップデータへのアクセスを提供するリポジトリレイヤー
 * 
 * @module repositories/membershipRepository
 */

import { supabase } from '@/lib/supabase';
import type { UserGroupMembership, OrganizationRole } from '@/types/organization';
import type { RepositoryResult } from '@/lib/database/interfaces';
import { safeExecute } from '@/lib/database/baseRepository';
import { isUserGroupMembershipArray } from '@/types/organization';

/**
 * メンバーシップリポジトリ
 */
export const membershipRepository = {
  /**
   * 組織のメンバー一覧を取得
   */
  async getByOrganizationId(organizationId: string): Promise<RepositoryResult<UserGroupMembership[]>> {
    return safeExecute(async () => {
      const { data, error } = await supabase
        .from('user_group_memberships')
        .select('*')
        .eq('organization_id', organizationId)
        .order('joined_at', { ascending: false });

      if (error) throw error;

      const safe = data || [];
      if (!isUserGroupMembershipArray(safe)) {
        throw new Error('Invalid memberships payload');
      }

      return safe;
    }, 'getByOrganizationId');
  },

  /**
   * ユーザーのメンバーシップを取得
   */
  async getByUserAndOrganization(
    userId: string,
    organizationId: string
  ): Promise<RepositoryResult<UserGroupMembership | null>> {
    return safeExecute(async () => {
      const { data, error } = await supabase
        .from('user_group_memberships')
        .select('*')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (error) throw error;

      return (data as UserGroupMembership) || null;
    }, 'getByUserAndOrganization');
  },

  /**
   * メンバーシップを作成
   */
  async create(data: {
    user_id: string;
    organization_id: string;
    role: OrganizationRole;
  }): Promise<RepositoryResult<UserGroupMembership>> {
    return safeExecute(async () => {
      // まず既存のメンバーシップを確認（重複チェック）
      const existing = await this.getByUserAndOrganization(
        data.user_id,
        data.organization_id
      );
      
      if (existing.data) {
        // 既にメンバーシップが存在する場合は、それを返す
        return { data: existing.data, error: null };
      }
      
      const { data: result, error } = await supabase
        .from('user_group_memberships')
        .insert(data)
        .select()
        .single();

      if (error) {
        // 既にメンバーの場合はエラーを無視（一意制約違反）
        if (error.code === '23505') {
          // 既存のメンバーシップを取得
          const existingAfterError = await this.getByUserAndOrganization(
            data.user_id,
            data.organization_id
          );
          if (existingAfterError.data) {
            return { data: existingAfterError.data, error: null };
          }
        }
        
        // 403エラー（RLSポリシーエラー）の場合は、詳細なエラーメッセージを返す
        if (error.code === '42501' || error.status === 403) {
          const detailedError = new Error(
            `メンバーシップの作成が拒否されました。RLSポリシーを確認してください。エラーコード: ${error.code || error.status}`
          ) as any;
          detailedError.code = error.code;
          detailedError.status = error.status;
          detailedError.message = error.message;
          throw detailedError;
        }
        
        throw error;
      }

      if (!result) {
        throw new Error('Failed to create membership');
      }

      return result as UserGroupMembership;
    }, 'create');
  },

  /**
   * メンバーシップの役割を更新
   */
  async updateRole(
    id: string,
    role: OrganizationRole
  ): Promise<RepositoryResult<UserGroupMembership>> {
    return safeExecute(async () => {
      const { data: result, error } = await supabase
        .from('user_group_memberships')
        .update({ role })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!result) {
        throw new Error('Failed to update membership role');
      }

      return result as UserGroupMembership;
    }, 'updateRole');
  },

  /**
   * メンバーシップを削除
   */
  async delete(id: string): Promise<RepositoryResult<void>> {
    return safeExecute(async () => {
      const { error } = await supabase
        .from('user_group_memberships')
        .delete()
        .eq('id', id);

      if (error) throw error;
    }, 'delete');
  },

  /**
   * ユーザーが組織のメンバーかどうかを確認
   */
  async isMember(
    userId: string,
    organizationId: string
  ): Promise<RepositoryResult<boolean>> {
    return safeExecute(async () => {
      const { data, error } = await supabase
        .from('user_group_memberships')
        .select('id')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (error) throw error;

      return !!data;
    }, 'isMember');
  },

  /**
   * ユーザーが組織の管理者かどうかを確認
   */
  async isAdmin(
    userId: string,
    organizationId: string
  ): Promise<RepositoryResult<boolean>> {
    return safeExecute(async () => {
      const { data, error } = await supabase
        .from('user_group_memberships')
        .select('role')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .eq('role', 'admin')
        .maybeSingle();

      if (error) throw error;

      return !!data;
    }, 'isAdmin');
  },
};

export default membershipRepository;



