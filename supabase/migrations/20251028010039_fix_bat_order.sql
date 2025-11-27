-- コウモリ序曲の表示順を下げる（1番目から外す）
UPDATE representative_songs
SET display_order = 100
WHERE title = 'コウモリ序曲'
  AND composer = 'ヨハン・シュトラウス2世';

