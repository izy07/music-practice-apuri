-- 'played' ステータスを my_songs テーブルに追加

-- 既存の CHECK 制約を削除
ALTER TABLE my_songs DROP CONSTRAINT IF EXISTS my_songs_status_check;

-- 新しい CHECK 制約を追加（'played' を含む）
ALTER TABLE my_songs ADD CONSTRAINT my_songs_status_check 
  CHECK (status IN ('want_to_play', 'learning', 'played', 'mastered'));

-- 統計ビューを更新
CREATE OR REPLACE VIEW my_songs_stats AS
SELECT 
  user_id,
  COUNT(*) as total_songs,
  COUNT(*) FILTER (WHERE status = 'want_to_play') as want_to_play_count,
  COUNT(*) FILTER (WHERE status = 'learning') as learning_count,
  COUNT(*) FILTER (WHERE status = 'played') as played_count,
  COUNT(*) FILTER (WHERE status = 'mastered') as mastered_count,
  COUNT(*) FILTER (WHERE difficulty = 'beginner') as beginner_count,
  COUNT(*) FILTER (WHERE difficulty = 'intermediate') as intermediate_count,
  COUNT(*) FILTER (WHERE difficulty = 'advanced') as advanced_count
FROM my_songs
GROUP BY user_id;

