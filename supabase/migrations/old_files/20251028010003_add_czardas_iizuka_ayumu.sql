-- チャルダッシュ（モンティ）に名演奏（飯塚歩夢）を設定
UPDATE representative_songs rs
SET famous_performer = '飯塚歩夢',
    famous_video_url = 'https://youtu.be/gNZo4aTfkaw?si=BTV8e_HnQmrEnJuk'
WHERE rs.title IN ('チャルダッシュ','チャールダッシュ','Czardas')
  AND rs.composer IN ('ヴィットーリオ・モンティ','モンティ','Vittorio Monti')
  AND rs.instrument_id = (SELECT id FROM instruments WHERE name = 'バイオリン' OR name_en = 'Violin' LIMIT 1);
