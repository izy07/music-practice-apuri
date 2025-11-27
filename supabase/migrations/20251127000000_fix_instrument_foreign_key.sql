-- 外部キー制約違反の修正
-- user_profiles.selected_instrument_idが存在しないinstruments.idを参照している場合の修正

-- 1. 存在しないinstrument_idをNULLに設定
UPDATE public.user_profiles
SET selected_instrument_id = NULL
WHERE selected_instrument_id IS NOT NULL
  AND selected_instrument_id NOT IN (SELECT id FROM public.instruments);

-- 2. 外部キー制約が存在しない場合は追加（ON DELETE SET NULLで緩和）
DO $$
BEGIN
  -- 既存の外部キー制約を削除（存在する場合）
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_profiles_selected_instrument_id_fkey'
  ) THEN
    ALTER TABLE public.user_profiles 
    DROP CONSTRAINT user_profiles_selected_instrument_id_fkey;
  END IF;

  -- 新しい外部キー制約を追加（ON DELETE SET NULL）
  ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_selected_instrument_id_fkey
  FOREIGN KEY (selected_instrument_id)
  REFERENCES public.instruments(id)
  ON DELETE SET NULL;
END $$;

-- 3. 存在しないinstrument_idを持つレコードを確認（ログ用）
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM public.user_profiles
  WHERE selected_instrument_id IS NOT NULL
    AND selected_instrument_id NOT IN (SELECT id FROM public.instruments);
  
  IF invalid_count > 0 THEN
    RAISE NOTICE '修正された無効なinstrument_idの数: %', invalid_count;
  END IF;
END $$;

