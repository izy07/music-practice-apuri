/**
 * 目標（Goal）関連の型定義
 */

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  target_date?: string;
  goal_type?: string;
  progress_percentage?: number;
  is_active?: boolean;
  show_on_calendar?: boolean;
  instrument_id?: string | null;
  is_completed?: boolean;
  completed_at?: string;
  created_at?: string;
  updated_at?: string;
}

