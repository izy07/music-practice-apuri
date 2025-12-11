/**
 * イベントリポジトリ
 * eventsテーブルへのアクセスを集約
 */

import { supabase } from '@/lib/supabase';
import logger from '@/lib/logger';

const REPOSITORY_CONTEXT = 'eventRepository';

export interface Event {
  id?: string;
  user_id: string;
  title: string;
  date: string; // YYYY-MM-DD形式
  description?: string | null;
  practice_schedule_id?: string | null; // 練習日程との連携用
  created_at?: string;
  updated_at?: string;
}

/**
 * イベントを作成
 */
export const createEvent = async (
  event: Omit<Event, 'id' | 'created_at' | 'updated_at'>
): Promise<{ data: Event | null; error: any }> => {
  try {
    // dateとevent_dateの両方を設定（テーブルスキーマの互換性のため）
    const payload: any = {
      ...event,
      created_at: new Date().toISOString(),
    };
    
    // event_dateカラムが存在する場合は、dateと同じ値を設定
    if (event.date) {
      payload.event_date = event.date;
    }
    
    const { data, error } = await supabase
      .from('events')
      .insert(payload)
      .select()
      .single();
    
    if (error) {
      logger.error(`[${REPOSITORY_CONTEXT}] createEvent:error`, { error, payload });
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error) {
    logger.error(`[${REPOSITORY_CONTEXT}] createEvent:exception`, { error });
    return { data: null, error };
  }
};

/**
 * イベントを更新
 */
export const updateEvent = async (
  eventId: string,
  updates: Partial<Event>
): Promise<{ data: Event | null; error: any }> => {
  try {
    // dateとevent_dateの両方を設定（テーブルスキーマの互換性のため）
    const payload: any = {
      ...updates,
      updated_at: new Date().toISOString(),
    };
    
    // dateが更新される場合は、event_dateも同じ値に設定
    if (updates.date) {
      payload.event_date = updates.date;
    }
    
    const { data, error } = await supabase
      .from('events')
      .update(payload)
      .eq('id', eventId)
      .select()
      .single();
    
    if (error) {
      logger.error(`[${REPOSITORY_CONTEXT}] updateEvent:error`, { error, payload });
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error) {
    logger.error(`[${REPOSITORY_CONTEXT}] updateEvent:exception`, { error });
    return { data: null, error };
  }
};

/**
 * イベントを削除
 */
export const deleteEvent = async (eventId: string): Promise<{ error: any }> => {
  try {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId);
    
    if (error) {
      logger.error(`[${REPOSITORY_CONTEXT}] deleteEvent:error`, { error });
      return { error };
    }
    
    return { error: null };
  } catch (error) {
    logger.error(`[${REPOSITORY_CONTEXT}] deleteEvent:exception`, { error });
    return { error };
  }
};

/**
 * ユーザーのイベント一覧を取得
 */
export const getEventsByUserId = async (
  userId: string,
  options: {
    startDate?: string;
    endDate?: string;
    isCompleted?: boolean;
  } = {}
): Promise<{ data: Event[] | null; error: any }> => {
  try {
    let query = supabase
      .from('events')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: true });
    
    if (options.startDate) {
      query = query.gte('date', options.startDate);
    }
    
    if (options.endDate) {
      query = query.lte('date', options.endDate);
    }
    
    if (options.isCompleted !== undefined) {
      query = query.eq('is_completed', options.isCompleted);
    }
    
    const { data, error } = await query;
    
    if (error) {
      logger.error(`[${REPOSITORY_CONTEXT}] getEventsByUserId:error`, { error });
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error) {
    logger.error(`[${REPOSITORY_CONTEXT}] getEventsByUserId:exception`, { error });
    return { data: null, error };
  }
};

