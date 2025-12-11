-- パフォーマンス最適化のためのインデックス追加
-- Phase 1: データ取得の最適化

-- practice_sessionsテーブルの複合インデックス
-- よく使用されるクエリパターンに合わせて最適化
CREATE INDEX IF NOT EXISTS idx_practice_sessions_user_date_instrument 
  ON practice_sessions(user_id, practice_date, instrument_id);

-- practice_sessionsテーブルのuser_id + practice_dateの複合インデックス（instrument_idがnullの場合）
CREATE INDEX IF NOT EXISTS idx_practice_sessions_user_date 
  ON practice_sessions(user_id, practice_date) 
  WHERE instrument_id IS NULL;

-- practice_sessionsテーブルのinput_methodインデックス（基礎練の検索用）
CREATE INDEX IF NOT EXISTS idx_practice_sessions_input_method 
  ON practice_sessions(input_method) 
  WHERE input_method = 'preset';

-- goalsテーブルの複合インデックス
-- user_id + instrument_id + is_completedの複合インデックス
CREATE INDEX IF NOT EXISTS idx_goals_user_instrument_completed 
  ON goals(user_id, instrument_id, is_completed) 
  WHERE is_completed = false;

-- goalsテーブルのuser_id + instrument_idの複合インデックス（is_completedがtrueの場合）
CREATE INDEX IF NOT EXISTS idx_goals_user_instrument_completed_true 
  ON goals(user_id, instrument_id, is_completed) 
  WHERE is_completed = true;

-- goalsテーブルのshow_on_calendarインデックス（既存のインデックスを確認）
-- 既に存在する場合はスキップ
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'goals' 
    AND indexname = 'idx_goals_show_on_calendar'
  ) THEN
    CREATE INDEX idx_goals_show_on_calendar 
      ON goals(show_on_calendar) 
      WHERE show_on_calendar = true;
  END IF;
END $$;

-- recordingsテーブルのインデックス（録音データの検索用）
-- user_id + instrument_id + recorded_atの複合インデックス
CREATE INDEX IF NOT EXISTS idx_recordings_user_instrument_recorded 
  ON recordings(user_id, instrument_id, recorded_at DESC);

-- recordingsテーブルのuser_id + recorded_atのインデックス（instrument_idがnullの場合）
CREATE INDEX IF NOT EXISTS idx_recordings_user_recorded 
  ON recordings(user_id, recorded_at DESC) 
  WHERE instrument_id IS NULL;

-- 既存のインデックスを確認して、不要なインデックスがあれば削除（オプション）
-- 今回は追加のみで、削除は行わない


