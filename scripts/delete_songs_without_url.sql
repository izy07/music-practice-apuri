-- すべての楽器の代表曲から、実際に使えないURLの曲を削除
-- youtube_urlまたはfamous_video_urlが有効なURL（youtu.beまたはyoutube.com/watchで、exampleを含まない）の曲のみを残す
-- Supabase StudioのSQL Editorで実行してください

DO $$
DECLARE
  deleted_count INTEGER;
  kept_count INTEGER;
BEGIN
  -- 実際に使えないURLの曲を削除
  -- 有効なURLの条件:
  -- 1. youtube_urlまたはfamous_video_urlのどちらかが有効
  -- 2. 有効なURLは以下のいずれかの形式:
  --    - https://youtu.be/... (短縮URL)
  --    - https://www.youtube.com/watch?v=... (通常のURL)
  -- 3. exampleを含まない
  -- 4. NULLでない、空文字列でない
  DELETE FROM representative_songs
  WHERE NOT (
    -- youtube_urlが有効な場合
    (
      youtube_url IS NOT NULL 
      AND youtube_url != ''
      AND youtube_url NOT LIKE '%example%'
      AND (
        youtube_url LIKE 'https://youtu.be/%' 
        OR youtube_url LIKE 'https://www.youtube.com/watch?v=%'
        OR youtube_url LIKE 'https://youtube.com/watch?v=%'
      )
    )
    OR
    -- famous_video_urlが有効な場合
    (
      famous_video_url IS NOT NULL 
      AND famous_video_url != ''
      AND famous_video_url NOT LIKE '%example%'
      AND (
        famous_video_url LIKE 'https://youtu.be/%' 
        OR famous_video_url LIKE 'https://www.youtube.com/watch?v=%'
        OR famous_video_url LIKE 'https://youtube.com/watch?v=%'
      )
    )
  );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- 残った曲の数を取得
  SELECT COUNT(*) INTO kept_count FROM representative_songs;
  
  RAISE NOTICE '削除完了: % 件の曲を削除しました。% 件の曲が残りました（有効なURLが設定されている曲のみ）。', deleted_count, kept_count;
END $$;

-- 確認クエリ1: 楽器ごとの残った曲の数を表示
SELECT 
  i.name AS instrument_name,
  COUNT(rs.id) AS song_count
FROM instruments i
LEFT JOIN representative_songs rs ON i.id = rs.instrument_id
GROUP BY i.id, i.name
ORDER BY i.name;

-- 確認クエリ2: 残った曲の詳細（URL付き）
SELECT 
  i.name AS instrument_name,
  rs.title,
  rs.composer,
  rs.youtube_url,
  rs.famous_video_url
FROM representative_songs rs
JOIN instruments i ON rs.instrument_id = i.id
ORDER BY i.name, rs.display_order;
