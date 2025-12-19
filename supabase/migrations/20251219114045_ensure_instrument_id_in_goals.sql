-- 目標画面などのデータ切り分けをデプロイ
-- goalsテーブルにinstrument_idカラムが存在しない場合は追加

-- goalsテーブルにinstrument_idカラムを追加（存在しない場合のみ）
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'goals') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'goals' AND column_name = 'instrument_id') THEN
      ALTER TABLE public.goals ADD COLUMN instrument_id UUID REFERENCES instruments(id) ON DELETE SET NULL;
      COMMENT ON COLUMN public.goals.instrument_id IS '目標に関連する楽器ID（楽器ごとのデータ切り分け用）';
      
      -- インデックスを追加
      CREATE INDEX IF NOT EXISTS idx_goals_instrument_id ON public.goals(instrument_id);
      
      RAISE NOTICE 'instrument_idカラムをgoalsテーブルに追加しました';
    ELSE
      RAISE NOTICE 'instrument_idカラムは既にgoalsテーブルに存在します';
    END IF;
  ELSE
    RAISE NOTICE 'goalsテーブルが存在しません';
  END IF;
END $$;

