-- ユーモレスク（ドヴォルザーク）を削除
DELETE FROM representative_songs
WHERE instrument_id = (SELECT id FROM instruments WHERE name = 'バイオリン' OR name_en = 'Violin' LIMIT 1)
  AND title = 'ユーモレスク'
  AND composer = 'アントニン・ドヴォルザーク'
  AND era = 'ロマン派'
  AND genre = 'クラシック';

