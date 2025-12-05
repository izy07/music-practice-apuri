-- ============================================
-- user_group_membershipsテーブルの404エラーを修正するSQL
-- ============================================
-- SupabaseダッシュボードのSQL Editorで実行してください
-- ============================================

-- 1. user_group_membershipsテーブルの作成（存在しない場合のみ）
CREATE TABLE IF NOT EXISTS public.user_group_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sub_group_id uuid REFERENCES public.sub_groups(id) ON DELETE CASCADE,
  role varchar(50) NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_group_memberships_user_org_subgroup_unique UNIQUE (user_id, organization_id, sub_group_id)
);

-- 2. インデックスの作成
CREATE INDEX IF NOT EXISTS idx_user_group_memberships_user_id ON public.user_group_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_user_group_memberships_organization_id ON public.user_group_memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_group_memberships_sub_group_id ON public.user_group_memberships(sub_group_id);

-- 3. RLSの有効化
ALTER TABLE public.user_group_memberships ENABLE ROW LEVEL SECURITY;

-- 4. 既存のポリシーをすべて削除
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.user_group_memberships;
DROP POLICY IF EXISTS "自分のメンバーシップ情報は閲覧可能" ON public.user_group_memberships;
DROP POLICY IF EXISTS "組織の管理者は全メンバーシップを閲覧可能" ON public.user_group_memberships;
DROP POLICY IF EXISTS "自分自身のメンバーシップを挿入可能" ON public.user_group_memberships;
DROP POLICY IF EXISTS "組織の管理者はメンバーシップを挿入可能" ON public.user_group_memberships;
DROP POLICY IF EXISTS "組織の管理者はメンバーシップを更新可能" ON public.user_group_memberships;
DROP POLICY IF EXISTS "組織の管理者はメンバーシップを削除可能" ON public.user_group_memberships;
DROP POLICY IF EXISTS "自分のメンバーシップを更新可能" ON public.user_group_memberships;
DROP POLICY IF EXISTS "自分のメンバーシップを削除可能" ON public.user_group_memberships;
DROP POLICY IF EXISTS "組織の作成者はメンバーシップを管理可能" ON public.user_group_memberships;

-- 5. 新しいRLSポリシーを作成（循環参照を回避）
-- 自分のメンバーシップ情報は常に閲覧可能
CREATE POLICY "自分のメンバーシップ情報は閲覧可能"
  ON public.user_group_memberships
  FOR SELECT
  USING (auth.uid() = user_id);

-- 自分自身のメンバーシップを挿入可能（組織参加時）
CREATE POLICY "自分自身のメンバーシップを挿入可能"
  ON public.user_group_memberships
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND role = 'member');

-- 自分のメンバーシップを更新可能
CREATE POLICY "自分のメンバーシップを更新可能"
  ON public.user_group_memberships
  FOR UPDATE
  USING (auth.uid() = user_id);

-- 自分のメンバーシップを削除可能
CREATE POLICY "自分のメンバーシップを削除可能"
  ON public.user_group_memberships
  FOR DELETE
  USING (auth.uid() = user_id);

-- 組織の作成者は、その組織のメンバーシップを管理可能
-- （organizationsテーブルを直接参照することで循環参照を回避）
CREATE POLICY "組織の作成者はメンバーシップを管理可能"
  ON public.user_group_memberships
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations
      WHERE public.organizations.id = public.user_group_memberships.organization_id
      AND public.organizations.created_by = auth.uid()
    )
  );

-- 6. 権限の付与
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_group_memberships TO anon, authenticated;

-- 7. 確認メッセージ
DO $$
BEGIN
  RAISE NOTICE '✅ user_group_membershipsテーブルの修正が完了しました';
  RAISE NOTICE '✅ テーブルとRLSポリシーを再作成しました';
  RAISE NOTICE '✅ 権限を再付与しました';
END $$;


