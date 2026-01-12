-- バイオリンの「情熱大陸」のYouTube URLを更新
-- Supabase StudioのSQL Editorで実行してください

UPDATE representative_songs
SET youtube_url = 'https://youtu.be/53B3ZrhfnOA?si=t9w-kYjKUca_32X'
WHERE instrument_id = '550e8400-e29b-41d4-a716-446655440003'
  AND title = '情熱大陸'
  AND composer = '葉加瀬太郎';
