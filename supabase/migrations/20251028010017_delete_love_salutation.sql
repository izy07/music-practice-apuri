-- 愛の挨拶（エルガー）を削除
DELETE FROM representative_songs
WHERE instrument_id = (SELECT id FROM instruments WHERE name = 'バイオリン' OR name_en = 'Violin' LIMIT 1)
  AND title = '愛の挨拶'
  AND composer = 'エルガー'
  AND era = 'ロマン派'
  AND genre = 'サロン';

