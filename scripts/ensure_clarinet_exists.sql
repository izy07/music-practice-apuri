-- クラリネットがデータベースに存在することを確認するスクリプト
-- 存在しない場合は追加、存在する場合は更新

-- クラリネットの挿入または更新
INSERT INTO public.instruments (
  id,
  name,
  name_en,
  color_primary,
  color_secondary,
  color_accent,
  starting_note,
  tuning_notes
) VALUES
('550e8400-e29b-41d4-a716-446655440009', 'クラリネット', 'Clarinet', '#000000', '#2F2F2F', '#1A1A1A', 'E3', ARRAY['E3', 'F3', 'G3', 'A3', 'B3'])
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  name_en = EXCLUDED.name_en,
  color_primary = EXCLUDED.color_primary,
  color_secondary = EXCLUDED.color_secondary,
  color_accent = EXCLUDED.color_accent,
  starting_note = EXCLUDED.starting_note,
  tuning_notes = EXCLUDED.tuning_notes,
  updated_at = now();

-- 確認クエリ
SELECT id, name, name_en, color_primary, color_secondary, color_accent 
FROM public.instruments 
WHERE id = '550e8400-e29b-41d4-a716-446655440009';


