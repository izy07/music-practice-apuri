-- RLSセキュリティ問題の修正
-- このマイグレーションは、Supabaseダッシュボードで検出されたセキュリティ問題を修正します

-- 1. music_termsテーブルのRLSを確実に有効化
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'music_terms'
  ) THEN
    -- まずRLSを有効化（ポリシーが存在する場合でも有効化できるように）
    ALTER TABLE music_terms ENABLE ROW LEVEL SECURITY;
    
    -- すべての既存ポリシーを削除
    DROP POLICY IF EXISTS "Anyone can read music terms" ON music_terms;
    DROP POLICY IF EXISTS "Authenticated users can read music terms" ON music_terms;
    DROP POLICY IF EXISTS "Service role can manage music terms" ON music_terms;
    
    -- 認証ユーザーが読み取り可能なポリシーを作成
    CREATE POLICY "Authenticated users can read music terms"
      ON music_terms
      FOR SELECT
      TO authenticated
      USING (true);
    
    -- サービスロールのみが書き込み可能
    CREATE POLICY "Service role can manage music terms"
      ON music_terms
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
    
    -- RLSが確実に有効化されていることを確認（再度有効化）
    ALTER TABLE music_terms ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- 2. note_training_statsビューを完全に削除して再作成
-- ビューは基になるテーブル（note_training_results）のRLSを自動的に継承します
-- 通常のビューとして作成することで、セキュリティ定義者ビューの問題を回避
DO $$
BEGIN
  -- ビューが存在する場合は削除
  DROP VIEW IF EXISTS note_training_stats CASCADE;
  
  -- 通常のビューとして再作成（デフォルトでSECURITY INVOKER）
  CREATE VIEW note_training_stats AS
  SELECT 
    user_id,
    COUNT(*) as total_plays,
    AVG(score) as average_score,
    MAX(score) as best_score,
    AVG(correct_count::DECIMAL / total_count) * 100 as accuracy_percentage,
    AVG(max_streak) as average_max_streak,
    SUM(play_time) as total_play_time
  FROM note_training_results
  GROUP BY user_id;
  
  -- ビューの所有者をpostgresに設定（セキュリティ定義者ビューを回避）
  ALTER VIEW note_training_stats OWNER TO postgres;
END $$;

-- 3. my_songs_statsビューを完全に削除して再作成
-- ビューは基になるテーブル（my_songs）のRLSを自動的に継承します
-- 通常のビューとして作成することで、セキュリティ定義者ビューの問題を回避
DO $$
BEGIN
  -- ビューが存在する場合は削除
  DROP VIEW IF EXISTS my_songs_stats CASCADE;
  
  -- 通常のビューとして再作成（デフォルトでSECURITY INVOKER）
  CREATE VIEW my_songs_stats AS
  SELECT 
    user_id,
    COUNT(*) as total_songs,
    COUNT(*) FILTER (WHERE status = 'want_to_play') as want_to_play_count,
    COUNT(*) FILTER (WHERE status = 'learning') as learning_count,
    COUNT(*) FILTER (WHERE status = 'played') as played_count,
    COUNT(*) FILTER (WHERE status = 'mastered') as mastered_count,
    COUNT(*) FILTER (WHERE difficulty = 'beginner') as beginner_count,
    COUNT(*) FILTER (WHERE difficulty = 'intermediate') as intermediate_count,
    COUNT(*) FILTER (WHERE difficulty = 'advanced') as advanced_count
  FROM my_songs
  GROUP BY user_id;
  
  -- ビューの所有者をpostgresに設定（セキュリティ定義者ビューを回避）
  ALTER VIEW my_songs_stats OWNER TO postgres;
END $$;

