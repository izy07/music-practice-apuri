-- アカウント削除 RPC: 残漏れテーブルを追加
-- music_terms / feature_usage_events はユーザー作成データのため削除必須

CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  table_name text;
  tables_to_clean text[] := ARRAY[
    'ai_conversations',
    'ai_feedback',
    'ai_usage_logs',
    'announcement_reads',
    'audio_analysis_results',
    'community_posts',
    'community_comments',
    'community_likes',
    'error_logs',
    'favorite_pieces',
    'feature_usage_events',
    'feedback',
    'goals',
    'goal_progress',
    'learning_progress',
    'music_terms',
    'notifications',
    'offline_data',
    'performance_evaluations',
    'piece_progress',
    'practice_plans',
    'practice_records',
    'practice_sessions',
    'recordings',
    'recording_analyses',
    'repertoire',
    'shared_content',
    'subscriptions',
    'sync_queue',
    'user_achievements',
    'user_activities',
    'user_favorite_songs',
    'user_instruments',
    'user_instrument_profiles',
    'user_preferences',
    'user_profiles',
    'user_settings',
    'user_stats',
    'video_watch_history'
  ];
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  BEGIN
    DELETE FROM storage.objects
    WHERE bucket_id = 'recordings'
      AND (name LIKE current_user_id::text || '/%'
           OR owner = current_user_id);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'storage.objects cleanup failed: %', SQLERRM;
  END;

  FOREACH table_name IN ARRAY tables_to_clean
  LOOP
    BEGIN
      EXECUTE format(
        'DELETE FROM public.%I WHERE user_id = $1',
        table_name
      ) USING current_user_id;
    EXCEPTION WHEN undefined_table THEN
      CONTINUE;
    WHEN undefined_column THEN
      BEGIN
        EXECUTE format(
          'DELETE FROM public.%I WHERE id = $1',
          table_name
        ) USING current_user_id;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'cleanup % failed: %', table_name, SQLERRM;
      END;
    WHEN OTHERS THEN
      RAISE WARNING 'cleanup % failed: %', table_name, SQLERRM;
    END;
  END LOOP;

  BEGIN
    DELETE FROM public.user_profiles WHERE id = current_user_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'user_profiles id cleanup failed: %', SQLERRM;
  END;

  BEGIN
    DELETE FROM public.profiles WHERE id = current_user_id;
  EXCEPTION WHEN undefined_table THEN
    NULL;
  WHEN OTHERS THEN
    RAISE WARNING 'profiles cleanup failed: %', SQLERRM;
  END;

  DELETE FROM auth.users WHERE id = current_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO service_role;
