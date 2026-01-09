/**
 * イベントリポジトリ
 * eventsテーブルへのアクセスを集約
 */

import { supabase } from '@/lib/supabase';
import logger from '@/lib/logger';
import { applyInstrumentFilter } from './common/instrumentFilter';
import { isColumnNotFoundError, handleColumnError, excludeColumnFromPayload } from '@/lib/columnErrorHandler';

const REPOSITORY_CONTEXT = 'eventRepository';

export interface Event {
  id?: string;
  user_id: string;
  title: string;
  date: string; // YYYY-MM-DD形式
  description?: string | null;
  color?: string | null; // イベントの色（red, green, blue, orange, purple）
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
      color: event.color || null,
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
    
    let { data, error } = await supabase
      .from('events')
      .insert(payload)
      .select()
      .single();
    
    // カラムが存在しないエラーの場合、該当カラムを除外して再試行
    if (error && isColumnNotFoundError(error)) {
      const optionalColumns = ['instrument_id', 'event_date', 'practice_schedule_id'];
      const handled = handleColumnError(error, payload, optionalColumns);
      
      if (handled) {
        logger.warn(`[${REPOSITORY_CONTEXT}] カラムが存在しないため、除外して再試行します`, {
          errorCode: error.code,
          errorMessage: error.message,
          excludedColumns: handled.excludedColumns
        });
        
        const retryResult = await supabase
          .from('events')
          .insert(handled.payload)
          .select()
          .single();
        
        if (retryResult.error) {
          // 再試行後もエラーが発生した場合、さらに他のカラムを除外して再試行
          if (isColumnNotFoundError(retryResult.error)) {
            const secondHandled = handleColumnError(retryResult.error, handled.payload, optionalColumns);
            if (secondHandled) {
              const finalResult = await supabase
                .from('events')
                .insert(secondHandled.payload)
                .select()
                .single();
              
              if (finalResult.error) {
                logger.error(`[${REPOSITORY_CONTEXT}] createEvent:再試行後もエラー`, { 
                  error: finalResult.error, 
                  payload: secondHandled.payload 
                });
                return { data: null, error: finalResult.error };
              }
              
              logger.info(`[${REPOSITORY_CONTEXT}] カラムを除外してイベントの作成に成功しました`, {
                excludedColumns: [...handled.excludedColumns, ...secondHandled.excludedColumns]
              });
              return { data: finalResult.data, error: null };
            }
          }
          
          logger.error(`[${REPOSITORY_CONTEXT}] createEvent:再試行後もエラー`, { 
            error: retryResult.error, 
            payload: handled.payload 
          });
          return { data: null, error: retryResult.error };
        }
        
        logger.info(`[${REPOSITORY_CONTEXT}] カラムを除外してイベントの作成に成功しました`, {
          excludedColumns: handled.excludedColumns
        });
        return { data: retryResult.data, error: null };
      }
    }
    
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
    if (updates.color !== undefined) payload.color = updates.color;
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
    
    let { data, error } = await supabase
      .from('events')
      .update(payload)
      .eq('id', eventId)
      .select()
      .single();
    
    // カラムが存在しないエラーの場合、該当カラムを除外して再試行
    if (error && isColumnNotFoundError(error)) {
      const optionalColumns = ['instrument_id', 'event_date', 'practice_schedule_id', 'color'];
      const handled = handleColumnError(error, payload, optionalColumns);
      
      if (handled) {
        logger.warn(`[${REPOSITORY_CONTEXT}] カラムが存在しないため、除外して再試行します`, {
          errorCode: error.code,
          errorMessage: error.message,
          excludedColumns: handled.excludedColumns
        });
        
        const retryResult = await supabase
          .from('events')
          .update(handled.payload)
          .eq('id', eventId)
          .select()
          .single();
        
        if (retryResult.error) {
          // 再試行後もエラーが発生した場合、さらに他のカラムを除外して再試行
          if (isColumnNotFoundError(retryResult.error)) {
            const secondHandled = handleColumnError(retryResult.error, handled.payload, optionalColumns);
            if (secondHandled) {
              const finalResult = await supabase
                .from('events')
                .update(secondHandled.payload)
                .eq('id', eventId)
                .select()
                .single();
              
              if (finalResult.error) {
                logger.error(`[${REPOSITORY_CONTEXT}] updateEvent:再試行後もエラー`, { 
                  error: finalResult.error, 
                  payload: secondHandled.payload 
                });
                return { data: null, error: finalResult.error };
              }
              
              logger.info(`[${REPOSITORY_CONTEXT}] カラムを除外してイベントの更新に成功しました`, {
                excludedColumns: [...handled.excludedColumns, ...secondHandled.excludedColumns]
              });
              return { data: finalResult.data, error: null };
            }
          }
          
          logger.error(`[${REPOSITORY_CONTEXT}] updateEvent:再試行後もエラー`, { 
            error: retryResult.error, 
            payload: handled.payload 
          });
          return { data: null, error: retryResult.error };
        }
        
        logger.info(`[${REPOSITORY_CONTEXT}] カラムを除外してイベントの更新に成功しました`, {
          excludedColumns: handled.excludedColumns
        });
        return { data: retryResult.data, error: null };
      }
    }
    
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
    // まず、instrument_idカラムとcolorカラムの存在を確認
    const { error: instrumentIdCheckError } = await supabase
      .from('events')
      .select('instrument_id')
      .limit(1);
    
    const { error: colorCheckError } = await supabase
      .from('events')
      .select('color')
      .limit(1);
    
    const hasInstrumentId = !instrumentIdCheckError || 
      (instrumentIdCheckError.code !== '42703' && !instrumentIdCheckError.message?.includes('instrument_id'));
    
    const hasColor = !colorCheckError || 
      (colorCheckError.code !== '42703' && !colorCheckError.message?.includes('color'));
    
    // SELECT句を構築（カラムが存在する場合のみ含める）
    let selectColumns = 'id,user_id,title,date,description';
    if (hasColor) selectColumns += ',color';
    selectColumns += ',practice_schedule_id';
    if (hasInstrumentId) selectColumns += ',instrument_id';
    selectColumns += ',is_completed,completed_at,created_at,updated_at';
    
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
    
    // colorカラムが存在しない場合、デフォルト値（blue: レッスン）を設定
    if (data && !hasColor) {
      data.forEach((event: any) => {
        if (!event.color) {
          event.color = 'blue';
        }
      });
    }
    
    return { data, error: null };
  } catch (error) {
    logger.error(`[${REPOSITORY_CONTEXT}] getEventsByUserId:exception`, { error });
    return { data: null, error };
  }
};

