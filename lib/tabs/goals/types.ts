/**
 * goals.tsx の型定義
 */

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

