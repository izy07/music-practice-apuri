-- 音楽用語辞典に用語を追加

-- frequencyカラムを追加
ALTER TABLE music_terms ADD COLUMN IF NOT EXISTS frequency TEXT CHECK (frequency IN ('rare', 'common', 'very_common'));

-- カテゴリ制約を拡張
ALTER TABLE music_terms DROP CONSTRAINT IF EXISTS music_terms_category_check;
ALTER TABLE music_terms ADD CONSTRAINT music_terms_category_check 
  CHECK (category IN ('tempo', 'dynamics', 'expression', 'articulation', 'accidental', 'technique', 'other', '基本用語', '楽器用語', '演奏用語', '音楽理論', '記譜法', '楽器名', '指揮用語', '民族音楽', '現代音楽', '古典音楽', '楽器製作用語', '編成用語', '形式用語'));

-- 再頻出（very_common）の用語を追加
INSERT INTO music_terms (term, reading, category, meaning_ja, meaning_en, description_ja, description_en, frequency) VALUES
-- 基本用語
('テンポ', 'テンポ', '基本用語', '音楽の速さ', 'Tempo', '音楽の演奏速度を表す。BPM（Beats Per Minute）で表されることが多い。', 'The speed or pace of music, often measured in BPM (Beats Per Minute).', 'very_common'),
('リズム', 'リズム', '基本用語', '音楽の時間的なパターン', 'Rhythm', '音の長さや強弱の時間的な配置によって生まれる音楽の基本的な要素。', 'The pattern of sounds and silences in music, created by the arrangement of note lengths and accents.', 'very_common'),
('メロディー', 'メロディー', '基本用語', '旋律', 'Melody', '音楽の主旋律となる音の連続。最も印象に残りやすい音楽の要素。', 'A sequence of musical notes that form the main tune of a piece of music.', 'very_common'),
('ハーモニー', 'ハーモニー', '基本用語', '和音・和声', 'Harmony', '複数の音が同時に響くことで生まれる音の調和。コード進行とも関連する。', 'The combination of different musical notes played simultaneously to create chords and chord progressions.', 'very_common'),
('ダイナミクス', 'ダイナミクス', '基本用語', '音量の変化', 'Dynamics', '音楽における音量の強弱。フォルテ（強く）、ピアノ（弱く）などで表現される。', 'The variation in loudness between notes or phrases in music.', 'very_common'),

-- 楽器用語
('チューニング', 'チューニング', '楽器用語', '調律・音合わせ', 'Tuning', '楽器の音程を正しい高さに合わせること。練習前の必須作業。', 'The process of adjusting the pitch of musical instruments to match a standard.', 'very_common'),
('ポジション', 'ポジション', '楽器用語', '手の位置', 'Position', '弦楽器で左手の位置を示す用語。1stポジション、2ndポジションなど。', 'The position of the left hand on string instruments, indicating which fret or position to play.', 'very_common'),
('ボウイング', 'ボウイング', '楽器用語', '弓の使い方', 'Bowing', '弦楽器での弓の動かし方。アップボウ、ダウンボウ、レガートなど。', 'The technique of moving the bow across strings in string instruments.', 'very_common'),

-- 演奏用語
('レガート', 'レガート', '演奏用語', 'なめらかに', 'Legato', '音と音の間を切れ目なく、なめらかに演奏すること。', 'Playing notes smoothly and connectedly without breaks between them.', 'very_common'),
('スタッカート', 'スタッカート', '演奏用語', '短く切って', 'Staccato', '音を短く切って演奏すること。音符の上に点を付けて表す。', 'Playing notes in a detached, short manner, indicated by dots above or below notes.', 'very_common'),
('アクセント', 'アクセント', '演奏用語', '強調', 'Accent', '特定の音を他の音よりも強く演奏すること。', 'Emphasizing a particular note by playing it louder than surrounding notes.', 'very_common'),
('フェルマータ', 'フェルマータ', '演奏用語', '延長記号', 'Fermata', '音符や休符の上に付ける記号で、その音を任意の長さだけ延長する。', 'A symbol placed over a note or rest to indicate that it should be held for an indefinite duration.', 'very_common'),

