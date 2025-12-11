-- user_settingsテーブルのuser_idにUNIQUE制約を追加
-- エラー: there is no unique or exclusion constraint matching the ON CONFLICT specification
-- を解決するため

-- 既存のUNIQUE制約を確認してから追加
DO $$
BEGIN
  -- user_idにUNIQUE制約が存在するか確認
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_settings_user_id_key'
    AND conrelid = 'public.user_settings'::regclass
  ) THEN
    -- UNIQUE制約を追加
    ALTER TABLE public.user_settings
    ADD CONSTRAINT user_settings_user_id_key UNIQUE (user_id);
    
    RAISE NOTICE 'user_settingsテーブルのuser_idにUNIQUE制約を追加しました';
  ELSE
    RAISE NOTICE 'user_settingsテーブルのuser_idには既にUNIQUE制約が存在します';
  END IF;
END $$;

-- インデックスも確認（パフォーマンス向上のため）
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id_unique ON user_settings(user_id);

-- コメントを追加
COMMENT ON CONSTRAINT user_settings_user_id_key ON user_settings IS 'ユーザーIDの一意性を保証する制約。upsert操作で使用されます。';




