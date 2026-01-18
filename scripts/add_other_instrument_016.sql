-- 「その他」楽器（ID: 550e8400-e29b-41d4-a716-446655440016）を追加
-- コードで使用されているIDとデータベースのIDを統一するため
-- このスクリプトはSupabase StudioのSQL Editorで実行してください（service_role権限が必要）
-- 
-- 注意: 実際のスキーマでは color_background と color_surface カラムは存在しません
-- 存在するカラム: id, name, name_en, name_ja, color_primary, color_secondary, color_accent, starting_note, tuning_notes, created_at

DO $$
BEGIN
  -- 既に存在するか確認
  IF NOT EXISTS (SELECT 1 FROM instruments WHERE id = '550e8400-e29b-41d4-a716-446655440016') THEN
    -- 「その他」楽器を追加
    -- 実際のスキーマに合わせて、color_background と color_surface は使用しない
    INSERT INTO instruments (
      id,
      name,
      name_en,
      color_primary,
      color_secondary,
      color_accent,
      starting_note,
      tuning_notes
    ) VALUES (
      '550e8400-e29b-41d4-a716-446655440016',
      'その他',
      'Other',
      '#4682B4',
      '#87CEEB',
      '#2F4F4F',
      'C4',
      '["C4"]'::jsonb
    );
    
    RAISE NOTICE '「その他」楽器（ID: 550e8400-e29b-41d4-a716-446655440016）を追加しました';
  ELSE
    RAISE NOTICE '「その他」楽器（ID: 550e8400-e29b-41d4-a716-446655440016）は既に存在します';
  END IF;
END $$;

-- 確認クエリ
SELECT id, name, name_en, color_primary, color_secondary, color_accent
FROM instruments 
WHERE id = '550e8400-e29b-41d4-a716-446655440016';
