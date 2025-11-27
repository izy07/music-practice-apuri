-- メンデルスゾーン / ヴァイオリン協奏曲 ホ短調 Op.64 第1楽章（Hilary Hahn）を登録/更新
DO $$
DECLARE
  v_violin_id uuid;
  v_exists boolean;
BEGIN
  SELECT id INTO v_violin_id FROM instruments WHERE name = 'バイオリン' OR name_en = 'Violin' LIMIT 1;
  IF v_violin_id IS NULL THEN
    RETURN;
  END IF;

  -- 既存行の有無を確認（タイトル類似）
  SELECT EXISTS (
    SELECT 1 FROM representative_songs
    WHERE instrument_id = v_violin_id
      AND composer IN ('フェリックス・メンデルスゾーン','メンデルスゾーン','Felix Mendelssohn')
      AND (
        title ILIKE '%ヴァイオリン協奏曲%第1楽章%'
        OR title ILIKE '%メンデルスゾーン%第1楽章%'
        OR title ILIKE '%Violin Concerto%Op.64%1%'
      )
  ) INTO v_exists;

  IF v_exists THEN
    UPDATE representative_songs
    SET famous_performer = 'Hilary Hahn',
        famous_video_url = 'https://youtu.be/vzbC39utkTw?si=cmOctF7thKAjy66Z'
    WHERE instrument_id = v_violin_id
      AND composer IN ('フェリックス・メンデルスゾーン','メンデルスゾーン','Felix Mendelssohn')
      AND (
        title ILIKE '%ヴァイオリン協奏曲%第1楽章%'
        OR title ILIKE '%メンデルスゾーン%第1楽章%'
        OR title ILIKE '%Violin Concerto%Op.64%1%'
      );
  ELSE
    INSERT INTO representative_songs (
      instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, famous_performer, famous_video_url, is_popular, display_order
    ) VALUES (
      v_violin_id,
      'ヴァイオリン協奏曲 ホ短調 Op.64 第1楽章',
      'フェリックス・メンデルスゾーン',
      'ロマン派',
      '協奏曲',
      4,
      'https://youtu.be/vzbC39utkTw?si=cmOctF7thKAjy66Z',
      'ロマン派を代表する名協奏曲。第1楽章は情熱的で技巧的な名場面が続く。',
      'Hilary Hahn',
      'https://youtu.be/vzbC39utkTw?si=cmOctF7thKAjy66Z',
      true,
      60
    );
  END IF;
END $$;
