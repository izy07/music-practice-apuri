-- 重複するuser_profilesをクリーンアップするスクリプト
-- 各user_idに対して最新の1件のみを残し、古いものを削除

-- 1. 重複データの確認
SELECT 
  user_id, 
  COUNT(*) as count,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM user_profiles 
GROUP BY user_id 
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- 2. 重複データの削除（最新の1件以外を削除）
DELETE FROM user_profiles 
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
    FROM user_profiles
  ) ranked
  WHERE rn > 1
);

-- 3. 削除後の確認
SELECT 
  user_id, 
  COUNT(*) as count
FROM user_profiles 
GROUP BY user_id 
HAVING COUNT(*) > 1;


