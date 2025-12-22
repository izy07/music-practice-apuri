/**
 * 基礎練習関連の型定義
 */

export type Level = 'beginner' | 'intermediate' | 'advanced';

export interface LevelData {
  id: string;
  label: string;
  description: string;
  value: Level;
}

export interface PracticeMenu {
  id: string;
  title: string;
  description?: string;
  points: string[];
  videoUrl?: string;
  difficulty: Level;
  howToPractice: string[];
  recommendedTempo?: string;
  duration?: string;
  tips?: string[];
}

export interface PracticeItem {
  id: string;
  title: string;
  description?: string;
  points: string[];
  videoUrl?: string;
  difficulty: Level;
  howToPractice?: string[];
  recommendedTempo?: string;
  duration?: string;
  tips?: string[];
}