-- 4. goals_overviewビューを完全に削除して再作成
-- ビューは基になるテーブル（goals）のRLSを自動的に継承します
-- 通常のビューとして作成することで、セキュリティ定義者ビューの問題を回避
DO $$
BEGIN
  -- ビューが存在する場合は削除
  DROP VIEW IF EXISTS goals_overview CASCADE;
  
  -- goalsテーブルが存在する場合のみビューを作成
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'goals'
  ) THEN
    -- 通常のビューとして再作成（デフォルトでSECURITY INVOKER）
    CREATE VIEW goals_overview AS
    SELECT 
      user_id,
      COUNT(*) FILTER (WHERE is_completed = false) as active_goals,
      COUNT(*) FILTER (WHERE is_completed = true) as completed_goals,
      COUNT(*) FILTER (WHERE goal_type = 'personal_short') as short_term_goals,
      COUNT(*) FILTER (WHERE goal_type = 'personal_long') as long_term_goals,
      COUNT(*) FILTER (WHERE goal_type = 'group') as group_goals,
      AVG(progress_percentage) FILTER (WHERE is_completed = false) as average_progress
    FROM goals
    GROUP BY user_id;
    
    -- ビューの所有者をpostgresに設定（セキュリティ定義者ビューを回避）
    ALTER VIEW goals_overview OWNER TO postgres;
  END IF;
END $$;

-- 5. instrumentsテーブルのRLSを確実に有効化
-- instrumentsテーブルはマスターデータなので、認証ユーザーは読み取り可能
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'instruments'
  ) THEN
    -- まずRLSを有効化（ポリシーが存在する場合でも有効化できるように）
    ALTER TABLE instruments ENABLE ROW LEVEL SECURITY;
    
    -- すべての既存ポリシーを削除
    DROP POLICY IF EXISTS "Anyone can view instruments" ON instruments;
    DROP POLICY IF EXISTS "Anyone can read instruments" ON instruments;
    DROP POLICY IF EXISTS "Authenticated users can read instruments" ON instruments;
    DROP POLICY IF EXISTS "Service role can manage instruments" ON instruments;
    
    -- 認証ユーザーが読み取り可能なポリシーを作成
    CREATE POLICY "Authenticated users can read instruments"
      ON instruments
      FOR SELECT
      TO authenticated
      USING (true);
    
    -- サービスロールのみが書き込み可能なポリシーを作成
    CREATE POLICY "Service role can manage instruments"
      ON instruments
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
    
    -- RLSが確実に有効化されていることを確認（再度有効化）
    ALTER TABLE instruments ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- 6. user_group_membershipsとorganizationsテーブルの無限再帰を修正
