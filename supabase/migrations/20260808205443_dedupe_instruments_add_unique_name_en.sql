-- instruments の同名重複行をカノニカル UUID に統合し、再発防止の UNIQUE を追加する
-- 背景: 過去の id なし INSERT により同名行が複数 UUID で増殖していた

-- 1) アプリ側の正規 ID「その他」(…0016) を確実に存在させる
--    初期スキーマは誤って …0017 を「その他」として投入していた
INSERT INTO public.instruments (
  id, name, name_en, color_primary, color_secondary, color_accent,
  color_background, color_surface, starting_note, tuning_notes
) VALUES (
  '550e8400-e29b-41d4-a716-446655440016',
  'その他',
  'Other',
  '#4682B4',
  '#87CEEB',
  '#2F4F4F',
  '#E0F6FF',
  '#FFFFFF',
  'C4',
  to_jsonb(ARRAY['C4'])
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  name_en = EXCLUDED.name_en,
  color_primary = EXCLUDED.color_primary,
  color_secondary = EXCLUDED.color_secondary,
  color_accent = EXCLUDED.color_accent,
  color_background = EXCLUDED.color_background,
  color_surface = EXCLUDED.color_surface,
  starting_note = EXCLUDED.starting_note,
  tuning_notes = EXCLUDED.tuning_notes;

DO $$
DECLARE
  rec RECORD;
  v_canonical_id uuid;
  v_orphan_id uuid;
BEGIN
  -- 2) name_en（大小無視）ごとに「カノニカル ID」を決め、孤児 ID → カノニカルへ FK を寄せる
  CREATE TEMP TABLE tmp_instrument_remap (
    orphan_id uuid PRIMARY KEY,
    canonical_id uuid NOT NULL
  ) ON COMMIT DROP;

  -- カノニカル UUID の定義（アプリ instrumentService / instrumentUtils と一致）
  CREATE TEMP TABLE tmp_canonical_instruments (
    name_en_norm text PRIMARY KEY,
    canonical_id uuid NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO tmp_canonical_instruments (name_en_norm, canonical_id) VALUES
    ('piano', '550e8400-e29b-41d4-a716-446655440001'),
    ('guitar', '550e8400-e29b-41d4-a716-446655440002'),
    ('violin', '550e8400-e29b-41d4-a716-446655440003'),
    ('flute', '550e8400-e29b-41d4-a716-446655440004'),
    ('trumpet', '550e8400-e29b-41d4-a716-446655440005'),
    ('drums', '550e8400-e29b-41d4-a716-446655440006'),
    ('saxophone', '550e8400-e29b-41d4-a716-446655440007'),
    ('horn', '550e8400-e29b-41d4-a716-446655440008'),
    ('clarinet', '550e8400-e29b-41d4-a716-446655440009'),
    ('trombone', '550e8400-e29b-41d4-a716-446655440010'),
    ('cello', '550e8400-e29b-41d4-a716-446655440011'),
    ('bassoon', '550e8400-e29b-41d4-a716-446655440012'),
    ('oboe', '550e8400-e29b-41d4-a716-446655440013'),
    ('harp', '550e8400-e29b-41d4-a716-446655440014'),
    ('contrabass', '550e8400-e29b-41d4-a716-446655440015'),
    ('other', '550e8400-e29b-41d4-a716-446655440016'),
    ('viola', '550e8400-e29b-41d4-a716-446655440018'),
    ('koto', '550e8400-e29b-41d4-a716-446655440019'),
    ('synthesizer', '550e8400-e29b-41d4-a716-446655440020'),
    ('taiko', '550e8400-e29b-41d4-a716-446655440021'),
    ('tuba', '550e8400-e29b-41d4-a716-446655440022'),
    ('vocal', '550e8400-e29b-41d4-a716-446655440023'),
    ('conductor', '550e8400-e29b-41d4-a716-446655440024'),
    ('euphonium', '550e8400-e29b-41d4-a716-446655440025'),
    ('recorder', '550e8400-e29b-41d4-a716-446655440026');

  -- カノニカル行が無いと孤児削除で楽器自体が消えるため、先に確実に投入する
  INSERT INTO public.instruments (
    id, name, name_en, color_primary, color_secondary, color_accent,
    color_background, color_surface, starting_note, tuning_notes
  ) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'ピアノ', 'Piano', '#1A1A1A', '#C0C0C0', '#D4AF37', '#F8F6F0', '#FFFFFF', 'C4', to_jsonb(ARRAY['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'])),
    ('550e8400-e29b-41d4-a716-446655440002', 'ギター', 'Guitar', '#654321', '#DEB887', '#8B4513', '#FFF8DC', '#FFFFFF', 'E2', to_jsonb(ARRAY['E2', 'A2', 'D3', 'G3', 'B3', 'E4'])),
    ('550e8400-e29b-41d4-a716-446655440003', 'バイオリン', 'Violin', '#6B4423', '#C9A961', '#D4AF37', '#FFF8F0', '#FFFFFF', 'G3', to_jsonb(ARRAY['G3', 'D4', 'A4', 'E5'])),
    ('550e8400-e29b-41d4-a716-446655440004', 'フルート', 'Flute', '#C0C0C0', '#E6E6FA', '#A9A9A9', '#F0F8FF', '#FFFFFF', 'C4', to_jsonb(ARRAY['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'])),
    ('550e8400-e29b-41d4-a716-446655440005', 'トランペット', 'Trumpet', '#B8860B', '#DAA520', '#8B4513', '#FFE4B5', '#FFFFFF', 'C4', to_jsonb(ARRAY['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'])),
    ('550e8400-e29b-41d4-a716-446655440006', 'ドラム', 'Drums', '#000000', '#696969', '#000000', '#F5F5DC', '#FFFFFF', NULL, NULL),
    ('550e8400-e29b-41d4-a716-446655440007', 'サックス', 'Saxophone', '#FFD700', '#FFEB3B', '#FFC107', '#FFFDE7', '#FFFFFF', 'Bb3', to_jsonb(ARRAY['Bb3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'Bb4'])),
    ('550e8400-e29b-41d4-a716-446655440008', 'ホルン', 'Horn', '#8B4513', '#F4A460', '#654321', '#FFF8DC', '#FFFFFF', 'F3', to_jsonb(ARRAY['F3', 'C4', 'F4'])),
    ('550e8400-e29b-41d4-a716-446655440009', 'クラリネット', 'Clarinet', '#000000', '#2F2F2F', '#1A1A1A', '#E6E6FA', '#FFFFFF', 'E3', to_jsonb(ARRAY['E3', 'F3', 'G3', 'A3', 'B3'])),
    ('550e8400-e29b-41d4-a716-446655440010', 'トロンボーン', 'Trombone', '#C0C0C0', '#E6E6FA', '#A9A9A9', '#F0F8FF', '#FFFFFF', 'B1', to_jsonb(ARRAY['B1', 'E2', 'B2', 'E3'])),
    ('550e8400-e29b-41d4-a716-446655440011', 'チェロ', 'Cello', '#DC143C', '#FF69B4', '#8B0000', '#FFE4E1', '#FFFFFF', 'C2', to_jsonb(ARRAY['C2', 'G2', 'D3', 'A3'])),
    ('550e8400-e29b-41d4-a716-446655440012', 'ファゴット', 'Bassoon', '#A0522D', '#DEB887', '#8B4513', '#FFF8DC', '#FFFFFF', 'B1', to_jsonb(ARRAY['B1', 'C2', 'D2', 'E2'])),
    ('550e8400-e29b-41d4-a716-446655440013', 'オーボエ', 'Oboe', '#DAA520', '#F0E68C', '#B8860B', '#FFFACD', '#FFFFFF', 'C4', to_jsonb(ARRAY['C4', 'D4', 'E4', 'F4'])),
    ('550e8400-e29b-41d4-a716-446655440014', 'ハープ', 'Harp', '#FF69B4', '#FFB6C1', '#C71585', '#FFF0F5', '#FFFFFF', 'C2', to_jsonb(ARRAY['C2', 'D2', 'E2', 'F2', 'G2', 'A2', 'B2'])),
    ('550e8400-e29b-41d4-a716-446655440015', 'コントラバス', 'Contrabass', '#2F4F4F', '#708090', '#000000', '#F5F5F5', '#FFFFFF', 'E1', to_jsonb(ARRAY['E1', 'A1', 'D2', 'G2'])),
    ('550e8400-e29b-41d4-a716-446655440018', 'ヴィオラ', 'Viola', '#B22222', '#FF7F50', '#8B0000', '#FFE4E1', '#FFFFFF', 'C3', to_jsonb(ARRAY['C3', 'G3', 'D4', 'A4'])),
    ('550e8400-e29b-41d4-a716-446655440019', '琴', 'Koto', '#8B4513', '#DEB887', '#654321', '#FFF8DC', '#FFFFFF', 'D3', to_jsonb(ARRAY['D3', 'E3', 'F3', 'G3', 'A3'])),
    ('550e8400-e29b-41d4-a716-446655440020', 'シンセサイザー', 'Synthesizer', '#4169E1', '#87CEEB', '#1E90FF', '#E0F6FF', '#FFFFFF', 'C4', to_jsonb(ARRAY['C4', 'D4', 'E4', 'F4', 'G4'])),
    ('550e8400-e29b-41d4-a716-446655440021', '太鼓', 'Taiko', '#DC143C', '#FF6347', '#8B0000', '#FFE4E1', '#FFFFFF', 'C4', to_jsonb(ARRAY['C4', 'D4', 'E4'])),
    ('550e8400-e29b-41d4-a716-446655440022', 'チューバ', 'Tuba', '#8B4513', '#D2691E', '#654321', '#FFF8DC', '#FFFFFF', 'E1', to_jsonb(ARRAY['E1', 'A1', 'D2', 'F2'])),
    ('550e8400-e29b-41d4-a716-446655440023', 'ボーカル', 'Vocal', '#9C27B0', '#CE93D8', '#7B1FA2', '#F3E5F5', '#FFFFFF', 'C4', to_jsonb(ARRAY['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'])),
    ('550e8400-e29b-41d4-a716-446655440024', '指揮者', 'Conductor', '#37474F', '#78909C', '#263238', '#ECEFF1', '#FFFFFF', 'C4', to_jsonb(ARRAY['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'])),
    ('550e8400-e29b-41d4-a716-446655440025', 'ユーフォニアム', 'Euphonium', '#8B4513', '#D2691E', '#654321', '#FFF8DC', '#FFFFFF', 'B1', to_jsonb(ARRAY['B1', 'E2', 'B2', 'E3'])),
    ('550e8400-e29b-41d4-a716-446655440026', 'リコーダー', 'Recorder', '#2E7D32', '#66BB6A', '#1B5E20', '#E8F5E9', '#FFFFFF', 'C4', to_jsonb(ARRAY['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5']))
  ON CONFLICT (id) DO NOTHING;

  -- 孤児行を洗い出し（カノニカル以外、かつ同名の name_en があるもの）
  INSERT INTO tmp_instrument_remap (orphan_id, canonical_id)
  SELECT i.id, c.canonical_id
  FROM public.instruments i
  JOIN tmp_canonical_instruments c
    ON lower(trim(i.name_en)) = c.name_en_norm
  WHERE i.id <> c.canonical_id
  ON CONFLICT (orphan_id) DO NOTHING;

  -- カノニカル表に無い同名重複（例: 予期しない name_en）は、最も古い行を残して他を孤児扱い
  FOR rec IN
    SELECT lower(trim(name_en)) AS name_en_norm
    FROM public.instruments
    GROUP BY lower(trim(name_en))
    HAVING COUNT(*) > 1
  LOOP
    SELECT id INTO v_canonical_id
    FROM public.instruments
    WHERE lower(trim(name_en)) = rec.name_en_norm
    ORDER BY
      CASE WHEN id IN (SELECT c2.canonical_id FROM tmp_canonical_instruments c2) THEN 0 ELSE 1 END,
      created_at NULLS LAST,
      id
    LIMIT 1;

    FOR v_orphan_id IN
      SELECT id
      FROM public.instruments
      WHERE lower(trim(name_en)) = rec.name_en_norm
        AND id <> v_canonical_id
    LOOP
      INSERT INTO tmp_instrument_remap (orphan_id, canonical_id)
      VALUES (v_orphan_id, v_canonical_id)
      ON CONFLICT (orphan_id) DO NOTHING;
    END LOOP;
  END LOOP;

  -- 3) FK 参照をカノニカルへ寄せる（UNIQUE 衝突は孤児側を削除）
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_instrument_profiles'
  ) THEN
    DELETE FROM public.user_instrument_profiles uip
    USING tmp_instrument_remap r
    WHERE uip.instrument_id = r.orphan_id
      AND EXISTS (
        SELECT 1
        FROM public.user_instrument_profiles keep
        WHERE keep.user_id = uip.user_id
          AND keep.instrument_id = r.canonical_id
      );

    UPDATE public.user_instrument_profiles uip
    SET instrument_id = r.canonical_id
    FROM tmp_instrument_remap r
    WHERE uip.instrument_id = r.orphan_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_favorite_songs'
  ) THEN
    UPDATE public.user_favorite_songs ufs
    SET instrument_id = r.canonical_id
    FROM tmp_instrument_remap r
    WHERE ufs.instrument_id = r.orphan_id;
  END IF;

  -- カラム存在を確認してから FK を更新（ローカル/クラウドのスキーマ差に耐える）
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'selected_instrument_id'
  ) THEN
    UPDATE public.user_profiles up
    SET selected_instrument_id = r.canonical_id
    FROM tmp_instrument_remap r
    WHERE up.selected_instrument_id = r.orphan_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'goals' AND column_name = 'instrument_id'
  ) THEN
    UPDATE public.goals g
    SET instrument_id = r.canonical_id
    FROM tmp_instrument_remap r
    WHERE g.instrument_id = r.orphan_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'practice_sessions' AND column_name = 'instrument_id'
  ) THEN
    UPDATE public.practice_sessions ps
    SET instrument_id = r.canonical_id
    FROM tmp_instrument_remap r
    WHERE ps.instrument_id = r.orphan_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'recordings' AND column_name = 'instrument_id'
  ) THEN
    UPDATE public.recordings recs
    SET instrument_id = r.canonical_id
    FROM tmp_instrument_remap r
    WHERE recs.instrument_id = r.orphan_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'my_songs' AND column_name = 'instrument_id'
  ) THEN
    UPDATE public.my_songs ms
    SET instrument_id = r.canonical_id
    FROM tmp_instrument_remap r
    WHERE ms.instrument_id = r.orphan_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'instrument_id'
  ) THEN
    UPDATE public.events e
    SET instrument_id = r.canonical_id
    FROM tmp_instrument_remap r
    WHERE e.instrument_id = r.orphan_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'instrument_id'
  ) THEN
    UPDATE public.tasks t
    SET instrument_id = r.canonical_id
    FROM tmp_instrument_remap r
    WHERE t.instrument_id = r.orphan_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'representative_songs' AND column_name = 'instrument_id'
  ) THEN
    UPDATE public.representative_songs rs
    SET instrument_id = r.canonical_id
    FROM tmp_instrument_remap r
    WHERE rs.instrument_id = r.orphan_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'practice_menus' AND column_name = 'instrument_id'
  ) THEN
    UPDATE public.practice_menus pm
    SET instrument_id = r.canonical_id
    FROM tmp_instrument_remap r
    WHERE pm.instrument_id = r.orphan_id;
  END IF;

  -- rewarded_ad_recordings の JSONB キー（楽器ID）も寄せる
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_profiles'
      AND column_name = 'rewarded_ad_recordings'
  ) THEN
    UPDATE public.user_profiles up
    SET rewarded_ad_recordings = (
      SELECT COALESCE(jsonb_object_agg(
        CASE
          WHEN r.canonical_id IS NOT NULL THEN r.canonical_id::text
          ELSE kv.key
        END,
        kv.value
      ), '{}'::jsonb)
      FROM jsonb_each(COALESCE(up.rewarded_ad_recordings, '{}'::jsonb)) AS kv(key, value)
      LEFT JOIN tmp_instrument_remap r ON r.orphan_id::text = kv.key
    )
    WHERE up.rewarded_ad_recordings IS NOT NULL
      AND up.rewarded_ad_recordings <> '{}'::jsonb;
  END IF;

  -- 4) 孤児行を削除
  DELETE FROM public.instruments i
  USING tmp_instrument_remap r
  WHERE i.id = r.orphan_id;

  -- 5) name_en を正規表記に揃える（UNIQUE 前の揺れ吸収）
  UPDATE public.instruments i
  SET name_en = CASE c.name_en_norm
    WHEN 'piano' THEN 'Piano'
    WHEN 'guitar' THEN 'Guitar'
    WHEN 'violin' THEN 'Violin'
    WHEN 'flute' THEN 'Flute'
    WHEN 'trumpet' THEN 'Trumpet'
    WHEN 'drums' THEN 'Drums'
    WHEN 'saxophone' THEN 'Saxophone'
    WHEN 'horn' THEN 'Horn'
    WHEN 'clarinet' THEN 'Clarinet'
    WHEN 'trombone' THEN 'Trombone'
    WHEN 'cello' THEN 'Cello'
    WHEN 'bassoon' THEN 'Bassoon'
    WHEN 'oboe' THEN 'Oboe'
    WHEN 'harp' THEN 'Harp'
    WHEN 'contrabass' THEN 'Contrabass'
    WHEN 'other' THEN 'Other'
    WHEN 'viola' THEN 'Viola'
    WHEN 'koto' THEN 'Koto'
    WHEN 'synthesizer' THEN 'Synthesizer'
    WHEN 'taiko' THEN 'Taiko'
    WHEN 'tuba' THEN 'Tuba'
    WHEN 'vocal' THEN 'Vocal'
    WHEN 'conductor' THEN 'Conductor'
    WHEN 'euphonium' THEN 'Euphonium'
    WHEN 'recorder' THEN 'Recorder'
    ELSE i.name_en
  END
  FROM tmp_canonical_instruments c
  WHERE i.id = c.canonical_id;

  RAISE NOTICE 'instruments dedupe complete: % orphan rows remapped',
    (SELECT COUNT(*) FROM tmp_instrument_remap);
END $$;

-- 6) 再発防止: name_en の一意制約（大小無視）
CREATE UNIQUE INDEX IF NOT EXISTS idx_instruments_name_en_unique
  ON public.instruments (lower(trim(name_en)));

COMMENT ON INDEX public.idx_instruments_name_en_unique IS
  '楽器の英語名の重複を防止（大小・前後空白を無視）';
