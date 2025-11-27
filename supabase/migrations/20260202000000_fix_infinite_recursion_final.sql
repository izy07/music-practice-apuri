-- 無限再帰エラーを根本的に修正
-- check_is_org_adminとcheck_is_org_member関数を修正して、RLSを完全にバイパス

-- 既存の関数を削除
DROP FUNCTION IF EXISTS check_is_org_admin(UUID) CASCADE;
DROP FUNCTION IF EXISTS check_is_org_member(UUID) CASCADE;

-- 管理者チェック関数（RLSを完全にバイパス）
-- SECURITY DEFINERを使用して、関数の所有者（postgres）の権限で実行
-- これにより、RLSポリシーを完全にバイパスできます
CREATE OR REPLACE FUNCTION check_is_org_admin(org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_admin BOOLEAN;
  current_user_id UUID;
BEGIN
  -- 現在のユーザーIDを取得
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- SECURITY DEFINER関数内では、関数の所有者（postgres）の権限で実行されるため
  -- RLSは適用されません。直接クエリを実行します。
  -- set_configを使用してRLSを無効化（念のため）
  PERFORM set_config('row_security', 'off', true);
  
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_group_memberships
    WHERE user_id = current_user_id
    AND organization_id = org_id
    AND role = 'admin'
  ) INTO is_admin;
  
  RETURN COALESCE(is_admin, false);
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 関数の所有者をpostgresに設定（RLSを完全にバイパス）
ALTER FUNCTION check_is_org_admin(UUID) OWNER TO postgres;

-- メンバーチェック関数（RLSを完全にバイパス）
CREATE OR REPLACE FUNCTION check_is_org_member(org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_member BOOLEAN;
  current_user_id UUID;
BEGIN
  -- 現在のユーザーIDを取得
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- SECURITY DEFINER関数内では、関数の所有者（postgres）の権限で実行されるため
  -- RLSは適用されません。直接クエリを実行します。
  -- set_configを使用してRLSを無効化（念のため）
  PERFORM set_config('row_security', 'off', true);
  
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_group_memberships
    WHERE user_id = current_user_id
    AND organization_id = org_id
  ) INTO is_member;
  
  RETURN COALESCE(is_member, false);
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 関数の所有者をpostgresに設定（RLSを完全にバイパス）
ALTER FUNCTION check_is_org_member(UUID) OWNER TO postgres;

-- PostgRESTのスキーマキャッシュをリロード
NOTIFY pgrst, 'reload schema';