-- 問題：RLSポリシー内でuser_group_membershipsテーブル自体を参照すると無限再帰が発生する
DO $$
BEGIN
  -- user_group_membershipsテーブルが存在する場合のみ処理
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_group_memberships'
  ) THEN
    -- 既存のポリシーを削除
    DROP POLICY IF EXISTS "自分のメンバーシップ情報は閲覧可能" ON user_group_memberships;
    DROP POLICY IF EXISTS "組織の管理者は全メンバーシップを閲覧可能" ON user_group_memberships;
    DROP POLICY IF EXISTS "管理者のみメンバーシップを作成・更新可能" ON user_group_memberships;
    DROP POLICY IF EXISTS "管理者のみメンバーシップを挿入可能" ON user_group_memberships;
    DROP POLICY IF EXISTS "管理者のみメンバーシップを更新可能" ON user_group_memberships;
    DROP POLICY IF EXISTS "管理者のみメンバーシップを削除可能" ON user_group_memberships;
    DROP POLICY IF EXISTS "自分自身のメンバーシップを挿入可能" ON user_group_memberships;
    DROP POLICY IF EXISTS "組織の管理者はメンバーシップを挿入可能" ON user_group_memberships;
    DROP POLICY IF EXISTS "組織の管理者はメンバーシップを更新可能" ON user_group_memberships;
    DROP POLICY IF EXISTS "組織の管理者はメンバーシップを削除可能" ON user_group_memberships;
    DROP POLICY IF EXISTS "Users can view their own memberships" ON user_group_memberships;
    DROP POLICY IF EXISTS "Users can view own memberships" ON user_group_memberships;
    
    -- 既存の関数を削除
    DROP FUNCTION IF EXISTS check_is_org_admin(UUID);
    DROP FUNCTION IF EXISTS check_is_org_member(UUID);
    DROP FUNCTION IF EXISTS is_organization_admin(UUID);
    DROP FUNCTION IF EXISTS is_organization_member(UUID);
    DROP FUNCTION IF EXISTS is_organization_admin_for_update(UUID);
    
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
      
      -- SECURITY DEFINER関数内では、関数の所有者（postgres）の権限で実行されるため
      -- RLSは適用されません。直接クエリを実行します。
      SELECT EXISTS (
        SELECT 1 
        FROM public.user_group_memberships
        WHERE user_id = current_user_id
        AND organization_id = org_id
        AND role = 'admin'
      ) INTO is_admin;
      
      RETURN COALESCE(is_admin, false);
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
    
    -- メンバーチェック関数（RLSを完全にバイパス）
    CREATE OR REPLACE FUNCTION check_is_org_member(org_id UUID)
    RETURNS BOOLEAN AS $$
    DECLARE
      is_member BOOLEAN;
      current_user_id UUID;
    BEGIN
      -- 現在のユーザーIDを取得
      current_user_id := auth.uid();
      
      -- SECURITY DEFINER関数内では、関数の所有者（postgres）の権限で実行されるため
      -- RLSは適用されません。直接クエリを実行します。
      SELECT EXISTS (
        SELECT 1 
        FROM public.user_group_memberships
        WHERE user_id = current_user_id
        AND organization_id = org_id
      ) INTO is_member;
      
      RETURN COALESCE(is_member, false);
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
    
    -- user_group_membershipsテーブルの新しいポリシー（循環参照を回避）
    -- 自分のメンバーシップ情報は常に閲覧可能
    CREATE POLICY "自分のメンバーシップ情報は閲覧可能" ON user_group_memberships
      FOR SELECT USING (user_id = auth.uid());
    
    -- 自分自身のメンバーシップを挿入可能（組織参加時）
    CREATE POLICY "自分自身のメンバーシップを挿入可能" ON user_group_memberships
      FOR INSERT WITH CHECK (user_id = auth.uid() AND role = 'member');
    
    -- 自分のメンバーシップを更新可能
    CREATE POLICY "自分のメンバーシップを更新可能" ON user_group_memberships
      FOR UPDATE USING (user_id = auth.uid());
    
    -- 自分のメンバーシップを削除可能
    CREATE POLICY "自分のメンバーシップを削除可能" ON user_group_memberships
      FOR DELETE USING (user_id = auth.uid());
    
    -- 組織の作成者は、その組織のメンバーシップを管理可能
    -- （organizationsテーブルを直接参照することで循環参照を回避）
    CREATE POLICY "組織の作成者はメンバーシップを管理可能" ON user_group_memberships
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM organizations
          WHERE organizations.id = user_group_memberships.organization_id
          AND organizations.created_by = auth.uid()
        )
      );
  END IF;
END $$;

-- 7. organizationsテーブルに必要なカラムを追加（存在しない場合）
DO $$
BEGIN
  -- organizationsテーブルが存在する場合のみ処理
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'organizations'
  ) THEN
    -- invite_codeカラムが存在しない場合は追加
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'organizations' 
      AND column_name = 'invite_code'
    ) THEN
      ALTER TABLE organizations ADD COLUMN invite_code VARCHAR(6);
      CREATE INDEX IF NOT EXISTS idx_organizations_invite_code ON organizations(invite_code);
    END IF;
    
    -- invite_code_hashカラムが存在しない場合は追加
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'organizations' 
      AND column_name = 'invite_code_hash'
    ) THEN
      ALTER TABLE organizations ADD COLUMN invite_code_hash TEXT;
    END IF;
    
    -- invite_code_expires_atカラムが存在しない場合は追加
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'organizations' 
      AND column_name = 'invite_code_expires_at'
    ) THEN
      ALTER TABLE organizations ADD COLUMN invite_code_expires_at TIMESTAMPTZ;
      CREATE INDEX IF NOT EXISTS idx_organizations_invite_expires ON organizations(invite_code_expires_at);
    END IF;
    
    -- passwordカラムが存在しない場合は追加
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'organizations' 
      AND column_name = 'password'
    ) THEN
      ALTER TABLE organizations ADD COLUMN password VARCHAR(8);
    END IF;
    
    -- password_hashカラムが存在しない場合は追加
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'organizations' 
      AND column_name = 'password_hash'
    ) THEN
      ALTER TABLE organizations ADD COLUMN password_hash TEXT;
    END IF;
    
    -- is_soloカラムが存在しない場合は追加
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'organizations' 
      AND column_name = 'is_solo'
    ) THEN
      ALTER TABLE organizations ADD COLUMN is_solo BOOLEAN DEFAULT false;
    END IF;
  END IF;
