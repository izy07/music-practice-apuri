/**
 * goals.tsx の型定義
 */

export interface SubGoal {
  id: string;
  goal_id: string;
  user_id: string;
  title: string;
  description?: string;
  is_completed: boolean;
  completed_at?: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  target_date?: string;
  progress_percentage: number;
  goal_type: 'personal_short' | 'personal_long' | 'group';
  is_active: boolean;
  is_completed: boolean;
  completed_at?: string;
  show_on_calendar?: boolean;
  sub_goals?: SubGoal[]; // サブ目標（長期目標の場合のみ）
  instrument_id?: string | null; // 楽器ID
  user_id?: string; // ユーザーID（サブ目標作成時に必要）
}

export interface UserProfile {
  nickname?: string;
  organization?: string;
}

export interface TargetSong {
  id: string;
  title: string;
  composer: string;
  notes?: string;
}

export interface GoalSong {
  id: string;
  user_id: string;
  goal_id: string;
  song_id: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  my_songs: {
    id: string;
    title: string;
    composer: string;
    artist: string;
    genre?: string;
    difficulty: string;
    status: string;
  };
}

export interface InspirationalPerformance {
  id: string;
  title: string;
  description?: string;
  video_url?: string;
  performer_name?: string;
  piece_name?: string;
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  genre?: string;
  created_at: string;
}

export interface Event {
  id: string;
  title: string;
  date: string;
  description?: string;
  is_completed: boolean;
  completed_at?: string;
}

