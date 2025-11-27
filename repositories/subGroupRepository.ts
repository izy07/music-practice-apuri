/**
 * サブグループリポジトリ
 * 
 * サブグループデータへのアクセスを提供するリポジトリレイヤー
 * 
 * @module repositories/subGroupRepository
 */

import { supabase } from '@/lib/supabase';
import type { SubGroup, CreateSubGroupInput } from '@/types/organization';
import type { RepositoryResult } from '@/lib/database/interfaces';
import { safeExecute } from '@/lib/database/baseRepository';
import { isSubGroupArray } from '@/types/organization';

/**
 * サブグループリポジトリ
 */
export const subGroupRepository = {
  /**
   * 組織のサブグループ一覧を取得
   */
  async getByOrganizationId(organizationId: string): Promise<RepositoryResult<SubGroup[]>> {
    return safeExecute(async () => {
      const { data, error } = await supabase
        .from('sub_groups')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const safe = data || [];
      if (!isSubGroupArray(safe)) {
        throw new Error('Invalid sub groups payload');
      }

      return safe;
    }, 'getByOrganizationId');
  },

  /**
   * サブグループIDで取得
   */
  async findById(id: string): Promise<RepositoryResult<SubGroup>> {
    return safeExecute(async () => {
      const { data, error } = await supabase
        .from('sub_groups')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) {
        throw new Error('Sub group not found');
      }

      return data as SubGroup;
    }, 'findById');
  },

  /**
   * サブグループを作成
   */
  async create(
    organizationId: string,
    input: CreateSubGroupInput
  ): Promise<RepositoryResult<SubGroup>> {
    return safeExecute(async () => {
      const { data: result, error } = await supabase
        .from('sub_groups')
        .insert({
          organization_id: organizationId,
          name: input.name.trim(),
          group_type: input.groupType,
        })
        .select()
        .single();

      if (error) throw error;
      if (!result) {
        throw new Error('Failed to create sub group');
      }

      return result as SubGroup;
    }, 'create');
  },

  /**
   * サブグループを更新
   */
  async update(
    id: string,
    data: Partial<Pick<SubGroup, 'name' | 'group_type'>>
  ): Promise<RepositoryResult<SubGroup>> {
    return safeExecute(async () => {
      const updateData: Record<string, unknown> = {};

      if (data.name !== undefined) {
        updateData.name = data.name.trim();
      }
      if (data.group_type !== undefined) {
        updateData.group_type = data.group_type;
      }

      const { data: result, error } = await supabase
        .from('sub_groups')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!result) {
        throw new Error('Failed to update sub group');
      }

      return result as SubGroup;
    }, 'update');
  },

  /**
   * サブグループを削除
   */
  async delete(id: string): Promise<RepositoryResult<void>> {
    return safeExecute(async () => {
      const { error } = await supabase
        .from('sub_groups')
        .delete()
        .eq('id', id);

      if (error) throw error;
    }, 'delete');
  },
};

export default subGroupRepository;

