-- バイオリンの削除された代表曲をデータベースから削除
-- Supabase StudioのSQL Editorで実行してください

-- 四季「春」を削除
DELETE FROM representative_songs
WHERE instrument_id = '550e8400-e29b-41d4-a716-446655440003'
  AND (title = '四季「春」' OR title = '四季より「春」')
  AND composer = 'アントニオ・ヴィヴァルディ';

-- カノン（パッヘルベル）を削除（もし存在する場合）
DELETE FROM representative_songs
WHERE instrument_id = '550e8400-e29b-41d4-a716-446655440003'
  AND title = 'カノン'
  AND composer = 'パッヘルベル';

-- サマータイム（ガーシュウィン）を削除（もし存在する場合）
DELETE FROM representative_songs
WHERE instrument_id = '550e8400-e29b-41d4-a716-446655440003'
  AND title = 'サマータイム'
  AND composer = 'ガーシュウィン';

-- ハバネラ（ビゼー）を削除（もし存在する場合）
DELETE FROM representative_songs
WHERE instrument_id = '550e8400-e29b-41d4-a716-446655440003'
  AND title = 'ハバネラ'
  AND composer = 'ジョルジュ・ビゼー';

-- ユーモレスク（ドヴォルザーク）を削除（もし存在する場合）
DELETE FROM representative_songs
WHERE instrument_id = '550e8400-e29b-41d4-a716-446655440003'
  AND title = 'ユーモレスク'
  AND composer = 'アントニン・ドヴォルザーク';
