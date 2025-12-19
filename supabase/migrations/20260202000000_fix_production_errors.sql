-- 本番環境エラー修正マイグレーション
-- 目的: goals.show_on_calendarカラムとinstrumentsテーブルの不足を修正
-- 日付: 2026-02-02

-- ============================================
-- 1. goalsテーブルにshow_on_calendarカラムを追加
-- ============================================
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'goals') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'goals' AND column_name = 'show_on_calendar') THEN
      ALTER TABLE goals ADD COLUMN show_on_calendar BOOLEAN DEFAULT false;
      COMMENT ON COLUMN goals.show_on_calendar IS 'カレンダーに表示するかどうか（true: 表示, false: 非表示）';
      
      -- 既存のレコードをfalseに設定
      UPDATE goals SET show_on_calendar = false WHERE show_on_calendar IS NULL;
      
      -- インデックスを作成
      CREATE INDEX IF NOT EXISTS idx_goals_show_on_calendar ON goals(show_on_calendar) WHERE show_on_calendar = true;
    END IF;
  END IF;
END $$;

-- ============================================
-- 2. instrumentsテーブルの作成（存在しない場合）
-- ============================================
CREATE TABLE IF NOT EXISTS public.instruments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_en text NOT NULL,
  color_primary text NOT NULL,
  color_secondary text NOT NULL,
  color_accent text NOT NULL,
  color_background text NOT NULL DEFAULT '#FFFFFF',
  color_surface text NOT NULL DEFAULT '#FFFFFF',
  starting_note text,
  tuning_notes jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLSの有効化
ALTER TABLE public.instruments ENABLE ROW LEVEL SECURITY;

-- RLSポリシーの作成（存在しない場合のみ）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'instruments' 
    AND policyname = 'Anyone can view instruments'
  ) THEN
    CREATE POLICY "Anyone can view instruments" ON public.instruments
      FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'instruments' 
    AND policyname = 'Service role can manage instruments'
  ) THEN
    CREATE POLICY "Service role can manage instruments" ON public.instruments
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ============================================
-- 3. 全ての楽器データを投入（ON CONFLICTで重複を回避）
-- ============================================
-- カラムの追加（既存テーブルにカラムがない場合）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'instruments' AND column_name = 'color_background') THEN
    ALTER TABLE public.instruments ADD COLUMN color_background text NOT NULL DEFAULT '#FFFFFF';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'instruments' AND column_name = 'color_surface') THEN
    ALTER TABLE public.instruments ADD COLUMN color_surface text NOT NULL DEFAULT '#FFFFFF';
  END IF;
  -- tuning_notesをtext[]からjsonbに変更（既にjsonbの場合はスキップ）
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'instruments' 
    AND column_name = 'tuning_notes' 
    AND data_type = 'ARRAY'
  ) THEN
    -- text[]からjsonbに変換
    ALTER TABLE public.instruments ALTER COLUMN tuning_notes TYPE jsonb USING to_jsonb(tuning_notes);
  END IF;
END $$;

