-- チャルダッシュ（飯塚歩夢）を表示順の一番下へ
DO $$
DECLARE
  v_violin_id uuid;
  v_next_order int;
BEGIN
  SELECT id INTO v_violin_id FROM instruments WHERE name = 'バイオリン' OR name_en = 'Violin' LIMIT 1;
  IF v_violin_id IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(MAX(display_order) + 1, 999) INTO v_next_order FROM representative_songs WHERE instrument_id = v_violin_id;

  UPDATE representative_songs
  SET display_order = v_next_order
  WHERE instrument_id = v_violin_id
    AND title IN ('チャルダッシュ','チャールダッシュ','Czardas')
    AND composer IN ('ヴィットーリオ・モンティ','モンティ','Vittorio Monti');
END $$;
