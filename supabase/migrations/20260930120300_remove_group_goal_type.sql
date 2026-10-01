-- 旧「団体目標」(goal_type = group) を撤去。アプリは personal_short / personal_long のみ。

UPDATE public.goals
SET goal_type = 'personal_long'
WHERE goal_type = 'group';

ALTER TABLE public.goals
  DROP CONSTRAINT IF EXISTS goals_goal_type_check;

ALTER TABLE public.goals
  ADD CONSTRAINT goals_goal_type_check
  CHECK (goal_type IN ('personal_short', 'personal_long'));

DROP VIEW IF EXISTS public.goals_overview;

CREATE VIEW public.goals_overview
WITH (security_invoker = true)
AS
SELECT user_id,
  count(*) FILTER (WHERE is_completed = false) AS active_goals,
  count(*) FILTER (WHERE is_completed = true) AS completed_goals,
  count(*) FILTER (WHERE goal_type = 'personal_short'::text) AS short_term_goals,
  count(*) FILTER (WHERE goal_type = 'personal_long'::text) AS long_term_goals,
  avg(progress_percentage) FILTER (WHERE is_completed = false) AS average_progress
FROM public.goals
GROUP BY user_id;
