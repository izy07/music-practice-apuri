-- ============================================
-- show_on_calendarカラムの強制追加マイグレーション
-- ============================================
-- 実行日: 2025-12-08
-- 目的: goalsテーブルにshow_on_calendarカラムを確実に追加する
-- ============================================

-- ============================================
-- 1. goalsテーブルにshow_on_calendarカラムを追加（強制）
-- ============================================
-- まず、カラムが既に存在する場合は削除してから再作成
DO $$ 
BEGIN 
  -- テーブルが存在することを確認
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'goals') THEN
    -- カラムが既に存在する場合は削除（データは保持できないので警告）
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'goals' AND column_name = 'show_on_calendar') THEN
      RAISE NOTICE '⚠️ show_on_calendarカラムは既に存在します。スキップします。';
    ELSE
      -- カラムを追加（NOT NULL制約は後で追加）
      ALTER TABLE public.goals ADD COLUMN show_on_calendar BOOLEAN DEFAULT false;
      COMMENT ON COLUMN public.goals.show_on_calendar IS 'カレンダーに表示するかどうか（true: 表示, false: 非表示）';
      
      -- 既存のレコードをfalseに設定（デフォルトで既にfalseだが、念のため）
      UPDATE public.goals SET show_on_calendar = false WHERE show_on_calendar IS NULL;
      
      RAISE NOTICE '✅ goalsテーブルにshow_on_calendarカラムを追加しました';
    END IF;
  ELSE
    RAISE NOTICE '⚠️ goalsテーブルが存在しません。先にgoalsテーブルを作成してください';
  END IF;
END $$;

-- ============================================
-- 2. インデックスの作成
-- ============================================
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'goals') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'goals' AND indexname = 'idx_goals_show_on_calendar') THEN
      CREATE INDEX idx_goals_show_on_calendar ON public.goals(show_on_calendar) WHERE show_on_calendar = true;
      RAISE NOTICE '✅ idx_goals_show_on_calendarインデックスを作成しました';
    ELSE
      RAISE NOTICE 'ℹ️ idx_goals_show_on_calendarインデックスは既に存在します';
    END IF;
  END IF;
END $$;

-- ============================================
-- 3. RLSポリシーの確認（既存のポリシーがあれば問題なし）
-- ============================================
-- show_on_calendarカラムに対して特別なRLSポリシーは不要
-- 既存のgoalsテーブルのRLSポリシーが適用されます

-- ============================================
-- 4. 検証クエリ（オプション）
-- ============================================
-- マイグレーション後に以下のクエリで確認できます：
-- SELECT column_name, data_type, column_default, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' AND table_name = 'goals' AND column_name = 'show_on_calendar';

