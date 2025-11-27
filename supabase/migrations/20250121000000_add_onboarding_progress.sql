-- オンボーディング進捗管理カラムを追加
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS tutorial_completed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS tutorial_completed_at timestamptz,
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;
