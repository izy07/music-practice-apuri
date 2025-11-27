-- room_members のINSERTが許可されていなかった問題を修正

-- 既存の該当ポリシーを除去
DROP POLICY IF EXISTS "Allow room creators to manage members" ON room_members;
DROP POLICY IF EXISTS "Allow users to view their own memberships" ON room_members;
DROP POLICY IF EXISTS "Allow creators to add members" ON room_members;
DROP POLICY IF EXISTS "Allow users to join themselves" ON room_members;

-- SELECT: 自分のメンバー情報は閲覧可能
CREATE POLICY "Allow users to view their own memberships" ON room_members
  FOR SELECT USING (user_id = auth.uid());

-- ALL: クリエイターは管理可能（SELECT/UPDATE/DELETE用途）
CREATE POLICY "Allow room creators to manage members" ON room_members
  FOR ALL USING (
    room_id IN (
      SELECT id FROM rooms WHERE created_by = auth.uid()
    )
  );

-- INSERT: クリエイターはメンバーを追加可能
CREATE POLICY "Allow creators to add members" ON room_members
  FOR INSERT WITH CHECK (
    room_id IN (
      SELECT id FROM rooms WHERE created_by = auth.uid()
    )
  );

-- INSERT: ユーザー本人は自分自身として参加可能
CREATE POLICY "Allow users to join themselves" ON room_members
  FOR INSERT WITH CHECK (user_id = auth.uid());


