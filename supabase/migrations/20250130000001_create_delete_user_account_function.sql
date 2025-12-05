-- ユーザーアカウント削除関数
-- この関数は、ユーザーが自分のアカウントを削除する際に使用されます
-- 注意: auth.usersからの削除はAdmin権限が必要なため、この関数ではデータのみを削除します
-- auth.usersからの削除は、Supabase Admin APIまたはEdge Functionsで行う必要があります

CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  -- 現在のユーザーIDを取得
  current_user_id := auth.uid();
  
  -- ユーザーが認証されていることを確認
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION '認証されていないユーザーです';
  END IF;

  -- ユーザーのデータを削除（CASCADEにより関連データも削除される）
  -- 注意: 外部キー制約により、関連データが自動的に削除されます
  
  -- user_profilesを削除（これにより、関連するデータもCASCADEで削除される可能性がある）
  DELETE FROM public.user_profiles WHERE user_id = current_user_id;
  
  -- practice_sessionsを削除
  DELETE FROM public.practice_sessions WHERE user_id = current_user_id;
  
  -- goalsを削除
  DELETE FROM public.goals WHERE user_id = current_user_id;
  
  -- user_settingsを削除
  DELETE FROM public.user_settings WHERE user_id = current_user_id;
  
  -- tutorial_progressを削除
  DELETE FROM public.tutorial_progress WHERE user_id = current_user_id;
  
  -- note_training_resultsを削除
  DELETE FROM public.note_training_results WHERE user_id = current_user_id;
  
  -- その他のユーザー関連データを削除
  -- 必要に応じて、他のテーブルも追加してください
  
  -- 注意: auth.usersからの削除は、この関数では行いません
  -- auth.usersからの削除は、Supabase Admin APIまたはEdge Functionsで行う必要があります
  -- クライアント側では、データ削除後にログアウト処理を行います
  
END;
$$;

-- 関数の実行権限を付与（認証済みユーザーのみ）
GRANT EXECUTE ON FUNCTION delete_user_account() TO authenticated;

-- コメントを追加
COMMENT ON FUNCTION delete_user_account() IS 'ユーザーアカウントのデータを削除します。auth.usersからの削除は別途必要です。';

