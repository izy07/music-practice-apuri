-- Jesu Joy のタイトルを日本語のみに変更
UPDATE representative_songs
SET title = '主よ、人の望みの喜びよ'
WHERE instrument_id = (SELECT id FROM instruments WHERE name = 'バイオリン' OR name_en = 'Violin' LIMIT 1)
  AND title = '主よ、人の望みの喜びよ (Jesus bleibet meine Freude)'
  AND composer = 'ヨハン・セバスチャン・バッハ';

