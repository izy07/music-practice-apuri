-- 指揮者・ボーカルを確実に存在させ、ユーフォニアム・リコーダーを追加
-- 既存の 20260306000001 が未適用の環境でも、このマイグレーションで 023/024 が入る
-- 他の楽器と同じ列で挿入（20260305000000 で color_background/color_surface が追加されている前提）
INSERT INTO public.instruments (
  id, name, name_en, color_primary, color_secondary, color_accent,
  color_background, color_surface, starting_note, tuning_notes
) VALUES
-- ボーカル（既存マイグレーションで入っている場合も上書きしないよう ON CONFLICT で更新）
('550e8400-e29b-41d4-a716-446655440023', 'ボーカル', 'Vocal', '#9C27B0', '#CE93D8', '#7B1FA2', '#F3E5F5', '#FFFFFF', 'C4', to_jsonb(ARRAY['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'])),
-- 指揮者
('550e8400-e29b-41d4-a716-446655440024', '指揮者', 'Conductor', '#37474F', '#78909C', '#263238', '#ECEFF1', '#FFFFFF', 'C4', to_jsonb(ARRAY['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'])),
-- ユーフォニアム（新規）
('550e8400-e29b-41d4-a716-446655440025', 'ユーフォニアム', 'Euphonium', '#8B4513', '#D2691E', '#654321', '#FFF8DC', '#FFFFFF', 'B1', to_jsonb(ARRAY['B1', 'E2', 'B2', 'E3'])),
-- リコーダー（新規）
('550e8400-e29b-41d4-a716-446655440026', 'リコーダー', 'Recorder', '#2E7D32', '#66BB6A', '#1B5E20', '#E8F5E9', '#FFFFFF', 'C4', to_jsonb(ARRAY['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5']))
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
