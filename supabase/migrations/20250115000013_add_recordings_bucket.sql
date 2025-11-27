-- Storage バケット: recordings（公開読み取り）

-- バケット作成（存在すればスキップ）
DO $$
BEGIN
  -- バケットが存在しない場合のみ作成
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'recordings'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('recordings', 'recordings', true);
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- エラーが発生した場合はスキップ
    NULL;
END$$;

-- RLS は storage.objects に対して既定で有効

-- ポリシー作成（存在すればスキップ）
DO $$
BEGIN
  -- 公開読み取り: recordings バケット内の全オブジェクト
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public can read recordings'
  ) THEN
    CREATE POLICY "Public can read recordings" ON storage.objects
      FOR SELECT USING (bucket_id = 'recordings');
  END IF;

  -- 認証ユーザーのアップロード（insert）
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated can upload to recordings'
  ) THEN
    CREATE POLICY "Authenticated can upload to recordings" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'recordings');
  END IF;

  -- 自分のオブジェクトの更新/削除（owner が自分）
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Owner can update recordings'
  ) THEN
    CREATE POLICY "Owner can update recordings" ON storage.objects
      FOR UPDATE TO authenticated
      USING (bucket_id = 'recordings' AND owner = auth.uid())
      WITH CHECK (bucket_id = 'recordings' AND owner = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Owner can delete recordings'
  ) THEN
    CREATE POLICY "Owner can delete recordings" ON storage.objects
      FOR DELETE TO authenticated
      USING (bucket_id = 'recordings' AND owner = auth.uid());
  END IF;
END$$;


