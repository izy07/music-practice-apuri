/**
 * サブグループ管理サービスの実装
 * 
 * ビジネスロジックをリポジトリから分離し、UI層に提供
 * 単一責任の原則に従い、サブグループ関連のビジネスロジックのみを担当
 * 
 * @module services/subGroupService
 */

import { subGroupRepository } from '@/repositories/subGroupRepository';
import { safeServiceExecute, ServiceResult } from './baseService';
import logger from '@/lib/logger';
import type {
  SubGroup,
  CreateSubGroupInput,
} from '@/types/organization';

const SERVICE_CONTEXT = 'subGroupService';

/**
 * サブグループサービス
 * 
 * リポジトリ層への依存を抽象化し、ビジネスロジックを提供
 */
export class SubGroupService {
  /**
   * 組織のサブグループ一覧を取得
   */
  async getByOrganizationId(organizationId: string): Promise<ServiceResult<SubGroup[]>> {
    return safeServiceExecute(
      async () => {
        logger.debug(`[${SERVICE_CONTEXT}] getByOrganizationId:start`, { organizationId });

        const result = await subGroupRepository.getByOrganizationId(organizationId);
        if (result.error) {
          throw result.error;
        }

        logger.debug(`[${SERVICE_CONTEXT}] getByOrganizationId:success`, {
          count: result.data?.length || 0,
        });

        return result.data || [];
      },
      `${SERVICE_CONTEXT}.getByOrganizationId`,
      'SUB_GROUP_FETCH_ERROR'
    );
  }

  /**
   * サブグループIDで取得
   */
  async getById(id: string): Promise<ServiceResult<SubGroup>> {
    return safeServiceExecute(
      async () => {
        logger.debug(`[${SERVICE_CONTEXT}] getById:start`, { id });

        const result = await subGroupRepository.findById(id);
        if (result.error) {
          throw result.error;
        }
        if (!result.data) {
          throw new Error('サブグループが見つかりません');
        }

        logger.debug(`[${SERVICE_CONTEXT}] getById:success`, { id });
        return result.data;
      },
      `${SERVICE_CONTEXT}.getById`,
      'SUB_GROUP_FETCH_ERROR'
    );
  }

  /**
   * サブグループを作成
   */
  async createSubGroup(
    organizationId: string,
    input: CreateSubGroupInput
  ): Promise<ServiceResult<SubGroup>> {
    return safeServiceExecute(
      async () => {
        logger.debug(`[${SERVICE_CONTEXT}] createSubGroup:start`, { organizationId, input });

        if (!input.name.trim()) {
          throw new Error('サブグループ名を入力してください');
        }

        const result = await subGroupRepository.create(organizationId, input);
        if (result.error) {
          throw result.error;
        }
        if (!result.data) {
          throw new Error('サブグループの作成に失敗しました');
        }

        logger.info(`[${SERVICE_CONTEXT}] createSubGroup:success`, {
          subGroupId: result.data.id,
          organizationId,
        });

        return result.data;
      },
      `${SERVICE_CONTEXT}.createSubGroup`,
      'SUB_GROUP_CREATE_ERROR'
    );
  }

  /**
   * サブグループを更新
   */
  async updateSubGroup(
    id: string,
    data: Partial<Pick<SubGroup, 'name' | 'group_type'>>
  ): Promise<ServiceResult<SubGroup>> {
    return safeServiceExecute(
      async () => {
        logger.debug(`[${SERVICE_CONTEXT}] updateSubGroup:start`, { id, data });

        const result = await subGroupRepository.update(id, data);
        if (result.error) {
          throw result.error;
        }
        if (!result.data) {
          throw new Error('サブグループの更新に失敗しました');
        }

        logger.info(`[${SERVICE_CONTEXT}] updateSubGroup:success`, { id });
        return result.data;
      },
      `${SERVICE_CONTEXT}.updateSubGroup`,
      'SUB_GROUP_UPDATE_ERROR'
    );
  }

  /**
   * サブグループを削除
   */
  async deleteSubGroup(id: string): Promise<ServiceResult<void>> {
    return safeServiceExecute(
      async () => {
        logger.debug(`[${SERVICE_CONTEXT}] deleteSubGroup:start`, { id });

        const result = await subGroupRepository.delete(id);
        if (result.error) {
          throw result.error;
        }

        logger.info(`[${SERVICE_CONTEXT}] deleteSubGroup:success`, { id });
      },
      `${SERVICE_CONTEXT}.deleteSubGroup`,
      'SUB_GROUP_DELETE_ERROR'
    );
  }
}

// シングルトンインスタンスをエクスポート
export const subGroupService = new SubGroupService();

