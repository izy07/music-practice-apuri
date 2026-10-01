-- 音楽団体・グループ管理機能を撤去（アプリに UI なし。誤解と攻撃面を減らす）

-- events は個人カレンダー用。団体練習日程への FK のみ外す
ALTER TABLE IF EXISTS public.events
  DROP COLUMN IF EXISTS practice_schedule_id;

DROP TABLE IF EXISTS public.attendance_records CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.practice_schedules CASCADE;
DROP TABLE IF EXISTS public.user_group_memberships CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;

-- 旧設計の残骸（存在する環境のみ）
DROP TABLE IF EXISTS public.admin_roles CASCADE;
DROP TABLE IF EXISTS public.room_members CASCADE;
DROP TABLE IF EXISTS public.rooms CASCADE;
DROP TABLE IF EXISTS public.affiliations CASCADE;
DROP TABLE IF EXISTS public.sub_groups CASCADE;

COMMENT ON SCHEMA public IS 'Organization/group tables removed 2026-09-30 — personal practice app only.';