-- 頻出（common）の用語を追加
('アーティキュレーション', 'アーティキュレーション', '演奏用語', '音の切り方', 'Articulation', '音の出し方や切り方を表現する技術。レガート、スタッカート、アクセントなど。', 'The manner in which musical notes are played, including legato, staccato, and accent techniques.', 'common'),
('クレッシェンド', 'クレッシェンド', '演奏用語', 'だんだん強く', 'Crescendo', '音量を徐々に大きくしていくこと。記号は＜で表される。', 'Gradually increasing the volume of music, indicated by the symbol <.', 'common'),
('デクレッシェンド', 'デクレッシェンド', '演奏用語', 'だんだん弱く', 'Decrescendo', '音量を徐々に小さくしていくこと。記号は＞で表される。', 'Gradually decreasing the volume of music, indicated by the symbol >.', 'common'),
('フォルテ', 'フォルテ', '演奏用語', '強く', 'Forte', '音量を強く演奏すること。記号はfで表される。', 'Playing music loudly, indicated by the symbol f.', 'common'),
('ピアノ', 'ピアノ', '演奏用語', '弱く', 'Piano', '音量を弱く演奏すること。記号はpで表される。', 'Playing music softly, indicated by the symbol p.', 'common'),
('メゾフォルテ', 'メゾフォルテ', '演奏用語', 'やや強く', 'Mezzo Forte', '中程度の強さで演奏すること。記号はmfで表される。', 'Playing music at a moderately loud volume, indicated by the symbol mf.', 'common'),
('メゾピアノ', 'メゾピアノ', '演奏用語', 'やや弱く', 'Mezzo Piano', '中程度の弱さで演奏すること。記号はmpで表される。', 'Playing music at a moderately soft volume, indicated by the symbol mp.', 'common'),

-- 楽器技術用語
('ビブラート', 'ビブラート', '楽器用語', '震音', 'Vibrato', '音程を細かく震わせる技術。感情表現を豊かにする。', 'A technique of rapidly varying the pitch of a note to add expressiveness.', 'common'),
('トリル', 'トリル', '演奏用語', '装飾音', 'Trill', '隣接する2つの音を素早く交互に演奏する装飾音。', 'A musical ornament consisting of a rapid alternation between two adjacent notes.', 'common'),
('グリッサンド', 'グリッサンド', '演奏用語', '滑奏', 'Glissando', '音程を滑らかに変化させながら演奏すること。', 'A continuous sliding movement from one pitch to another.', 'common'),
('ピッチカート', 'ピッチカート', '演奏用語', '指弾き', 'Pizzicato', '弦楽器で弓を使わずに指で弦を弾く奏法。', 'A playing technique where strings are plucked with fingers instead of using a bow.', 'common'),

-- 音楽理論用語
('スケール', 'スケール', '音楽理論', '音階', 'Scale', '音を一定の規則に従って並べたもの。メジャースケール、マイナースケールなど。', 'A series of musical notes in ascending or descending order.', 'common'),
('コード', 'コード', '音楽理論', '和音', 'Chord', '3つ以上の音が同時に響く音の組み合わせ。', 'A combination of three or more musical notes played simultaneously.', 'common'),
('キー', 'キー', '音楽理論', '調', 'Key', '楽曲の基本的な音階や調性。ハ長調、ト短調など。', 'The tonal center or key signature of a piece of music.', 'common'),
('調性', 'チョウセイ', '音楽理論', '音楽の調', 'Tonality', '楽曲がどの調に基づいているかを表す概念。', 'The system of tones and chords that forms the basis of a musical composition.', 'common'),

