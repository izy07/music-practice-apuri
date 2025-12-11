-- 打楽器をドラムに名称変更
-- 実行日: 2025-12-12

DO $$
DECLARE
  drums_id UUID := '550e8400-e29b-41d4-a716-446655440006';
BEGIN
  -- instrumentsテーブルの名称を更新
  UPDATE instruments
  SET name = 'ドラム'
  WHERE id = drums_id AND name = '打楽器';
  
  RAISE NOTICE '打楽器の名称をドラムに更新しました';
END $$;
