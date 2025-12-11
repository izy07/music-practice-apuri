/**
 * ミニ音楽辞典リポジトリ
 * music_termsテーブルへのアクセスを集約
 */

import { supabase } from '@/lib/supabase';
import { practiceDataCache, PracticeDataCache } from '@/lib/cache/practiceDataCache';
import logger from '@/lib/logger';

const REPOSITORY_CONTEXT = 'musicTermRepository';

export interface MusicTerm {
  id: string;
  term_ja: string;
  term_en?: string | null;
  category?: string | null;
  description_ja?: string | null;
  description_en?: string | null;
  example_usage?: string | null;
  related_terms?: string[] | null;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface MusicTermQuery {
  category?: string;
  searchQuery?: string;
}

/**
 * 音楽用語を取得（キャッシュ付き）
 */
export const getMusicTerms = async (
  query?: MusicTermQuery
): Promise<{ data: MusicTerm[] | null; error: any }> => {
  try {
    // キャッシュキーを生成
    const cacheKey = PracticeDataCache.generateKey('music_terms', {
      category: query?.category || 'all',
      searchQuery: query?.searchQuery || '',
    });
    
    // メモリキャッシュから取得を試行
    const cachedData = practiceDataCache.get<MusicTerm[]>(cacheKey);
    if (cachedData) {
      return { data: cachedData, error: null };
    }
    
    // ローカルストレージキャッシュから取得を試行
    const storageData = await practiceDataCache.getFromStorage<MusicTerm[]>(cacheKey);
    if (storageData) {
      // メモリキャッシュにも保存
      practiceDataCache.set(cacheKey, storageData);
      return { data: storageData, error: null };
    }
    
    // DBから取得
    let dbQuery = supabase
      .from('music_terms')
      .select('id, term_ja, term_en, category, description_ja, description_en, example_usage, related_terms, display_order, created_at, updated_at')
      .order('display_order', { ascending: true });
    
    if (query?.category) {
      dbQuery = dbQuery.eq('category', query.category);
    }
    
    const { data, error } = await dbQuery;
    
    if (error) {
      logger.error(`[${REPOSITORY_CONTEXT}] getMusicTerms:error`, { error });
      return { data: null, error };
    }
    
    // 検索クエリがある場合はフィルタリング
    let filteredData = data;
    if (query?.searchQuery && filteredData) {
      const searchLower = query.searchQuery.toLowerCase();
      filteredData = filteredData.filter(term => 
        term.term_ja.toLowerCase().includes(searchLower) ||
        (term.term_en && term.term_en.toLowerCase().includes(searchLower)) ||
        (term.description_ja && term.description_ja.toLowerCase().includes(searchLower))
      );
    }
    
    // キャッシュに保存（メモリとローカルストレージ）
    if (filteredData) {
      practiceDataCache.set(cacheKey, filteredData);
      await practiceDataCache.setToStorage(cacheKey, filteredData);
    }
    
    return { data: filteredData, error: null };
  } catch (error) {
    logger.error(`[${REPOSITORY_CONTEXT}] getMusicTerms:exception`, { error });
    return { data: null, error };
  }
};

/**
 * 音楽用語をIDで取得
 */
export const getMusicTermById = async (
  termId: string
): Promise<{ data: MusicTerm | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('music_terms')
      .select('id, term_ja, term_en, category, description_ja, description_en, example_usage, related_terms, display_order, created_at, updated_at')
      .eq('id', termId)
      .single();
    
    if (error) {
      logger.error(`[${REPOSITORY_CONTEXT}] getMusicTermById:error`, { error });
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error) {
    logger.error(`[${REPOSITORY_CONTEXT}] getMusicTermById:exception`, { error });
    return { data: null, error };
  }
};

/**
 * カテゴリ一覧を取得
 */
export const getMusicTermCategories = async (): Promise<{ data: string[] | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('music_terms')
      .select('category')
      .not('category', 'is', null);
    
    if (error) {
      logger.error(`[${REPOSITORY_CONTEXT}] getMusicTermCategories:error`, { error });
      return { data: null, error };
    }
    
    // 重複を除去して返す
    const categories = Array.from(new Set(data.map(term => term.category).filter(Boolean))) as string[];
    return { data: categories.sort(), error: null };
  } catch (error) {
    logger.error(`[${REPOSITORY_CONTEXT}] getMusicTermCategories:exception`, { error });
    return { data: null, error };
  }
};


