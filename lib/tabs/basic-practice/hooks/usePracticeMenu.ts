/**
 * 練習メニュー管理のカスタムフック
 */
import { useMemo } from 'react';
import { PracticeItem } from '../types';
import { genericMenus } from '../data/_practiceMenus';
import { instrumentSpecificMenus } from '../data/_instrumentSpecificMenus';
import { getInstrumentKey } from '../utils';

interface UsePracticeMenuReturn {
  filteredPracticeMenus: PracticeItem[];
}

/**
 * 練習メニューをフィルタリングするフック
 * @param selectedInstrument 選択された楽器ID
 * @param selectedLevel 選択されたレベル
 */
export const usePracticeMenu = (
  selectedInstrument: string | null | undefined,
  selectedLevel: 'beginner' | 'intermediate' | 'advanced'
): UsePracticeMenuReturn => {
  const filteredPracticeMenus = useMemo(() => {
    // 楽器キーを取得
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
  }, [selectedInstrument, selectedLevel]);

  return {
    filteredPracticeMenus,
  };
};

