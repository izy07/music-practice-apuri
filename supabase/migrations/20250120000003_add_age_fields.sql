-- 年齢フィールドをuser_profilesテーブルに追加
-- 現在の年齢と音楽開始年齢を保存するためのカラムを追加

-- 現在の年齢フィールドを追加
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS current_age INTEGER;

-- 音楽開始年齢フィールドを追加
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS music_start_age INTEGER;

-- 演奏歴年数フィールドを追加（自動計算される値）
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS music_experience_years INTEGER DEFAULT 0;

-- コメントを追加
COMMENT ON COLUMN user_profiles.current_age IS 'ユーザーの現在の年齢';
COMMENT ON COLUMN user_profiles.music_start_age IS '音楽を始めた年齢';
COMMENT ON COLUMN user_profiles.music_experience_years IS '演奏歴年数（現在の年齢 - 音楽開始年齢）';

-- 年齢の妥当性チェック制約を追加
ALTER TABLE user_profiles 
ADD CONSTRAINT check_current_age_valid 
CHECK (current_age IS NULL OR (current_age >= 0 AND current_age <= 150));

ALTER TABLE user_profiles 
ADD CONSTRAINT check_music_start_age_valid 
CHECK (music_start_age IS NULL OR (music_start_age >= 0 AND music_start_age <= 150));

ALTER TABLE user_profiles 
ADD CONSTRAINT check_experience_years_valid 
CHECK (music_experience_years IS NULL OR (music_experience_years >= 0 AND music_experience_years <= 150));
