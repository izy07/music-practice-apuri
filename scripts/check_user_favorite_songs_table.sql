-- user_favorite_songsテーブルの存在確認とマイグレーション適用状況の確認

-- 1. テーブルの存在確認
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'user_favorite_songs'
    ) THEN '✅ user_favorite_songsテーブルは存在します'
    ELSE '❌ user_favorite_songsテーブルが存在しません'
  END as table_status;

-- 2. カラムの存在確認
SELECT 
  column_name,
  data_type,
  CASE 
    WHEN column_name IN (
      'id', 'user_id', 'instrument_id', 'title', 'composer', 
      'era', 'genre', 'youtube_url', 'spotify_url', 'description_ja', 
      'description_en', 'famous_performer', 'famous_video_url', 
      'famous_note', 'display_order', 'created_at', 'updated_at'
    ) THEN '✅'
    ELSE '⚠️'
  END as status
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_favorite_songs'
ORDER BY ordinal_position;

-- 3. RLSポリシーの確認
SELECT 
  policyname,
  CASE 
    WHEN policyname IN (
      'Users can read own favorite songs',
      'Users can insert own favorite songs',
      'Users can update own favorite songs',
      'Users can delete own favorite songs'
    ) THEN '✅'
    ELSE '⚠️'
  END as status
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'user_favorite_songs'
ORDER BY policyname;

-- 4. インデックスの確認
SELECT 
  indexname,
  CASE 
    WHEN indexname IN (
      'idx_user_favorite_songs_user_id',
      'idx_user_favorite_songs_instrument_id',
      'idx_user_favorite_songs_display_order'
    ) THEN '✅'
    ELSE '⚠️'
  END as status
FROM pg_indexes
WHERE schemaname = 'public' 
  AND tablename = 'user_favorite_songs'
ORDER BY indexname;

-- 5. データ件数の確認（サンプル）
SELECT 
  COUNT(*) as total_songs,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT instrument_id) as unique_instruments
FROM public.user_favorite_songs;