-- 稀出（rare）の用語を追加
('アッパルジュ', 'アッパルジュ', '演奏用語', '分散和音', 'Arpeggio', '和音の音を同時ではなく順次に演奏すること。', 'Playing the notes of a chord in succession rather than simultaneously.', 'rare'),
('コル・レーニョ', 'コル・レーニョ', '演奏用語', '弓の木の部分で', 'Col Legno', '弦楽器で弓の木の部分を使って弦を叩く奏法。', 'A string instrument technique where the bow is turned upside down and the wood is used to strike the strings.', 'rare'),
('スル・ポンティチェロ', 'スル・ポンティチェロ', '演奏用語', '橋の近くで', 'Sul Ponticello', '弦楽器で弓を駒（ブリッジ）の近くで演奏する奏法。特殊な音色が得られる。', 'A string technique where the bow is played near the bridge, producing a metallic, glassy sound.', 'rare'),
('スル・タスト', 'スル・タスト', '演奏用語', '指板の上で', 'Sul Tasto', '弦楽器で弓を指板の近くで演奏する奏法。柔らかい音色が得られる。', 'A string technique where the bow is played over the fingerboard, producing a soft, muted sound.', 'rare'),
('フラッタートンゲ', 'フラッタートンゲ', '演奏用語', '巻き舌奏法', 'Flatterzunge', '木管楽器での巻き舌のような特殊奏法。', 'A woodwind technique involving a flutter-tonguing effect.', 'rare'),
('ミュート', 'ミュート', '楽器用語', '弱音器', 'Mute', '楽器の音量を抑えたり音色を変えたりする装置。', 'A device used to reduce the volume or change the tone of a musical instrument.', 'rare'),
('ハーモニクス', 'ハーモニクス', '演奏用語', '倍音', 'Harmonics', '弦楽器で指を軽く触れることで得られる高音域の音。', 'High-pitched tones produced on string instruments by lightly touching the strings.', 'rare'),
('フラジオレット', 'フラジオレット', '演奏用語', '自然倍音', 'Flageolet', '弦楽器での倍音奏法の一種。', 'A harmonic technique on string instruments.', 'rare'),

-- 古典音楽用語
('リピエーノ', 'リピエーノ', '編成用語', '補強楽器', 'Ripieno', '協奏曲でソリスト以外の楽器群。', 'The full orchestra in a concerto, as opposed to the solo instruments.', 'rare'),
('コンチェルティーノ', 'コンチェルティーノ', '編成用語', '独奏楽器群', 'Concertino', '協奏曲でソロを担当する楽器群。', 'The group of solo instruments in a concerto grosso.', 'rare'),
('リトルネッロ', 'リトルネッロ', '形式用語', 'リフレイン', 'Ritornello', '協奏曲で繰り返し現れる主題部分。', 'A recurring musical passage in a concerto.', 'rare'),
('カデンツァ', 'カデンツァ', '演奏用語', '装飾的独奏部分', 'Cadenza', '協奏曲でソリストが自由に即興演奏する部分。', 'An improvised or written-out ornamental passage played by a soloist.', 'rare'),

-- 現代音楽用語
('クラスター', 'クラスター', '現代音楽', '音群', 'Cluster', '隣接する音を同時に演奏する現代音楽の技法。', 'A group of adjacent notes played simultaneously in modern music.', 'rare'),
('ミクロトーン', 'ミクロトーン', '現代音楽', '微分音', 'Microtone', '半音より小さい音程。現代音楽で使用される。', 'An interval smaller than a semitone, used in contemporary music.', 'rare'),
('プリペアド・ピアノ', 'プリペアド・ピアノ', '現代音楽', '準備されたピアノ', 'Prepared Piano', 'ピアノの弦に物体を挟んで音色を変える技法。', 'A piano with objects placed between its strings to alter its sound.', 'rare'),
('グラス・ハーモニカ', 'グラス・ハーモニカ', '楽器名', 'グラスハーモニカ', 'Glass Harmonica', 'ガラスの器を回転させて音を出す楽器。', 'A musical instrument that produces sound by rotating glass bowls.', 'rare'),

