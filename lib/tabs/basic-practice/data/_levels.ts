/**
 * レベル定義データ
 */
import type { LevelData } from '../types/practice.types';

export const levels: LevelData[] = [
  {
    id: 'beginner',
    label: '初級',
    description: '基礎を固める段階',
    value: 'beginner',
  },
  {
    id: 'intermediate',
    label: '中級',
    description: '技術を向上させる段階',
    value: 'intermediate',
  },
  {
    id: 'advanced',
    label: 'マスター',
    description: '表現力を高める段階',
    value: 'advanced',
  }
];

