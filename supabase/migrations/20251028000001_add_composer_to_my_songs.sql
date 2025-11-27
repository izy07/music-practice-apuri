-- my_songsテーブルにcomposerカラムを追加

-- composerカラムを追加（artistカラムの補足として）
ALTER TABLE my_songs 
  ADD COLUMN IF NOT EXISTS composer TEXT;

-- 既存のレコードがある場合、composerカラムが空の場合はartistと同じ値を設定
UPDATE my_songs 
  SET composer = artist 
  WHERE composer IS NULL;