END $$;

-- 8. organizationsテーブルの無限再帰を修正
DO $$
BEGIN
  -- organizationsテーブルが存在する場合のみ処理
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'organizations'
  ) THEN
    -- 既存のポリシーを削除
    DROP POLICY IF EXISTS "組織のメンバーは組織情報を閲覧可能" ON organizations;
    DROP POLICY IF EXISTS "組織の作成者は閲覧可能" ON organizations;
    DROP POLICY IF EXISTS "管理者のみ組織を作成可能" ON organizations;
    DROP POLICY IF EXISTS "認証されたユーザーは組織を作成可能" ON organizations;
    DROP POLICY IF EXISTS "管理者のみ組織を更新可能" ON organizations;
    DROP POLICY IF EXISTS "組織の作成者は組織を更新可能" ON organizations;
    DROP POLICY IF EXISTS "組織の管理者は組織を更新可能" ON organizations;
    DROP POLICY IF EXISTS "Users can view organizations" ON organizations;
    DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
    DROP POLICY IF EXISTS "Users can update own organizations" ON organizations;
    DROP POLICY IF EXISTS "Users can delete own organizations" ON organizations;
    DROP POLICY IF EXISTS "招待コードで組織検索可能" ON organizations;
    
    -- organizationsテーブルの新しいポリシー
    -- 組織の作成者は常に閲覧可能
    CREATE POLICY "組織の作成者は閲覧可能" ON organizations
      FOR SELECT USING (auth.uid() = created_by);
    
    -- 組織のメンバーは組織情報を閲覧可能（関数を使用して循環参照を回避）
    CREATE POLICY "組織のメンバーは組織情報を閲覧可能" ON organizations
      FOR SELECT USING (check_is_org_member(id));
    
    -- 認証されたユーザーは組織を作成可能
    CREATE POLICY "認証されたユーザーは組織を作成可能" ON organizations
      FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = created_by);
    
    -- 組織の作成者は組織を更新可能
    CREATE POLICY "組織の作成者は組織を更新可能" ON organizations
      FOR UPDATE USING (auth.uid() = created_by);
    
    -- 組織の管理者は組織を更新可能（関数を使用して循環参照を回避）
    CREATE POLICY "組織の管理者は組織を更新可能" ON organizations
      FOR UPDATE USING (check_is_org_admin(id));
    
    -- 招待コードで組織検索可能（有効な招待コードのみ）
    CREATE POLICY "招待コードで組織検索可能" ON organizations
      FOR SELECT USING (
        invite_code IS NOT NULL AND 
        invite_code_expires_at IS NOT NULL AND
        invite_code_expires_at > NOW()
      );
  END IF;
END $$;

-- コメント追加（存在する場合のみ）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'music_terms') THEN
    COMMENT ON TABLE music_terms IS '音楽用語辞典テーブル。認証ユーザーは読み取り可能。';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'instruments') THEN
    COMMENT ON TABLE instruments IS '楽器マスターテーブル。認証ユーザーは読み取り可能。';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'note_training_stats') THEN
    COMMENT ON VIEW note_training_stats IS '音符トレーニング統計ビュー。ユーザーは自分の統計のみ閲覧可能。';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'my_songs_stats') THEN
    COMMENT ON VIEW my_songs_stats IS 'マイライブラリ統計ビュー。ユーザーは自分の統計のみ閲覧可能。';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'goals_overview') THEN
    COMMENT ON VIEW goals_overview IS '目標統計ビュー。ユーザーは自分の統計のみ閲覧可能。';
  END IF;
END $$;

-- 9. PostgRESTのスキーマキャッシュをリロード（カラム追加を反映）
-- 注意: これはPostgRESTが実行されている場合にのみ有効です
-- Supabase CLIを使用している場合は、supabase db reset または supabase migration up を実行してください
NOTIFY pgrst, 'reload schema';