-- 民族音楽用語
('ラガ', 'ラガ', '民族音楽', 'インド古典音楽の旋律', 'Raga', 'インド古典音楽における旋律の枠組み。', 'A melodic framework in Indian classical music.', 'rare'),
('タラ', 'タラ', '民族音楽', 'インド古典音楽のリズム', 'Tala', 'インド古典音楽におけるリズムの枠組み。', 'A rhythmic framework in Indian classical music.', 'rare'),
('ガムラン', 'ガムラン', '民族音楽', 'インドネシアの楽器群', 'Gamelan', 'インドネシアの伝統的な打楽器アンサンブル。', 'A traditional Indonesian percussion ensemble.', 'rare'),
('シタール', 'シタール', '楽器名', 'インドの弦楽器', 'Sitar', 'インドの代表的な弦楽器。', 'A traditional Indian string instrument.', 'rare'),

-- 楽器製作用語
('ボウ', 'ボウ', '楽器用語', '弓', 'Bow', '弦楽器を演奏するための弓。弓毛と弓身で構成される。', 'The stick with horsehair used to play string instruments.', 'common'),
('ブリッジ', 'ブリッジ', '楽器用語', '駒', 'Bridge', '弦楽器で弦を支える部品。音の伝達に重要な役割。', 'The part of a string instrument that supports the strings.', 'common'),
('ネック', 'ネック', '楽器用語', '棹', 'Neck', '弦楽器の指板部分。左手で弦を押さえる部分。', 'The part of a string instrument that extends from the body and holds the fingerboard.', 'common'),
('サウンドホール', 'サウンドホール', '楽器用語', '響孔', 'Sound Hole', '弦楽器の表板にある音を響かせるための穴。', 'The opening in the top of a string instrument that allows sound to project.', 'common'),
('フレット', 'フレット', '楽器用語', 'フレット', 'Fret', 'ギターなどの弦楽器で音程を決める金属の仕切り。', 'Metal strips on the fingerboard of fretted instruments.', 'common'),

-- 指揮用語
('テンポ・ルバート', 'テンポ・ルバート', '指揮用語', '自由なテンポ', 'Tempo Rubato', 'テンポを自由に変化させて演奏すること。', 'The expressive and rhythmically free manipulation of tempo.', 'common'),
('ア・テンポ', 'ア・テンポ', '指揮用語', '元のテンポで', 'A Tempo', 'テンポ変更の後、元のテンポに戻す指示。', 'A direction to return to the original tempo after a tempo change.', 'common'),
('リタルダンド', 'リタルダンド', '指揮用語', 'だんだん遅く', 'Ritardando', 'テンポを徐々に遅くしていくこと。', 'Gradually slowing down the tempo.', 'common'),
('アッチェレランド', 'アッチェレランド', '指揮用語', 'だんだん速く', 'Accelerando', 'テンポを徐々に速くしていくこと。', 'Gradually increasing the tempo.', 'common'),

-- 記譜法用語
('クォーター・ノート', 'クォーター・ノート', '記譜法', '四分音符', 'Quarter Note', '4分の1拍の長さの音符。', 'A note with the time value of one beat in 4/4 time.', 'common'),
('ハーフ・ノート', 'ハーフ・ノート', '記譜法', '二分音符', 'Half Note', '2分の1拍の長さの音符。', 'A note with the time value of two beats in 4/4 time.', 'common'),
('ホール・ノート', 'ホール・ノート', '記譜法', '全音符', 'Whole Note', '1拍の長さの音符。', 'A note with the time value of four beats in 4/4 time.', 'common'),
('エイト・ノート', 'エイト・ノート', '記譜法', '八分音符', 'Eighth Note', '8分の1拍の長さの音符。', 'A note with the time value of half a beat in 4/4 time.', 'common'),
('シックスティーンス・ノート', 'シックスティーンス・ノート', '記譜法', '十六分音符', 'Sixteenth Note', '16分の1拍の長さの音符。', 'A note with the time value of a quarter of a beat in 4/4 time.', 'common'),

