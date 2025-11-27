-- カノン（パッヘルベル）を削除
DELETE FROM representative_songs
WHERE instrument_id = (SELECT id FROM instruments WHERE name = 'バイオリン' OR name_en = 'Violin' LIMIT 1)
  AND title = 'カノン'
  AND composer = 'パッヘルベル'
  AND era = 'バロック'
  AND genre = 'カノン';

