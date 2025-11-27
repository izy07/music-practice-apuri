-- カプリース第24番の表示順を3番目に設定
UPDATE representative_songs
SET display_order = 3
WHERE title = 'カプリース第24番'
  AND composer = 'ニコロ・パガニーニ';

