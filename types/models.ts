/**
 * データモデルの型定義
 * アプリ全体で使用される共通の型定義
 */

// ユーザー関連
export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at?: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  username?: string;
  display_name?: string;
  nickname?: string;
  bio?: string;
  avatar_url?: string;
  selected_instrument_id?: string;
  organization?: string;
  birthday?: string; // 誕生日（YYYY-MM-DD形式）
  current_age?: number; // 現在の年齢（自動計算）
  music_start_age?: number; // 音楽開始年齢
  music_experience_years?: number; // 演奏歴年数（自動計算）
  created_at: string;
  updated_at: string;
}

// 目標関連
export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  target_date?: string;
  progress_percentage: number;
  goal_type: 'personal_short' | 'personal_long' | 'group';
  is_active: boolean;
  is_completed: boolean;
  completed_at?: string;
  created_at: string;
  updated_at?: string;
}

// 練習記録関連
export interface PracticeSession {
  id: string;
  user_id: string;
  practice_date: string;
  duration_minutes: number;
  content?: string;
  audio_url?: string;
  video_url?: string;
  input_method: 'manual' | 'timer' | 'voice' | 'quick';
  instrument_id?: string;
  created_at: string;
  updated_at?: string;
}

// 録音関連
export interface Recording {
  id: string;
  user_id: string;
  title: string;
  memo?: string;
  file_path: string;
  duration_seconds?: number;
  is_favorite: boolean;
  instrument_id?: string;
  recorded_at: string;
  created_at: string;
  updated_at?: string;
}

// イベント関連
export interface Event {
  id: string;
  user_id: string;
  title: string;
  date: string;
  description?: string;
  is_completed: boolean;
  completed_at?: string;
  created_at: string;
  updated_at?: string;
}

// 楽器関連
export interface Instrument {
  id: string;
  name: string;
  name_en: string;
  color_primary: string;
  color_secondary: string;
  color_accent: string;
  starting_note?: string;
  tuning_notes?: string[];
  created_at?: string;
  updated_at?: string;
}

// テーマ関連
export interface InstrumentTheme {
  id: string;
  name: string;
  nameEn: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
}

// 練習日程関連（団体機能）
export interface PracticeSchedule {
  id: string;
  organization_id: string;
  title: string;
  description?: string;
  practice_date: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  practice_type: 'ensemble' | 'part_practice' | 'individual_practice' | 'rehearsal' | 'lesson' | 'event';
  created_at: string;
  updated_at?: string;
}

// サブスクリプション関連
export interface UserSubscription {
  id: string;
  user_id: string;
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid';
  trial_end?: string;
  current_period_start: string;
  current_period_end: string;
  created_at: string;
  updated_at?: string;
}

export interface Entitlement {
  isEntitled: boolean;
  isTrial: boolean;
  isPremiumActive: boolean;
  daysLeftOnTrial: number;
}

// 憧れの演奏関連
export interface InspirationalPerformance {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  video_url?: string;
  performer_name?: string;
  piece_name?: string;
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  genre?: string;
  slot?: number;
  created_at: string;
  updated_at?: string;
}

// 目標曲関連
export interface TargetSong {
  id: string;
  user_id: string;
  title: string;
  composer: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

// 設定関連
export interface UserSettings {
  user_id: string;
  language: 'ja' | 'en';
  theme?: 'light' | 'dark' | 'auto';
  notifications_enabled: boolean;
  practice_reminder_enabled: boolean;
  practice_reminder_time?: string;
  created_at: string;
  updated_at: string;
}

export interface PracticeSettings {
  colorChangeThreshold: number;
}

// チュートリアル関連
export interface TutorialProgress {
  user_id: string;
  completed_steps: string[];
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

// フィードバック関連
export interface Feedback {
  id: string;
  user_id?: string;
  type: 'general' | 'bug' | 'feature' | 'improvement';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  contact_email?: string;
  diagnostics?: string;
  created_at: string;
}

// 部屋（団体）関連
export interface Room {
  id: string;
  room_id: string;
  parent_room_id?: string;
  name: string;
  description?: string;
  password_hash: string;
  icon_name: string;
  color_theme: string;
  created_at: string;
  updated_at?: string;
}

export interface RoomMember {
  id: string;
  room_id: string;
  user_id: string;
  nickname: string;
  role: 'admin' | 'member';
  joined_at: string;
}

// 音楽辞書関連
export interface MusicTerm {
  id: string;
  term: string;
  reading?: string;
  category: 'tempo' | 'dynamics' | 'articulation' | 'technique' | 'other';
  meaning_ja: string;
  meaning_en?: string;
  description_ja?: string;
  description_en?: string;
  created_at: string;
}

// API レスポンス型
export interface ApiResponse<T> {
  data: T | null;
  error: Error | null;
}

export interface SupabaseResponse<T> {
  data: T | null;
  error: {
    message: string;
    code?: string;
  } | null;
}

