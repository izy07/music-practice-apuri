-- ============================================
-- 全ての楽器を確実にデータベースに登録するマイグレーション
-- ============================================
-- アプリケーションのdefaultInstrumentsに定義されている
-- 全ての楽器をデータベースに登録します
-- 実行日: 2025-12-02
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

-- 全ての楽器データを投入（ON CONFLICTで重複を回避し、既存データを更新）
-- defaultInstrumentsに定義されている全21個の楽器を含む
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
-- 001: ピアノ
('550e8400-e29b-41d4-a716-446655440001', 'ピアノ', 'Piano', '#1A1A1A', '#FFFFFF', '#D4AF37', 'C4', ARRAY['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4']),
-- 002: ギター
('550e8400-e29b-41d4-a716-446655440002', 'ギター', 'Guitar', '#654321', '#DEB887', '#8B4513', 'E2', ARRAY['E2', 'A2', 'D3', 'G3', 'B3', 'E4']),
-- 003: バイオリン
('550e8400-e29b-41d4-a716-446655440003', 'バイオリン', 'Violin', '#6B4423', '#C9A961', '#D4AF37', 'G3', ARRAY['G3', 'D4', 'A4', 'E5']),
-- 004: フルート
('550e8400-e29b-41d4-a716-446655440004', 'フルート', 'Flute', '#C0C0C0', '#E6E6FA', '#A9A9A9', 'C4', ARRAY['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4']),
-- 005: トランペット
('550e8400-e29b-41d4-a716-446655440005', 'トランペット', 'Trumpet', '#B8860B', '#DAA520', '#8B4513', 'C4', ARRAY['C4', 'E4', 'G4']),
-- 006: 打楽器
('550e8400-e29b-41d4-a716-446655440006', '打楽器', 'Drums', '#000000', '#696969', '#000000', 'C4', ARRAY['C4', 'D4', 'E4', 'F4', 'G4']),
-- 007: サックス
('550e8400-e29b-41d4-a716-446655440007', 'サックス', 'Saxophone', '#4B0082', '#9370DB', '#2E0854', 'C4', ARRAY['C4', 'D4', 'E4', 'F4', 'G4']),
-- 008: ホルン
('550e8400-e29b-41d4-a716-446655440008', 'ホルン', 'Horn', '#8B4513', '#F4A460', '#654321', 'F3', ARRAY['F3', 'C4', 'F4']),
-- 009: クラリネット
('550e8400-e29b-41d4-a716-446655440009', 'クラリネット', 'Clarinet', '#000000', '#2F2F2F', '#1A1A1A', 'E3', ARRAY['E3', 'F3', 'G3', 'A3', 'B3']),
-- 010: トロンボーン
('550e8400-e29b-41d4-a716-446655440010', 'トロンボーン', 'Trombone', '#C0C0C0', '#E6E6FA', '#A9A9A9', 'B1', ARRAY['B1', 'E2', 'B2', 'E3']),
-- 011: チェロ
('550e8400-e29b-41d4-a716-446655440011', 'チェロ', 'Cello', '#DC143C', '#FF69B4', '#8B0000', 'C2', ARRAY['C2', 'G2', 'D3', 'A3']),
-- 012: ファゴット
('550e8400-e29b-41d4-a716-446655440012', 'ファゴット', 'Bassoon', '#A0522D', '#DEB887', '#8B4513', 'B1', ARRAY['B1', 'C2', 'D2', 'E2']),
-- 013: オーボエ
('550e8400-e29b-41d4-a716-446655440013', 'オーボエ', 'Oboe', '#DAA520', '#F0E68C', '#B8860B', 'C4', ARRAY['C4', 'D4', 'E4', 'F4']),
-- 014: ハープ
('550e8400-e29b-41d4-a716-446655440014', 'ハープ', 'Harp', '#FF69B4', '#FFB6C1', '#C71585', 'C2', ARRAY['C2', 'D2', 'E2', 'F2', 'G2', 'A2', 'B2']),
-- 015: コントラバス
('550e8400-e29b-41d4-a716-446655440015', 'コントラバス', 'Contrabass', '#2F4F4F', '#708090', '#000000', 'E1', ARRAY['E1', 'A1', 'D2', 'G2']),
-- 017: その他（016は存在しない）
('550e8400-e29b-41d4-a716-446655440017', 'その他', 'Other', '#4682B4', '#87CEEB', '#2F4F4F', 'C4', ARRAY['C4']),
-- 018: ヴィオラ
('550e8400-e29b-41d4-a716-446655440018', 'ヴィオラ', 'Viola', '#B22222', '#FF7F50', '#8B0000', 'C3', ARRAY['C3', 'G3', 'D4', 'A4']),
-- 019: 琴
('550e8400-e29b-41d4-a716-446655440019', '琴', 'Koto', '#8B4513', '#DEB887', '#654321', 'D3', ARRAY['D3', 'E3', 'F3', 'G3', 'A3']),
-- 020: シンセサイザー
('550e8400-e29b-41d4-a716-446655440020', 'シンセサイザー', 'Synthesizer', '#4169E1', '#87CEEB', '#1E90FF', 'C4', ARRAY['C4', 'D4', 'E4', 'F4', 'G4']),
-- 021: 太鼓
('550e8400-e29b-41d4-a716-446655440021', '太鼓', 'Taiko', '#DC143C', '#FF6347', '#8B0000', 'C4', ARRAY['C4', 'D4', 'E4'])
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

-- 権限の設定
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON TABLE public.instruments TO anon, authenticated;

-- 確認: 登録された楽器の数を確認
-- SELECT COUNT(*) as total_instruments FROM public.instruments;
-- SELECT id, name, name_en FROM public.instruments ORDER BY name;




