-- ハバネラ（ビゼー）を削除
DELETE FROM representative_songs
WHERE instrument_id = (SELECT id FROM instruments WHERE name = 'バイオリン' OR name_en = 'Violin' LIMIT 1)
  AND title = 'ハバネラ'
  AND composer = 'ジョルジュ・ビゼー'
  AND era = 'ロマン派'
  AND genre = 'オペラ';

