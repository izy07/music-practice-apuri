-- user_settingsテーブルにnotification_settingsカラムを追加
-- 通知設定をJSONB形式で保存するためのカラム

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

-- 既存のnotifications_enabledカラムの値をnotification_settingsに移行（オプション）
-- 既存ユーザーの設定を保持するため
DO $$
DECLARE
  user_record RECORD;
  current_settings JSONB;
BEGIN
  -- notifications_enabledがtrueで、notification_settingsがnullまたはpractice_remindersがfalseのユーザーを更新
  FOR user_record IN 
    SELECT user_id, notifications_enabled 
    FROM public.user_settings 
    WHERE notifications_enabled = true 
    AND (
      notification_settings IS NULL 
      OR (notification_settings->>'practice_reminders')::boolean = false
    )
  LOOP
    -- 既存のnotification_settingsを取得、なければデフォルト値を使用
    SELECT COALESCE(notification_settings, '{
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
    }'::jsonb) INTO current_settings
    FROM public.user_settings
    WHERE user_id = user_record.user_id;
    
    -- practice_remindersをtrueに設定
    current_settings := jsonb_set(
      current_settings,
      '{practice_reminders}',
      'true'::jsonb
    );
    
    -- 更新
    UPDATE public.user_settings
    SET notification_settings = current_settings
    WHERE user_id = user_record.user_id;
  END LOOP;
  
  RAISE NOTICE '既存ユーザーの通知設定を移行しました';
END $$;

-- コメント
COMMENT ON COLUMN public.user_settings.notification_settings IS '通知設定をJSONB形式で保存（practice_reminders, goal_reminders, daily_practice等）';




