/**
 * 管理者コードサービスの実装
 * 
 * 管理者コードの設定・検証に関するビジネスロジックを提供
 * 
 * @module services/adminCodeService
 */

import { organizationRepository } from '@/repositories/organizationRepository';
import { membershipRepository } from '@/repositories/membershipRepository';
import { safeServiceExecute, ServiceResult } from './baseService';
import logger from '@/lib/logger';
import { hashPassword, verifyPassword } from '@/lib/security/passwordHasher';
import {
  validateSetAdminCode,
  validateAdminCodeFormat,
} from '@/lib/validation/organizationValidators';
import type { Organization, SetAdminCodeInput } from '@/types/organization';
import { supabase } from '@/lib/supabase';

const SERVICE_CONTEXT = 'adminCodeService';

/**
 * 管理者コードサービス
 */
export class AdminCodeService {
  /**
   * 管理者コードを設定（組織作成者のみ）
   */
  async setAdminCode(input: SetAdminCodeInput): Promise<ServiceResult<void>> {
    // バリデーション
    const validation = validateSetAdminCode(input);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errors.join(', '),
        code: 'VALIDATION_ERROR',
      };
    }

    return safeServiceExecute(
      async () => {
        logger.debug(`[${SERVICE_CONTEXT}] setAdminCode:start`, {
          organizationId: input.organizationId,
        });

        // 現在のユーザーを取得
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('認証が必要です');
        }

        // 組織の作成者を確認
        const creatorResult = await organizationRepository.getCreator(input.organizationId);
        if (creatorResult.error) {
          throw creatorResult.error;
        }

        if (creatorResult.data !== user.id) {
          throw new Error('組織の作成者のみが管理者コードを設定できます');
        }

        // 管理者コードをハッシュ化
        const adminCodeHash = await hashPassword(input.adminCode);

        // 組織を更新
        const updateResult = await organizationRepository.setAdminCode(
          input.organizationId,
          input.adminCode,
          adminCodeHash
        );

        if (updateResult.error) {
          throw updateResult.error;
        }

        logger.info(`[${SERVICE_CONTEXT}] setAdminCode:success`, {
          organizationId: input.organizationId,
        });
      },
      `${SERVICE_CONTEXT}.setAdminCode`,
      'ADMIN_CODE_SET_ERROR'
    );
  }

  /**
   * 管理者コードで管理者になる
   */
  async becomeAdminByCode(
    organizationId: string,
    adminCode: string
  ): Promise<ServiceResult<void>> {
    // バリデーション
    if (!validateAdminCodeFormat(adminCode)) {
      return {
        success: false,
        error: '管理者コードは4桁の数字である必要があります',
        code: 'VALIDATION_ERROR',
      };
    }

    return safeServiceExecute(
      async () => {
        logger.debug(`[${SERVICE_CONTEXT}] becomeAdminByCode:start`, {
          organizationId,
        });

        // 現在のユーザーを取得
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('認証が必要です');
        }

        // 組織を取得
        const orgResult = await organizationRepository.findById(organizationId);
        if (orgResult.error) {
          throw orgResult.error;
        }
        if (!orgResult.data) {
          throw new Error('組織が見つかりません');
        }

        const organization = orgResult.data;

        // 管理者コードが設定されているか確認
        if (!organization.admin_code_hash) {
          throw new Error('この組織には管理者コードが設定されていません');
        }

        // 管理者コードを検証
        const isValidCode = await verifyPassword(adminCode, organization.admin_code_hash);
        if (!isValidCode) {
          throw new Error('管理者コードが正しくありません');
        }

        // 既存のメンバーシップを確認
        const membershipResult = await membershipRepository.getByUserAndOrganization(
          user.id,
          organizationId
        );

        if (membershipResult.error) {
          throw membershipResult.error;
        }

        if (membershipResult.data) {
          // 既存のメンバーシップを更新
          const updateResult = await membershipRepository.updateRole(
            membershipResult.data.id,
            'admin'
          );

          if (updateResult.error) {
            throw updateResult.error;
          }
        } else {
          // 新しいメンバーシップを作成
          const createResult = await membershipRepository.create({
            user_id: user.id,
            organization_id: organizationId,
            role: 'admin',
            sub_group_id: null,
          });

          if (createResult.error) {
            throw createResult.error;
          }
        }

        logger.info(`[${SERVICE_CONTEXT}] becomeAdminByCode:success`, {
          organizationId,
          userId: user.id,
        });
      },
      `${SERVICE_CONTEXT}.becomeAdminByCode`,
      'ADMIN_CODE_VERIFY_ERROR'
    );
  }
}

// シングルトンインスタンスをエクスポート
export const adminCodeService = new AdminCodeService();

