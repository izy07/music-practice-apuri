/**
 * 統計集計リポジトリ（DB側集計処理）
 * 
 * 特徴:
 * - Supabase関数を使用してDB側で集計処理を実行
 * - TypeScript側の集計処理を削減してパフォーマンスを向上
 * - 楽器フィルタリング対応
 */

import { supabase } from '@/lib/supabase';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';

export interface DailyPracticeStats {
  practice_date: string;
  total_minutes: number;
  record_count: number;
  has_basic_practice: boolean;
}

export interface WeeklyPracticeStats {
  week_start: string;
  total_minutes: number;
  record_count: number;
  practice_days: number;
}

export interface MonthlyPracticeStats {
  year_month: string;
  total_minutes: number;
  record_count: number;
  practice_days: number;
  avg_minutes_per_day: number;
}

export interface InputMethodStats {
  input_method: string;
  record_count: number;
  total_minutes: number;
  avg_minutes: number;
}

export interface SummaryStats {
  total_minutes: number;
  total_records: number;
  total_days: number;
  avg_minutes_per_day: number;
  longest_session_minutes: number;
  most_active_day: string | null;
}

/**
 * 日別統計を取得（DB側集計）
 */
export const getDailyPracticeStats = async (
  userId: string,
  instrumentId: string | null | undefined,
  startDate: string,
  endDate: string
): Promise<DailyPracticeStats[]> => {
  try {
    const { data, error } = await supabase.rpc('get_daily_practice_stats', {
      p_user_id: userId,
      p_instrument_id: instrumentId || null,
      p_start_date: startDate,
      p_end_date: endDate,
    });

    if (error) {
      logger.error('日別統計取得エラー:', error);
      ErrorHandler.handle(error, 'getDailyPracticeStats', false);
      return [];
    }

    return (data || []).map((row: any) => ({
      practice_date: row.practice_date,
      total_minutes: Number(row.total_minutes) || 0,
      record_count: Number(row.record_count) || 0,
      has_basic_practice: Boolean(row.has_basic_practice),
    }));
  } catch (error) {
    logger.error('日別統計取得中にエラーが発生しました:', error);
    ErrorHandler.handle(error, 'getDailyPracticeStats', false);
    return [];
  }
};

/**
 * 週別統計を取得（DB側集計）
 */
export const getWeeklyPracticeStats = async (
  userId: string,
  instrumentId: string | null | undefined,
  startDate: string,
  endDate: string
): Promise<WeeklyPracticeStats[]> => {
  try {
    const { data, error } = await supabase.rpc('get_weekly_practice_stats', {
      p_user_id: userId,
      p_instrument_id: instrumentId || null,
      p_start_date: startDate,
      p_end_date: endDate,
    });

    if (error) {
      logger.error('週別統計取得エラー:', error);
      ErrorHandler.handle(error, 'getWeeklyPracticeStats', false);
      return [];
    }

    return (data || []).map((row: any) => ({
      week_start: row.week_start,
      total_minutes: Number(row.total_minutes) || 0,
      record_count: Number(row.record_count) || 0,
      practice_days: Number(row.practice_days) || 0,
    }));
  } catch (error) {
    logger.error('週別統計取得中にエラーが発生しました:', error);
    ErrorHandler.handle(error, 'getWeeklyPracticeStats', false);
    return [];
  }
};

/**
 * 月別統計を取得（DB側集計）
 */
export const getMonthlyPracticeStats = async (
  userId: string,
  instrumentId: string | null | undefined,
  startDate: string,
  endDate: string
): Promise<MonthlyPracticeStats[]> => {
  try {
    const { data, error } = await supabase.rpc('get_monthly_practice_stats', {
      p_user_id: userId,
      p_instrument_id: instrumentId || null,
      p_start_date: startDate,
      p_end_date: endDate,
    });

    if (error) {
      logger.error('月別統計取得エラー:', error);
      ErrorHandler.handle(error, 'getMonthlyPracticeStats', false);
      return [];
    }

    return (data || []).map((row: any) => ({
      year_month: row.year_month,
      total_minutes: Number(row.total_minutes) || 0,
      record_count: Number(row.record_count) || 0,
      practice_days: Number(row.practice_days) || 0,
      avg_minutes_per_day: Number(row.avg_minutes_per_day) || 0,
    }));
  } catch (error) {
    logger.error('月別統計取得中にエラーが発生しました:', error);
    ErrorHandler.handle(error, 'getMonthlyPracticeStats', false);
    return [];
  }
};

/**
 * 入力方法別統計を取得（DB側集計）
 */
export const getInputMethodStats = async (
  userId: string,
  instrumentId: string | null | undefined,
  startDate: string,
  endDate: string
): Promise<InputMethodStats[]> => {
  try {
    const { data, error } = await supabase.rpc('get_input_method_stats', {
      p_user_id: userId,
      p_instrument_id: instrumentId || null,
      p_start_date: startDate,
      p_end_date: endDate,
    });

    if (error) {
      logger.error('入力方法別統計取得エラー:', error);
      ErrorHandler.handle(error, 'getInputMethodStats', false);
      return [];
    }

    return (data || []).map((row: any) => ({
      input_method: row.input_method || 'その他',
      record_count: Number(row.record_count) || 0,
      total_minutes: Number(row.total_minutes) || 0,
      avg_minutes: Number(row.avg_minutes) || 0,
    }));
  } catch (error) {
    logger.error('入力方法別統計取得中にエラーが発生しました:', error);
    ErrorHandler.handle(error, 'getInputMethodStats', false);
    return [];
  }
};

/**
 * 総合統計を取得（DB側集計）
 */
export const getPracticeSummaryStats = async (
  userId: string,
  instrumentId: string | null | undefined,
  startDate: string,
  endDate: string
): Promise<SummaryStats | null> => {
  try {
    const { data, error } = await supabase.rpc('get_practice_summary_stats', {
      p_user_id: userId,
      p_instrument_id: instrumentId || null,
      p_start_date: startDate,
      p_end_date: endDate,
    });

    if (error) {
      logger.error('総合統計取得エラー:', error);
      ErrorHandler.handle(error, 'getPracticeSummaryStats', false);
      return null;
    }

    if (!data || data.length === 0) {
      return {
        total_minutes: 0,
        total_records: 0,
        total_days: 0,
        avg_minutes_per_day: 0,
        longest_session_minutes: 0,
        most_active_day: null,
      };
    }

    const row = data[0];
    return {
      total_minutes: Number(row.total_minutes) || 0,
      total_records: Number(row.total_records) || 0,
      total_days: Number(row.total_days) || 0,
      avg_minutes_per_day: Number(row.avg_minutes_per_day) || 0,
      longest_session_minutes: Number(row.longest_session_minutes) || 0,
      most_active_day: row.most_active_day || null,
    };
  } catch (error) {
    logger.error('総合統計取得中にエラーが発生しました:', error);
    ErrorHandler.handle(error, 'getPracticeSummaryStats', false);
    return null;
  }
};

