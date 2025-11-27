-- 愛のあいさつ（エルガー）を削除
DELETE FROM representative_songs
WHERE title = '愛のあいさつ'
  AND composer = 'エルガー'
  AND era = 'ロマン派'
  AND genre = 'サロン';

