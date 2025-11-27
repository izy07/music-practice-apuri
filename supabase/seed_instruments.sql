-- 楽器テーブルのシードデータ
INSERT INTO instruments (id, name, name_en, color_primary, color_secondary, color_accent, starting_note, tuning_notes, created_at) VALUES
('piano', 'ピアノ', 'Piano', '#4CAF50', '#81C784', '#2E7D32', 'C4', ARRAY['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'], NOW()),
('guitar', 'ギター', 'Guitar', '#9C27B0', '#BA68C8', '#7B1FA2', 'E2', ARRAY['E2', 'A2', 'D3', 'G3', 'B3', 'E4'], NOW()),
('violin', 'バイオリン', 'Violin', '#2196F3', '#64B5F6', '#1976D2', 'G3', ARRAY['G3', 'D4', 'A4', 'E5'], NOW()),
('flute', 'フルート', 'Flute', '#00BCD4', '#4DD0E1', '#0097A7', 'C4', ARRAY['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'], NOW()),
('trumpet', 'トランペット', 'Trumpet', '#FF9800', '#FFB74D', '#F57C00', 'C4', ARRAY['C4', 'E4', 'G4'], NOW()),
('drums', '打楽器', 'Drums', '#795548', '#A1887F', '#5D4037', 'C4', ARRAY['C4', 'D4', 'E4', 'F4', 'G4'], NOW()),
('saxophone', 'サックス', 'Saxophone', '#607D8B', '#90A4AE', '#455A64', 'C4', ARRAY['C4', 'D4', 'E4', 'F4', 'G4'], NOW()),
('horn', 'ホルン', 'Horn', '#E91E63', '#F06292', '#C2185B', 'F3', ARRAY['F3', 'C4', 'F4'], NOW()),
('clarinet', 'クラリネット', 'Clarinet', '#3F51B5', '#7986CB', '#303F9F', 'E3', ARRAY['E3', 'F3', 'G3', 'A3', 'B3'], NOW()),
('trombone', 'トロンボーン', 'Trombone', '#FF5722', '#FF8A65', '#D84315', 'B1', ARRAY['B1', 'E2', 'B2', 'E3'], NOW()),
('cello', 'チェロ', 'Cello', '#8BC34A', '#AED581', '#689F38', 'C2', ARRAY['C2', 'G2', 'D3', 'A3'], NOW()),
('bassoon', 'ファゴット', 'Bassoon', '#795548', '#A1887F', '#5D4037', 'B1', ARRAY['B1', 'C2', 'D2', 'E2'], NOW()),
('oboe', 'オーボエ', 'Oboe', '#FFC107', '#FFD54F', '#FF8F00', 'C4', ARRAY['C4', 'D4', 'E4', 'F4'], NOW()),
('harp', 'ハープ', 'Harp', '#9C27B0', '#BA68C8', '#7B1FA2', 'C2', ARRAY['C2', 'D2', 'E2', 'F2', 'G2', 'A2', 'B2'], NOW()),
('contrabass', 'コントラバス', 'Contrabass', '#607D8B', '#90A4AE', '#455A64', 'E1', ARRAY['E1', 'A1', 'D2', 'G2'], NOW()),
('viola', 'ヴィオラ', 'Viola', '#7A3D1F', '#A0522D', '#5C2E12', 'C3', ARRAY['C3', 'G3', 'D4', 'A4'], NOW()),
('koto', '琴', 'Koto', '#8B4513', '#D2B48C', '#654321', 'D3', ARRAY['D3', 'E3', 'F3', 'G3', 'A3'], NOW()),
('synthesizer', 'シンセサイザー', 'Synthesizer', '#4169E1', '#87CEEB', '#1E90FF', 'C4', ARRAY['C4', 'D4', 'E4', 'F4', 'G4'], NOW()),
('taiko', '太鼓', 'Taiko', '#8B4513', '#D2691E', '#654321', 'C4', ARRAY['C4', 'D4', 'E4'], NOW()),
('other', 'その他', 'Other', '#9E9E9E', '#BDBDBD', '#757575', 'C4', ARRAY['C4'], NOW());

-- 既存のデータがある場合は更新
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  name_en = EXCLUDED.name_en,
  color_primary = EXCLUDED.color_primary,
  color_secondary = EXCLUDED.color_secondary,
  color_accent = EXCLUDED.color_accent,
  starting_note = EXCLUDED.starting_note,
  tuning_notes = EXCLUDED.tuning_notes,
  created_at = EXCLUDED.created_at;


