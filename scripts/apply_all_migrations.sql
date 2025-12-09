-- ============================================
-- すべての必要なマイグレーションを一括実行
-- SupabaseダッシュボードのSQL Editorで実行してください
-- ============================================

-- 1. user_profilesテーブルとオンボーディングカラムの作成
-- ============================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  selected_instrument_id uuid,
  practice_level text CHECK (practice_level IN ('beginner', 'intermediate', 'advanced')),
  level_selected_at timestamptz,
  total_practice_minutes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_profiles_user_id_unique UNIQUE (user_id)
);

-- オンボーディング進捗管理カラム
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'tutorial_completed'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN tutorial_completed boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'tutorial_completed_at'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN tutorial_completed_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'onboarding_completed'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN onboarding_completed boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'onboarding_completed_at'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN onboarding_completed_at timestamptz;
  END IF;

  -- custom_instrument_nameカラム
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'custom_instrument_name'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN custom_instrument_name text;
  END IF;
END $$;

-- インデックスとトリガー
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_selected_instrument_id ON public.user_profiles(selected_instrument_id);

CREATE OR REPLACE FUNCTION public.trg_set_updated_at_user_profiles()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_user_profiles ON public.user_profiles;
CREATE TRIGGER set_updated_at_user_profiles
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_set_updated_at_user_profiles();

-- RLSポリシー
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_profiles_select_own ON public.user_profiles;
DROP POLICY IF EXISTS user_profiles_insert_own ON public.user_profiles;
DROP POLICY IF EXISTS user_profiles_update_own ON public.user_profiles;
DROP POLICY IF EXISTS user_profiles_delete_own ON public.user_profiles;

CREATE POLICY user_profiles_select_own ON public.user_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY user_profiles_insert_own ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY user_profiles_update_own ON public.user_profiles FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY user_profiles_delete_own ON public.user_profiles FOR DELETE USING (auth.uid() = user_id);

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_profiles TO anon, authenticated;

-- 2. instrumentsテーブルと全楽器データの作成
-- ============================================
CREATE TABLE IF NOT EXISTS public.instruments (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  name_en text NOT NULL,
  color_primary text NOT NULL,
  color_secondary text NOT NULL,
  color_accent text NOT NULL,
  starting_note text,
  tuning_notes text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

INSERT INTO public.instruments (
  id, name, name_en, color_primary, color_secondary, color_accent, starting_note, tuning_notes
) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'ピアノ', 'Piano', '#1A1A1A', '#FFFFFF', '#D4AF37', 'C4', ARRAY['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4']),
  ('550e8400-e29b-41d4-a716-446655440002', 'ギター', 'Guitar', '#654321', '#DEB887', '#8B4513', 'E2', ARRAY['E2', 'A2', 'D3', 'G3', 'B3', 'E4']),
  ('550e8400-e29b-41d4-a716-446655440003', 'バイオリン', 'Violin', '#A0522D', '#CD853F', '#8B4513', 'G3', ARRAY['G3', 'D4', 'A4', 'E5']),
  ('550e8400-e29b-41d4-a716-446655440004', 'フルート', 'Flute', '#C0C0C0', '#E6E6FA', '#A9A9A9', 'C4', ARRAY['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5']),
  ('550e8400-e29b-41d4-a716-446655440005', 'トランペット', 'Trumpet', '#B8860B', '#DAA520', '#8B4513', 'C4', ARRAY['C4', 'E4', 'G4', 'C5']),
  ('550e8400-e29b-41d4-a716-446655440006', '打楽器', 'Drums', '#000000', '#696969', '#000000', 'C4', ARRAY['C4']),
  ('550e8400-e29b-41d4-a716-446655440007', 'サックス', 'Saxophone', '#4B0082', '#9370DB', '#2E0854', 'Bb3', ARRAY['Bb3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'Bb4']),
  ('550e8400-e29b-41d4-a716-446655440008', 'ホルン', 'Horn', '#8B4513', '#F4A460', '#654321', 'F3', ARRAY['F3', 'G3', 'A3', 'Bb3', 'C4', 'D4', 'E4', 'F4']),
  ('550e8400-e29b-41d4-a716-446655440009', 'クラリネット', 'Clarinet', '#000000', '#2F2F2F', '#1A1A1A', 'Bb3', ARRAY['Bb3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'Bb4']),
  ('550e8400-e29b-41d4-a716-446655440010', 'トロンボーン', 'Trombone', '#C0C0C0', '#E6E6FA', '#A9A9A9', 'Bb2', ARRAY['Bb2', 'C3', 'D3', 'Eb3', 'F3', 'G3', 'A3', 'Bb3']),
  ('550e8400-e29b-41d4-a716-446655440011', 'チェロ', 'Cello', '#DC143C', '#FF69B4', '#8B0000', 'C2', ARRAY['C2', 'G2', 'D3', 'A3']),
  ('550e8400-e29b-41d4-a716-446655440012', 'ファゴット', 'Bassoon', '#A0522D', '#DEB887', '#8B4513', 'Bb1', ARRAY['Bb1', 'C2', 'D2', 'Eb2', 'F2', 'G2', 'A2', 'Bb2']),
  ('550e8400-e29b-41d4-a716-446655440013', 'オーボエ', 'Oboe', '#DAA520', '#F0E68C', '#B8860B', 'C4', ARRAY['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5']),
  ('550e8400-e29b-41d4-a716-446655440015', 'コントラバス', 'Contrabass', '#2F4F4F', '#708090', '#000000', 'E1', ARRAY['E1', 'A1', 'D2', 'G2']),
  ('550e8400-e29b-41d4-a716-446655440018', 'ヴィオラ', 'Viola', '#7A3D1F', '#A0522D', '#5C2E12', 'C3', ARRAY['C3', 'G3', 'D4', 'A4'])
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  name_en = EXCLUDED.name_en,
  color_primary = EXCLUDED.color_primary,
  color_secondary = EXCLUDED.color_secondary,
  color_accent = EXCLUDED.color_accent,
  starting_note = EXCLUDED.starting_note,
  tuning_notes = EXCLUDED.tuning_notes,
  updated_at = now();

-- 3. eventsテーブルとdateカラムの作成
-- ============================================
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  date date NOT NULL DEFAULT CURRENT_DATE,
  is_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- dateカラムが存在しない場合は追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'date'
  ) THEN
    ALTER TABLE public.events ADD COLUMN date date NOT NULL DEFAULT CURRENT_DATE;
  END IF;
END $$;

-- インデックス
CREATE INDEX IF NOT EXISTS idx_events_user_id ON public.events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON public.events(date);

-- RLSポリシー
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS events_select_own ON public.events;
DROP POLICY IF EXISTS events_insert_own ON public.events;
DROP POLICY IF EXISTS events_update_own ON public.events;
DROP POLICY IF EXISTS events_delete_own ON public.events;

CREATE POLICY events_select_own ON public.events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY events_insert_own ON public.events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY events_update_own ON public.events FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY events_delete_own ON public.events FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.events TO anon, authenticated;

-- 完了メッセージ
DO $$
BEGIN
  RAISE NOTICE '✅ すべてのマイグレーションが完了しました';
END $$;




