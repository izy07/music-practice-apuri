-- ============================================
-- user_profilesテーブルの400エラーを修正するSQL
-- ============================================
-- SupabaseダッシュボードのSQL Editorで実行してください
-- ============================================

-- 1. 無効なselected_instrument_idをNULLに設定（存在しないinstruments.idを参照している場合）
UPDATE public.user_profiles
SET selected_instrument_id = NULL
WHERE selected_instrument_id IS NOT NULL
  AND selected_instrument_id NOT IN (SELECT id FROM public.instruments);

-- 2. RLSポリシーを再作成（確実に設定するため）
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーをすべて削除
DROP POLICY IF EXISTS user_profiles_select_own ON public.user_profiles;
DROP POLICY IF EXISTS user_profiles_insert_own ON public.user_profiles;
DROP POLICY IF EXISTS user_profiles_update_own ON public.user_profiles;
DROP POLICY IF EXISTS user_profiles_delete_own ON public.user_profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;

-- 新しいRLSポリシーを作成
CREATE POLICY user_profiles_select_own
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY user_profiles_insert_own
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_profiles_update_own
  ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_profiles_delete_own
  ON public.user_profiles
  FOR DELETE
  USING (auth.uid() = user_id);

-- 3. 権限の再付与
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_profiles TO anon, authenticated;

-- 4. 確認メッセージ
DO $$
BEGIN
  RAISE NOTICE '✅ user_profilesテーブルの修正が完了しました';
  RAISE NOTICE '✅ 無効なselected_instrument_idをNULLに設定しました';
  RAISE NOTICE '✅ RLSポリシーを再作成しました';
  RAISE NOTICE '✅ 権限を再付与しました';
END $$;




