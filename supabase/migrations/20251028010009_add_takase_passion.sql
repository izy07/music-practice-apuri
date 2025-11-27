-- 葉加瀬太郎 / 情熱大陸 の名演奏情報を更新（既存曲に名演奏情報を追加）
DO $$
DECLARE
  v_violin_id uuid;
BEGIN
  SELECT id INTO v_violin_id FROM instruments WHERE name = 'バイオリン' OR name_en = 'Violin' LIMIT 1;
  IF v_violin_id IS NOT NULL THEN
    -- 既存の「情熱大陸」に名演奏情報を追加
    UPDATE representative_songs
    SET famous_performer = '葉加瀬太郎',
        famous_video_url = 'https://youtu.be/53B3ZrhfnOA?si=Vhx8g15yKSCaIZNL'
    WHERE instrument_id = v_violin_id
      AND title = '情熱大陸'
      AND composer = '葉加瀬太郎';
  END IF;
END $$;

