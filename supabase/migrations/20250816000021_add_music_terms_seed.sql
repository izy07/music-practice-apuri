-- Seed 50 additional music terms (headwords) into music_terms
-- Safe to run multiple times (unique index + ON CONFLICT DO NOTHING)

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' AND indexname = 'idx_music_terms_term_unique'
  ) THEN
    CREATE UNIQUE INDEX idx_music_terms_term_unique ON public.music_terms (lower(term));
  END IF;
END $$;

-- Insert terms
INSERT INTO public.music_terms (term, reading, category, meaning_ja, meaning_en, description_ja, description_en, created_at)
VALUES
  ('Accelerando', 'アッチェレランド', 'tempo', 'だんだん速く', 'gradually faster', NULL, NULL, now()),
  ('Adagio', 'アダージョ', 'tempo', 'ゆっくりと', 'slowly', NULL, NULL, now()),
  ('Allegro', 'アレグロ', 'tempo', '快活に、速く', 'lively, fast', NULL, NULL, now()),
  ('Andante', 'アンダンテ', 'tempo', '歩く速さで', 'at a walking pace', NULL, NULL, now()),
  ('Agitato', 'アジタート', 'other', '激しく、落ち着かずに', 'agitated', NULL, NULL, now()),
  ('Appassionato', 'アパッショナート', 'other', '情熱的に', 'passionately', NULL, NULL, now()),
  ('A tempo', 'ア・テンポ', 'other', '元の速さで', 'back to the original tempo', NULL, NULL, now()),
  ('Attacca', 'アタッカ', 'other', '切れ目なく続けて', 'proceed without pause', NULL, NULL, now()),
  ('Bravura', 'ブラヴーラ', 'other', '華やかに巧みに', 'with bravura', NULL, NULL, now()),
  ('Crescendo', 'クレッシェンド', 'dynamics', 'だんだん強く', 'gradually louder', NULL, NULL, now()),
  ('Diminuendo', 'ディミヌエンド', 'dynamics', 'だんだん弱く', 'gradually softer', NULL, NULL, now()),
  ('Dolce', 'ドルチェ', 'other', '甘くやさしく', 'sweetly, softly', NULL, NULL, now()),
  ('Espressivo', 'エスプレッシーヴォ', 'other', '表情豊かに', 'expressively', NULL, NULL, now()),
  ('Fermata', 'フェルマータ', 'other', '音や休符を延長する記号', 'hold or pause', NULL, NULL, now()),
  ('Forte', 'フォルテ', 'dynamics', '強く', 'loud', NULL, NULL, now()),
  ('Fortissimo', 'フォルティッシモ', 'dynamics', '非常に強く', 'very loud', NULL, NULL, now()),
  ('Fortepiano', 'フォルテピアノ', 'dynamics', '強く直後に弱く', 'loud then immediately soft', NULL, NULL, now()),
  ('Glissando', 'グリッサンド', 'articulation', 'すべるように音を移動', 'gliding between notes', NULL, NULL, now()),
  ('Grave', 'グラーヴェ', 'tempo', '荘重に、きわめて遅く', 'very slow, solemn', NULL, NULL, now()),
  ('Grazioso', 'グラツィオーソ', 'other', '優雅に', 'gracefully', NULL, NULL, now()),
  ('Legato', 'レガート', 'articulation', 'なめらかに', 'smoothly connected', NULL, NULL, now()),
  ('Marcato', 'マルカート', 'articulation', 'はっきりと、強調して', 'marked, accented', NULL, NULL, now()),
  ('Maestoso', 'マエストーソ', 'other', '荘厳に', 'majestic', NULL, NULL, now()),
  ('Mezzo forte', 'メッゾ・フォルテ', 'dynamics', '中くらいに強く', 'moderately loud', NULL, NULL, now()),
  ('Mezzo piano', 'メッゾ・ピアノ', 'dynamics', '中くらいに弱く', 'moderately soft', NULL, NULL, now()),
  ('Moderato', 'モデラート', 'tempo', '中くらいの速さで', 'moderate tempo', NULL, NULL, now()),
  ('Morendo', 'モレンド', 'other', '消えるように弱く遅く', 'dying away', NULL, NULL, now()),
  ('Molto', 'モルト', 'other', '非常に、とても', 'very, much', NULL, NULL, now()),
  ('Ostinato', 'オスティナート', 'other', '執拗に繰り返す低音／型', 'persistent repeated pattern', NULL, NULL, now()),
  ('Pianissimo', 'ピアニッシモ', 'dynamics', '非常に弱く', 'very soft', NULL, NULL, now()),
  ('Piano', 'ピアノ', 'dynamics', '弱く', 'soft', NULL, NULL, now()),
  ('Pizzicato', 'ピチカート', 'articulation', '弦をはじいて', 'plucked', NULL, NULL, now()),
  ('Poco a poco', 'ポーコ・ア・ポーコ', 'other', '少しずつ', 'little by little', NULL, NULL, now()),
  ('Portamento', 'ポルタメント', 'articulation', '滑らかに音を運ぶ', 'portamento', NULL, NULL, now()),
  ('Presto', 'プレスト', 'tempo', 'きわめて速く', 'very fast', NULL, NULL, now()),
  ('Rallentando', 'ラッレンタンド', 'tempo', 'だんだん遅く', 'gradually slower', NULL, NULL, now()),
  ('Ritardando', 'リタルダンド', 'tempo', 'だんだん遅く', 'gradually slower', NULL, NULL, now()),
  ('Rubato', 'ルバート', 'other', 'テンポを自由にゆらして', 'with expressive freedom of tempo', NULL, NULL, now()),
  ('Scherzando', 'スケルツァンド', 'other', 'おどけて、陽気に', 'playfully', NULL, NULL, now()),
  ('Sforzando', 'スフォルツァンド', 'dynamics', '突強音、特に強く', 'sudden strong accent', NULL, NULL, now()),
  ('Smorzando', 'ズモルツァンド', 'other', 'だんだん弱く消えるように', 'fading away', NULL, NULL, now()),
  ('Staccato', 'スタッカート', 'articulation', '切って、短く', 'detached, short', NULL, NULL, now()),
  ('Subito', 'スビト', 'other', '突然に', 'suddenly', NULL, NULL, now()),
  ('Tenuto', 'テヌート', 'articulation', '保って、十分に音価を', 'held for full value', NULL, NULL, now()),
  ('Tranquillo', 'トランクィッロ', 'other', '穏やかに', 'calmly, tranquilly', NULL, NULL, now()),
  ('Vivace', 'ヴィヴァーチェ', 'tempo', '生き生きと速く', 'lively, brisk', NULL, NULL, now()),
  ('Vibrato', 'ヴィブラート', 'articulation', '音を微妙に揺らして', 'vibrato', NULL, NULL, now()),
  ('Da capo', 'ダ・カーポ', 'other', '最初に戻る', 'from the beginning', NULL, NULL, now()),
  ('Dal segno', 'ダル・セーニョ', 'other', 'セーニョ記号に戻る', 'from the sign', NULL, NULL, now()),
  ('Fine', 'フィーネ', 'other', '終わり', 'the end', NULL, NULL, now()),
  ('Coda', 'コーダ', 'other', '楽曲の結尾部', 'coda, ending section', NULL, NULL, now())
ON CONFLICT (lower(term)) DO NOTHING;


