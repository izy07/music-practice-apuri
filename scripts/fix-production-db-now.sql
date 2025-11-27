-- ============================================
-- 本番データベース修正スクリプト
-- 実行日: 2025-11-27
-- ============================================
-- ⚠️ 重要: このスクリプトをSupabase DashboardのSQL Editorで実行してください
-- ============================================

-- 1. instrumentsテーブルの作成（存在しない場合）
CREATE TABLE IF NOT EXISTS instruments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_en TEXT NOT NULL,
  color_primary TEXT NOT NULL,
  color_secondary TEXT NOT NULL,
  color_accent TEXT NOT NULL,
  starting_note TEXT,
  tuning_notes TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 「その他」楽器のIDを追加（コードで使用されている016）
-- これが最も重要な修正です
INSERT INTO instruments (id, name, name_en, color_primary, color_secondary, color_accent, starting_note, tuning_notes) 
VALUES 
  ('550e8400-e29b-41d4-a716-446655440016', 'その他', 'Other', '#9E9E9E', '#BDBDBD', '#757575', 'C4', ARRAY['C4'])
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  name_en = EXCLUDED.name_en,
  color_primary = EXCLUDED.color_primary,
  color_secondary = EXCLUDED.color_secondary,
  color_accent = EXCLUDED.color_accent,
  starting_note = EXCLUDED.starting_note,
  tuning_notes = EXCLUDED.tuning_notes;

-- 3. 無効なinstrument_idをNULLに設定（外部キー制約違反を防ぐ）
UPDATE user_profiles
SET selected_instrument_id = NULL
WHERE selected_instrument_id IS NOT NULL
  AND selected_instrument_id NOT IN (SELECT id FROM instruments);

-- 4. 外部キー制約の確認と修正
DO $$
BEGIN
  -- 既存の制約を削除（存在する場合）
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_profiles_selected_instrument_id_fkey'
  ) THEN
    ALTER TABLE user_profiles 
    DROP CONSTRAINT user_profiles_selected_instrument_id_fkey;
    RAISE NOTICE '既存の外部キー制約を削除しました';
  END IF;

  -- 新しい外部キー制約を追加（ON DELETE SET NULL）
  ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_selected_instrument_id_fkey
  FOREIGN KEY (selected_instrument_id)
  REFERENCES instruments(id)
  ON DELETE SET NULL;
  
  RAISE NOTICE '外部キー制約を追加しました';
END $$;

-- 5. 確認クエリ（実行結果を確認）
SELECT 
  '✅ 修正完了' AS status,
  (SELECT COUNT(*) FROM instruments WHERE id = '550e8400-e29b-41d4-a716-446655440016') AS other_instrument_exists,
  (SELECT COUNT(*) FROM user_profiles WHERE selected_instrument_id IS NOT NULL 
   AND selected_instrument_id NOT IN (SELECT id FROM instruments)) AS invalid_profiles_count,
  (SELECT COUNT(*) FROM instruments) AS total_instruments;

-- 6. 詳細確認（オプション）
-- 以下のクエリで詳細を確認できます（コメントアウトを解除して実行）
/*
SELECT 
  id, 
  name, 
  name_en,
  CASE 
    WHEN id = '550e8400-e29b-41d4-a716-446655440016' THEN '✅ コードで使用されているID'
    ELSE 'その他'
  END AS status
FROM instruments 
WHERE name = 'その他' OR name_en = 'Other';
*/

