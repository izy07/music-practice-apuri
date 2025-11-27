/**
 * basic-practice.tsx の型定義
 */

export interface PracticeItem {
  id: string;
  title: string;
  description: string;
  points: string[];
  videoUrl?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  howToPractice?: string[]; // 練習の仕方
  recommendedTempo?: string; // 推奨テンポ
  duration?: string; // 推奨練習時間
  tips?: string[]; // 追加のヒント
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

export interface Level {
  id: 'beginner' | 'intermediate' | 'advanced';
  label: string;
  description: string;
}

