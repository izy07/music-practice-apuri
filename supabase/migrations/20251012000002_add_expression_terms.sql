-- 発想標語を追加

-- Dolceは既存データにあるため、categoryを更新
UPDATE music_terms SET category = 'expression' WHERE LOWER(term) = 'dolce';

-- 新規用語を追加
INSERT INTO music_terms (term, reading, meaning_ja, meaning_en, description_ja, description_en, category, frequency)
SELECT 'Cantabile', 'カンタービレ', '歌うように', 'In a singing style', '歌を歌うような、なめらかで美しい表現で演奏する指示。', 'Instruction to play in a smooth, lyrical singing manner.', 'expression', 'very_common'
WHERE NOT EXISTS (SELECT 1 FROM music_terms WHERE LOWER(term) = 'cantabile')
UNION ALL
SELECT 'Con brio', 'コン・ブリオ', '活気をもって', 'With vigor', '活気に満ちた、生き生きとした表現で演奏する指示。', 'Instruction to play with vigor, spirit and liveliness.', 'expression', 'common'
WHERE NOT EXISTS (SELECT 1 FROM music_terms WHERE LOWER(term) = 'con brio')
UNION ALL
SELECT 'Maestoso', 'マエストーソ', '荘厳に、威厳をもって', 'Majestically', '荘厳で威厳のある、堂々とした表現で演奏する指示。', 'Instruction to play majestically with dignity and grandeur.', 'expression', 'common'
WHERE NOT EXISTS (SELECT 1 FROM music_terms WHERE LOWER(term) = 'maestoso')
UNION ALL
SELECT 'Appassionato', 'アパッショナート', '情熱的に', 'Passionately', '情熱的で感情豊かに演奏する指示。', 'Instruction to play with passion and intense emotion.', 'expression', 'common'
WHERE NOT EXISTS (SELECT 1 FROM music_terms WHERE LOWER(term) = 'appassionato');