-- 楽器名（管楽器）
('オーボエ', 'オーボエ', '楽器名', 'オーボエ', 'Oboe', 'ダブルリードの木管楽器。明るく鼻にかかった音色。', 'A double-reed woodwind instrument with a bright, nasal tone.', 'common'),
('クラリネット', 'クラリネット', '楽器名', 'クラリネット', 'Clarinet', 'シングルリードの木管楽器。豊かで柔らかい音色。', 'A single-reed woodwind instrument with a rich, warm tone.', 'common'),
('ファゴット', 'ファゴット', '楽器名', 'ファゴット', 'Bassoon', 'ダブルリードの低音楽器。深く響く音色。', 'A double-reed woodwind instrument with a deep, resonant tone.', 'common'),
('フルート', 'フルート', '楽器名', 'フルート', 'Flute', 'リードを使わない木管楽器。澄んだ音色。', 'A woodwind instrument that produces sound without a reed.', 'common'),
('サックス', 'サックス', '楽器名', 'サックス', 'Saxophone', 'シングルリードの金属製楽器。ジャズでよく使用される。', 'A single-reed woodwind instrument made of brass, popular in jazz.', 'common'),

-- 楽器名（金管楽器）
('トランペット', 'トランペット', '楽器名', 'トランペット', 'Trumpet', '高い音域の金管楽器。明るく華やかな音色。', 'A high-pitched brass instrument with a bright, brilliant tone.', 'common'),
('トロンボーン', 'トロンボーン', '楽器名', 'トロンボーン', 'Trombone', 'スライドで音程を変える金管楽器。', 'A brass instrument that uses a slide to change pitch.', 'common'),
('ホルン', 'ホルン', '楽器名', 'ホルン', 'French Horn', '丸く巻かれた金管楽器。温かく豊かな音色。', 'A coiled brass instrument with a warm, rich tone.', 'common'),
('チューバ', 'チューバ', '楽器名', 'チューバ', 'Tuba', '最も低い音域の金管楽器。', 'The lowest-pitched brass instrument.', 'common'),

-- 楽器名（弦楽器）
('ヴァイオリン', 'ヴァイオリン', '楽器名', 'ヴァイオリン', 'Violin', '最も高い音域の弦楽器。', 'The highest-pitched string instrument.', 'common'),
('ヴィオラ', 'ヴィオラ', '楽器名', 'ヴィオラ', 'Viola', 'ヴァイオリンより低い音域の弦楽器。', 'A string instrument pitched lower than the violin.', 'common'),
('チェロ', 'チェロ', '楽器名', 'チェロ', 'Cello', '座って演奏する弦楽器。人間の声に近い音色。', 'A string instrument played while seated, with a tone similar to the human voice.', 'common'),
('コントラバス', 'コントラバス', '楽器名', 'コントラバス', 'Double Bass', '最も低い音域の弦楽器。', 'The lowest-pitched string instrument.', 'common'),

-- 楽器名（打楽器）
('ティンパニ', 'ティンパニ', '楽器名', 'ティンパニ', 'Timpani', '調律可能な太鼓。オーケストラの重要な打楽器。', 'Tunable drums that are essential in orchestral music.', 'common'),
('スネアドラム', 'スネアドラム', '楽器名', 'スネアドラム', 'Snare Drum', '底面にスナアが張られた太鼓。', 'A drum with snares on the bottom head.', 'common'),
('バスドラム', 'バスドラム', '楽器名', 'バスドラム', 'Bass Drum', '大きな太鼓。低い音を出す。', 'A large drum that produces low-pitched sounds.', 'common'),
('シンバル', 'シンバル', '楽器名', 'シンバル', 'Cymbal', '金属製の打楽器。', 'Metal percussion instruments that are struck together or with sticks.', 'common');
