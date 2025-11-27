-- inspirational_performancesテーブルのスキーマを更新
-- 新しいスキーマに合わせてカラムを追加・変更

DO $$
BEGIN
  -- テーブルが存在する場合のみ処理
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inspirational_performances') THEN
    
    -- 古いカラムを削除（存在する場合）
    ALTER TABLE inspirational_performances DROP COLUMN IF EXISTS url;
    ALTER TABLE inspirational_performances DROP COLUMN IF EXISTS notes;
    ALTER TABLE inspirational_performances DROP COLUMN IF EXISTS slot;
    
    -- 新しいカラムを追加（存在しない場合のみ）
    ALTER TABLE inspirational_performances ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE inspirational_performances ADD COLUMN IF NOT EXISTS video_url TEXT;
    ALTER TABLE inspirational_performances ADD COLUMN IF NOT EXISTS performer_name TEXT;
    ALTER TABLE inspirational_performances ADD COLUMN IF NOT EXISTS piece_name TEXT;
    ALTER TABLE inspirational_performances ADD COLUMN IF NOT EXISTS difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced', 'expert'));
    ALTER TABLE inspirational_performances ADD COLUMN IF NOT EXISTS genre TEXT;
    
    -- 既存のtitleカラムがNOT NULL制約を持っているか確認し、必要なら削除
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'inspirational_performances' 
      AND column_name = 'title' 
      AND is_nullable = 'NO'
    ) THEN
      -- titleカラムは既にNOT NULLなので、そのまま
      NULL;
    END IF;
    
  ELSE
    -- テーブルが存在しない場合は新規作成
    CREATE TABLE inspirational_performances (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      video_url TEXT,
      performer_name TEXT,
      piece_name TEXT,
      difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
      genre TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- RLS有効化
    ALTER TABLE inspirational_performances ENABLE ROW LEVEL SECURITY;
    
    -- RLSポリシー
    CREATE POLICY "Users can view own inspirational performances" ON inspirational_performances
      FOR SELECT USING (auth.uid() = user_id);
    
    CREATE POLICY "Users can insert own inspirational performances" ON inspirational_performances
      FOR INSERT WITH CHECK (auth.uid() = user_id);
    
    CREATE POLICY "Users can update own inspirational performances" ON inspirational_performances
      FOR UPDATE USING (auth.uid() = user_id);
    
    CREATE POLICY "Users can delete own inspirational performances" ON inspirational_performances
      FOR DELETE USING (auth.uid() = user_id);
    
    -- インデックス
    CREATE INDEX IF NOT EXISTS idx_inspirational_performances_user_id ON inspirational_performances(user_id);
    CREATE INDEX IF NOT EXISTS idx_inspirational_performances_created_at ON inspirational_performances(created_at);
    
    -- 更新日時を自動更新するトリガー
    CREATE TRIGGER update_inspirational_performances_updated_at
      BEFORE UPDATE ON inspirational_performances
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END$$;

