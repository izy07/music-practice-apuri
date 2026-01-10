-- ============================================
-- sub_goals テーブルの作成
-- 長期目標のサブ目標を管理するテーブル
-- ============================================

CREATE TABLE IF NOT EXISTS public.sub_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid REFERENCES public.goals(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  is_completed boolean DEFAULT false,
  completed_at timestamptz,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLSの有効化
ALTER TABLE public.sub_goals ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: ユーザーは自分のサブ目標のみ操作可能
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sub_goals' AND policyname = 'Users can read own sub_goals') THEN
    CREATE POLICY "Users can read own sub_goals" ON public.sub_goals
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sub_goals' AND policyname = 'Users can insert own sub_goals') THEN
    CREATE POLICY "Users can insert own sub_goals" ON public.sub_goals
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sub_goals' AND policyname = 'Users can update own sub_goals') THEN
    CREATE POLICY "Users can update own sub_goals" ON public.sub_goals
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sub_goals' AND policyname = 'Users can delete own sub_goals') THEN
    CREATE POLICY "Users can delete own sub_goals" ON public.sub_goals
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- インデックス
CREATE INDEX IF NOT EXISTS idx_sub_goals_goal_id ON public.sub_goals(goal_id);
CREATE INDEX IF NOT EXISTS idx_sub_goals_user_id ON public.sub_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_sub_goals_order_index ON public.sub_goals(goal_id, order_index);

-- 最大10個までの制約をトリガー関数で実装
CREATE OR REPLACE FUNCTION check_sub_goals_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.sub_goals WHERE goal_id = NEW.goal_id) > 10 THEN
    RAISE EXCEPTION '目標ごとにサブ目標は最大10個まで設定できます';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーの作成
DROP TRIGGER IF EXISTS trigger_check_sub_goals_limit ON public.sub_goals;
CREATE TRIGGER trigger_check_sub_goals_limit
  BEFORE INSERT ON public.sub_goals
  FOR EACH ROW
  EXECUTE FUNCTION check_sub_goals_limit();

-- コメント
COMMENT ON TABLE public.sub_goals IS '長期目標のサブ目標（最大10個まで）';
COMMENT ON COLUMN public.sub_goals.goal_id IS '親となる長期目標のID';
COMMENT ON COLUMN public.sub_goals.order_index IS '表示順序（小さい順）';
COMMENT ON COLUMN public.sub_goals.is_completed IS '完了フラグ（trueの場合、進捗率に反映される）';
