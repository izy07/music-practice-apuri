-- G線上のアリア（バッハ）にアナスタシア・ペトリーシャクの演奏を追加
UPDATE representative_songs
SET famous_performer = 'Anastasiya Petryshak',
    famous_video_url = 'https://youtu.be/CLk8OILr72U?si=C8TIaAO3jnQkFPA3'
WHERE instrument_id = (SELECT id FROM instruments WHERE name = 'バイオリン' OR name_en = 'Violin' LIMIT 1)
  AND title IN ('G線のアリア', 'G線上のアリア', 'G String')
  AND composer IN ('ヨハン・セバスチャン・バッハ', 'バッハ', 'J.S. Bach');

