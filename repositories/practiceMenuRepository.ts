/**
 * 基礎練メニューリポジトリ
 * practice_menusテーブルへのアクセスを集約
 */

import { supabase } from '@/lib/supabase';
import { practiceDataCache, PracticeDataCache } from '@/lib/cache/practiceDataCache';
import logger from '@/lib/logger';

const REPOSITORY_CONTEXT = 'practiceMenuRepository';

export interface PracticeMenu {
  id: string;
  instrument_id?: string | null;
  title: string;
  description?: string | null;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  points?: string[] | null;
  how_to_practice?: string[] | null;
  recommended_tempo?: string | null;
  duration?: string | null;
  tips?: string[] | null;
  video_url?: string | null;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface PracticeMenuQuery {
  instrumentId?: string | null;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

/**
 * 練習メニューを取得（キャッシュ付き）
 */
export const getPracticeMenus = async (
  query?: PracticeMenuQuery
): Promise<{ data: PracticeMenu[] | null; error: any }> => {
  try {
    // キャッシュキーを生成
    const cacheKey = PracticeDataCache.generateKey('practice_menus', {
      instrumentId: query?.instrumentId || 'null',
      difficulty: query?.difficulty || 'all',
    });
    
    // メモリキャッシュから取得を試行
    const cachedData = practiceDataCache.get<PracticeMenu[]>(cacheKey);
    if (cachedData) {
      return { data: cachedData, error: null };
    }
    
    // ローカルストレージキャッシュから取得を試行
    const storageData = await practiceDataCache.getFromStorage<PracticeMenu[]>(cacheKey);
    if (storageData) {
      // メモリキャッシュにも保存
      practiceDataCache.set(cacheKey, storageData);
      return { data: storageData, error: null };
    }
    
    // DBから取得
    let dbQuery = supabase
      .from('practice_menus')
      .select('id, instrument_id, title, description, difficulty, points, how_to_practice, recommended_tempo, duration, tips, video_url, display_order, created_at, updated_at')
      .order('display_order', { ascending: true });
    
    if (query?.instrumentId) {
      dbQuery = dbQuery.eq('instrument_id', query.instrumentId);
    } else if (query?.instrumentId === null) {
      // nullの場合は共通メニューのみ
      dbQuery = dbQuery.is('instrument_id', null);
    }
    
    if (query?.difficulty) {
      dbQuery = dbQuery.eq('difficulty', query.difficulty);
    }
    
    const { data, error } = await dbQuery;
    
    if (error) {
      logger.error(`[${REPOSITORY_CONTEXT}] getPracticeMenus:error`, { error });
      return { data: null, error };
    }
    
    // キャッシュに保存（メモリとローカルストレージ）
    if (data) {
      practiceDataCache.set(cacheKey, data);
      await practiceDataCache.setToStorage(cacheKey, data);
    }
    
    return { data, error: null };
  } catch (error) {
    logger.error(`[${REPOSITORY_CONTEXT}] getPracticeMenus:exception`, { error });
    return { data: null, error };
  }
};

/**
 * 練習メニューをIDで取得
 */
export const getPracticeMenuById = async (
  menuId: string
): Promise<{ data: PracticeMenu | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('practice_menus')
      .select('id, instrument_id, title, description, difficulty, points, how_to_practice, recommended_tempo, duration, tips, video_url, display_order, created_at, updated_at')
      .eq('id', menuId)
      .single();
    
    if (error) {
      logger.error(`[${REPOSITORY_CONTEXT}] getPracticeMenuById:error`, { error });
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error) {
    logger.error(`[${REPOSITORY_CONTEXT}] getPracticeMenuById:exception`, { error });
    return { data: null, error };
  }
};


