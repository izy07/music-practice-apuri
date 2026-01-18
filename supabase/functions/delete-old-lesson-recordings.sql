-- 30日経過したレッスン録音を自動削除するSQL関数
-- この関数はSupabaseのpg_cronまたは外部スケジューラーから定期実行されます

-- 注意: Storageファイルの削除はSupabase Storage APIを使用する必要があるため、
-- このSQL関数はデータベースレコードのみを削除します。
-- StorageファイルはEdge Function（delete-old-lesson-recordings/index.ts）で削除してください。

-- または、以下のトリガー関数を使用して、レコード削除時にStorageファイルも削除する方法もあります。

CREATE OR REPLACE FUNCTION delete_old_lesson_recordings()
RETURNS TABLE(deleted_count INTEGER, deleted_ids UUID[]) AS $$
DECLARE
  deleted_ids_array UUID[];
  deleted_count_var INTEGER;
BEGIN
  -- 30日経過したレッスン録音を削除（お気に入りは除外）
  -- 注意: Storageファイルは自動削除されないため、別途Edge Functionで削除する必要があります
  
  WITH deleted AS (
    DELETE FROM public.recordings
    WHERE recording_type = 'lesson'
      AND is_favorite = false
      AND auto_delete_at IS NOT NULL
      AND auto_delete_at <= NOW()
    RETURNING id
  )
  SELECT COUNT(*), array_agg(id) INTO deleted_count_var, deleted_ids_array
  FROM deleted;

  RETURN QUERY SELECT deleted_count_var, deleted_ids_array;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 関数にコメントを追加
COMMENT ON FUNCTION delete_old_lesson_recordings() IS '30日経過したレッスン録音（お気に入り以外）を削除する。Storageファイルは別途削除が必要。';

-- pg_cronが有効な場合、毎日午前3時（UTC）に実行するジョブを作成
-- 注意: pg_cronが有効な場合は、以下のコメントを外して実行してください
-- SELECT cron.schedule(
--   'delete-old-lesson-recordings',
--   '0 3 * * *', -- 毎日午前3時（UTC）
--   $$SELECT delete_old_lesson_recordings();$$
-- );

-- ジョブを削除する場合:
-- SELECT cron.unschedule('delete-old-lesson-recordings');
