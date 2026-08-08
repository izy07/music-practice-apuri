-- カノニカル楽器行の再保証（琴・シンセ・太鼓・チューバ）
-- 重複統合時にカノニカル UUID 行が未投入だと楽器自体が消えるため、不足分を補填する
INSERT INTO public.instruments (
  id, name, name_en, color_primary, color_secondary, color_accent,
  color_background, color_surface, starting_note, tuning_notes
) VALUES
  ('550e8400-e29b-41d4-a716-446655440019', '琴', 'Koto', '#8B4513', '#DEB887', '#654321', '#FFF8DC', '#FFFFFF', 'D3', to_jsonb(ARRAY['D3', 'E3', 'F3', 'G3', 'A3'])),
  ('550e8400-e29b-41d4-a716-446655440020', 'シンセサイザー', 'Synthesizer', '#4169E1', '#87CEEB', '#1E90FF', '#E0F6FF', '#FFFFFF', 'C4', to_jsonb(ARRAY['C4', 'D4', 'E4', 'F4', 'G4'])),
  ('550e8400-e29b-41d4-a716-446655440021', '太鼓', 'Taiko', '#DC143C', '#FF6347', '#8B0000', '#FFE4E1', '#FFFFFF', 'C4', to_jsonb(ARRAY['C4', 'D4', 'E4'])),
  ('550e8400-e29b-41d4-a716-446655440022', 'チューバ', 'Tuba', '#8B4513', '#D2691E', '#654321', '#FFF8DC', '#FFFFFF', 'E1', to_jsonb(ARRAY['E1', 'A1', 'D2', 'F2']))
ON CONFLICT (id) DO NOTHING;
