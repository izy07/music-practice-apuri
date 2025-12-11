-- カラムの存在をチェックするRPC関数を作成
-- エラーを発生させずにカラムの存在を確認できる

CREATE OR REPLACE FUNCTION check_column_exists(
  table_schema_name TEXT,
  table_name_param TEXT,
  column_name_param TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = table_schema_name
      AND table_name = table_name_param
      AND column_name = column_name_param
  );
END;
$$;

-- 関数にコメントを追加
COMMENT ON FUNCTION check_column_exists IS '指定されたテーブルのカラムが存在するかチェックする関数。エラーを発生させずにカラムの存在を確認できる。';

-- 匿名ユーザーがこの関数を実行できるように権限を付与
GRANT EXECUTE ON FUNCTION check_column_exists TO anon;
GRANT EXECUTE ON FUNCTION check_column_exists TO authenticated;




