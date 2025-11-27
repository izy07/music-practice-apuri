/*
  # 初期データの挿入

  1. 楽器マスターデータ
  2. 音楽用語辞典データ
*/

-- 楽器マスターデータの挿入
INSERT INTO instruments (name, name_en, color_primary, color_secondary, color_accent) VALUES
  ('ピアノ', 'piano', '#2196F3', '#BBDEFB', '#1976D2'),
  ('ギター', 'guitar', '#03A9F4', '#B3E5FC', '#0288D1'),
  ('バイオリン', 'violin', '#00BCD4', '#B2EBF2', '#0097A7'),
  ('フルート', 'flute', '#9C27B0', '#E1BEE7', '#7B1FA2'),
  ('トランペット', 'trumpet', '#FF5722', '#FFCCBC', '#E64A19'),
  ('打楽器', 'drums', '#795548', '#D7CCC8', '#5D4037'),
  ('サックス', 'saxophone', '#607D8B', '#CFD8DC', '#455A64'),
  ('ホルン', 'horn', '#3F51B5', '#C5CAE9', '#303F9F'),
  ('クラリネット', 'clarinet', '#009688', '#B2DFDB', '#00796B'),
  ('チューバ', 'tuba', '#8D6E63', '#D7CCC8', '#6D4C41'),
  ('チェロ', 'cello', '#6A4C93', '#D1C4E9', '#512DA8'),
  ('ファゴット', 'bassoon', '#A1887F', '#D7CCC8', '#8D6E63'),
  ('トロンボーン', 'trombone', '#FF7043', '#FFCCBC', '#E64A19'),
  ('オーボエ', 'oboe', '#66BB6A', '#C8E6C9', '#43A047'),
  ('ハープ', 'harp', '#26A69A', '#B2DFDB', '#00897B'),
  ('コントラバス', 'contrabass', '#5D4037', '#D7CCC8', '#3E2723'),
  ('その他', 'other', '#9E9E9E', '#F5F5F5', '#757575');

-- 音楽用語辞典データの挿入
INSERT INTO music_terms (term, reading, category, meaning_ja, meaning_en, description_ja, description_en) VALUES
('Allegro', 'アレグロ', 'tempo', '快速に、生き生きと', 'Fast, lively', '一般的に速いテンポを指示する音楽用語', 'A musical term indicating a fast tempo'),
('Andante', 'アンダンテ', 'tempo', '歩くような速さで', 'Walking pace', '中程度のテンポを表す用語', 'A musical term indicating a moderate tempo'),
('Forte', 'フォルテ', 'dynamics', '強く', 'Loud', '音量を強く演奏することを指示', 'Indicates to play loudly'),
('Piano', 'ピアノ', 'dynamics', '弱く', 'Soft', '音量を弱く演奏することを指示', 'Indicates to play softly'),
('Legato', 'レガート', 'articulation', 'なめらかに', 'Smooth', '音と音をつなげて滑らかに演奏する奏法', 'A smooth, connected style of playing'),
('Staccato', 'スタッカート', 'articulation', '短く切って', 'Detached', '音を短く切って演奏する奏法', 'A detached, crisp style of playing'),
('Pizzicato', 'ピッツィカート', 'technique', '指で弦をはじく', 'Pluck strings', '弦楽器で弓を使わずに指で弦をはじく奏法', 'Playing strings by plucking with fingers'),
('Crescendo', 'クレッシェンド', 'dynamics', 'だんだん強く', 'Gradually louder', '音量を徐々に大きくしていく', 'Gradually increasing in volume');