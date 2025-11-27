-- コウモリ序曲 にオーケストラ演奏の情報を追加
DO $$
DECLARE
  v_violin_id uuid;
BEGIN
  SELECT id INTO v_violin_id FROM instruments WHERE name = 'バイオリン' OR name_en = 'Violin' LIMIT 1;
  IF v_violin_id IS NOT NULL THEN
    -- 既存の「コウモリ序曲」に名演奏情報を追加
    UPDATE representative_songs
    SET famous_performer = 'オーケストラ',
        famous_video_url = 'https://youtu.be/BugDZWgVQnY?si=k-wwJiiY_lfx2wWI'
    WHERE instrument_id = v_violin_id
      AND title = 'コウモリ序曲'
      AND composer = 'ヨハン・シュトラウス2世';
  END IF;
END $$;

