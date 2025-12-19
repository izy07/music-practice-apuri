-- チャルダッシュの重複を解消し、一意制約を追加
DO $$
DECLARE
  v_violin_id uuid;
BEGIN
  SELECT id INTO v_violin_id FROM instruments WHERE name = 'バイオリン' OR name_en = 'Violin' LIMIT 1;
  IF v_violin_id IS NOT NULL THEN
    -- 重複行がある場合、名演奏情報がある行を残し、それ以外を削除
    WITH cte AS (
      SELECT id,
             ROW_NUMBER() OVER (
               PARTITION BY instrument_id, title, composer
               ORDER BY (famous_performer IS NOT NULL) DESC, updated_at DESC, created_at DESC
             ) AS rn
      FROM representative_songs
      WHERE instrument_id = v_violin_id
        AND title IN ('チャルダッシュ','チャールダッシュ','Czardas')
        AND composer IN ('ヴィットーリオ・モンティ','モンティ','Vittorio Monti')
    )
    DELETE FROM representative_songs rs
    USING cte
    WHERE rs.id = cte.id AND cte.rn > 1;
  END IF;
END $$;

-- （instrument_id, title, composer）の組み合わせを一意にする（既に存在しない場合のみ）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'uniq_representative_songs_instr_title_composer'
  ) THEN
    CREATE UNIQUE INDEX uniq_representative_songs_instr_title_composer
      ON representative_songs(instrument_id, title, composer);
  END IF;
END $$;
