-- ============================================
-- organizationsテーブルとuser_group_membershipsテーブルの404エラーを修正するSQL
-- ============================================
-- SupabaseダッシュボードのSQL Editorで実行してください
-- ============================================

-- ============================================
-- 1. organizationsテーブルの作成
-- ============================================

-- organizationsテーブルの作成（存在しない場合のみ）
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(100) NOT NULL,
  description text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_solo boolean DEFAULT false,
  invite_code varchar(6),
  invite_code_hash text,
  invite_code_expires_at timestamptz,
  password varchar(8),
  password_hash text,
  admin_code varchar(6),
  admin_code_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- organizationsテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_organizations_created_by ON public.organizations(created_by);
CREATE INDEX IF NOT EXISTS idx_organizations_invite_code ON public.organizations(invite_code);
CREATE INDEX IF NOT EXISTS idx_organizations_invite_expires ON public.organizations(invite_code_expires_at);

-- updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION public.trg_set_updated_at_organizations()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_organizations ON public.organizations;
CREATE TRIGGER set_updated_at_organizations
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_set_updated_at_organizations();

-- RLSの有効化
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーをすべて削除
DROP POLICY IF EXISTS "Users can view organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can update own organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can delete own organizations" ON public.organizations;
DROP POLICY IF EXISTS "認証されたユーザーは組織を作成可能" ON public.organizations;
DROP POLICY IF EXISTS "組織の作成者は組織を更新可能" ON public.organizations;
DROP POLICY IF EXISTS "組織の作成者は組織を削除可能" ON public.organizations;
DROP POLICY IF EXISTS "招待コードで組織検索可能" ON public.organizations;

-- 新しいRLSポリシーを作成
-- すべてのユーザーが組織を閲覧可能
CREATE POLICY "Users can view organizations"
  ON public.organizations
  FOR SELECT
  USING (true);

-- 認証されたユーザーが組織を作成可能
CREATE POLICY "Users can create organizations"
  ON public.organizations
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- 組織の作成者が組織を更新可能
CREATE POLICY "Users can update own organizations"
  ON public.organizations
  FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- 組織の作成者が組織を削除可能
CREATE POLICY "Users can delete own organizations"
  ON public.organizations
  FOR DELETE
  USING (auth.uid() = created_by);

-- 招待コードで組織検索可能（有効期限内の場合）
CREATE POLICY "招待コードで組織検索可能"
  ON public.organizations
  FOR SELECT
  USING (
    invite_code IS NOT NULL AND 
    invite_code_expires_at > now()
  );

-- 権限の付与
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.organizations TO anon, authenticated;

-- ============================================
-- 2. sub_groupsテーブルの作成（user_group_membershipsの前に作成）
-- ============================================

-- sub_groupsテーブルの作成（存在しない場合のみ）
CREATE TABLE IF NOT EXISTS public.sub_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name varchar(100) NOT NULL,
  description text,
  group_type varchar(50) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, name, group_type)
);

-- sub_groupsテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_sub_groups_organization_id ON public.sub_groups(organization_id);

-- updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION public.trg_set_updated_at_sub_groups()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_sub_groups ON public.sub_groups;
CREATE TRIGGER set_updated_at_sub_groups
  BEFORE UPDATE ON public.sub_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_set_updated_at_sub_groups();

-- RLSの有効化
ALTER TABLE public.sub_groups ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーをすべて削除
DROP POLICY IF EXISTS "Users can view sub_groups" ON public.sub_groups;
DROP POLICY IF EXISTS "組織のメンバーはサブグループを閲覧可能" ON public.sub_groups;

-- 新しいRLSポリシーを作成
-- すべてのユーザーがサブグループを閲覧可能
CREATE POLICY "Users can view sub_groups"
  ON public.sub_groups
  FOR SELECT
  USING (true);

-- 権限の付与
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.sub_groups TO anon, authenticated;

-- ============================================
-- 3. user_group_membershipsテーブルの作成
-- ============================================

-- user_group_membershipsテーブルの作成（存在しない場合のみ）
CREATE TABLE IF NOT EXISTS public.user_group_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sub_group_id uuid REFERENCES public.sub_groups(id) ON DELETE CASCADE,
  role varchar(50) NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_group_memberships_user_org_subgroup_unique UNIQUE (user_id, organization_id, sub_group_id)
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_user_group_memberships_user_id ON public.user_group_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_user_group_memberships_organization_id ON public.user_group_memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_group_memberships_sub_group_id ON public.user_group_memberships(sub_group_id);

-- RLSの有効化
ALTER TABLE public.user_group_memberships ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーをすべて削除
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

-- 新しいRLSポリシーを作成（循環参照を回避）
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

-- 権限の付与
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_group_memberships TO anon, authenticated;

-- ============================================
-- 4. 確認メッセージ
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ organizationsテーブルとuser_group_membershipsテーブルの修正が完了しました';
  RAISE NOTICE '✅ sub_groupsテーブルも作成しました';
  RAISE NOTICE '✅ すべてのRLSポリシーと権限が設定されました';
END $$;