INSERT INTO public.instruments (
  id,
  name,
  name_en,
  color_primary,
  color_secondary,
  color_accent,
  color_background,
  color_surface,
  starting_note,
  tuning_notes
) VALUES
-- 001: ピアノ
('550e8400-e29b-41d4-a716-446655440001', 'ピアノ', 'Piano', '#1A1A1A', '#C0C0C0', '#D4AF37', '#F8F6F0', '#FFFFFF', 'C4', to_jsonb(ARRAY['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'])),
-- 002: ギター
('550e8400-e29b-41d4-a716-446655440002', 'ギター', 'Guitar', '#654321', '#DEB887', '#8B4513', '#FFF8DC', '#FFFFFF', 'E2', to_jsonb(ARRAY['E2', 'A2', 'D3', 'G3', 'B3', 'E4'])),
-- 003: バイオリン
('550e8400-e29b-41d4-a716-446655440003', 'バイオリン', 'Violin', '#6B4423', '#C9A961', '#D4AF37', '#FFF8F0', '#FFFFFF', 'G3', to_jsonb(ARRAY['G3', 'D4', 'A4', 'E5'])),
-- 004: フルート
('550e8400-e29b-41d4-a716-446655440004', 'フルート', 'Flute', '#C0C0C0', '#E6E6FA', '#A9A9A9', '#F0F8FF', '#FFFFFF', 'C4', to_jsonb(ARRAY['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'])),
-- 005: トランペット
('550e8400-e29b-41d4-a716-446655440005', 'トランペット', 'Trumpet', '#B8860B', '#DAA520', '#8B4513', '#FFE4B5', '#FFFFFF', 'C4', to_jsonb(ARRAY['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'])),
-- 006: ドラム（統一された定義）
('550e8400-e29b-41d4-a716-446655440006', 'ドラム', 'Drums', '#000000', '#696969', '#000000', '#F5F5DC', '#FFFFFF', NULL, NULL),
-- 007: サックス
('550e8400-e29b-41d4-a716-446655440007', 'サックス', 'Saxophone', '#FFD700', '#FFEB3B', '#FFC107', '#FFFDE7', '#FFFFFF', 'Bb3', to_jsonb(ARRAY['Bb3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'Bb4'])),
-- 008: ホルン
('550e8400-e29b-41d4-a716-446655440008', 'ホルン', 'Horn', '#8B4513', '#F4A460', '#654321', '#FFF8DC', '#FFFFFF', 'F3', to_jsonb(ARRAY['F3', 'C4', 'F4'])),
-- 009: クラリネット
('550e8400-e29b-41d4-a716-446655440009', 'クラリネット', 'Clarinet', '#000000', '#2F2F2F', '#1A1A1A', '#E6E6FA', '#FFFFFF', 'E3', to_jsonb(ARRAY['E3', 'F3', 'G3', 'A3', 'B3'])),
-- 010: トロンボーン
('550e8400-e29b-41d4-a716-446655440010', 'トロンボーン', 'Trombone', '#C0C0C0', '#E6E6FA', '#A9A9A9', '#F0F8FF', '#FFFFFF', 'B1', to_jsonb(ARRAY['B1', 'E2', 'B2', 'E3'])),
-- 011: チェロ
('550e8400-e29b-41d4-a716-446655440011', 'チェロ', 'Cello', '#DC143C', '#FF69B4', '#8B0000', '#FFF0F5', '#FFFFFF', 'C2', to_jsonb(ARRAY['C2', 'G2', 'D3', 'A3'])),
-- 012: ファゴット
('550e8400-e29b-41d4-a716-446655440012', 'ファゴット', 'Bassoon', '#A0522D', '#DEB887', '#8B4513', '#FFF8DC', '#FFFFFF', 'B1', to_jsonb(ARRAY['B1', 'C2', 'D2', 'E2'])),
-- 013: オーボエ
('550e8400-e29b-41d4-a716-446655440013', 'オーボエ', 'Oboe', '#DAA520', '#F0E68C', '#B8860B', '#FFFACD', '#FFFFFF', 'C4', to_jsonb(ARRAY['C4', 'D4', 'E4', 'F4'])),
-- 014: ハープ
('550e8400-e29b-41d4-a716-446655440014', 'ハープ', 'Harp', '#FF69B4', '#FFB6C1', '#C71585', '#FFF0F5', '#FFFFFF', 'C2', to_jsonb(ARRAY['C2', 'D2', 'E2', 'F2', 'G2', 'A2', 'B2'])),
-- 015: コントラバス
('550e8400-e29b-41d4-a716-446655440015', 'コントラバス', 'Contrabass', '#2F4F4F', '#708090', '#000000', '#F5F5F5', '#FFFFFF', 'E1', to_jsonb(ARRAY['E1', 'A1', 'D2', 'G2'])),
-- 017: その他（016は存在しない）
('550e8400-e29b-41d4-a716-446655440017', 'その他', 'Other', '#4682B4', '#87CEEB', '#2F4F4F', '#F0F8FF', '#FFFFFF', 'C4', to_jsonb(ARRAY['C4'])),
-- 018: ヴィオラ
('550e8400-e29b-41d4-a716-446655440018', 'ヴィオラ', 'Viola', '#B22222', '#FF7F50', '#8B0000', '#FFF0F5', '#FFFFFF', 'C3', to_jsonb(ARRAY['C3', 'G3', 'D4', 'A4'])),
-- 019: 琴
('550e8400-e29b-41d4-a716-446655440019', '琴', 'Koto', '#8B4513', '#DEB887', '#654321', '#FFF8DC', '#FFFFFF', 'D3', to_jsonb(ARRAY['D3', 'E3', 'F3', 'G3', 'A3'])),
-- 020: シンセサイザー
('550e8400-e29b-41d4-a716-446655440020', 'シンセサイザー', 'Synthesizer', '#4169E1', '#87CEEB', '#1E90FF', '#F0F8FF', '#FFFFFF', 'C4', to_jsonb(ARRAY['C4', 'D4', 'E4', 'F4', 'G4'])),
-- 021: 太鼓
('550e8400-e29b-41d4-a716-446655440021', '太鼓', 'Taiko', '#DC143C', '#FF6347', '#8B0000', '#FFF0F5', '#FFFFFF', 'C4', to_jsonb(ARRAY['C4', 'D4', 'E4']))
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  name_en = EXCLUDED.name_en,
  color_primary = EXCLUDED.color_primary,
  color_secondary = EXCLUDED.color_secondary,
  color_accent = EXCLUDED.color_accent,
  color_background = EXCLUDED.color_background,
  color_surface = EXCLUDED.color_surface,
  starting_note = EXCLUDED.starting_note,
  tuning_notes = EXCLUDED.tuning_notes,
  updated_at = now();

-- インデックスの作成（存在しない場合のみ）
CREATE INDEX IF NOT EXISTS idx_instruments_id ON public.instruments(id);
CREATE INDEX IF NOT EXISTS idx_instruments_name_en ON public.instruments(name_en);

-- 権限の設定
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON TABLE public.instruments TO anon, authenticated;

-- PostgRESTのスキーマキャッシュをリロード
NOTIFY pgrst, 'reload schema';







