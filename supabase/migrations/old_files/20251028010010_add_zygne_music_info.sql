-- ツィゴイネルワイゼン に名演奏情報を追加
DO $$
DECLARE
  v_violin_id uuid;
BEGIN
  SELECT id INTO v_violin_id FROM instruments WHERE name = 'バイオリン' OR name_en = 'Violin' LIMIT 1;
  IF v_violin_id IS NOT NULL THEN
    -- 既存の「ツィゴイネルワイゼン」に名演奏情報を追加
    UPDATE representative_songs
    SET famous_performer = 'Various Artists',
        famous_video_url = 'https://youtu.be/CIRJbsFHUm4?si=P1yVcPdM_hKWBqwr'
    WHERE instrument_id = v_violin_id
      AND (title = 'ツィゴイネルワイゼン' OR title ILIKE '%Zigeunerweisen%' OR title ILIKE '%Gypsy Airs%')
      AND composer IN ('サラサーテ','パブロ・デ・サラサーテ','Pablo de Sarasate');
  END IF;
END $$;

