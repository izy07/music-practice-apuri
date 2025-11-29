/**
 * 組織管理サービスの実装
 * 
 * ビジネスロジックをリポジトリから分離し、UI層に提供
 * 単一責任の原則に従い、組織関連のビジネスロジックのみを担当
 * 
 * @module services/organizationService
 */

import { organizationRepository } from '@/repositories/organizationRepository';
import { membershipRepository } from '@/repositories/membershipRepository';
import { safeServiceExecute, ServiceResult } from './baseService';
import logger from '@/lib/logger';
import { hashPassword } from '@/lib/security/passwordHasher';
import { generatePassword, generateInviteCode } from '@/lib/security/codeGenerator';
import {
  validateCreateOrganization,
  validateUpdateOrganization,
  validateJoinOrganization,
  normalizeOrganizationName,
} from '@/lib/validation/organizationValidators';
import type {
  Organization,
  CreateOrganizationInput,
  UpdateOrganizationInput,
  JoinOrganizationInput,
} from '@/types/organization';
import { supabase } from '@/lib/supabase';

const SERVICE_CONTEXT = 'organizationService';

/**
 * 組織作成結果
 */
export interface CreateOrganizationResult {
  organization: Organization;
  password: string;
  inviteCode?: string;
}

/**
 * 組織サービス
 * 
 * リポジトリ層への依存を抽象化し、ビジネスロジックを提供
 */
export class OrganizationService {
  /**
   * 現在のユーザーが参加している組織一覧を取得
   */
  async getUserOrganizations(): Promise<ServiceResult<Organization[]>> {
    return safeServiceExecute(
      async () => {
        logger.debug(`[${SERVICE_CONTEXT}] getUserOrganizations:start`);
        
        const result = await organizationRepository.getUserOrganizations();
        
        // 404エラーはリポジトリ層で処理済み（error: null, data: []）
        // その他のエラーのみスロー
        if (result.error) {
          throw result.error;
        }

        logger.debug(`[${SERVICE_CONTEXT}] getUserOrganizations:success`, {
          count: result.data?.length || 0,
        });

        return result.data || [];
      },
      `${SERVICE_CONTEXT}.getUserOrganizations`,
      'ORGANIZATION_FETCH_ERROR'
    );
  }

  /**
   * 組織IDで組織を取得
   */
  async getById(id: string): Promise<ServiceResult<Organization>> {
    return safeServiceExecute(
      async () => {
        logger.debug(`[${SERVICE_CONTEXT}] getById:start`, { id });

        const result = await organizationRepository.findById(id);
        if (result.error) {
          throw result.error;
        }
        if (!result.data) {
          throw new Error('組織が見つかりません');
        }

        logger.debug(`[${SERVICE_CONTEXT}] getById:success`, { id });
        return result.data;
      },
      `${SERVICE_CONTEXT}.getById`,
      'ORGANIZATION_FETCH_ERROR'
    );
  }

  /**
   * 組織名で組織を検索
   */
  async searchByName(name: string, limit: number = 10): Promise<ServiceResult<Organization[]>> {
    return safeServiceExecute(
      async () => {
        logger.debug(`[${SERVICE_CONTEXT}] searchByName:start`, { name, limit });

        const result = await organizationRepository.searchByName(name, limit);
        if (result.error) {
          throw result.error;
        }

        logger.debug(`[${SERVICE_CONTEXT}] searchByName:success`, {
          count: result.data?.length || 0,
        });

        return result.data || [];
      },
      `${SERVICE_CONTEXT}.searchByName`,
      'ORGANIZATION_SEARCH_ERROR'
    );
  }

