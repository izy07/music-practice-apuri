-- ============================================
-- user_profilesテーブルにリワード広告録音数を追加
-- ============================================
-- 月間のリワード広告録音数を記録するカラムを追加
-- JSONB形式: { "instrument_id": count, ... }
-- ============================================

-- monthly_rewarded_ad_recordingsカラムを追加
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS monthly_rewarded_ad_recordings JSONB DEFAULT '{}'::jsonb;

-- コメントを追加
COMMENT ON COLUMN public.user_profiles.monthly_rewarded_ad_recordings IS 
'月間のリワード広告録音数（楽器ごと）。JSONB形式で{ "instrument_id": count }を格納。月ごとにリセットされる。';

-- 既存データの初期化（既存ユーザーに対して空のJSONオブジェクトを設定）
UPDATE public.user_profiles 
SET monthly_rewarded_ad_recordings = '{}'::jsonb 
WHERE monthly_rewarded_ad_recordings IS NULL;
