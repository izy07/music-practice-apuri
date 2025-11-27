-- カルメン幻想曲を2番目、カプリース第24番を3番目に設定
UPDATE representative_songs
SET display_order = 2
WHERE title = 'カルメン幻想曲'
  AND famous_performer = 'HIMARI';

UPDATE representative_songs
SET display_order = 3
WHERE title = 'カプリース第24番'
  AND composer = 'ニコロ・パガニーニ';

