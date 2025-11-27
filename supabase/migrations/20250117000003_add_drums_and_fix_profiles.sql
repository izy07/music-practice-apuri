-- drumsをUUID形式で追加
INSERT INTO instruments (id, name, name_en, color_primary, color_secondary, color_accent, starting_note, tuning_notes) VALUES
('550e8400-e29b-41d4-a716-446655440022', '打楽器', 'Drums', '#795548', '#A1887F', '#5D4037', 'C4', ARRAY['C4', 'D4', 'E4', 'F4', 'G4'])
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  name_en = EXCLUDED.name_en,
  color_primary = EXCLUDED.color_primary,
  color_secondary = EXCLUDED.color_secondary,
  color_accent = EXCLUDED.color_accent,
  starting_note = EXCLUDED.starting_note,
  tuning_notes = EXCLUDED.tuning_notes;

-- 'drums'を選択しているユーザーのプロフィールを修正
UPDATE user_profiles 
SET selected_instrument_id = '550e8400-e29b-41d4-a716-446655440022'
WHERE selected_instrument_id::text = 'drums';

