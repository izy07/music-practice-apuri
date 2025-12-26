/**
 * タスクリポジトリ
 * 
 * タスクデータへのアクセスを提供するリポジトリレイヤー
 * 
 * @module repositories/taskRepository
 */

import { supabase } from '@/lib/supabase';
import type { Task, TaskStatus } from '@/types/organization';
import type { RepositoryResult } from '@/lib/database/interfaces';
import { safeExecute, isSupabaseTableNotFoundError } from '@/lib/database/baseRepository';
import { isTaskArray } from '@/lib/validation';
import logger from '@/lib/logger';

/**
 * タスクリポジトリ
 */
export const taskRepository = {
  /**
   * 組織のタスク一覧を取得
   */
  async getByOrganizationId(organizationId: string, instrumentId?: string | null): Promise<RepositoryResult<Task[]>> {
    return safeExecute(async () => {
      let query = supabase
        .from('tasks')
        .select('*')
        .eq('organization_id', organizationId);
      
      // 楽器ごとにフィルタリング
      if (instrumentId !== undefined) {
        if (instrumentId) {
          query = query.eq('instrument_id', instrumentId);
        } else {
          query = query.is('instrument_id', null);
        }
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      // 404エラー（テーブル不存在）の場合は空配列を返す
      if (error) {
        if (isSupabaseTableNotFoundError(error)) {
          logger.info('tasksテーブルが存在しないか、アクセス権限がありません。空配列を返します。');
          return [];
        }
        throw error;
      }

      const safe = data || [];
      if (!isTaskArray(safe)) {
        throw new Error('Invalid tasks payload');
      }

      return safe as Task[];
    }, 'getByOrganizationId');
  },

  /**
   * タスクIDで取得
   */
  async findById(id: string): Promise<RepositoryResult<Task>> {
    return safeExecute(async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) {
        throw new Error('Task not found');
      }

      return data as Task;
    }, 'findById');
  },

  /**
   * タスクを作成
   */
  async create(data: {
    organization_id: string;
    title: string;
    description?: string;
    assigned_to?: string;
    priority: 'low' | 'medium' | 'high';
    due_date?: string;
    status?: TaskStatus;
    instrument_id?: string | null;
  }): Promise<RepositoryResult<Task>> {
    return safeExecute(async () => {
      const insertData: any = {
        ...data,
        status: data.status || 'pending',
      };
      
      // 楽器IDを設定（存在する場合のみ）
      if (data.instrument_id !== undefined) {
        insertData.instrument_id = data.instrument_id;
      }
      
      const { data: result, error } = await supabase
        .from('tasks')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      if (!result) {
        throw new Error('Failed to create task');
      }

      return result as Task;
    }, 'create');
  },

  /**
   * タスクのステータスを更新
   */
  async updateStatus(
    id: string,
    status: TaskStatus
  ): Promise<RepositoryResult<Task>> {
    return safeExecute(async () => {
      const { data: result, error } = await supabase
        .from('tasks')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!result) {
        throw new Error('Failed to update task status');
      }

      return result as Task;
    }, 'updateStatus');
  },

  /**
   * タスクを更新
   */
  async update(
    id: string,
    data: Partial<Omit<Task, 'id' | 'created_at' | 'organization_id'>>
  ): Promise<RepositoryResult<Task>> {
    return safeExecute(async () => {
      const updateData: Record<string, unknown> = {
        ...data,
        updated_at: new Date().toISOString(),
      };

      const { data: result, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!result) {
        throw new Error('Failed to update task');
      }

      return result as Task;
    }, 'update');
  },

  /**
   * タスクを削除
   */
  async delete(id: string): Promise<RepositoryResult<void>> {
    return safeExecute(async () => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
    }, 'delete');
  },
};

export default taskRepository;


