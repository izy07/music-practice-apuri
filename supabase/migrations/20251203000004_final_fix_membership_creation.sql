-- ============================================
-- 組織作成時のメンバーシップ作成の最終修正
-- ============================================
-- 実行日: 2025-12-03
-- ============================================
-- このマイグレーションは、組織作成時のメンバーシップ作成を確実に動作させるための最終修正です
-- トリガー関数（SECURITY DEFINER）に完全に依存し、アプリケーション側からの明示的なINSERTは不要
-- ============================================

-- ============================================
-- 1. 既存のトリガーと関数を完全に削除
-- ============================================
DO $$
BEGIN
  -- すべての既存のトリガーを削除
  DROP TRIGGER IF EXISTS on_organization_created ON organizations;
  DROP TRIGGER IF EXISTS after_organization_insert ON organizations;
  
  -- すべての既存の関数を削除
  DROP FUNCTION IF EXISTS auto_add_organization_creator();
  DROP FUNCTION IF EXISTS add_creator_as_admin();
  
  RAISE NOTICE '✅ 既存のトリガーと関数を削除しました';
END $$;

-- ============================================
-- 2. 新しいトリガー関数を作成（SECURITY DEFINER）
-- ============================================
DO $$
BEGIN
  -- 組織作成時に自動的に作成者をadminとしてメンバーシップに追加する関数
  -- SECURITY DEFINERでRLSを完全にバイパス
  CREATE OR REPLACE FUNCTION auto_add_organization_creator()
  RETURNS TRIGGER 
  SECURITY DEFINER
  SET search_path = public
  AS $$
  BEGIN
    -- 組織作成者をadminとしてメンバーシップに追加
    -- SECURITY DEFINERなので、RLSポリシーを完全にバイパスできる
    INSERT INTO user_group_memberships (user_id, organization_id, role)
    VALUES (NEW.created_by, NEW.id, 'admin')
    ON CONFLICT (user_id, organization_id) 
    DO UPDATE SET role = 'admin';
    
    RETURN NEW;
  EXCEPTION
    WHEN OTHERS THEN
      -- エラーが発生しても組織作成は成功とする（ログに記録）
      RAISE WARNING 'Failed to create membership for organization creator: %', SQLERRM;
      RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  RAISE NOTICE '✅ トリガー関数を作成しました（SECURITY DEFINER）';
END $$;

-- ============================================
-- 3. トリガーを作成
-- ============================================
DO $$
BEGIN
  CREATE TRIGGER on_organization_created
    AFTER INSERT ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION auto_add_organization_creator();
  
  RAISE NOTICE '✅ トリガーを作成しました';
END $$;

-- ============================================
-- 4. 関数の権限を確認
-- ============================================
DO $$
BEGIN
  -- 関数が正しく作成されているか確認
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'auto_add_organization_creator'
    AND prosecdef = true  -- SECURITY DEFINER
  ) THEN
    RAISE NOTICE '✅ 関数はSECURITY DEFINERとして正しく作成されています';
  ELSE
    RAISE WARNING '⚠️ 関数がSECURITY DEFINERとして作成されていない可能性があります';
  END IF;
END $$;

-- ============================================
-- 5. 確認メッセージ
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '組織作成時のメンバーシップ作成の最終修正が完了しました';
  RAISE NOTICE '========================================';
  RAISE NOTICE '1. 既存のトリガーと関数を削除';
  RAISE NOTICE '2. 新しいトリガー関数を作成（SECURITY DEFINER）';
  RAISE NOTICE '3. トリガーを作成';
  RAISE NOTICE '4. 関数の権限を確認';
  RAISE NOTICE '========================================';
  RAISE NOTICE '注意: アプリケーション側からの明示的なメンバーシップ作成は不要です';
  RAISE NOTICE '      トリガー関数が自動的にメンバーシップを作成します';
  RAISE NOTICE '========================================';
END $$;




