-- ============================================
-- representative_songsテーブルの作成とバイオリンの代表曲データの追加
-- ============================================
-- 実行日: 2025-12-05
-- ============================================
-- このマイグレーションは、representative_songsテーブルを作成し、
-- バイオリンの代表曲15曲を追加します
-- ============================================

-- 1. 更新日時を自動更新するトリガー関数を作成（存在しない場合のみ）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. representative_songsテーブルの作成（存在しない場合のみ）
CREATE TABLE IF NOT EXISTS representative_songs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  instrument_id UUID REFERENCES instruments(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  composer TEXT NOT NULL,
  era TEXT,
  genre TEXT,
  difficulty_level INTEGER CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
  youtube_url TEXT,
  spotify_url TEXT,
  description_ja TEXT,
  description_en TEXT,
  is_popular BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  famous_performer TEXT,
  famous_video_url TEXT,
  famous_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. インデックスの作成（存在しない場合のみ）
CREATE INDEX IF NOT EXISTS idx_representative_songs_instrument_id ON representative_songs(instrument_id);
CREATE INDEX IF NOT EXISTS idx_representative_songs_display_order ON representative_songs(display_order);
CREATE INDEX IF NOT EXISTS idx_representative_songs_is_popular ON representative_songs(is_popular);

-- 4. RLS（Row Level Security）の有効化
ALTER TABLE representative_songs ENABLE ROW LEVEL SECURITY;

-- 5. RLSポリシーの作成（存在しない場合のみ）
DO $$
BEGIN
  -- 既存のポリシーを削除してから再作成（重複を避ける）
  DROP POLICY IF EXISTS "Anyone can view representative songs" ON representative_songs;
  DROP POLICY IF EXISTS "representative_songs_select_policy" ON representative_songs;
  
  -- 新しいポリシーを作成（全ユーザーが読み取り可能）
  CREATE POLICY "Anyone can view representative songs" ON representative_songs
    FOR SELECT USING (true);
END $$;

-- 6. 更新日時を自動更新するトリガー（存在しない場合のみ）
DROP TRIGGER IF EXISTS update_representative_songs_updated_at ON representative_songs;
CREATE TRIGGER update_representative_songs_updated_at
  BEFORE UPDATE ON representative_songs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 7. instrumentsテーブルにバイオリンが存在することを確認
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM instruments WHERE id = '550e8400-e29b-41d4-a716-446655440003') THEN
    -- バイオリンを挿入（存在しない場合）
    INSERT INTO instruments (id, name, name_en, color_primary, color_secondary, color_accent, starting_note, tuning_notes) 
    VALUES ('550e8400-e29b-41d4-a716-446655440003', 'バイオリン', 'Violin', '#6B4423', '#C9A961', '#D4AF37', 'G3', ARRAY['G3', 'D4', 'A4', 'E5'])
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE 'バイオリンデータを挿入しました';
  END IF;
END $$;

-- 8. バイオリンの代表曲データは削除（20250120000002_create_representative_songs.sqlに統合済み）

-- 9. PostgRESTのスキーマキャッシュをリロード（テーブル作成を反映）
NOTIFY pgrst, 'reload schema';

-- 10. マイグレーション完了メッセージ
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'representative_songsテーブル作成完了';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'バイオリンの代表曲は20250120000002_create_representative_songs.sqlで定義されています';
  RAISE NOTICE '========================================';
END $$;

