-- ============================================
-- 楽器テーブルの統合マイグレーション（最終版）
-- ============================================
-- このマイグレーションは、すべての楽器データを統合し、
-- デフォルト背景色の概念を削除し、全ての楽器に色を設定します
-- ============================================

-- 1. instrumentsテーブルの作成（存在しない場合のみ）
CREATE TABLE IF NOT EXISTS public.instruments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_en TEXT NOT NULL,
  color_primary TEXT NOT NULL,
  color_secondary TEXT NOT NULL,
  color_accent TEXT NOT NULL,
  color_background TEXT NOT NULL,
  color_surface TEXT NOT NULL DEFAULT '#FFFFFF',
  starting_note TEXT,
  tuning_notes JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. カラムの追加（既存テーブルにカラムがない場合）
DO $$
BEGIN
  -- color_backgroundカラムの追加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'instruments' 
    AND column_name = 'color_background'
  ) THEN
    ALTER TABLE public.instruments ADD COLUMN color_background TEXT NOT NULL DEFAULT '#FFFFFF';
  END IF;
  
  -- color_surfaceカラムの追加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'instruments' 
    AND column_name = 'color_surface'
  ) THEN
    ALTER TABLE public.instruments ADD COLUMN color_surface TEXT NOT NULL DEFAULT '#FFFFFF';
  END IF;
  
  -- tuning_notesがTEXT[]の場合はJSONBに変換
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'instruments' 
    AND column_name = 'tuning_notes'
    AND data_type = 'ARRAY'
  ) THEN
    -- 配列をJSONBに変換（既存データを保持）
    ALTER TABLE public.instruments 
    ALTER COLUMN tuning_notes TYPE JSONB USING to_jsonb(tuning_notes);
  END IF;
END $$;

-- 3. RLSの有効化
ALTER TABLE public.instruments ENABLE ROW LEVEL SECURITY;

-- 4. RLSポリシーの作成（既存のポリシーを削除してから作成）
DROP POLICY IF EXISTS "Anyone can view instruments" ON public.instruments;
DROP POLICY IF EXISTS "Anyone can read instruments" ON public.instruments;
DROP POLICY IF EXISTS "instruments_select_all" ON public.instruments;
DROP POLICY IF EXISTS "Service role can manage instruments" ON public.instruments;
DROP POLICY IF EXISTS "Authenticated users can read instruments" ON public.instruments;

CREATE POLICY "Anyone can view instruments" ON public.instruments
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage instruments" ON public.instruments
  FOR ALL USING (auth.role() = 'service_role');

-- 5. 権限を付与
GRANT SELECT ON TABLE public.instruments TO anon, authenticated;

