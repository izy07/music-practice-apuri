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
import { safeExecute } from '@/lib/database/baseRepository';
import { isTaskArray } from '@/lib/validation';

/**
 * タスクリポジトリ
 */
export const taskRepository = {
  /**
   * サブグループのタスク一覧を取得
   */
  async getBySubGroupId(subGroupId: string): Promise<RepositoryResult<Task[]>> {
    return safeExecute(async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('sub_group_id', subGroupId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const safe = data || [];
      if (!isTaskArray(safe)) {
        throw new Error('Invalid tasks payload');
      }

      return safe as Task[];
    }, 'getBySubGroupId');
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
    sub_group_id: string;
    title: string;
    description?: string;
    assigned_to?: string;
    priority: 'low' | 'medium' | 'high';
    due_date?: string;
    status?: TaskStatus;
  }): Promise<RepositoryResult<Task>> {
    return safeExecute(async () => {
      const { data: result, error } = await supabase
        .from('tasks')
        .insert({
          ...data,
          status: data.status || 'pending',
        })
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
    data: Partial<Omit<Task, 'id' | 'created_at' | 'organization_id' | 'sub_group_id'>>
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