  /**
   * 組織を作成
   */
  async createOrganization(
    input: CreateOrganizationInput
  ): Promise<ServiceResult<CreateOrganizationResult>> {
    // バリデーション
    const validation = validateCreateOrganization(input);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errors.join(', '),
        code: 'VALIDATION_ERROR',
      };
    }

    return safeServiceExecute(
      async () => {
        logger.debug(`[${SERVICE_CONTEXT}] createOrganization:start`, { input });

        // 現在のユーザーを取得
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('認証が必要です');
        }

        // 組織名を正規化
        const normalizedName = normalizeOrganizationName(input.name);

        // ソロモードの場合はパスワードと招待コードを生成しない
        let password: string | undefined;
        let passwordHash: string | undefined;
        let inviteCode: string | undefined;
        let inviteCodeHash: string | undefined;
        let expiresAt: Date | undefined;

        if (!input.isSolo) {
          // カスタムパスワードまたは自動生成
          password = input.customPassword || generatePassword(8);
          
          // パスワードをハッシュ化
          passwordHash = await hashPassword(password);

          // 招待コードを生成
          inviteCode = generateInviteCode();
          inviteCodeHash = await hashPassword(inviteCode);
          
          // 招待コードの有効期限（30日後）
          expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 30);
        }

        // 組織データを作成
        const insertData: Record<string, unknown> = {
          name: normalizedName,
          description: input.description?.trim(),
          created_by: user.id,
        };

        // is_soloがtrueの場合のみ追加（falseの場合はカラムが存在しない可能性があるため）
        if (input.isSolo) {
          insertData.is_solo = true;
        }

        // ソロモードでない場合のみパスワードと招待コードを設定
        if (!input.isSolo && password && passwordHash && inviteCode && inviteCodeHash) {
          insertData.password = password;
          insertData.password_hash = passwordHash;
          insertData.invite_code = inviteCode;
          insertData.invite_code_hash = inviteCodeHash;
          insertData.invite_code_expires_at = expiresAt?.toISOString();
        }
        // ソロモードの場合はこれらのフィールドを完全に除外（NULL制約を回避）

        // デバッグ: insertDataの内容をログ出力
        logger.debug(`[${SERVICE_CONTEXT}] createOrganization:insertData`, { insertData });

        // 組織を作成
        const result = await organizationRepository.create(insertData as any);
        if (result.error) {
          throw result.error;
        }
        if (!result.data) {
          throw new Error('組織の作成に失敗しました');
        }

        logger.info(`[${SERVICE_CONTEXT}] createOrganization:success`, {
          organizationId: result.data.id,
          isSolo: input.isSolo,
        });

        return {
          organization: result.data,
          password: password || '',
          inviteCode: inviteCode,
        };
      },
      `${SERVICE_CONTEXT}.createOrganization`,
      'ORGANIZATION_CREATE_ERROR'
    );
  }

  /**
   * 組織を更新
   */
  async updateOrganization(
    id: string,
    input: UpdateOrganizationInput
  ): Promise<ServiceResult<Organization>> {
    // バリデーション
    const validation = validateUpdateOrganization(input);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errors.join(', '),
        code: 'VALIDATION_ERROR',
      };
    }

    return safeServiceExecute(
      async () => {
        logger.debug(`[${SERVICE_CONTEXT}] updateOrganization:start`, { id, input });

        // 組織名を正規化
        const updateData: UpdateOrganizationInput = {
          ...input,
          name: input.name ? normalizeOrganizationName(input.name) : undefined,
        };

        const result = await organizationRepository.update(id, updateData);
        if (result.error) {
          throw result.error;
        }
        if (!result.data) {
          throw new Error('組織の更新に失敗しました');
        }

        logger.info(`[${SERVICE_CONTEXT}] updateOrganization:success`, { id });
        return result.data;
      },
      `${SERVICE_CONTEXT}.updateOrganization`,
      'ORGANIZATION_UPDATE_ERROR'
    );
  }

  /**
   * 組織を削除
   */
  async deleteOrganization(id: string): Promise<ServiceResult<void>> {
    return safeServiceExecute(
      async () => {
        logger.debug(`[${SERVICE_CONTEXT}] deleteOrganization:start`, { id });

        const result = await organizationRepository.delete(id);
        if (result.error) {
          throw result.error;
        }

        logger.info(`[${SERVICE_CONTEXT}] deleteOrganization:success`, { id });
      },
      `${SERVICE_CONTEXT}.deleteOrganization`,
      'ORGANIZATION_DELETE_ERROR'
    );
  }

  /**
   * パスワードで組織に参加
   */
  async joinOrganization(
    input: JoinOrganizationInput
  ): Promise<ServiceResult<Organization>> {
    // バリデーション
    const validation = validateJoinOrganization(input);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errors.join(', '),
        code: 'VALIDATION_ERROR',
      };
    }

    return safeServiceExecute(
      async () => {
        logger.debug(`[${SERVICE_CONTEXT}] joinOrganization:start`, {
          organizationId: input.organizationId,
        });

        // 現在のユーザーを取得
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('認証が必要です');
        }

        // 組織を取得
        const orgResult = await organizationRepository.findById(input.organizationId);
        if (orgResult.error) {
          throw orgResult.error;
        }
        if (!orgResult.data) {
          throw new Error('組織が見つかりません');
        }

        const organization = orgResult.data;

        // パスワードを検証
        if (!organization.password_hash) {
          throw new Error('この組織にはパスワードが設定されていません');
        }

        const { verifyPassword } = await import('@/lib/security/passwordHasher');
        const isValidPassword = await verifyPassword(
          input.password,
          organization.password_hash
        );

        if (!isValidPassword) {
          throw new Error('パスワードが正しくありません');
        }

        // メンバーシップを作成（既にメンバーの場合はエラーを無視）
        const membershipResult = await membershipRepository.create({
          user_id: user.id,
          organization_id: input.organizationId,
          role: 'member',
          sub_group_id: null,
        });

        if (membershipResult.error) {
          // 既にメンバーの場合は成功として扱う
          const errorCode = (membershipResult.error as any).code;
          if (errorCode !== '23505') {
            throw membershipResult.error;
          }
        }

        logger.info(`[${SERVICE_CONTEXT}] joinOrganization:success`, {
          organizationId: input.organizationId,
          userId: user.id,
        });

        return organization;
      },
      `${SERVICE_CONTEXT}.joinOrganization`,
      'ORGANIZATION_JOIN_ERROR'
    );
  }

  /**
   * 招待コードで組織に参加
   */
  async joinByInviteCode(inviteCode: string): Promise<ServiceResult<Organization>> {
    return safeServiceExecute(
      async () => {
        logger.debug(`[${SERVICE_CONTEXT}] joinByInviteCode:start`, { inviteCode });

        // 現在のユーザーを取得
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('認証が必要です');
        }

        // 招待コードで組織を検索
        const orgResult = await organizationRepository.findByInviteCode(inviteCode);
        if (orgResult.error) {
          throw orgResult.error;
        }
        if (!orgResult.data) {
          throw new Error('有効な招待コードではありません');
        }

        const organization = orgResult.data;

        // 招待コードの有効性を確認
        if (!organization.invite_code_hash) {
          throw new Error('招待コードが無効です');
        }

        const { verifyPassword } = await import('@/lib/security/passwordHasher');
        const isValidInviteCode = await verifyPassword(
          inviteCode,
          organization.invite_code_hash
        );

        if (!isValidInviteCode) {
          throw new Error('招待コードが無効です');
        }

        // メンバーシップを作成（既にメンバーの場合はエラーを無視）
        const membershipResult = await membershipRepository.create({
          user_id: user.id,
          organization_id: organization.id,
          role: 'member',
          sub_group_id: null,
        });

        if (membershipResult.error) {
          // 既にメンバーの場合は成功として扱う
          const errorCode = (membershipResult.error as any).code;
          if (errorCode !== '23505') {
            throw membershipResult.error;
          }
        }

        logger.info(`[${SERVICE_CONTEXT}] joinByInviteCode:success`, {
          organizationId: organization.id,
          userId: user.id,
        });

        return organization;
      },
      `${SERVICE_CONTEXT}.joinByInviteCode`,
      'ORGANIZATION_JOIN_ERROR'
    );
  }
}

// シングルトンインスタンスをエクスポート
export const organizationService = new OrganizationService();

