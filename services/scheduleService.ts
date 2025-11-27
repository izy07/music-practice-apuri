/**
 * 練習日程管理サービスの実装
 * 
 * ビジネスロジックをリポジトリから分離し、UI層に提供
 * 単一責任の原則に従い、練習日程関連のビジネスロジックのみを担当
 * 
 * @module services/scheduleService
 */

import { scheduleRepository } from '@/repositories/scheduleRepository';
import { safeServiceExecute, ServiceResult } from './baseService';
import logger from '@/lib/logger';
import type { PracticeSchedule } from '@/types/organization';
import { createEvent, updateEvent, deleteEvent, getEventsByUserId } from '@/repositories/eventRepository';
import { supabase } from '@/lib/supabase';

const SERVICE_CONTEXT = 'scheduleService';

/**
 * 練習日程サービス
 * 
 * リポジトリ層への依存を抽象化し、ビジネスロジックを提供
 */
export class ScheduleService {
  /**
   * 組織の月次練習日程を取得
   */
  async getMonthlySchedules(
    organizationId: string,
    year: number,
    month: number
  ): Promise<ServiceResult<PracticeSchedule[]>> {
    return safeServiceExecute(
      async () => {
        logger.debug(`[${SERVICE_CONTEXT}] getMonthlySchedules:start`, {
          organizationId,
          year,
          month,
        });

        const result = await scheduleRepository.getMonthlySchedules(
          organizationId,
          year,
          month
        );
        if (result.error) {
          throw result.error;
        }

        logger.debug(`[${SERVICE_CONTEXT}] getMonthlySchedules:success`, {
          count: result.data?.length || 0,
        });

        return result.data || [];
      },
      `${SERVICE_CONTEXT}.getMonthlySchedules`,
      'SCHEDULE_FETCH_ERROR'
    );
  }

  /**
   * 練習日程IDで取得
   */
  async getById(id: string): Promise<ServiceResult<PracticeSchedule>> {
    return safeServiceExecute(
      async () => {
        logger.debug(`[${SERVICE_CONTEXT}] getById:start`, { id });

        const result = await scheduleRepository.findById(id);
        if (result.error) {
          throw result.error;
        }
        if (!result.data) {
          throw new Error('練習日程が見つかりません');
        }

        logger.debug(`[${SERVICE_CONTEXT}] getById:success`, { id });
        return result.data;
      },
      `${SERVICE_CONTEXT}.getById`,
      'SCHEDULE_FETCH_ERROR'
    );
  }

