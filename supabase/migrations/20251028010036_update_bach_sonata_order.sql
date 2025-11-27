-- 無伴奏ヴァイオリン・ソナタ 第1番の表示順を1番目に設定
UPDATE representative_songs
SET display_order = 1
WHERE title LIKE '無伴奏ヴァイオリン・ソナタ 第1番%'
  AND famous_performer = 'HIMARI';

