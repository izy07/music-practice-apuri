-- 外部キー制約を復元（安全のため NOT VALID で追加後に検証）

-- rooms.created_by -> auth.users(id)
ALTER TABLE rooms
  ADD CONSTRAINT rooms_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES auth.users(id)
  ON DELETE CASCADE
  NOT VALID;

-- rooms.parent_room_id -> rooms(id)
ALTER TABLE rooms
  ADD CONSTRAINT rooms_parent_room_id_fkey
  FOREIGN KEY (parent_room_id)
  REFERENCES rooms(id)
  ON DELETE CASCADE
  NOT VALID;

-- room_members.room_id -> rooms(id)
ALTER TABLE room_members
  ADD CONSTRAINT room_members_room_id_fkey
  FOREIGN KEY (room_id)
  REFERENCES rooms(id)
  ON DELETE CASCADE
  NOT VALID;

-- room_members.user_id -> auth.users(id)
ALTER TABLE room_members
  ADD CONSTRAINT room_members_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE
  NOT VALID;

-- 検証を試みる（違反がある場合は後でデータ修正の上、VALIDATE を再実行）
DO $$
BEGIN
  BEGIN
    ALTER TABLE rooms VALIDATE CONSTRAINT rooms_created_by_fkey;
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'rooms_created_by_fkey validation skipped (violations exist)';
  END;

  BEGIN
    ALTER TABLE rooms VALIDATE CONSTRAINT rooms_parent_room_id_fkey;
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'rooms_parent_room_id_fkey validation skipped (violations exist)';
  END;

  BEGIN
    ALTER TABLE room_members VALIDATE CONSTRAINT room_members_room_id_fkey;
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'room_members_room_id_fkey validation skipped (violations exist)';
  END;

  BEGIN
    ALTER TABLE room_members VALIDATE CONSTRAINT room_members_user_id_fkey;
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'room_members_user_id_fkey validation skipped (violations exist)';
  END;
END$$;


