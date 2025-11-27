/**
 * 練習メニュー管理フック
 * 楽器別のメニューフィルタリングと表示を管理
 */

import { useMemo } from 'react';
import { genericMenus } from '../data/genericMenus';
import { instrumentSpecificMenus } from '../data/instrumentSpecificMenus';
import type { PracticeItem } from '../types/practice.types';

export interface UsePracticeMenuReturn {
  filteredPracticeMenus: PracticeItem[];
  instrumentKey: string;
}

/**
 * 楽器ID(選択ID) → 楽器キーへの変換
 */
function getInstrumentKey(selectedInstrument: string): string {
  // UUID → 楽器キーの対応（instrument-selection.tsx で使用している固定UUID）
  const id = selectedInstrument;
  const map: { [key: string]: string } = {
    '550e8400-e29b-41d4-a716-446655440001': 'piano',
    '550e8400-e29b-41d4-a716-446655440002': 'guitar',
    '550e8400-e29b-41d4-a716-446655440003': 'violin',
    '550e8400-e29b-41d4-a716-446655440004': 'flute',
    '550e8400-e29b-41d4-a716-446655440005': 'trumpet',
    '550e8400-e29b-41d4-a716-446655440006': 'drums',
    '550e8400-e29b-41d4-a716-446655440007': 'saxophone',
    '550e8400-e29b-41d4-a716-446655440008': 'horn',
    '550e8400-e29b-41d4-a716-446655440009': 'clarinet',
    '550e8400-e29b-41d4-a716-446655440010': 'tuba',
    '550e8400-e29b-41d4-a716-446655440011': 'cello',
    '550e8400-e29b-41d4-a716-446655440012': 'bassoon',
    '550e8400-e29b-41d4-a716-446655440013': 'trombone',
    // TODO: 実装完了後にコメントアウトを解除
    // '550e8400-e29b-41d4-a716-446655440014': 'harp',
    // '550e8400-e29b-41d4-a716-446655440015': 'harp',
    '550e8400-e29b-41d4-a716-446655440016': 'other',
  };
  return map[id] || id || 'other';
}

export function usePracticeMenu(
  selectedInstrument: string,
  selectedLevel: 'beginner' | 'intermediate' | 'advanced'
): UsePracticeMenuReturn {
  // 楽器キーの取得
  const instrumentKey = useMemo(() => {
    return getInstrumentKey(selectedInstrument);
  }, [selectedInstrument]);

  // 選択された楽器キーでメニューを差し替え
  const filteredPracticeMenus = useMemo(() => {
    const sourceMenus: PracticeItem[] = [
      ...(instrumentSpecificMenus[instrumentKey] || []),
      ...genericMenus,
    ];
    
    // 選択されたレベルの練習メニューをフィルタリング
    return sourceMenus.filter(menu => menu.difficulty === selectedLevel);
  }, [instrumentKey, selectedLevel]);

  return {
    filteredPracticeMenus,
    instrumentKey,
  };
}



