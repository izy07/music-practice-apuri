-- 楽器テーブルの作成
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

-- 楽器テーブルのRLSを有効化
ALTER TABLE instruments ENABLE ROW LEVEL SECURITY;

-- 楽器テーブルのRLSポリシーを作成
CREATE POLICY "Anyone can view instruments" ON instruments
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage instruments" ON instruments
  FOR ALL USING (auth.role() = 'service_role');

-- 楽器データの挿入（固定UUIDを使用）
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
('550e8400-e29b-41d4-a716-446655440014', 'ハープ', 'Harp', '#9C27B0', '#BA68C8', '#7B1FA2', 'C2', ARRAY['C2', 'D2', 'E2', 'F2', 'G2', 'A2', 'B2']),
('550e8400-e29b-41d4-a716-446655440015', 'コントラバス', 'Contrabass', '#607D8B', '#90A4AE', '#455A64', 'E1', ARRAY['E1', 'A1', 'D2', 'G2']),
('550e8400-e29b-41d4-a716-446655440017', 'その他', 'Other', '#9E9E9E', '#BDBDBD', '#757575', 'C4', ARRAY['C4']),
('550e8400-e29b-41d4-a716-446655440018', 'ヴィオラ', 'Viola', '#7A3D1F', '#A0522D', '#5C2E12', 'C3', ARRAY['C3', 'G3', 'D4', 'A4']),
('550e8400-e29b-41d4-a716-446655440019', '琴', 'Koto', '#8B4513', '#D2B48C', '#654321', 'D3', ARRAY['D3', 'E3', 'F3', 'G3', 'A3']),
('550e8400-e29b-41d4-a716-446655440020', 'シンセサイザー', 'Synthesizer', '#4169E1', '#87CEEB', '#1E90FF', 'C4', ARRAY['C4', 'D4', 'E4', 'F4', 'G4']),
('550e8400-e29b-41d4-a716-446655440021', '太鼓', 'Taiko', '#8B4513', '#D2691E', '#654321', 'C4', ARRAY['C4', 'D4', 'E4']);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_instruments_id ON instruments(id);
CREATE INDEX IF NOT EXISTS idx_instruments_name_en ON instruments(name_en);

-- 更新日時を自動更新するトリガー
CREATE TRIGGER update_instruments_updated_at
  BEFORE UPDATE ON instruments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
