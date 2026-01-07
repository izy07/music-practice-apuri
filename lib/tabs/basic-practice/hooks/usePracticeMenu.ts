/**
 * 練習メニュー管理のカスタムフック
 * シンプルな実装：楽器キーで直接フィルタリング
 */
import { useMemo } from 'react';
import { PracticeItem } from '../types';
import { genericMenus } from '../data/_practiceMenus';
import { instrumentSpecificMenus } from '../data/_instrumentSpecificMenus';
import { getInstrumentKey } from '../utils';

interface UsePracticeMenuReturn {
  filteredPracticeMenus: PracticeItem[];
  loading: boolean;
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
  // 楽器キーを取得（例: 'piano', 'violin'）
  const instrumentKey = getInstrumentKey(selectedInstrument || null);
  
  // メニューを楽器別にフィルタリング
  const filteredPracticeMenus = useMemo(() => {
    // 楽器が選択されている場合は楽器固有のメニューのみ
    // 楽器が選択されていない場合は共通メニューのみ
    let allMenus: PracticeItem[] = [];
    
    if (instrumentKey && instrumentKey !== 'other') {
      // 楽器固有のメニューを取得
      allMenus = instrumentSpecificMenus[instrumentKey] || [];
    } else {
      // 共通メニューを取得
      allMenus = genericMenus;
    }
    
    // 選択されたレベルでフィルタリング
    const filtered = allMenus.filter(
      (menu) => menu.difficulty === selectedLevel
    );
    
    return filtered;
  }, [instrumentKey, selectedLevel]);

  return {
    filteredPracticeMenus,
    loading: false, // 同期的な処理なのでloadingは不要
  };
};

