-- 「その他」楽器のIDを追加（550e8400-e29b-41d4-a716-446655440016）
-- コード内で使用されているIDと一致させるため

INSERT INTO instruments (id, name, name_en, color_primary, color_secondary, color_accent, starting_note, tuning_notes) 
VALUES 
  ('550e8400-e29b-41d4-a716-446655440016', 'その他', 'Other', '#9E9E9E', '#BDBDBD', '#757575', 'C4', ARRAY['C4'])
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  name_en = EXCLUDED.name_en,
  color_primary = EXCLUDED.color_primary,
  color_secondary = EXCLUDED.color_secondary,
  color_accent = EXCLUDED.color_accent,
  starting_note = EXCLUDED.starting_note,
  tuning_notes = EXCLUDED.tuning_notes;

