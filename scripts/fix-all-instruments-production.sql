-- ============================================
-- 本番データベース修正スクリプト（全楽器ID対応版）
-- 実行日: 2025-11-27
-- ============================================
-- ⚠️ 重要: このスクリプトをSupabase DashboardのSQL Editorで実行してください
-- ============================================

-- 1. instrumentsテーブルの作成（存在しない場合）
CREATE TABLE IF NOT EXISTS instruments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_en TEXT NOT NULL,
  color_primary TEXT NOT NULL,
  color_secondary TEXT NOT NULL,
  color_accent TEXT NOT NULL,
  starting_note TEXT,
  tuning_notes TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. すべての楽器データを投入（ON CONFLICTで重複を回避）
-- アプリケーションで使用されているすべての楽器IDを含む
INSERT INTO instruments (id, name, name_en, color_primary, color_secondary, color_accent, starting_note, tuning_notes) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'ピアノ', 'Piano', '#4CAF50', '#81C784', '#2E7D32', 'C4', ARRAY['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4']),
('550e8400-e29b-41d4-a716-446655440002', 'ギター', 'Guitar', '#9C27B0', '#BA68C8', '#7B1FA2', 'E2', ARRAY['E2', 'A2', 'D3', 'G3', 'B3', 'E4']),
('550e8400-e29b-41d4-a716-446655440003', 'バイオリン', 'Violin', '#A0522D', '#CD853F', '#8B4513', 'G3', ARRAY['G3', 'D4', 'A4', 'E5']),
('550e8400-e29b-41d4-a716-446655440004', 'フルート', 'Flute', '#2ECC71', '#82E0AA', '#27AE60', 'C4', ARRAY['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4']),
('550e8400-e29b-41d4-a716-446655440005', 'トランペット', 'Trumpet', '#FF9800', '#FFB74D', '#F57C00', 'C4', ARRAY['C4', 'E4', 'G4']),
('550e8400-e29b-41d4-a716-446655440006', '打楽器', 'Drums', '#795548', '#A1887F', '#5D4037', 'C4', ARRAY['C4', 'D4', 'E4', 'F4', 'G4']),
('550e8400-e29b-41d4-a716-446655440007', 'サックス', 'Saxophone', '#607D8B', '#90A4AE', '#455A64', 'C4', ARRAY['C4', 'D4', 'E4', 'F4', 'G4']),
('550e8400-e29b-41d4-a716-446655440008', 'ホルン', 'Horn', '#DAA520', '#F4E6B2', '#B8860B', 'F3', ARRAY['F3', 'C4', 'F4']),
('550e8400-e29b-41d4-a716-446655440009', 'クラリネット', 'Clarinet', '#3F51B5', '#7986CB', '#303F9F', 'E3', ARRAY['E3', 'F3', 'G3', 'A3', 'B3']),
('550e8400-e29b-41d4-a716-446655440010', 'トロンボーン', 'Trombone', '#FF5722', '#FF8A65', '#D84315', 'B1', ARRAY['B1', 'E2', 'B2', 'E3']),
('550e8400-e29b-41d4-a716-446655440011', 'チェロ', 'Cello', '#8BC34A', '#AED581', '#689F38', 'C2', ARRAY['C2', 'G2', 'D3', 'A3']),
('550e8400-e29b-41d4-a716-446655440012', 'ファゴット', 'Bassoon', '#795548', '#A1887F', '#5D4037', 'B1', ARRAY['B1', 'C2', 'D2', 'E2']),
('550e8400-e29b-41d4-a716-446655440013', 'オーボエ', 'Oboe', '#FFC107', '#FFD54F', '#FF8F00', 'C4', ARRAY['C4', 'D4', 'E4', 'F4']),
('550e8400-e29b-41d4-a716-446655440015', 'コントラバス', 'Contrabass', '#607D8B', '#90A4AE', '#455A64', 'E1', ARRAY['E1', 'A1', 'D2', 'G2']),
('550e8400-e29b-41d4-a716-446655440016', 'その他', 'Other', '#9E9E9E', '#BDBDBD', '#757575', 'C4', ARRAY['C4']),
('550e8400-e29b-41d4-a716-446655440018', 'ヴィオラ', 'Viola', '#7A3D1F', '#A0522D', '#5C2E12', 'C3', ARRAY['C3', 'G3', 'D4', 'A4'])
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  name_en = EXCLUDED.name_en,
  color_primary = EXCLUDED.color_primary,
  color_secondary = EXCLUDED.color_secondary,
  color_accent = EXCLUDED.color_accent,
  starting_note = EXCLUDED.starting_note,
  tuning_notes = EXCLUDED.tuning_notes,
  updated_at = NOW();

-- 3. 無効なinstrument_idをNULLに設定（外部キー制約違反を防ぐ）
UPDATE user_profiles
SET selected_instrument_id = NULL
WHERE selected_instrument_id IS NOT NULL
  AND selected_instrument_id NOT IN (SELECT id FROM instruments);

-- 4. 外部キー制約の確認と修正
DO $$
BEGIN
  -- 既存の制約を削除（存在する場合）
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_profiles_selected_instrument_id_fkey'
  ) THEN
    ALTER TABLE user_profiles
    DROP CONSTRAINT user_profiles_selected_instrument_id_fkey;
  END IF;
  
  -- 新しい制約を追加（ON DELETE SET NULLで安全に削除可能）
  ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_selected_instrument_id_fkey
  FOREIGN KEY (selected_instrument_id)
  REFERENCES instruments(id)
  ON DELETE SET NULL;
END $$;

-- 5. 確認用のクエリ
SELECT 
  COUNT(*) as total_instruments,
  COUNT(CASE WHEN id IN (
    '550e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440004',
    '550e8400-e29b-41d4-a716-446655440005',
    '550e8400-e29b-41d4-a716-446655440006',
    '550e8400-e29b-41d4-a716-446655440007',
    '550e8400-e29b-41d4-a716-446655440008',
    '550e8400-e29b-41d4-a716-446655440009',
    '550e8400-e29b-41d4-a716-446655440010',
    '550e8400-e29b-41d4-a716-446655440011',
    '550e8400-e29b-41d4-a716-446655440012',
    '550e8400-e29b-41d4-a716-446655440013',
    '550e8400-e29b-41d4-a716-446655440015',
    '550e8400-e29b-41d4-a716-446655440016',
    '550e8400-e29b-41d4-a716-446655440018'
  ) THEN 1 END) as required_instruments_found
FROM instruments;


