/**
 * 練習メニュー管理のカスタムフック
 * DBから取得（フォールバックで既存のTypeScriptデータを使用）
 */
import { useMemo, useState, useEffect } from 'react';
import { PracticeItem } from '../types';
import { genericMenus } from '../data/_practiceMenus';
import { instrumentSpecificMenus } from '../data/_instrumentSpecificMenus';
import { getInstrumentKey } from '../utils';
import { getInstrumentId } from '@/lib/instrumentUtils';
import { getPracticeMenus, PracticeMenu } from '@/repositories/practiceMenuRepository';
import logger from '@/lib/logger';

interface UsePracticeMenuReturn {
  filteredPracticeMenus: PracticeItem[];
  loading: boolean;
}

/**
 * DBのPracticeMenuをPracticeItemに変換
 */
const convertPracticeMenuToItem = (menu: PracticeMenu): PracticeItem => {
  return {
    id: menu.id,
    title: menu.title,
    description: menu.description || undefined,
    points: menu.points || [],
    videoUrl: menu.video_url || undefined,
    difficulty: menu.difficulty,
    howToPractice: menu.how_to_practice || [],
    recommendedTempo: menu.recommended_tempo || undefined,
    duration: menu.duration || undefined,
    tips: menu.tips || [],
  };
};

/**
 * 練習メニューをフィルタリングするフック（DB取得版）
 * @param selectedInstrument 選択された楽器ID
 * @param selectedLevel 選択されたレベル
 */
export const usePracticeMenu = (
  selectedInstrument: string | null | undefined,
  selectedLevel: 'beginner' | 'intermediate' | 'advanced'
): UsePracticeMenuReturn => {
  const [dbMenus, setDbMenus] = useState<PracticeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [useFallback, setUseFallback] = useState(false);
  
  // DBからメニューを取得
  useEffect(() => {
    let isMounted = true;
    
    const loadMenus = async () => {
      try {
        setLoading(true);
        const instrumentId = getInstrumentId(selectedInstrument);
        
        const { data, error } = await getPracticeMenus({
          instrumentId: instrumentId || null,
          difficulty: selectedLevel,
        });
        
        if (error) {
          // テーブルが存在しない場合のエラー（PGRST205）を特別に処理
          if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
            logger.warn('practice_menusテーブルが存在しません。マイグレーションを実行してください。フォールバックを使用します。', {
              error: {
                code: error.code,
                message: error.message,
                hint: error.hint || 'practice_menusテーブルを作成するマイグレーションを実行してください。'
              },
              instrumentId,
              difficulty: selectedLevel
            });
          } else {
            logger.warn('practice_menusテーブルから取得失敗、フォールバックを使用', {
              error: {
                code: error.code,
                message: error.message,
                details: error.details,
                hint: error.hint
              },
              instrumentId,
              difficulty: selectedLevel
            });
          }
          setUseFallback(true);
          setDbMenus([]);
          return;
        }
        
        if (data && data.length > 0) {
          // DBにデータがある場合はDBを使用
          const convertedMenus = data.map(convertPracticeMenuToItem);
          if (isMounted) {
            setDbMenus(convertedMenus);
            setUseFallback(false);
          }
        } else {
          // DBにデータがない場合はフォールバックを使用
          logger.debug('practice_menusテーブルにデータがない、フォールバックを使用');
          setUseFallback(true);
          setDbMenus([]);
        }
      } catch (error) {
        logger.error('練習メニュー取得エラー:', error);
        setUseFallback(true);
        setDbMenus([]);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    loadMenus();
    
    return () => {
      isMounted = false;
    };
  }, [selectedInstrument, selectedLevel]);
  
  const filteredPracticeMenus = useMemo(() => {
    // DBにデータがある場合はDBのデータを使用
    if (!useFallback && dbMenus.length > 0) {
      return dbMenus;
    }
    
    // フォールバック: 既存のTypeScriptデータを使用
    const instrumentKey = getInstrumentKey(selectedInstrument);
    
    // 楽器固有のメニューを取得
    const instrumentMenus = instrumentKey 
      ? (instrumentSpecificMenus[instrumentKey] || [])
      : [];
    
    // 共通メニューと楽器固有メニューを結合
    const allMenus = [...genericMenus, ...instrumentMenus];
    
    // 選択されたレベルでフィルタリング
    const filtered = allMenus.filter(
      (menu) => menu.difficulty === selectedLevel
    );
    
    return filtered;
  }, [selectedInstrument, selectedLevel, dbMenus, useFallback]);

  return {
    filteredPracticeMenus,
    loading,
  };
};

