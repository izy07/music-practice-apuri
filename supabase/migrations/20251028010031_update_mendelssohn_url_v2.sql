-- メンデルスゾーン協奏曲（Hilary Hahn）の名演奏動画URLを再度更新
UPDATE representative_songs
SET famous_video_url = 'https://youtu.be/vzbC39utkTw?si=CTeClSf5cyiomobn'
WHERE instrument_id = (SELECT id FROM instruments WHERE name = 'バイオリン' OR name_en = 'Violin' LIMIT 1)
  AND composer IN ('フェリックス・メンデルスゾーン','メンデルスゾーン','Felix Mendelssohn')
  AND famous_performer = 'Hilary Hahn';

