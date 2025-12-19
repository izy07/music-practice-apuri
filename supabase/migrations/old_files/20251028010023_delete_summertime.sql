-- サマータイム（ガーシュウィン）を削除
DELETE FROM representative_songs
WHERE instrument_id = (SELECT id FROM instruments WHERE name = 'バイオリン' OR name_en = 'Violin' LIMIT 1)
  AND title = 'サマータイム'
  AND composer = 'ガーシュウィン'
  AND era = '近代'
  AND genre = 'ジャズ';

