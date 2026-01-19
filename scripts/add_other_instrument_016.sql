-- 「その他」楽器（ID: 550e8400-e29b-41d4-a716-446655440016）を追加
-- コードで使用されているIDとデータベースのIDを統一するため

DO $$
BEGIN
  -- 既に存在するか確認
  IF NOT EXISTS (SELECT 1 FROM instruments WHERE id = '550e8400-e29b-41d4-a716-446655440016') THEN
    -- 「その他」楽器を追加
    INSERT INTO instruments (
      id,
      name,
      name_en,
      color_primary,
      color_secondary,
      color_accent,
      background_color,
      surface_color,
      starting_note,
      tuning_notes
    ) VALUES (
      '550e8400-e29b-41d4-a716-446655440016',
      'その他',
      'Other',
      '#4682B4',
      '#87CEEB',
      '#2F4F4F',
      '#E0F6FF',
      '#FFFFFF',
      'C4',
      to_jsonb(ARRAY['C4'])
    );
    
    RAISE NOTICE '「その他」楽器（ID: 550e8400-e29b-41d4-a716-446655440016）を追加しました';
  ELSE
    RAISE NOTICE '「その他」楽器（ID: 550e8400-e29b-41d4-a716-446655440016）は既に存在します';
  END IF;
END $$;
