-- バイオリンの《チャルダッシュ》重複（時代:近代 / ジャンル:舞曲）を削除
DELETE FROM representative_songs
WHERE instrument_id = (SELECT id FROM instruments WHERE name = 'バイオリン' OR name_en = 'Violin' LIMIT 1)
  AND title IN ('チャルダッシュ','チャールダッシュ','Czardas')
  AND composer IN ('ヴィットーリオ・モンティ','モンティ','Vittorio Monti')
  AND era = '近代'
  AND genre = '舞曲';
