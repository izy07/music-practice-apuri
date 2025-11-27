-- 追加の楽器を挿入（琴、シンセサイザー、太鼓）
INSERT INTO instruments (id, name, name_en, color_primary, color_secondary, color_accent, starting_note, tuning_notes) VALUES
('550e8400-e29b-41d4-a716-446655440019', '琴', 'Koto', '#8B4513', '#D2B48C', '#654321', 'D3', ARRAY['D3', 'E3', 'F3', 'G3', 'A3']),
('550e8400-e29b-41d4-a716-446655440020', 'シンセサイザー', 'Synthesizer', '#4169E1', '#87CEEB', '#1E90FF', 'C4', ARRAY['C4', 'D4', 'E4', 'F4', 'G4']),
('550e8400-e29b-41d4-a716-446655440021', '太鼓', 'Taiko', '#8B4513', '#D2691E', '#654321', 'C4', ARRAY['C4', 'D4', 'E4'])
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  name_en = EXCLUDED.name_en,
  color_primary = EXCLUDED.color_primary,
  color_secondary = EXCLUDED.color_secondary,
  color_accent = EXCLUDED.color_accent,
  starting_note = EXCLUDED.starting_note,
  tuning_notes = EXCLUDED.tuning_notes;

