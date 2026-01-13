-- ============================================
-- practice_sessionsテーブルのインデックス最適化
-- ============================================
-- 日付: 2026-01-13
-- 目的: クエリ速度を10-100倍向上させるための複合インデックスを追加
-- ============================================

-- 複合インデックス（最も頻繁に使用されるクエリパターン）
-- user_id、practice_date DESC、instrument_idの組み合わせで検索が頻繁に行われる
-- このインデックスにより、以下のクエリパターンが高速化される：
-- 1. 特定ユーザーの特定期間の練習記録を取得（楽器フィルタリング付き）
-- 2. 特定ユーザーの最新の練習記録を取得（楽器フィルタリング付き）
-- 3. 統計画面での期間指定クエリ（楽器フィルタリング付き）
CREATE INDEX IF NOT EXISTS idx_practice_sessions_user_date_instrument 
ON public.practice_sessions(user_id, practice_date DESC, instrument_id);

-- 部分インデックス（practice_date DESCのみ、日付範囲検索用）
-- 既存のidx_practice_sessions_practice_dateがあるが、DESC順序を明示的に指定
-- 注意: 既存のインデックスと重複する可能性があるが、複合インデックスが優先されるため問題なし
CREATE INDEX IF NOT EXISTS idx_practice_sessions_practice_date_desc 
ON public.practice_sessions(practice_date DESC) 
WHERE practice_date IS NOT NULL;

-- コメント
COMMENT ON INDEX idx_practice_sessions_user_date_instrument IS 
'複合インデックス: user_id、practice_date DESC、instrument_idの組み合わせで検索を高速化';

COMMENT ON INDEX idx_practice_sessions_practice_date_desc IS 
'日付範囲検索用インデックス: practice_date DESC順序で検索を高速化';

-- インデックスの使用状況を確認するためのクエリ（参考）
-- SELECT 
--   schemaname,
--   tablename,
--   indexname,
--   idx_scan as index_scans,
--   idx_tup_read as tuples_read,
--   idx_tup_fetch as tuples_fetched
-- FROM pg_stat_user_indexes
-- WHERE tablename = 'practice_sessions'
-- ORDER BY idx_scan DESC;
