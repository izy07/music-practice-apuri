-- ギターの代表曲から「ライラック」と「キックバック」以外を削除
-- Supabase StudioのSQL Editorで実行してください

DO $$
DECLARE
  guitar_id UUID := '550e8400-e29b-41d4-a716-446655440002';
  deleted_count INTEGER;
BEGIN
  -- 「ライラック」と「キックバック」以外のギターの代表曲を削除
  DELETE FROM representative_songs
  WHERE instrument_id = guitar_id
    AND NOT (
      (title = 'ライラック' AND composer = 'Mrs. GREEN APPLE')
      OR
      (title = 'KICK BACK' AND composer = 'チェンソーマン')
    );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RAISE NOTICE 'ギターの代表曲から % 件を削除しました。「ライラック」と「キックバック」のみ残しました。', deleted_count;
END $$;
