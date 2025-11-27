-- 外部キー制約を一時的に無効化して動作確認

-- roomsテーブルの外部キー制約を削除
ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_created_by_fkey;
ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_parent_room_id_fkey;

-- room_membersテーブルの外部キー制約を削除
ALTER TABLE room_members DROP CONSTRAINT IF EXISTS room_members_room_id_fkey;
ALTER TABLE room_members DROP CONSTRAINT IF EXISTS room_members_user_id_fkey;
