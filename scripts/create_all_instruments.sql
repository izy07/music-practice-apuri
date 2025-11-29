-- ============================================
-- すべての楽器を確実に作成するSQLスクリプト
-- ============================================
-- SupabaseダッシュボードのSQL Editorで実行してください
-- 実行日: 2025-11-28
-- ============================================

-- instrumentsテーブルの作成（存在しない場合のみ）
CREATE TABLE IF NOT EXISTS public.instruments (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  name_en text NOT NULL,
  color_primary text NOT NULL,
  color_secondary text NOT NULL,
  color_accent text NOT NULL,
  starting_note text,
  tuning_notes text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- すべての楽器データを投入（ON CONFLICTで重複を回避）
INSERT INTO public.instruments (
  id,
  name,
  name_en,
  color_primary,
  color_secondary,
  color_accent,
  starting_note,
  tuning_notes
) VALUES
-- ピアノ
('550e8400-e29b-41d4-a716-446655440001', 'ピアノ', 'Piano', '#1A1A1A', '#FFFFFF', '#D4AF37', 'C4', ARRAY['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4']),
-- ギター
('550e8400-e29b-41d4-a716-446655440002', 'ギター', 'Guitar', '#654321', '#DEB887', '#8B4513', 'E2', ARRAY['E2', 'A2', 'D3', 'G3', 'B3', 'E4']),
-- バイオリン
('550e8400-e29b-41d4-a716-446655440003', 'バイオリン', 'Violin', '#A0522D', '#CD853F', '#8B4513', 'G3', ARRAY['G3', 'D4', 'A4', 'E5']),
-- フルート
('550e8400-e29b-41d4-a716-446655440004', 'フルート', 'Flute', '#C0C0C0', '#E6E6FA', '#A9A9A9', 'C4', ARRAY['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4']),
-- トランペット
('550e8400-e29b-41d4-a716-446655440005', 'トランペット', 'Trumpet', '#B8860B', '#DAA520', '#8B4513', 'C4', ARRAY['C4', 'E4', 'G4']),
-- 打楽器
('550e8400-e29b-41d4-a716-446655440006', '打楽器', 'Drums', '#000000', '#696969', '#000000', 'C4', ARRAY['C4', 'D4', 'E4', 'F4', 'G4']),
-- サックス
('550e8400-e29b-41d4-a716-446655440007', 'サックス', 'Saxophone', '#4B0082', '#9370DB', '#2E0854', 'C4', ARRAY['C4', 'D4', 'E4', 'F4', 'G4']),
-- ホルン
('550e8400-e29b-41d4-a716-446655440008', 'ホルン', 'Horn', '#8B4513', '#F4A460', '#654321', 'F3', ARRAY['F3', 'C4', 'F4']),
-- クラリネット
('550e8400-e29b-41d4-a716-446655440009', 'クラリネット', 'Clarinet', '#000000', '#2F2F2F', '#1A1A1A', 'E3', ARRAY['E3', 'F3', 'G3', 'A3', 'B3']),
-- トロンボーン
('550e8400-e29b-41d4-a716-446655440010', 'トロンボーン', 'Trombone', '#C0C0C0', '#E6E6FA', '#A9A9A9', 'B1', ARRAY['B1', 'E2', 'B2', 'E3']),
-- チェロ
('550e8400-e29b-41d4-a716-446655440011', 'チェロ', 'Cello', '#DC143C', '#FF69B4', '#8B0000', 'C2', ARRAY['C2', 'G2', 'D3', 'A3']),
-- ファゴット
('550e8400-e29b-41d4-a716-446655440012', 'ファゴット', 'Bassoon', '#A0522D', '#DEB887', '#8B4513', 'B1', ARRAY['B1', 'C2', 'D2', 'E2']),
-- オーボエ
('550e8400-e29b-41d4-a716-446655440013', 'オーボエ', 'Oboe', '#DAA520', '#F0E68C', '#B8860B', 'C4', ARRAY['C4', 'D4', 'E4', 'F4']),
-- コントラバス
('550e8400-e29b-41d4-a716-446655440015', 'コントラバス', 'Contrabass', '#2F4F4F', '#708090', '#000000', 'E1', ARRAY['E1', 'A1', 'D2', 'G2']),
-- ヴィオラ
('550e8400-e29b-41d4-a716-446655440018', 'ヴィオラ', 'Viola', '#7A3D1F', '#A0522D', '#5C2E12', 'C3', ARRAY['C3', 'G3', 'D4', 'A4'])
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  name_en = EXCLUDED.name_en,
  color_primary = EXCLUDED.color_primary,
  color_secondary = EXCLUDED.color_secondary,
  color_accent = EXCLUDED.color_accent,
  starting_note = EXCLUDED.starting_note,
  tuning_notes = EXCLUDED.tuning_notes,
  updated_at = now();

-- インデックスの作成（存在しない場合のみ）
CREATE INDEX IF NOT EXISTS idx_instruments_id ON public.instruments(id);
CREATE INDEX IF NOT EXISTS idx_instruments_name_en ON public.instruments(name_en);

-- RLSポリシーの設定（全ユーザーが読み取り可能）
ALTER TABLE public.instruments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS instruments_select_all ON public.instruments;
CREATE POLICY instruments_select_all ON public.instruments FOR SELECT USING (true);

-- 権限の設定
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON TABLE public.instruments TO anon, authenticated;

-- 確認クエリ
SELECT id, name, name_en, color_primary FROM public.instruments ORDER BY name;

