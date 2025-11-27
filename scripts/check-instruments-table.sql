-- instrumentsテーブルの状態を確認するSQLスクリプト
-- 本番環境で直接実行して確認できます

-- 1. テーブルの存在確認
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'instruments') 
    THEN '✅ instrumentsテーブルは存在します'
    ELSE '❌ instrumentsテーブルが存在しません'
  END AS table_status;

-- 2. 楽器データの件数確認
SELECT 
  COUNT(*) AS total_instruments,
  COUNT(CASE WHEN id = '550e8400-e29b-41d4-a716-446655440016' THEN 1 END) AS other_instrument_exists
FROM instruments;

-- 3. すべての楽器IDと名前を表示
SELECT id, name, name_en 
FROM instruments 
ORDER BY name;

-- 4. 「その他」楽器の確認
SELECT 
  id, 
  name, 
  name_en,
  CASE 
    WHEN id = '550e8400-e29b-41d4-a716-446655440016' THEN '✅ コードで使用されているID (016)'
    WHEN id = '550e8400-e29b-41d4-a716-446655440017' THEN '⚠️  古いID (017)'
    ELSE 'その他'
  END AS status
FROM instruments 
WHERE name = 'その他' OR name_en = 'Other';

-- 5. 無効なinstrument_idを持つuser_profilesを確認
SELECT 
  user_id,
  selected_instrument_id,
  '無効なinstrument_id' AS issue
FROM user_profiles
WHERE selected_instrument_id IS NOT NULL
  AND selected_instrument_id NOT IN (SELECT id FROM instruments);

-- 6. 外部キー制約の確認
SELECT 
  conname AS constraint_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'user_profiles_selected_instrument_id_fkey'
    ) 
    THEN '✅ 外部キー制約が存在します'
    ELSE '❌ 外部キー制約が存在しません'
  END AS constraint_status
FROM pg_constraint
WHERE conname = 'user_profiles_selected_instrument_id_fkey'
LIMIT 1;

