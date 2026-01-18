-- ============================================
-- 代表曲データ（representative_songs）エクスポート用SQL
-- ============================================
-- このスクリプトは、全代表曲データをJSON形式でエクスポートします
-- SupabaseダッシュボードのSQL Editorで実行してください
-- ============================================
-- 使用方法:
-- 1. Supabaseダッシュボードにログイン
-- 2. SQL Editorを開く
-- 3. このスクリプトを実行
-- 4. 結果をコピーして、data/staticRepresentativeSongs.ts に貼り付け
-- ============================================

SELECT 
  json_agg(
    json_build_object(
      'id', id,
      'instrument_id', instrument_id,
      'title', title,
      'composer', composer,
      'era', era,
      'genre', genre,
      'difficulty_level', difficulty_level,
      'youtube_url', youtube_url,
      'spotify_url', spotify_url,
      'description_ja', description_ja,
      'description_en', description_en,
      'is_popular', is_popular,
      'display_order', display_order,
      'famous_performer', famous_performer,
      'famous_video_url', famous_video_url,
      'famous_note', famous_note
    )
    ORDER BY instrument_id, display_order
  ) AS representative_songs_data
FROM representative_songs;

-- ============================================
-- 楽器IDごとにグループ化した形式（確認用）
-- ============================================
-- このクエリは、楽器IDごとにグループ化した形式でデータを表示します
-- 静的データファイルの構造を確認する際に使用してください
-- ============================================

SELECT 
  instrument_id,
  json_agg(
    json_build_object(
      'id', id,
      'title', title,
      'composer', composer,
      'era', era,
      'genre', genre,
      'difficulty_level', difficulty_level,
      'youtube_url', youtube_url,
      'spotify_url', spotify_url,
      'description_ja', description_ja,
      'description_en', description_en,
      'is_popular', is_popular,
      'display_order', display_order,
      'famous_performer', famous_performer,
      'famous_video_url', famous_video_url,
      'famous_note', famous_note
    )
    ORDER BY display_order
  ) AS songs
FROM representative_songs
GROUP BY instrument_id
ORDER BY instrument_id;
