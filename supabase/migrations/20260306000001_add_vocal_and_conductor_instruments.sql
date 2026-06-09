-- ボーカル・指揮者を楽器一覧に追加（通常楽器として扱い、チューナー等も表示する）
INSERT INTO public.instruments (
  id, name, name_en, color_primary, color_secondary, color_accent,
  color_background, color_surface, starting_note, tuning_notes
) VALUES
-- ボーカル（声楽）
('550e8400-e29b-41d4-a716-446655440023', 'ボーカル', 'Vocal', '#9C27B0', '#CE93D8', '#7B1FA2', '#F3E5F5', '#FFFFFF', 'C4', to_jsonb(ARRAY['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'])),
-- 指揮者
('550e8400-e29b-41d4-a716-446655440024', '指揮者', 'Conductor', '#37474F', '#78909C', '#263238', '#ECEFF1', '#FFFFFF', 'C4', to_jsonb(ARRAY['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4']))
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  name_en = EXCLUDED.name_en,
  color_primary = EXCLUDED.color_primary,
  color_secondary = EXCLUDED.color_secondary,
  color_accent = EXCLUDED.color_accent,
  color_background = EXCLUDED.color_background,
  color_surface = EXCLUDED.color_surface,
  starting_note = EXCLUDED.starting_note,
  tuning_notes = EXCLUDED.tuning_notes;
