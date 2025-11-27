-- target_songs テーブルの廃止（段階的移行完了後）

-- 1) 既存のtarget_songsデータがgoal_songsに移行済みか確認
-- 2) テーブルを削除（データは既にgoal_songs + my_songsに移行済み）

-- 注意: このマイグレーションは段階的移行が完了した後に実行
-- 実行前に以下を確認:
-- - 既存のtarget_songsデータがgoal_songs + my_songsに移行済み
-- - フロントエンドのクエリがgoal_songsベースに切り替え済み
-- - アプリケーションが正常に動作することを確認済み

-- target_songsテーブルを削除
DROP TABLE IF EXISTS target_songs CASCADE;

-- 関連するインデックスも自動的に削除される
-- 関連するRLSポリシーも自動的に削除される
-- 関連するトリガーも自動的に削除される

-- 移行完了の確認用クエリ（コメントアウト）
-- SELECT 
--   (SELECT COUNT(*) FROM goal_songs) as goal_songs_count,
--   (SELECT COUNT(*) FROM my_songs WHERE status = 'want_to_play') as my_songs_want_to_play_count;
