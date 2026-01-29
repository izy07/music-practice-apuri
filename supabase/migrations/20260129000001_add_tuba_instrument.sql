-- チューバを楽器一覧に追加（基礎練メニュー完成に伴い楽器選択画面に表示するため）
INSERT INTO public.instruments (
  id, name, name_en, color_primary, color_secondary, color_accent,
  color_background, color_surface, starting_note, tuning_notes
) VALUES
('550e8400-e29b-41d4-a716-446655440022', 'チューバ', 'Tuba', '#8B4513', '#D2691E', '#654321', '#FFF8DC', '#FFFFFF', 'E1', to_jsonb(ARRAY['E1', 'A1', 'D2', 'F2']))
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
