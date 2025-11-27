/**
 * タスク管理サービスの実装
 * 
 * ビジネスロジックをリポジトリから分離し、UI層に提供
 * 単一責任の原則に従い、タスク管理関連のビジネスロジックのみを担当
 * 
 * @module services/taskService
 */

import { taskRepository } from '@/repositories/taskRepository';
import { safeServiceExecute, ServiceResult } from './baseService';
import logger from '@/lib/logger';
import type { Task, TaskStatus } from '@/types/organization';

const SERVICE_CONTEXT = 'taskService';

/**
 * タスク管理サービス
 * 
 * リポジトリ層への依存を抽象化し、ビジネスロジックを提供
 */
export class TaskService {
  /**
   * サブグループのタスク一覧を取得
   */
  async getBySubGroupId(subGroupId: string): Promise<ServiceResult<Task[]>> {
    return safeServiceExecute(
      async () => {
        logger.debug(`[${SERVICE_CONTEXT}] getBySubGroupId:start`, { subGroupId });

        const result = await taskRepository.getBySubGroupId(subGroupId);
        if (result.error) {
          throw result.error;
        }

        logger.debug(`[${SERVICE_CONTEXT}] getBySubGroupId:success`, {
          count: result.data?.length || 0,
        });

        return result.data || [];
      },
      `${SERVICE_CONTEXT}.getBySubGroupId`,
      'TASK_FETCH_ERROR'
    );
  }

  /**
   * タスクIDで取得
   */
  async getById(id: string): Promise<ServiceResult<Task>> {
    return safeServiceExecute(
      async () => {
        logger.debug(`[${SERVICE_CONTEXT}] getById:start`, { id });

        const result = await taskRepository.findById(id);
        if (result.error) {
          throw result.error;
        }
        if (!result.data) {
          throw new Error('タスクが見つかりません');
        }

        logger.debug(`[${SERVICE_CONTEXT}] getById:success`, { id });
        return result.data;
      },
      `${SERVICE_CONTEXT}.getById`,
      'TASK_FETCH_ERROR'
    );
  }

  /**
   * タスクを作成
   */
  async createTask(data: {
    organizationId: string;
    subGroupId: string;
    title: string;
    description?: string;
    assignedTo?: string;
    priority?: 'low' | 'medium' | 'high';
    dueDate?: string;
  }): Promise<ServiceResult<Task>> {
    return safeServiceExecute(
      async () => {
        logger.debug(`[${SERVICE_CONTEXT}] createTask:start`, { data });

        if (!data.title.trim()) {
          throw new Error('タスクタイトルを入力してください');
        }

        const result = await taskRepository.create({
          organization_id: data.organizationId,
          sub_group_id: data.subGroupId,
          title: data.title.trim(),
          description: data.description?.trim(),
          assigned_to: data.assignedTo,
          priority: data.priority || 'medium',
          due_date: data.dueDate,
          status: 'pending',
        });

        if (result.error) {
          throw result.error;
        }
        if (!result.data) {
          throw new Error('タスクの作成に失敗しました');
        }

        logger.info(`[${SERVICE_CONTEXT}] createTask:success`, {
          taskId: result.data.id,
          organizationId: data.organizationId,
        });

        return result.data;
      },
      `${SERVICE_CONTEXT}.createTask`,
      'TASK_CREATE_ERROR'
    );
  }

  /**
   * タスクのステータスを更新
   */
  async updateTaskProgress(
    taskId: string,
    status: TaskStatus
  ): Promise<ServiceResult<Task>> {
    return safeServiceExecute(
      async () => {
        logger.debug(`[${SERVICE_CONTEXT}] updateTaskProgress:start`, {
          taskId,
          status,
        });

        const result = await taskRepository.updateStatus(taskId, status);
        if (result.error) {
          throw result.error;
        }
        if (!result.data) {
          throw new Error('タスクの更新に失敗しました');
        }

        logger.info(`[${SERVICE_CONTEXT}] updateTaskProgress:success`, {
          taskId,
          status,
        });

        return result.data;
      },
      `${SERVICE_CONTEXT}.updateTaskProgress`,
      'TASK_UPDATE_ERROR'
    );
  }

  /**
   * タスクを更新
   */
  async updateTask(
    id: string,
    data: Partial<Omit<Task, 'id' | 'created_at' | 'organization_id' | 'sub_group_id'>>
  ): Promise<ServiceResult<Task>> {
    return safeServiceExecute(
      async () => {
        logger.debug(`[${SERVICE_CONTEXT}] updateTask:start`, { id, data });

        const result = await taskRepository.update(id, data);
        if (result.error) {
          throw result.error;
        }
        if (!result.data) {
          throw new Error('タスクの更新に失敗しました');
        }

        logger.info(`[${SERVICE_CONTEXT}] updateTask:success`, { id });
        return result.data;
      },
      `${SERVICE_CONTEXT}.updateTask`,
      'TASK_UPDATE_ERROR'
    );
  }

  /**
   * タスクを削除
   */
  async deleteTask(id: string): Promise<ServiceResult<void>> {
    return safeServiceExecute(
      async () => {
        logger.debug(`[${SERVICE_CONTEXT}] deleteTask:start`, { id });

        const result = await taskRepository.delete(id);
        if (result.error) {
          throw result.error;
        }

        logger.info(`[${SERVICE_CONTEXT}] deleteTask:success`, { id });
      },
      `${SERVICE_CONTEXT}.deleteTask`,
      'TASK_DELETE_ERROR'
    );
  }
}

// シングルトンインスタンスをエクスポート
export const taskService = new TaskService();

