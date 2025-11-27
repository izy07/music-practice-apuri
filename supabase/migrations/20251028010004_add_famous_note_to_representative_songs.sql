-- 名演奏の補足（イベント名等）を保存するカラムを追加
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'representative_songs') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'representative_songs' AND column_name = 'famous_note'
    ) THEN
      ALTER TABLE representative_songs ADD COLUMN famous_note TEXT;
      COMMENT ON COLUMN representative_songs.famous_note IS '名演奏の補足（イベント名等）';
    END IF;
  END IF;
END $$;

-- チャルダッシュ（モンティ）にイベント名を設定
UPDATE representative_songs rs
SET famous_note = '『超絶技巧選手権』〜桐朋祭2020〜'
WHERE rs.title IN ('チャルダッシュ','チャールダッシュ','Czardas')
  AND rs.composer IN ('ヴィットーリオ・モンティ','モンティ','Vittorio Monti')
  AND rs.instrument_id = (SELECT id FROM instruments WHERE name = 'バイオリン' OR name_en = 'Violin' LIMIT 1);

