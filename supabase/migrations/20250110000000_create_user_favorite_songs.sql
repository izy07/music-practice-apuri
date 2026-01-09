-- ============================================
-- user_favorite_songs テーブル作成
-- ============================================
-- 日付: 2025-01-10
-- 目的: ユーザーが自分のお気に入りの曲を追加できるようにする
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_favorite_songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  instrument_id uuid REFERENCES public.instruments(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  composer text NOT NULL DEFAULT '',
  era text,
  genre text,
  youtube_url text,
  spotify_url text,
  description_ja text,
  description_en text,
  famous_performer text,
  famous_video_url text,
  famous_note text,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLSの有効化
ALTER TABLE public.user_favorite_songs ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
DO $$
BEGIN
  -- ユーザーは自分のお気に入り曲を閲覧可能
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_favorite_songs' AND policyname = 'Users can read own favorite songs') THEN
    CREATE POLICY "Users can read own favorite songs" ON public.user_favorite_songs
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  -- ユーザーは自分のお気に入り曲を追加可能
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_favorite_songs' AND policyname = 'Users can insert own favorite songs') THEN
    CREATE POLICY "Users can insert own favorite songs" ON public.user_favorite_songs
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  -- ユーザーは自分のお気に入り曲を更新可能
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_favorite_songs' AND policyname = 'Users can update own favorite songs') THEN
    CREATE POLICY "Users can update own favorite songs" ON public.user_favorite_songs
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  -- ユーザーは自分のお気に入り曲を削除可能
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_favorite_songs' AND policyname = 'Users can delete own favorite songs') THEN
    CREATE POLICY "Users can delete own favorite songs" ON public.user_favorite_songs
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- インデックス
CREATE INDEX IF NOT EXISTS idx_user_favorite_songs_user_id ON public.user_favorite_songs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorite_songs_instrument_id ON public.user_favorite_songs(instrument_id);
CREATE INDEX IF NOT EXISTS idx_user_favorite_songs_display_order ON public.user_favorite_songs(display_order);

-- 更新日時を自動更新するトリガー
DROP TRIGGER IF EXISTS update_user_favorite_songs_updated_at ON public.user_favorite_songs;
CREATE TRIGGER update_user_favorite_songs_updated_at
  BEFORE UPDATE ON public.user_favorite_songs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
