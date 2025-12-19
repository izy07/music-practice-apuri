-- 愛の挨拶（宮本笑里）の名演奏情報を更新
UPDATE representative_songs
SET famous_performer = '宮本笑里',
    famous_video_url = 'https://youtu.be/dBrtiVWxGZg?si=uhOCUkM3bHYPFZ5I'
WHERE instrument_id = (SELECT id FROM instruments WHERE name = 'バイオリン' OR name_en = 'Violin' LIMIT 1)
  AND title = '愛の挨拶'
  AND composer IN ('エルガー', 'エドワード・エルガー', 'Edward Elgar');

