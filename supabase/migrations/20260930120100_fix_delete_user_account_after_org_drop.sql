-- 団体テーブル削除後: delete_user_account と出欠用 RPC を整理

DROP FUNCTION IF EXISTS public.can_register_attendance(date);

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
  DELETE FROM public.inspirational_performances WHERE user_id = uid;
  DELETE FROM public.user_custom_instruments WHERE user_id = uid;
  DELETE FROM public.user_instrument_profiles WHERE user_id = uid;
  DELETE FROM public.user_settings WHERE user_id = uid;
  DELETE FROM public.score_comments WHERE user_id = uid;
  DELETE FROM public.score_edits WHERE user_id = uid;
  DELETE FROM public.user_subscriptions WHERE user_id = uid;

  DELETE FROM storage.objects
  WHERE bucket_id = 'recordings'
    AND (name LIKE uid::text || '/%');

  DELETE FROM public.recordings WHERE user_id = uid;
  DELETE FROM public.user_profiles WHERE user_id = uid;

  DELETE FROM auth.users WHERE id = uid;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_account() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_user_account() FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
