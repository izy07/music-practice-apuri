-- メンデルスゾーン協奏曲（Hilary Hahn）を削除
DELETE FROM representative_songs
WHERE instrument_id = (SELECT id FROM instruments WHERE name = 'バイオリン' OR name_en = 'Violin' LIMIT 1)
  AND composer IN ('フェリックス・メンデルスゾーン','メンデルスゾーン','Felix Mendelssohn')
  AND famous_performer = 'Hilary Hahn';

