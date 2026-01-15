-- バイオリンの活躍曲「コウモリ序曲」を一番下に移動
DO $$
DECLARE
  violin_id UUID := '550e8400-e29b-41d4-a716-446655440003';
  max_display_order INTEGER;
  fledermaus_id UUID;
BEGIN
  -- 現在の最大display_orderを取得
  SELECT COALESCE(MAX(display_order), 0) INTO max_display_order
  FROM representative_songs
  WHERE instrument_id = violin_id;
  
  -- コウモリ序曲のIDを取得
  SELECT id INTO fledermaus_id
  FROM representative_songs
  WHERE instrument_id = violin_id
    AND title = 'コウモリ序曲'
    AND composer = 'ヨハン・シュトラウス2世'
  LIMIT 1;
  
  -- コウモリ序曲が見つかった場合、一番下に移動
  IF fledermaus_id IS NOT NULL THEN
    -- コウモリ序曲のdisplay_orderを最大値+1に設定
    UPDATE representative_songs
    SET display_order = max_display_order + 1,
        updated_at = NOW()
    WHERE id = fledermaus_id;
    
    RAISE NOTICE 'コウモリ序曲を一番下に移動しました (display_order: %)', max_display_order + 1;
  ELSE
    RAISE NOTICE 'コウモリ序曲が見つかりませんでした';
  END IF;
END $$;
