/**
 * イベントリポジトリ
 * eventsテーブルへのアクセスを集約
 */

import { supabase } from '@/lib/supabase';
import logger from '@/lib/logger';
import { applyInstrumentFilter } from './common/instrumentFilter';

const REPOSITORY_CONTEXT = 'eventRepository';

export interface Event {
  id?: string;
  user_id: string;
  title: string;
  date: string; // YYYY-MM-DD形式
  description?: string | null;
  practice_schedule_id?: string | null; // 練習日程との連携用
  instrument_id?: string | null; // 楽器ID（楽器ごとにイベントを分けて管理）
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
      user_id: event.user_id,
      title: event.title,
      date: event.date,
      description: event.description || null,
      created_at: new Date().toISOString(),
    };
    
    // event_dateカラムが存在する場合は、dateと同じ値を設定
    if (event.date) {
      payload.event_date = event.date;
    }
    
    // practice_schedule_idが存在する場合のみ追加（カラムが存在しない場合のエラーを防ぐため）
    if (event.practice_schedule_id) {
      payload.practice_schedule_id = event.practice_schedule_id;
    }
    
    // instrument_idが存在する場合のみ追加（カラムが存在しない場合のエラーを防ぐため）
    if (event.instrument_id !== undefined) {
      payload.instrument_id = event.instrument_id;
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
      updated_at: new Date().toISOString(),
    };
    
    // 更新されるフィールドのみを追加
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.date !== undefined) {
      payload.date = updates.date;
      payload.event_date = updates.date; // event_dateも同じ値に設定
    }
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.practice_schedule_id !== undefined) {
      // practice_schedule_idがnullでない場合のみ追加
      if (updates.practice_schedule_id !== null) {
        payload.practice_schedule_id = updates.practice_schedule_id;
      }
    }
    
    // instrument_idが存在する場合のみ追加（カラムが存在しない場合のエラーを防ぐため）
    if (updates.instrument_id !== undefined) {
      payload.instrument_id = updates.instrument_id;
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
    instrumentId?: string | null;
  } = {}
): Promise<{ data: Event[] | null; error: any }> => {
  try {
    // まず、instrument_idカラムの存在を確認
    const { error: checkError } = await supabase
      .from('events')
      .select('instrument_id')
      .limit(1);
    
    const hasInstrumentId = !checkError || 
      (checkError.code !== '42703' && !checkError.message?.includes('instrument_id'));
    
    // SELECT句を構築（instrument_idカラムが存在する場合のみ含める）
    const selectColumns = hasInstrumentId
      ? 'id,user_id,title,date,description,practice_schedule_id,instrument_id,is_completed,completed_at,created_at,updated_at'
      : 'id,user_id,title,date,description,practice_schedule_id,is_completed,completed_at,created_at,updated_at';
    
    let query = supabase
      .from('events')
      .select(selectColumns)
      .eq('user_id', userId);
    
    // 楽器ごとにフィルタリング（統一関数を使用、テーブル名を指定して自動作成を試みる）
    // カラムが存在する場合のみフィルタリングを適用
    if (options.instrumentId !== undefined && hasInstrumentId) {
      query = await applyInstrumentFilter(query, options.instrumentId, true, 'events');
    }
    
    if (options.startDate) {
      query = query.gte('date', options.startDate);
    }
    
    if (options.endDate) {
      query = query.lte('date', options.endDate);
    }
    
    if (options.isCompleted !== undefined) {
      query = query.eq('is_completed', options.isCompleted);
    }
    
    const { data, error } = await query.order('date', { ascending: true });
    
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