-- 6. 全ての楽器データを統合して投入（ON CONFLICTで重複を回避）
-- デフォルト背景色の概念を無くし、全ての楽器に色を設定
INSERT INTO public.instruments (
  id, name, name_en, color_primary, color_secondary, color_accent, 
  color_background, color_surface, starting_note, tuning_notes
) VALUES
-- ピアノ
('550e8400-e29b-41d4-a716-446655440001', 'ピアノ', 'Piano', '#1A1A1A', '#C0C0C0', '#D4AF37', '#F8F6F0', '#FFFFFF', 'C4', to_jsonb(ARRAY['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'])),
-- ギター
('550e8400-e29b-41d4-a716-446655440002', 'ギター', 'Guitar', '#654321', '#DEB887', '#8B4513', '#FFF8DC', '#FFFFFF', 'E2', to_jsonb(ARRAY['E2', 'A2', 'D3', 'G3', 'B3', 'E4'])),
-- バイオリン
('550e8400-e29b-41d4-a716-446655440003', 'バイオリン', 'Violin', '#6B4423', '#C9A961', '#D4AF37', '#FFF8F0', '#FFFFFF', 'G3', to_jsonb(ARRAY['G3', 'D4', 'A4', 'E5'])),
-- フルート
('550e8400-e29b-41d4-a716-446655440004', 'フルート', 'Flute', '#C0C0C0', '#E6E6FA', '#A9A9A9', '#F0F8FF', '#FFFFFF', 'C4', to_jsonb(ARRAY['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'])),
-- トランペット
('550e8400-e29b-41d4-a716-446655440005', 'トランペット', 'Trumpet', '#B8860B', '#DAA520', '#8B4513', '#FFE4B5', '#FFFFFF', 'C4', to_jsonb(ARRAY['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'])),
-- ドラム
('550e8400-e29b-41d4-a716-446655440006', 'ドラム', 'Drums', '#000000', '#696969', '#000000', '#F5F5DC', '#FFFFFF', NULL, NULL),
-- サックス
('550e8400-e29b-41d4-a716-446655440007', 'サックス', 'Saxophone', '#FFD700', '#FFEB3B', '#FFC107', '#FFFDE7', '#FFFFFF', 'Bb3', to_jsonb(ARRAY['Bb3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'Bb4'])),
-- ホルン
('550e8400-e29b-41d4-a716-446655440008', 'ホルン', 'Horn', '#8B4513', '#F4A460', '#654321', '#FFF8DC', '#FFFFFF', 'F3', to_jsonb(ARRAY['F3', 'C4', 'F4'])),
-- クラリネット
('550e8400-e29b-41d4-a716-446655440009', 'クラリネット', 'Clarinet', '#000000', '#2F2F2F', '#1A1A1A', '#E6E6FA', '#FFFFFF', 'E3', to_jsonb(ARRAY['E3', 'F3', 'G3', 'A3', 'B3'])),
-- トロンボーン
('550e8400-e29b-41d4-a716-446655440010', 'トロンボーン', 'Trombone', '#C0C0C0', '#E6E6FA', '#A9A9A9', '#F0F8FF', '#FFFFFF', 'B1', to_jsonb(ARRAY['B1', 'E2', 'B2', 'E3'])),
-- チェロ
('550e8400-e29b-41d4-a716-446655440011', 'チェロ', 'Cello', '#DC143C', '#FF69B4', '#8B0000', '#FFE4E1', '#FFFFFF', 'C2', to_jsonb(ARRAY['C2', 'G2', 'D3', 'A3'])),
-- ファゴット
('550e8400-e29b-41d4-a716-446655440012', 'ファゴット', 'Bassoon', '#A0522D', '#DEB887', '#8B4513', '#FFF8DC', '#FFFFFF', 'B1', to_jsonb(ARRAY['B1', 'C2', 'D2', 'E2'])),
-- オーボエ
('550e8400-e29b-41d4-a716-446655440013', 'オーボエ', 'Oboe', '#DAA520', '#F0E68C', '#B8860B', '#FFFACD', '#FFFFFF', 'C4', to_jsonb(ARRAY['C4', 'D4', 'E4', 'F4'])),
-- ハープ
('550e8400-e29b-41d4-a716-446655440014', 'ハープ', 'Harp', '#FF69B4', '#FFB6C1', '#C71585', '#FFF0F5', '#FFFFFF', 'C2', to_jsonb(ARRAY['C2', 'D2', 'E2', 'F2', 'G2', 'A2', 'B2'])),
-- コントラバス
('550e8400-e29b-41d4-a716-446655440015', 'コントラバス', 'Contrabass', '#2F4F4F', '#708090', '#000000', '#F5F5F5', '#FFFFFF', 'E1', to_jsonb(ARRAY['E1', 'A1', 'D2', 'G2'])),
-- その他
('550e8400-e29b-41d4-a716-446655440017', 'その他', 'Other', '#4682B4', '#87CEEB', '#2F4F4F', '#E0F6FF', '#FFFFFF', 'C4', to_jsonb(ARRAY['C4'])),
-- ヴィオラ
('550e8400-e29b-41d4-a716-446655440018', 'ヴィオラ', 'Viola', '#B22222', '#FF7F50', '#8B0000', '#FFE4E1', '#FFFFFF', 'C3', to_jsonb(ARRAY['C3', 'G3', 'D4', 'A4'])),
-- 琴
('550e8400-e29b-41d4-a716-446655440019', '琴', 'Koto', '#8B4513', '#DEB887', '#654321', '#FFF8DC', '#FFFFFF', 'D3', to_jsonb(ARRAY['D3', 'E3', 'F3', 'G3', 'A3'])),
-- シンセサイザー
('550e8400-e29b-41d4-a716-446655440020', 'シンセサイザー', 'Synthesizer', '#4169E1', '#87CEEB', '#1E90FF', '#E0F6FF', '#FFFFFF', 'C4', to_jsonb(ARRAY['C4', 'D4', 'E4', 'F4', 'G4'])),
-- 太鼓
('550e8400-e29b-41d4-a716-446655440021', '太鼓', 'Taiko', '#DC143C', '#FF6347', '#8B0000', '#FFE4E1', '#FFFFFF', 'C4', to_jsonb(ARRAY['C4', 'D4', 'E4']))
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
  updated_at = NOW();

-- 7. デフォルト背景色の概念を削除（NULLやデフォルト値の背景色を設定済みの値に更新）
UPDATE public.instruments 
SET 
  color_background = CASE 
    WHEN id = '550e8400-e29b-41d4-a716-446655440001' THEN '#F8F6F0'  -- ピアノ
    WHEN id = '550e8400-e29b-41d4-a716-446655440002' THEN '#FFF8DC'  -- ギター
    WHEN id = '550e8400-e29b-41d4-a716-446655440003' THEN '#FFF8F0'  -- バイオリン
    WHEN id = '550e8400-e29b-41d4-a716-446655440004' THEN '#F0F8FF'  -- フルート
    WHEN id = '550e8400-e29b-41d4-a716-446655440005' THEN '#FFE4B5'  -- トランペット
    WHEN id = '550e8400-e29b-41d4-a716-446655440006' THEN '#F5F5DC'  -- ドラム
    WHEN id = '550e8400-e29b-41d4-a716-446655440007' THEN '#FFFDE7'  -- サックス
    WHEN id = '550e8400-e29b-41d4-a716-446655440008' THEN '#FFF8DC'  -- ホルン
    WHEN id = '550e8400-e29b-41d4-a716-446655440009' THEN '#E6E6FA'  -- クラリネット
    WHEN id = '550e8400-e29b-41d4-a716-446655440010' THEN '#F0F8FF'  -- トロンボーン
    WHEN id = '550e8400-e29b-41d4-a716-446655440011' THEN '#FFE4E1'  -- チェロ
    WHEN id = '550e8400-e29b-41d4-a716-446655440012' THEN '#FFF8DC'  -- ファゴット
    WHEN id = '550e8400-e29b-41d4-a716-446655440013' THEN '#FFFACD'  -- オーボエ
    WHEN id = '550e8400-e29b-41d4-a716-446655440014' THEN '#FFF0F5'  -- ハープ
    WHEN id = '550e8400-e29b-41d4-a716-446655440015' THEN '#F5F5F5'  -- コントラバス
    WHEN id = '550e8400-e29b-41d4-a716-446655440017' THEN '#E0F6FF'  -- その他
    WHEN id = '550e8400-e29b-41d4-a716-446655440018' THEN '#FFE4E1'  -- ヴィオラ
    WHEN id = '550e8400-e29b-41d4-a716-446655440019' THEN '#FFF8DC'  -- 琴
    WHEN id = '550e8400-e29b-41d4-a716-446655440020' THEN '#E0F6FF'  -- シンセサイザー
    WHEN id = '550e8400-e29b-41d4-a716-446655440021' THEN '#FFE4E1'  -- 太鼓
    ELSE color_background
  END,
  color_surface = '#FFFFFF'
WHERE color_background IS NULL OR color_background = '#F7FAFC' OR color_background = '#FEFEFE';

-- 8. インデックスの作成
CREATE INDEX IF NOT EXISTS idx_instruments_id ON public.instruments(id);
CREATE INDEX IF NOT EXISTS idx_instruments_name_en ON public.instruments(name_en);

-- 9. 更新日時を自動更新するトリガー関数を作成（存在しない場合のみ）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. 更新日時を自動更新するトリガー（既存のトリガーを削除してから作成）
DROP TRIGGER IF EXISTS update_instruments_updated_at ON public.instruments;
CREATE TRIGGER update_instruments_updated_at
  BEFORE UPDATE ON public.instruments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 11. マイグレーション完了メッセージ
DO $$
BEGIN
  RAISE NOTICE '楽器テーブルの統合マイグレーションが完了しました。全ての楽器に色が設定され、デフォルト背景色の概念が削除されました。';
END $$;

