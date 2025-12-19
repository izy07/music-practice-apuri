-- ツィゴイネルワイゼンの名演奏動画URLを更新
UPDATE representative_songs
SET famous_video_url = 'https://youtu.be/-My4X_OBNtI?si=1eXxeTZyKoD8JKpW'
WHERE instrument_id = (SELECT id FROM instruments WHERE name = 'バイオリン' OR name_en = 'Violin' LIMIT 1)
  AND title IN ('ツィゴイネルワイゼン', 'Zigeunerweisen', 'Gypsy Airs')
  AND famous_video_url IS NOT NULL;

