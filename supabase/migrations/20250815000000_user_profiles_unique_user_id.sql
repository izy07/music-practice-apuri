-- user_profiles.user_id の重複を解消し、一意制約を追加

-- 1) 重複レコードの削除（最新 created_at を残す）
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY user_id
           ORDER BY created_at DESC NULLS LAST, id DESC
         ) AS rn
  FROM user_profiles
)
DELETE FROM user_profiles
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 2) user_id に一意制約を追加（存在しない場合のみ）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.user_profiles'::regclass
      AND conname = 'user_profiles_user_id_unique'
  ) THEN
    ALTER TABLE public.user_profiles
      ADD CONSTRAINT user_profiles_user_id_unique UNIQUE (user_id);
  END IF;
END$$;

-- 3) 補助インデックス（冪等）
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);


