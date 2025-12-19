-- カルメン幻想曲の表示順を2番目に設定
UPDATE representative_songs
SET display_order = 2
WHERE title = 'カルメン幻想曲'
  AND famous_performer = 'HIMARI';

