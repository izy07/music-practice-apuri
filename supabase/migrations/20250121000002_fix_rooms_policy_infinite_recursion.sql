-- roomsテーブルの無限再帰ポリシーを修正

-- 既存のすべてのポリシーを削除
DROP POLICY IF EXISTS "Room members can view rooms" ON rooms;
DROP POLICY IF EXISTS "Room admins can update rooms" ON rooms;
DROP POLICY IF EXISTS "Room creators can delete rooms" ON rooms;
DROP POLICY IF EXISTS "Authenticated users can create rooms" ON rooms;

-- シンプルで安全なポリシーを作成
-- 1. 部屋の作成（認証済みユーザーなら誰でも）
CREATE POLICY "Authenticated users can create rooms" ON rooms
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 2. 部屋の閲覧（メンバーのみ）- 直接的なメンバーシップチェック
CREATE POLICY "Room members can view rooms" ON rooms
  FOR SELECT USING (
    id IN (
      SELECT room_id FROM room_members 
      WHERE user_id = auth.uid()
    )
  );

-- 3. 部屋の更新（作成者のみ）
CREATE POLICY "Room creators can update rooms" ON rooms
  FOR UPDATE USING (created_by = auth.uid());

-- 4. 部屋の削除（作成者のみ）
CREATE POLICY "Room creators can delete rooms" ON rooms
  FOR DELETE USING (created_by = auth.uid());
