-- アカウント削除: ログイン中ユーザー自身のデータと auth.users を削除する
-- SECURITY DEFINER だが auth.uid() のみ対象（他ユーザー削除不可）

CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  -- 子データを先に削除（FK）
  DELETE FROM public.attendance_records WHERE user_id = uid;
  DELETE FROM public.sub_goals WHERE goal_id IN (SELECT id FROM public.goals WHERE user_id = uid);
  DELETE FROM public.goals WHERE user_id = uid;
  DELETE FROM public.practice_sessions WHERE user_id = uid;
  DELETE FROM public.practice_statistics WHERE user_id = uid;
  DELETE FROM public.events WHERE user_id = uid;
  DELETE FROM public.my_songs WHERE user_id = uid;
  DELETE FROM public.user_favorite_songs WHERE user_id = uid;
  DELETE FROM public.target_songs WHERE user_id = uid;
  DELETE FROM public.songs WHERE user_id = uid;
  DELETE FROM public.note_training_results WHERE user_id = uid;
  DELETE FROM public.ai_chat_history WHERE user_id = uid;
  DELETE FROM public.audio_memos WHERE user_id = uid;
  DELETE FROM public.feedback WHERE user_id = uid;
  DELETE FROM public.achievements WHERE user_id = uid;
  DELETE FROM public.affiliations WHERE user_id = uid;
  DELETE FROM public.inspirational_performances WHERE user_id = uid;
  DELETE FROM public.user_custom_instruments WHERE user_id = uid;
  DELETE FROM public.user_instrument_profiles WHERE user_id = uid;
  DELETE FROM public.user_settings WHERE user_id = uid;
  DELETE FROM public.user_group_memberships WHERE user_id = uid;
  DELETE FROM public.room_members WHERE user_id = uid;
  DELETE FROM public.score_comments WHERE user_id = uid;
  DELETE FROM public.score_edits WHERE user_id = uid;
  DELETE FROM public.admin_roles WHERE user_id = uid;
  DELETE FROM public.user_subscriptions WHERE user_id = uid;

  -- 録音: Storage オブジェクトも削除
  DELETE FROM storage.objects
  WHERE bucket_id = 'recordings'
    AND (name LIKE uid::text || '/%');

  DELETE FROM public.recordings WHERE user_id = uid;
  DELETE FROM public.user_profiles WHERE user_id = uid;

  -- Auth ユーザー削除（セッション無効化含む）
  DELETE FROM auth.users WHERE id = uid;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_account() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_user_account() FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;

COMMENT ON FUNCTION public.delete_user_account() IS
  'ログイン中ユーザー自身のアカウントと関連データを削除する。auth.uid() 以外は削除できない。';
