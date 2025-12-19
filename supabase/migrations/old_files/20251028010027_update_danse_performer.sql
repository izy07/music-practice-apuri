-- 死の舞踏の演奏者を「高松あい_violin」に変更
UPDATE representative_songs
SET famous_performer = '高松あい_violin'
WHERE instrument_id = (SELECT id FROM instruments WHERE name = 'バイオリン' OR name_en = 'Violin' LIMIT 1)
  AND title LIKE '死の舞踏%'
  AND composer = 'カミーユ・サン=サーンス';

