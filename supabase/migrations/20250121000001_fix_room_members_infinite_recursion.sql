-- room_membersテーブルの無限再帰ポリシーを完全に修正

-- 既存のすべてのポリシーを削除
DROP POLICY IF EXISTS "Room creators can manage members" ON room_members;
DROP POLICY IF EXISTS "Users can manage own membership" ON room_members;
DROP POLICY IF EXISTS "Users can view own membership" ON room_members;
DROP POLICY IF EXISTS "Room creators and members can add members" ON room_members;
DROP POLICY IF EXISTS "Room admins can manage members" ON room_members;

-- シンプルで安全なポリシーを作成
-- 1. 自分のメンバー情報の閲覧・更新
CREATE POLICY "Users can view own membership" ON room_members
  FOR SELECT USING (user_id = auth.uid());

-- 2. 自分のメンバー情報の更新
CREATE POLICY "Users can update own membership" ON room_members
  FOR UPDATE USING (user_id = auth.uid());

-- 3. 部屋作成者のみがメンバーを管理可能
CREATE POLICY "Room creators can manage members" ON room_members
  FOR ALL USING (
    room_id IN (
      SELECT id FROM rooms 
      WHERE created_by = auth.uid()
    )
  );

-- 4. メンバー追加は部屋作成者のみ
CREATE POLICY "Room creators can add members" ON room_members
  FOR INSERT WITH CHECK (
    room_id IN (
      SELECT id FROM rooms 
      WHERE created_by = auth.uid()
    )
  );

-- 5. メンバー削除は部屋作成者のみ
CREATE POLICY "Room creators can remove members" ON room_members
  FOR DELETE USING (
    room_id IN (
      SELECT id FROM rooms 
      WHERE created_by = auth.uid()
    )
  );
