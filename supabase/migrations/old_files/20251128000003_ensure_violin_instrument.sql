-- バイオリン（Violin）楽器を確実に追加
-- 楽器ID: 550e8400-e29b-41d4-a716-446655440003

-- instrumentsテーブルの作成（存在しない場合のみ）
CREATE TABLE IF NOT EXISTS public.instruments (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  name_en text NOT NULL,
  color_primary text NOT NULL,
  color_secondary text NOT NULL,
  color_accent text NOT NULL,
  starting_note text,
  tuning_notes text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- バイオリン楽器の追加（存在しない場合のみ）
INSERT INTO public.instruments (
  id,
  name,
  name_en,
  color_primary,
  color_secondary,
  color_accent,
  starting_note,
  tuning_notes
) VALUES (
  '550e8400-e29b-41d4-a716-446655440003',
  'バイオリン',
  'Violin',
  '#A0522D',
  '#CD853F',
  '#8B4513',
  'G3',
  ARRAY['G3', 'D4', 'A4', 'E5']
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  name_en = EXCLUDED.name_en,
  color_primary = EXCLUDED.color_primary,
  color_secondary = EXCLUDED.color_secondary,
  color_accent = EXCLUDED.color_accent,
  starting_note = EXCLUDED.starting_note,
  tuning_notes = EXCLUDED.tuning_notes,
  updated_at = now();

-- 確認クエリ（実行結果を確認するためにコメントアウト）
-- SELECT 
--   id,
--   name,
--   name_en
-- FROM public.instruments 
-- WHERE id = '550e8400-e29b-41d4-a716-446655440003';

