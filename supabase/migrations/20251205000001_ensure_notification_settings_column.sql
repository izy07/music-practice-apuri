-- user_settingsテーブルにnotification_settingsカラムを確実に追加
-- エラー: notification_settingsカラムが存在しません を解決
-- 既存のマイグレーション（20251204000001）が適用されていない場合に備えて作成

-- notification_settingsカラムの追加（存在しない場合のみ）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_settings' 
    AND column_name = 'notification_settings'
  ) THEN
    ALTER TABLE public.user_settings 
    ADD COLUMN notification_settings JSONB DEFAULT '{
      "practice_reminders": true,
      "goal_reminders": true,
      "daily_practice": true,
      "weekly_summary": false,
      "achievement_notifications": true,
      "sound_notifications": true,
      "vibration_notifications": true,
      "quiet_hours_enabled": false,
      "quiet_hours_start": "22:00",
      "quiet_hours_end": "08:00"
    }'::jsonb;
    
    RAISE NOTICE 'notification_settingsカラムを追加しました';
  ELSE
    RAISE NOTICE 'notification_settingsカラムは既に存在します';
  END IF;
END $$;

-- 既存のレコードにデフォルト値を設定（notification_settingsがNULLの場合）
UPDATE public.user_settings
SET notification_settings = '{
  "practice_reminders": true,
  "goal_reminders": true,
  "daily_practice": true,
  "weekly_summary": false,
  "achievement_notifications": true,
  "sound_notifications": true,
  "vibration_notifications": true,
  "quiet_hours_enabled": false,
  "quiet_hours_start": "22:00",
  "quiet_hours_end": "08:00"
}'::jsonb
WHERE notification_settings IS NULL;

-- コメントを追加
COMMENT ON COLUMN public.user_settings.notification_settings IS '通知設定をJSONB形式で保存（practice_reminders, goal_reminders, daily_practice等）';



