-- 一時的にRLSを無効にして部屋作成機能をテスト

-- roomsテーブルのRLSを一時的に無効化
ALTER TABLE rooms DISABLE ROW LEVEL SECURITY;

-- room_membersテーブルのRLSを一時的に無効化
ALTER TABLE room_members DISABLE ROW LEVEL SECURITY;
