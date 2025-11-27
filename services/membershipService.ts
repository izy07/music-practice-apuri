/**
 * メンバーシップ管理サービスの実装
 * 
 * メンバーシップ管理に関するビジネスロジックを提供
 * 
 * @module services/membershipService
 */

import { membershipRepository } from '@/repositories/membershipRepository';
import { safeServiceExecute, ServiceResult } from './baseService';
import logger from '@/lib/logger';
import type { UserGroupMembership, OrganizationRole } from '@/types/organization';

const SERVICE_CONTEXT = 'membershipService';

/**
 * メンバーシップサービス
 */
export class MembershipService {
  /**
   * 組織のメンバー一覧を取得
   */
  async getOrganizationMembers(
    organizationId: string
  ): Promise<ServiceResult<UserGroupMembership[]>> {
    return safeServiceExecute(
      async () => {
        logger.debug(`[${SERVICE_CONTEXT}] getOrganizationMembers:start`, {
          organizationId,
        });

        const result = await membershipRepository.getByOrganizationId(organizationId);
        if (result.error) {
          throw result.error;
        }

        logger.debug(`[${SERVICE_CONTEXT}] getOrganizationMembers:success`, {
          count: result.data?.length || 0,
        });

        return result.data || [];
      },
      `${SERVICE_CONTEXT}.getOrganizationMembers`,
      'MEMBERSHIP_FETCH_ERROR'
    );
  }

  /**
   * ユーザーが組織のメンバーかどうかを確認
   */
  async isMember(
    userId: string,
    organizationId: string
  ): Promise<ServiceResult<boolean>> {
    return safeServiceExecute(
      async () => {
        const result = await membershipRepository.isMember(userId, organizationId);
        if (result.error) {
          throw result.error;
        }

        return result.data || false;
      },
      `${SERVICE_CONTEXT}.isMember`,
      'MEMBERSHIP_CHECK_ERROR'
    );
  }

  /**
   * ユーザーが組織の管理者かどうかを確認
   */
  async isAdmin(
    userId: string,
    organizationId: string
  ): Promise<ServiceResult<boolean>> {
    return safeServiceExecute(
      async () => {
        const result = await membershipRepository.isAdmin(userId, organizationId);
        if (result.error) {
          throw result.error;
        }

        return result.data || false;
      },
      `${SERVICE_CONTEXT}.isAdmin`,
      'ADMIN_CHECK_ERROR'
    );
  }

  /**
   * メンバーシップの役割を更新
   */
  async updateRole(
    membershipId: string,
    role: OrganizationRole
  ): Promise<ServiceResult<UserGroupMembership>> {
    return safeServiceExecute(
      async () => {
        logger.debug(`[${SERVICE_CONTEXT}] updateRole:start`, {
          membershipId,
          role,
        });

        const result = await membershipRepository.updateRole(membershipId, role);
        if (result.error) {
          throw result.error;
        }
        if (!result.data) {
          throw new Error('メンバーシップの更新に失敗しました');
        }

        logger.info(`[${SERVICE_CONTEXT}] updateRole:success`, {
          membershipId,
          role,
        });

        return result.data;
      },
      `${SERVICE_CONTEXT}.updateRole`,
      'MEMBERSHIP_UPDATE_ERROR'
    );
  }

  /**
   * メンバーシップを削除
   */
  async removeMember(membershipId: string): Promise<ServiceResult<void>> {
    return safeServiceExecute(
      async () => {
        logger.debug(`[${SERVICE_CONTEXT}] removeMember:start`, { membershipId });

        const result = await membershipRepository.delete(membershipId);
        if (result.error) {
          throw result.error;
        }

        logger.info(`[${SERVICE_CONTEXT}] removeMember:success`, { membershipId });
      },
      `${SERVICE_CONTEXT}.removeMember`,
      'MEMBERSHIP_DELETE_ERROR'
    );
  }
}

// シングルトンインスタンスをエクスポート
export const membershipService = new MembershipService();

