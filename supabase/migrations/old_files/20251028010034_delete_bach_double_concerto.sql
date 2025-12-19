-- 二つのバイオリンのための協奏曲（バッハ）を削除
DELETE FROM representative_songs
WHERE title = '二つのバイオリンのための協奏曲'
  AND composer = 'ヨハン・セバスチャン・バッハ'
  AND era = 'バロック'
  AND genre = '協奏曲';

