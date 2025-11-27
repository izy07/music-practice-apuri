-- 部屋管理機能用のテーブル作成

-- 部屋テーブル（親部屋・子部屋の階層構造）
CREATE TABLE IF NOT EXISTS rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id VARCHAR(6) UNIQUE NOT NULL, -- 6文字の部屋ID
  parent_room_id UUID REFERENCES rooms(id) ON DELETE CASCADE, -- 親部屋のID（NULLの場合は親部屋）
  name TEXT NOT NULL, -- 部屋名
  description TEXT, -- 部屋の説明
  password_hash TEXT NOT NULL, -- 合言葉のハッシュ
  icon_name TEXT DEFAULT 'music', -- 部屋アイコン
  color_theme TEXT DEFAULT '#2196F3', -- 部屋のカラーテーマ
  is_archived BOOLEAN DEFAULT false, -- アーカイブ状態
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 部屋メンバーテーブル
CREATE TABLE IF NOT EXISTS room_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nickname TEXT NOT NULL, -- 部屋内でのニックネーム
  role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')) DEFAULT 'viewer', -- 権限
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

-- 楽譜テーブル
CREATE TABLE IF NOT EXISTS scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL, -- 楽譜タイトル
  composer TEXT, -- 作曲者
  file_path TEXT NOT NULL, -- ファイルパス
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'pdf')), -- ファイル形式
  page_count INTEGER DEFAULT 1, -- ページ数
  thumbnail_path TEXT, -- サムネイルパス
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 楽譜編集履歴テーブル
CREATE TABLE IF NOT EXISTS score_edits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  score_id UUID REFERENCES scores(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  edit_type TEXT NOT NULL CHECK (edit_type IN ('drawing', 'text', 'stamp', 'highlight')), -- 編集タイプ
  edit_data JSONB NOT NULL, -- 編集データ（座標、色、テキストなど）
  page_number INTEGER DEFAULT 1, -- ページ番号
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 楽譜コメントテーブル
CREATE TABLE IF NOT EXISTS score_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  score_id UUID REFERENCES scores(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  comment TEXT NOT NULL, -- コメント内容
  page_number INTEGER DEFAULT 1, -- ページ番号
  x_position FLOAT, -- X座標
  y_position FLOAT, -- Y座標
  parent_comment_id UUID REFERENCES score_comments(id) ON DELETE CASCADE, -- 親コメント（スレッド用）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 録音メモテーブル
CREATE TABLE IF NOT EXISTS audio_memos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  score_id UUID REFERENCES scores(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  audio_path TEXT NOT NULL, -- 音声ファイルパス
  duration_seconds INTEGER NOT NULL, -- 録音時間（秒）
  page_number INTEGER DEFAULT 1, -- ページ番号
  x_position FLOAT, -- X座標
  y_position FLOAT, -- Y座標
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_rooms_room_id ON rooms(room_id);
CREATE INDEX IF NOT EXISTS idx_rooms_parent_room_id ON rooms(parent_room_id);
CREATE INDEX IF NOT EXISTS idx_room_members_room_id ON room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_room_members_user_id ON room_members(user_id);
CREATE INDEX IF NOT EXISTS idx_scores_room_id ON scores(room_id);
CREATE INDEX IF NOT EXISTS idx_score_edits_score_id ON score_edits(score_id);
CREATE INDEX IF NOT EXISTS idx_score_comments_score_id ON score_comments(score_id);

-- RLS（Row Level Security）の有効化
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_edits ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_memos ENABLE ROW LEVEL SECURITY;

-- RLSポリシーの作成
-- 部屋の閲覧（メンバーのみ）
CREATE POLICY "Room members can view rooms" ON rooms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM room_members 
      WHERE room_members.room_id = rooms.id 
      AND room_members.user_id = auth.uid()
    )
  );

-- 部屋の作成（認証ユーザーのみ）
CREATE POLICY "Authenticated users can create rooms" ON rooms
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 部屋の更新（管理者・作成者のみ）
CREATE POLICY "Room admins can update rooms" ON rooms
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM room_members 
      WHERE room_members.room_id = rooms.id 
      AND room_members.user_id = auth.uid()
      AND room_members.role = 'admin'
    ) OR created_by = auth.uid()
  );

-- 部屋の削除（作成者のみ）
CREATE POLICY "Room creators can delete rooms" ON rooms
  FOR DELETE USING (created_by = auth.uid());

-- 部屋メンバーの管理（部屋管理者のみ）
CREATE POLICY "Room admins can manage members" ON room_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM room_members rm
      WHERE rm.room_id = room_members.room_id 
      AND rm.user_id = auth.uid()
      AND rm.role = 'admin'
    )
  );

-- 自分のメンバー情報の閲覧
CREATE POLICY "Users can view own membership" ON room_members
  FOR SELECT USING (user_id = auth.uid());

-- 楽譜の閲覧（部屋メンバーのみ）
CREATE POLICY "Room members can view scores" ON scores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM room_members 
      WHERE room_members.room_id = scores.room_id 
      AND room_members.user_id = auth.uid()
    )
  );

-- 楽譜のアップロード（部屋メンバーのみ）
CREATE POLICY "Room members can upload scores" ON scores
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM room_members 
      WHERE room_members.room_id = scores.room_id 
      AND room_members.user_id = auth.uid()
    )
  );

-- 楽譜の更新・削除（アップロード者のみ）
CREATE POLICY "Score uploaders can manage scores" ON scores
  FOR ALL USING (uploaded_by = auth.uid());

-- 編集履歴の閲覧・作成（部屋メンバーのみ）
CREATE POLICY "Room members can manage score edits" ON score_edits
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM room_members rm
      JOIN scores s ON s.id = score_edits.score_id
      WHERE rm.room_id = s.room_id 
      AND rm.user_id = auth.uid()
    )
  );

-- コメントの閲覧・作成（部屋メンバーのみ）
CREATE POLICY "Room members can manage comments" ON score_comments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM room_members rm
      JOIN scores s ON s.id = score_comments.score_id
      WHERE rm.room_id = s.room_id 
      AND rm.user_id = auth.uid()
    )
  );

-- 録音メモの閲覧・作成（部屋メンバーのみ）
CREATE POLICY "Room members can manage audio memos" ON audio_memos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM room_members rm
      JOIN scores s ON s.id = audio_memos.score_id
      WHERE rm.room_id = s.room_id 
      AND rm.user_id = auth.uid()
    )
  );

-- 更新日時を自動更新するトリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_rooms_updated_at
    BEFORE UPDATE ON rooms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scores_updated_at
    BEFORE UPDATE ON scores
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_score_comments_updated_at
    BEFORE UPDATE ON score_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
