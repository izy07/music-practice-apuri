-- ブラームスのバイオリン協奏曲 第1楽章を削除
DELETE FROM representative_songs
WHERE title = 'ブラームスのバイオリン協奏曲 第1楽章'
  AND composer = 'ヨハネス・ブラームス'
  AND era = 'ロマン派'
  AND genre = '協奏曲';

