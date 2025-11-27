-- Jesu Joy of Mans Desiring のタイトルを日本語に変更
UPDATE representative_songs
SET title = '主よ、人の望みの喜びよ (Jesus bleibet meine Freude)'
WHERE instrument_id = (SELECT id FROM instruments WHERE name = 'バイオリン' OR name_en = 'Violin' LIMIT 1)
  AND title = 'Jesu Joy of Mans Desiring (Jesus bleibet meine Freude)'
  AND composer = 'ヨハン・セバスチャン・バッハ';

