-- ヴィオラ楽器を追加
INSERT INTO instruments (id, name, name_en, color_primary, color_secondary, color_accent, starting_note, tuning_notes) VALUES
('550e8400-e29b-41d4-a716-446655440018', 'ヴィオラ', 'Viola', '#7A3D1F', '#A0522D', '#5C2E12', 'C3', ARRAY['C3', 'G3', 'D4', 'A4'])
ON CONFLICT (id) DO NOTHING;