  /**
   * 練習日程を作成
   */
  async createSchedule(
    schedule: Omit<PracticeSchedule, 'id' | 'created_at'>
  ): Promise<ServiceResult<PracticeSchedule>> {
    return safeServiceExecute(
      async () => {
        logger.debug(`[${SERVICE_CONTEXT}] createSchedule:start`, { schedule });

        if (!schedule.title.trim()) {
          throw new Error('練習タイトルを入力してください');
        }

        const result = await scheduleRepository.create(schedule);
        if (result.error) {
          throw result.error;
        }
        if (!result.data) {
          throw new Error('練習日程の作成に失敗しました');
        }

        // practice_typeが'event'の場合、eventsテーブルにも登録
        if (result.data.practice_type === 'event') {
          try {
            // created_byからuser_idを取得（practice_schedulesテーブルの構造に依存）
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              const eventResult = await createEvent({
                user_id: user.id,
                title: result.data.title,
                date: result.data.practice_date,
                description: result.data.notes || null,
                practice_schedule_id: result.data.id, // 練習日程との連携
              });
              
              if (eventResult.error) {
                logger.warn(`[${SERVICE_CONTEXT}] createSchedule:event creation failed`, {
                  error: eventResult.error,
                  scheduleId: result.data.id,
                });
                // イベント作成に失敗しても練習日程の作成は成功とする
              } else {
                logger.info(`[${SERVICE_CONTEXT}] createSchedule:event created`, {
                  scheduleId: result.data.id,
                  eventId: eventResult.data?.id,
                });
              }
            }
          } catch (error) {
            logger.warn(`[${SERVICE_CONTEXT}] createSchedule:event creation error`, { error });
            // イベント作成に失敗しても練習日程の作成は成功とする
          }
        }

        logger.info(`[${SERVICE_CONTEXT}] createSchedule:success`, {
          scheduleId: result.data.id,
          organizationId: schedule.organization_id,
        });

        return result.data;
      },
      `${SERVICE_CONTEXT}.createSchedule`,
      'SCHEDULE_CREATE_ERROR'
    );
  }

  /**
   * 練習日程を更新
   */
  async updateSchedule(
    id: string,
    data: Partial<Omit<PracticeSchedule, 'id' | 'created_at' | 'organization_id'>>
  ): Promise<ServiceResult<PracticeSchedule>> {
    return safeServiceExecute(
      async () => {
        logger.debug(`[${SERVICE_CONTEXT}] updateSchedule:start`, { id, data });

        // 更新前に既存のスケジュールを取得（practice_typeを確認するため）
        const existingSchedule = await scheduleRepository.findById(id);
        const wasEvent = existingSchedule.data?.practice_type === 'event';
        const isEvent = data.practice_type === 'event' || (existingSchedule.data?.practice_type === 'event' && !data.practice_type);

        const result = await scheduleRepository.update(id, data);
        if (result.error) {
          throw result.error;
        }
        if (!result.data) {
          throw new Error('練習日程の更新に失敗しました');
        }

        // practice_typeが'event'の場合、eventsテーブルも更新
        if (isEvent && result.data.practice_type === 'event') {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              // practice_schedule_idで関連するイベントを探して更新
              const eventsResult = await getEventsByUserId(user.id, {
                startDate: result.data.practice_date,
                endDate: result.data.practice_date,
              });
              
              if (eventsResult.data && eventsResult.data.length > 0) {
                // practice_schedule_idで一致するイベントを探す
                const matchingEvent = eventsResult.data.find(
                  e => e.practice_schedule_id === id
                );
                
                if (matchingEvent) {
                  const updateResult = await updateEvent(matchingEvent.id!, {
                    title: result.data.title,
                    date: result.data.practice_date,
                    description: result.data.notes || null,
                    practice_schedule_id: id,
                  });
                  
                  if (updateResult.error) {
                    logger.warn(`[${SERVICE_CONTEXT}] updateSchedule:event update failed`, {
                      error: updateResult.error,
                      scheduleId: id,
                    });
                  } else {
                    logger.info(`[${SERVICE_CONTEXT}] updateSchedule:event updated`, {
                      scheduleId: id,
                      eventId: matchingEvent.id,
                    });
                  }
                } else if (wasEvent) {
                  // 既存のイベントが見つからない場合、新規作成
                  const eventResult = await createEvent({
                    user_id: user.id,
                    title: result.data.title,
                    date: result.data.practice_date,
                    description: result.data.notes || null,
                    practice_schedule_id: id,
                  });
                  
                  if (eventResult.error) {
                    logger.warn(`[${SERVICE_CONTEXT}] updateSchedule:event creation failed`, {
                      error: eventResult.error,
                      scheduleId: id,
                    });
                  } else {
                    logger.info(`[${SERVICE_CONTEXT}] updateSchedule:event created`, {
                      scheduleId: id,
                      eventId: eventResult.data?.id,
                    });
                  }
                }
              } else if (wasEvent) {
                // イベントが見つからない場合、新規作成
                const eventResult = await createEvent({
                  user_id: user.id,
                  title: result.data.title,
                  date: result.data.practice_date,
                  description: result.data.notes || null,
                  practice_schedule_id: id,
                });
                
                if (eventResult.error) {
                  logger.warn(`[${SERVICE_CONTEXT}] updateSchedule:event creation failed`, {
                    error: eventResult.error,
                    scheduleId: id,
                  });
                } else {
                  logger.info(`[${SERVICE_CONTEXT}] updateSchedule:event created`, {
                    scheduleId: id,
                    eventId: eventResult.data?.id,
                  });
                }
              }
            }
          } catch (error) {
            logger.warn(`[${SERVICE_CONTEXT}] updateSchedule:event update error`, { error });
            // イベント更新に失敗しても練習日程の更新は成功とする
          }
        }

        logger.info(`[${SERVICE_CONTEXT}] updateSchedule:success`, { id });
        return result.data;
      },
      `${SERVICE_CONTEXT}.updateSchedule`,
      'SCHEDULE_UPDATE_ERROR'
    );
  }

  /**
   * 練習日程を削除
   */
  async deleteSchedule(id: string): Promise<ServiceResult<void>> {
    return safeServiceExecute(
      async () => {
        logger.debug(`[${SERVICE_CONTEXT}] deleteSchedule:start`, { id });

        // 削除前に既存のスケジュールを取得（practice_typeを確認するため）
        const existingSchedule = await scheduleRepository.findById(id);
        const isEvent = existingSchedule.data?.practice_type === 'event';

        const result = await scheduleRepository.delete(id);
        if (result.error) {
          throw result.error;
        }

        // practice_typeが'event'の場合、関連するイベントも削除
        if (isEvent && existingSchedule.data) {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              // practice_schedule_idで関連するイベントを探して削除
              const eventsResult = await getEventsByUserId(user.id, {
                startDate: existingSchedule.data.practice_date,
                endDate: existingSchedule.data.practice_date,
              });
              
              if (eventsResult.data && eventsResult.data.length > 0) {
                // practice_schedule_idで一致するイベントを探す
                const matchingEvent = eventsResult.data.find(
                  e => e.practice_schedule_id === id
                );
                
                if (matchingEvent && matchingEvent.id) {
                  const deleteResult = await deleteEvent(matchingEvent.id);
                  
                  if (deleteResult.error) {
                    logger.warn(`[${SERVICE_CONTEXT}] deleteSchedule:event delete failed`, {
                      error: deleteResult.error,
                      scheduleId: id,
                    });
                  } else {
                    logger.info(`[${SERVICE_CONTEXT}] deleteSchedule:event deleted`, {
                      scheduleId: id,
                      eventId: matchingEvent.id,
                    });
                  }
                }
              }
            }
          } catch (error) {
            logger.warn(`[${SERVICE_CONTEXT}] deleteSchedule:event delete error`, { error });
            // イベント削除に失敗しても練習日程の削除は成功とする
          }
        }

        logger.info(`[${SERVICE_CONTEXT}] deleteSchedule:success`, { id });
      },
      `${SERVICE_CONTEXT}.deleteSchedule`,
      'SCHEDULE_DELETE_ERROR'
    );
  }
}

// シングルトンインスタンスをエクスポート
export const scheduleService = new ScheduleService();

