-- ============================================
-- instrumentsテーブルをrepresentative_songsより前に確実に作成
-- ============================================
-- このマイグレーションは、representative_songsテーブルを作成する前に
-- instrumentsテーブルが存在することを保証します
-- ============================================

-- 1. instrumentsテーブルの作成（存在しない場合のみ）
CREATE TABLE IF NOT EXISTS public.instruments (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT NOT NULL,
  color_primary TEXT NOT NULL DEFAULT '#8B4513',
  color_secondary TEXT NOT NULL DEFAULT '#F8F9FA',
  color_accent TEXT NOT NULL DEFAULT '#8B4513',
  starting_note TEXT,
  tuning_notes JSONB,
  color_background TEXT,
  color_surface TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. instrumentsテーブルのRLSを有効化
ALTER TABLE public.instruments ENABLE ROW LEVEL SECURITY;

-- 3. instrumentsテーブルのRLSポリシーを作成（存在しない場合のみ）
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
END $$;

-- 4. 権限を付与
GRANT SELECT ON TABLE public.instruments TO anon, authenticated;

-- 5. 基本的な楽器データを挿入（存在しない場合のみ）
-- ピアノ
INSERT INTO public.instruments (
  id, name, name_en, color_primary, color_secondary, color_accent, starting_note, tuning_notes
) VALUES (
  '550e8400-e29b-41d4-a716-446655440001',
  'ピアノ',
  'Piano',
  '#1A1A1A',
  '#C0C0C0',
  '#D4AF37',
  'C4',
  to_jsonb(ARRAY['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'])
) ON CONFLICT (id) DO NOTHING;

-- ギター
INSERT INTO public.instruments (
  id, name, name_en, color_primary, color_secondary, color_accent, starting_note, tuning_notes
) VALUES (
  '550e8400-e29b-41d4-a716-446655440002',
  'ギター',
  'Guitar',
  '#654321',
  '#DEB887',
  '#8B4513',
  'E2',
  to_jsonb(ARRAY['E2', 'A2', 'D3', 'G3', 'B3', 'E4'])
) ON CONFLICT (id) DO NOTHING;

-- バイオリン
INSERT INTO public.instruments (
  id, name, name_en, color_primary, color_secondary, color_accent, starting_note, tuning_notes
) VALUES (
  '550e8400-e29b-41d4-a716-446655440003',
  'バイオリン',
  'Violin',
  '#6B4423',
  '#C9A961',
  '#D4AF37',
  'G3',
  to_jsonb(ARRAY['G3', 'D4', 'A4', 'E5'])
) ON CONFLICT (id) DO NOTHING;

-- フルート
INSERT INTO public.instruments (
  id, name, name_en, color_primary, color_secondary, color_accent, starting_note, tuning_notes
) VALUES (
  '550e8400-e29b-41d4-a716-446655440004',
  'フルート',
  'Flute',
  '#C0C0C0',
  '#E6E6FA',
  '#A9A9A9',
  'C4',
  to_jsonb(ARRAY['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'])
) ON CONFLICT (id) DO NOTHING;

-- トランペット
INSERT INTO public.instruments (
  id, name, name_en, color_primary, color_secondary, color_accent, starting_note, tuning_notes
) VALUES (
  '550e8400-e29b-41d4-a716-446655440005',
  'トランペット',
  'Trumpet',
  '#B8860B',
  '#DAA520',
  '#8B4513',
  'C4',
  to_jsonb(ARRAY['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'])
) ON CONFLICT (id) DO NOTHING;

-- ドラム
INSERT INTO public.instruments (
  id, name, name_en, color_primary, color_secondary, color_accent, starting_note, tuning_notes
) VALUES (
  '550e8400-e29b-41d4-a716-446655440006',
  'ドラム',
  'Drums',
  '#000000',
  '#696969',
  '#000000',
  NULL,
  NULL
) ON CONFLICT (id) DO NOTHING;

-- サックス
INSERT INTO public.instruments (
  id, name, name_en, color_primary, color_secondary, color_accent, starting_note, tuning_notes
) VALUES (
  '550e8400-e29b-41d4-a716-446655440007',
  'サックス',
  'Saxophone',
  '#FFD700',
  '#FFEB3B',
  '#FFC107',
  'Bb3',
  to_jsonb(ARRAY['Bb3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'Bb4'])
) ON CONFLICT (id) DO NOTHING;

