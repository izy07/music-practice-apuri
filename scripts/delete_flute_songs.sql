-- フルートの代表曲から指定の曲を削除
-- 1. フルート協奏曲第2番が2個あるので1個削除（古い方を削除）
-- 2. シランクスを2個とも削除
-- 3. フルートソナタを削除
-- 4. フルート協奏曲（第2番以外）を削除
-- Supabase StudioのSQL Editorで実行してください

DO $$
DECLARE
  flute_id UUID := '550e8400-e29b-41d4-a716-446655440004';
  deleted_count INTEGER;
BEGIN
  -- 1. フルート協奏曲第2番が複数ある場合、古い方（display_orderが大きい方またはidが古い方）を1個削除
  -- まず、最新のURLが設定されている方を残し、古い方を削除
  DELETE FROM representative_songs
  WHERE id IN (
    SELECT id
    FROM representative_songs
    WHERE instrument_id = flute_id
      AND (
        title LIKE '%フルート協奏曲%第2番%' 
        OR title LIKE '%フルート協奏曲 第2番%'
        OR title = 'フルート協奏曲第2番'
      )
      AND composer LIKE '%モーツァルト%'
      AND id NOT IN (
        -- 最新のURLが設定されている方を残す（youtube_urlが 'https://youtu.be/l2EvHNzQV_M' を含む方）
        SELECT id
        FROM representative_songs
        WHERE instrument_id = flute_id
          AND (
            title LIKE '%フルート協奏曲%第2番%' 
            OR title LIKE '%フルート協奏曲 第2番%'
            OR title = 'フルート協奏曲第2番'
          )
          AND composer LIKE '%モーツァルト%'
          AND youtube_url LIKE '%l2EvHNzQV_M%'
        ORDER BY display_order ASC, created_at DESC
        LIMIT 1
      )
  );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'フルート協奏曲第2番の重複を % 件削除しました', deleted_count;

  -- 2. シランクスを2個とも削除
  DELETE FROM representative_songs
  WHERE instrument_id = flute_id
    AND (title LIKE '%シランクス%' OR title LIKE '%Syrinx%')
    AND composer LIKE '%ドビュッシー%';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'シランクスを % 件削除しました', deleted_count;

  -- 3. フルートソナタを削除
  DELETE FROM representative_songs
  WHERE instrument_id = flute_id
    AND (title LIKE '%フルートソナタ%' OR title LIKE '%Flute Sonata%');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'フルートソナタを % 件削除しました', deleted_count;

  -- 4. フルート協奏曲（第2番以外）を削除
  DELETE FROM representative_songs
  WHERE instrument_id = flute_id
    AND title LIKE '%フルート協奏曲%'
    AND NOT (
      title LIKE '%フルート協奏曲%第2番%' 
      OR title LIKE '%フルート協奏曲 第2番%'
      OR title = 'フルート協奏曲第2番'
    );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'フルート協奏曲（第2番以外）を % 件削除しました', deleted_count;

END $$;

-- 確認クエリ: 残ったフルートの代表曲を表示
SELECT 
  id,
  title,
  composer,
  youtube_url,
  famous_video_url,
  famous_performer,
  display_order,
  created_at
FROM representative_songs
WHERE instrument_id = '550e8400-e29b-41d4-a716-446655440004'
ORDER BY display_order, created_at;
