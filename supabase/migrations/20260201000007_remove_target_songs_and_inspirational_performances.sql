-- 目標曲機能と憧れの演奏機能の削除
-- target_songsとinspirational_performancesテーブルを削除

-- 1. 関連するRLSポリシーを削除
DROP POLICY IF EXISTS "Users can view own target songs" ON target_songs;
DROP POLICY IF EXISTS "Users can insert own target songs" ON target_songs;
DROP POLICY IF EXISTS "Users can update own target songs" ON target_songs;
DROP POLICY IF EXISTS "Users can delete own target songs" ON target_songs;
DROP POLICY IF EXISTS "Users can view own target_songs" ON target_songs;
DROP POLICY IF EXISTS "Users can insert own target_songs" ON target_songs;
DROP POLICY IF EXISTS "Users can update own target_songs" ON target_songs;
DROP POLICY IF EXISTS "Users can delete own target_songs" ON target_songs;

DROP POLICY IF EXISTS "Users can view own inspirational performances" ON inspirational_performances;
DROP POLICY IF EXISTS "Users can insert own inspirational performances" ON inspirational_performances;
DROP POLICY IF EXISTS "Users can update own inspirational performances" ON inspirational_performances;
DROP POLICY IF EXISTS "Users can delete own inspirational performances" ON inspirational_performances;

-- 2. 関連するトリガーを削除
DROP TRIGGER IF EXISTS update_target_songs_updated_at ON target_songs;
DROP TRIGGER IF EXISTS update_inspirational_performances_updated_at ON inspirational_performances;

-- 3. 関連するインデックスを削除
DROP INDEX IF EXISTS idx_target_songs_user_id;
DROP INDEX IF EXISTS idx_inspirational_performances_user_id;
DROP INDEX IF EXISTS idx_inspirational_performances_slot;
DROP INDEX IF EXISTS idx_inspirational_performances_created_at;

-- 4. テーブルを削除
DROP TABLE IF EXISTS target_songs CASCADE;
DROP TABLE IF EXISTS inspirational_performances CASCADE;

