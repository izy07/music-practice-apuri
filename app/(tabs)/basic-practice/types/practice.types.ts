/**
 * 練習メニュー関連の型定義
 */

export interface PracticeItem {
  id: string;
  title: string;
  description: string;
  points: string[];
  videoUrl?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  howToPractice?: string[];
  recommendedTempo?: string;
  duration?: string;
  tips?: string[];
}

export interface Level {
  id: 'beginner' | 'intermediate' | 'advanced';
  label: string;
  description: string;
}

export interface InstrumentBasics {
  posture: string;
  grip: string;
  tips: string[];
}
