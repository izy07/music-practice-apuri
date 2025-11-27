-- representative_songsテーブルの説明文を修正

-- 情熱大陸の説明を修正
UPDATE representative_songs 
SET 
  description_ja = 'TBS系「情熱大陸」のテーマ曲。現代的なバイオリンの音色で知られる。',
  genre = 'テレビ音楽'
WHERE title = '情熱大陸' AND composer = '葉加瀬太郎';

-- コウモリ序曲の説明を修正
UPDATE representative_songs 
SET 
  description_ja = 'オペレッタ「こうもり」の序曲。ウィーンを代表する軽快で華やかな旋律。'
WHERE title = 'コウモリ序曲' AND composer = 'ヨハン・シュトラウス2世';

-- 確認ログ（開発用）
-- 更新された曲の情報を表示
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN 
    SELECT title, composer, era, genre, description_ja 
    FROM representative_songs 
    WHERE title IN ('情熱大陸', 'コウモリ序曲')
  LOOP
    RAISE NOTICE '曲名: %, 作曲者: %, 時代: %, ジャンル: %', rec.title, rec.composer, rec.era, rec.genre;
    RAISE NOTICE '説明: %', rec.description_ja;
  END LOOP;
END $$;

