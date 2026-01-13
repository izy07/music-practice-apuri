-- practice_sessionsテーブルにvideo_urlカラムを追加
-- Supabase StudioのSQL Editorで実行してください

DO $$
BEGIN
  -- video_urlカラムが存在しない場合のみ追加
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'practice_sessions'
      AND column_name = 'video_url'
  ) THEN
    ALTER TABLE public.practice_sessions
    ADD COLUMN video_url text;
    
    RAISE NOTICE 'practice_sessionsテーブルにvideo_urlカラムを追加しました';
  ELSE
    RAISE NOTICE 'practice_sessionsテーブルにvideo_urlカラムは既に存在します';
  END IF;
END $$;
