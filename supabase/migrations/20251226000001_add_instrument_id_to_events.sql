-- ============================================
-- eventsテーブルにinstrument_idカラムを追加
-- ============================================
-- 日付: 2025-12-26
-- 目的: イベントを楽器ごとに分けて管理できるようにする
-- 注意: 初期スキーマ（20251219000000_initial_schema.sql）には既に含まれています
--       このマイグレーションは、初期スキーマ適用前の既存データベース用です

-- instrument_idカラムを追加（既に存在する場合はスキップ）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'instrument_id'
  ) THEN
    ALTER TABLE public.events 
    ADD COLUMN instrument_id uuid REFERENCES public.instruments(id) ON DELETE SET NULL;
    
    COMMENT ON COLUMN public.events.instrument_id IS '楽器ID（楽器ごとにイベントを分けて管理）';
    
    -- 既存のイベントデータに、ユーザーの選択された楽器IDを設定（統合）
    -- user_profilesテーブルから選択された楽器IDを取得して設定
    UPDATE public.events e
    SET instrument_id = (
      SELECT up.selected_instrument_id 
      FROM public.user_profiles up 
      WHERE up.user_id = e.user_id 
      AND up.selected_instrument_id IS NOT NULL
      LIMIT 1
    )
    WHERE e.instrument_id IS NULL
    AND EXISTS (
      SELECT 1 
      FROM public.user_profiles up 
      WHERE up.user_id = e.user_id 
      AND up.selected_instrument_id IS NOT NULL
    );
    
    -- 選択された楽器がないユーザーのイベントはNULLのまま（既存データ保護）
    -- これにより、後方互換性が保たれます
  END IF;
END $$;

-- インデックスを追加（既に存在する場合はスキップ）
CREATE INDEX IF NOT EXISTS idx_events_instrument_id ON public.events(instrument_id);

