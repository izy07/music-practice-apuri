/**
 * goals.tsx のユーティリティ関数
 */

import { Goal } from './_types';

/**
 * 目標タイプのラベルを取得
 */
export const getGoalTypeLabel = (type: string): string => {
  switch (type) {
    case 'personal_short':
      return '短期目標';
    case 'personal_long':
      return '長期目標';
    case 'group':
      return '団体目標';
    default:
      return '目標';
  }
};

/**
 * 目標タイプのカラーを取得
 */
export const getGoalTypeColor = (type: string): string => {
  switch (type) {
    case 'personal_short':
      return '#FF6B6B'; // 赤系
    case 'personal_long':
      return '#4ECDC4'; // 青緑系
    case 'group':
      return '#95E1D3'; // 緑系
    default:
      return '#95A5A6'; // グレー
  }
};

/**
 * 重複排除ユーティリティ（idでユニーク）
 */
export const uniqueById = <T extends { id: string }>(items: T[]): T[] => {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      result.push(item);
    }
  }
  return result;
};

