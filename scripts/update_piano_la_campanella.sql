-- ピアノの「ラ・カンパネラ」のYouTube URLと演奏者情報を更新
-- 辻井伸行さんの演奏に変更
-- Supabase StudioのSQL Editorで実行してください

DO $$
DECLARE
  piano_id UUID := '550e8400-e29b-41d4-a716-446655440001';
  updated_count INTEGER;
BEGIN
  -- ラ・カンパネラのYouTube URLと演奏者情報を更新
  UPDATE representative_songs
  SET 
    youtube_url = 'https://youtu.be/8EaXf6fOFnA?si=OkuJkk79vr-V3yl3',
    famous_performer = '辻井伸行',
    famous_video_url = 'https://youtu.be/8EaXf6fOFnA?si=OkuJkk79vr-V3yl3',
    updated_at = NOW()
  WHERE 
    instrument_id = piano_id 
    AND title = 'ラ・カンパネラ' 
    AND composer = 'フランツ・リスト';
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  IF updated_count > 0 THEN
    RAISE NOTICE 'ピアノの「ラ・カンパネラ」を更新しました（辻井伸行さんの演奏）';
  ELSE
    RAISE NOTICE '更新対象のレコードが見つかりませんでした。先に「ラ・カンパネラ」を追加してください。';
  END IF;
END $$;
