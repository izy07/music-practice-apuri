-- ピアノの「幻想即興曲」のYouTube URLと演奏者情報を更新
-- Yundi Li（李云迪）さんの演奏に変更
-- Supabase StudioのSQL Editorで実行してください

DO $$
DECLARE
  piano_id UUID := '550e8400-e29b-41d4-a716-446655440001';
  updated_count INTEGER;
BEGIN
  -- 幻想即興曲のYouTube URLと演奏者情報を更新
  -- 作曲家名が「ショパン」または「フレデリック・ショパン」の両方に対応
  UPDATE representative_songs
  SET 
    youtube_url = 'https://youtu.be/tvm2ZsRv3C8?si=sIUs43q7SuhyUd1A',
    famous_performer = 'Yundi Li',
    famous_video_url = 'https://youtu.be/tvm2ZsRv3C8?si=sIUs43q7SuhyUd1A',
    updated_at = NOW()
  WHERE 
    instrument_id = piano_id 
    AND title = '幻想即興曲' 
    AND (composer = 'ショパン' OR composer = 'フレデリック・ショパン');
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  IF updated_count > 0 THEN
    RAISE NOTICE 'ピアノの「幻想即興曲」を更新しました（Yundi Liさんの演奏）';
  ELSE
    RAISE NOTICE '更新対象のレコードが見つかりませんでした。先に「幻想即興曲」を追加してください。';
  END IF;
END $$;
