/**
 * 楽器別の練習メニュー
 * 各楽器固有の練習メニューを定義
 */
import type { PracticeItem } from '../types/practice.types';

export const instrumentSpecificMenus: { [key: string]: PracticeItem[] } = {
  
    piano: [
      { 
        id: 'piano-scales', 
        title: 'スケール（全調）', 
        description: '指使いと均等な打鍵を徹底', 
        points: ['弱音で整える', 'メトロノームで一定テンポ', '指替えの滑らかさ'], 
        difficulty: 'beginner',
        howToPractice: [
          '1. C majorから始め、正しい指使いを確認',
          '2. メゾピアノで均等な音量を意識',
          '3. 親指のくぐりをスムーズに',
          '4. 2オクターブ上行・下行を練習',
          '5. 全調（12調）を順番に練習'
        ],
        recommendedTempo: '♩ = 60〜100',
        duration: '15〜20分',
        tips: ['五度圏の順で練習すると効率的', '手首は柔軟に', '鍵盤の底まで押さない']
      },
      { 
        id: 'piano-arpeggio', 
        title: 'アルペジオ（分散和音）', 
        description: '手首の柔軟性とレガート', 
        points: ['手首を固めない', '腕の重みを使う', '和声感を意識'], 
        difficulty: 'intermediate',
        howToPractice: [
          '1. C majorの基本形アルペジオ（ド-ミ-ソ-ド）',
          '2. 手首を円を描くように回転させる',
          '3. 各音をレガートでつなげる',
          '4. 転回形も練習',
          '5. 他の調でも同様に'
        ],
        recommendedTempo: '♩ = 60〜90',
        duration: '10〜15分',
        tips: ['手首の回転運動が鍵', '腕の重さを鍵盤に伝える', 'ペダルなしで練習']
      },
      { 
        id: 'piano-octave', 
        title: 'オクターブ連打', 
        description: '脱力と瞬発力のバランス', 
        points: ['手首のスナップ', '手の形を保つ', '短時間で区切る'], 
        difficulty: 'advanced',
        howToPractice: [
          '1. ゆっくりとオクターブで音階を弾く',
          '2. 手首のスナップを使った連打を練習',
          '3. 短い休憩を挟みながら',
          '4. スタッカートとレガートの両方で',
          '5. 速いパッセージで応用'
        ],
        recommendedTempo: '♩ = 60〜120',
        duration: '10〜15分',
        tips: ['手首を固めない', '腱鞘炎に注意', '疲れたらすぐ休憩']
      },
    ],
    violin: [
      { 
        id: 'violin-openstrings', 
        title: '開放弦ボウイング', 
        description: '弓の直線・接点・圧のコントロール', 
        points: ['弓を弦に直角', '音の大きさが均一か', 'まっすぐな音を出す'], 
        difficulty: 'beginner',
        howToPractice: [
          '1. 各開放弦でロングトーン（全弓で8カウント）',
          '2. 弓が弦に対して直角になるよう鏡で確認',
          '3. 均一な音量とまっすぐな音を目指す'
        ],
        recommendedTempo: 'ロングトーン（♩ = 60で4拍）',
        duration: '10〜15分',
        tips: ['右腕全体をリラックス', '弓の重さを使う', '毎日の音作りの基本']
      },
      { 
        id: 'violin-favorite-song', 
        title: '好きな曲を簡単にアレンジ', 
        description: 'モチベーションを保ちながら基礎技術を身につける', 
        points: ['半音が少ない曲を演奏', 'シンプルなメロディ', '楽しみながら練習'], 
        difficulty: 'beginner',
        howToPractice: [
          '1. 好きな曲のメロディを覚えて触る場所を確認する',
          '3. 音程はあまり気にせず、リズムと弓の使い方に集中',
          '4. 音程も気にして弾いてみる',
          '5. 録音して自分の演奏を確認し、改善点を見つける'
        ],
        recommendedTempo: '♩ = 60〜80（ゆっくりから）',
        duration: '15〜20分',
        tips: ['完璧を求めず楽しむことが大切', '基礎練習の応用として活用', 'モチベーション維持に最適']
      },
      { 
        id: 'violin-scale-2octave', 
        title: 'スケール（2オクターブ）', 
        description: '1ポジションでの音階練習', 
        points: ['正しい指使い', '均等な音量', '音程の確認'], 
        difficulty: 'beginner',
        howToPractice: [
          '1. C majorから始める（1ポジションのみ）',
          '2. ゆっくりとしたテンポで上行・下行する',
          '3. 各音が均等な音量になるよう意識する',
          '4. チューナーで音程を確認',
          '5. 慣れたら他の調（G, D, Aなど）に進む'
        ],
        recommendedTempo: '♩ = 60〜80',
        duration: '10〜15分',
        tips: ['1ポジションのみで練習', '指の形を保つ', 'メトロノームを使用']
      },
      { 
        id: 'violin-position-change', 
        title: 'ポジション移動練習', 
        description: '同じ音を異なる指で弾く練習', 
        points: ['ポジション移動の感覚', '指の独立性', '正確な音程'], 
        difficulty: 'beginner',
        howToPractice: [
          '1. 例えばドの音を3の指で弾く',
          '2. そのまま上に上がり、ドを1の指で弾く',
          '3. 元のポジションに戻り、再び上がる',
          '4. 一定の時間の中で上げ下げを繰り返す',
          '5. すべての弦で同様の練習をする'
        ],
        recommendedTempo: '♩ = 60〜80',
        duration: '10〜15分',
        tips: ['ゆっくりと確実に', '親指が一緒に移動することを意識', '音程を正確に']
      },
      { 
        id: 'violin-scale', 
        title: 'スケール（3オクターブ）', 
        description: 'ポジション移動と音程', 
        points: ['シフトの準備', '弓圧の均一化', '音程の縦合わせ'], 
        difficulty: 'intermediate',
        howToPractice: [
          '1. 1ポジションで音階を確認',
          '2. シフト前に次のポジションを予測',
          '3. シフト中も弓を止めない',
          '4. 3オクターブ上行・下行',
          '5. チューナーで音程を確認'
        ],
        recommendedTempo: '♩ = 60〜100',
        duration: '15〜20分',
        tips: ['ブリッジ寄り、指板寄りで音色の変化を聴く', '全弓、半弓、弓先、弓元の使い分け', 'シフトは親指から', '音程は耳で確認', 'ビブラートなしで練習']
      },
      { 
        id: 'violin-double-stop', 
        title: '重音練習', 
        description: '指の独立と和声の響き', 
        points: ['指の立て方', '和音のバランス', 'ビブラートの統一'], 
        difficulty: 'advanced',
        howToPractice: [
          '1. 3度の重音から始める',
          '2. 両方の弦を同時に鳴らす弓の角度を探す',
          '3. 各音の音程を個別に確認',
          '4. 6度、8度と進む',
          '5. 曲の重音箇所で応用'
        ],
        recommendedTempo: 'ゆっくり（♩ = 40〜60）',
        duration: '15〜20分',
        tips: ['弓圧のバランスが重要', '指の形を保つ', '和音の響きを聴く']
      },
    ],
    guitar: [
      { 
        id: 'guitar-picking', 
        title: 'オルタネイト・ピッキング', 
        description: '右手の均一な刻み', 
        points: ['小さな可動域', 'リズムの精度', 'ミュート制御'], 
        difficulty: 'beginner',
        howToPractice: [
          '1. 開放弦で上下交互のピッキングを練習',
          '2. ピックの動きを最小限に',
          '3. メトロノームで正確なリズムを',
          '4. 音量を均等に',
          '5. 徐々にテンポを上げる'
        ],
        recommendedTempo: '♩ = 60〜120（8分音符刻み）',
        duration: '10〜15分',
        tips: ['手首だけでなく腕全体を使う', 'ダウンとアップで音量差をなくす', 'ミュートで余分な弦を消す']
      },
      { 
        id: 'guitar-chords', 
        title: 'コードチェンジ高速化', 
        description: '左手のポジション移動', 
        points: ['最短移動', '離弦を小さく', '先読みする'], 
        difficulty: 'intermediate',
        howToPractice: [
          '1. 2つのコードを選ぶ（C→G など）',
          '2. ゆっくりとコードチェンジを繰り返す',
          '3. 共通の指は動かさない',
          '4. 次のコードの形を予測',
          '5. テンポを上げて実際の曲で使う'
        ],
        recommendedTempo: '♩ = 60〜100',
        duration: '10〜15分',
        tips: ['最短距離で移動', '指は弦の近くに', 'リズムを崩さない']
      },
      { 
        id: 'guitar-legato', 
        title: 'レガート/スウィープ', 
        description: '滑らかな連結と省エネ', 
        points: ['ハンマリング/プリング', 'ノイズ処理', 'ピック角度'], 
        difficulty: 'advanced',
        howToPractice: [
          '1. ハンマリングオン、プリングオフを単独で練習',
          '2. ピッキングは最初の音だけ',
          '3. フィンガリングだけで音を出す力を鍛える',
          '4. スウィープでアルペジオを練習',
          '5. 速いフレーズで応用'
        ],
        recommendedTempo: '♩ = 60〜120',
        duration: '15〜20分',
        tips: ['左手の力を鍛える', 'ノイズを最小限に', 'ピックの角度に注意']
      },
    ],
    flute: [
      { 
        id: 'flute-longtone', 
        title: 'ロングトーン', 
        description: '息の流れと音程', 
        points: ['息の当て方', '口形の安定', 'ビブラートの均一'], 
        difficulty: 'beginner',
        howToPractice: [
          '1. チューナーを使って中音域（Aなど）でロングトーン',
          '2. 8拍間、音程と音色を保つ',
          '3. 息の速度と量を一定に',
          '4. 口の形が変わらないよう鏡で確認',
          '5. 低音域、高音域でも同様に'
        ],
        recommendedTempo: '♩ = 60（8拍キープ）',
        duration: '10〜15分',
        tips: ['腹式呼吸で息の支え', '口だけでなく喉も開く', '毎日の音作りの基本']
      },
      { 
        id: 'flute-articulation', 
        title: 'タンギング', 
        description: '発音の明瞭さ', 
        points: ['舌の位置', '息の支え', '連続タンギング'], 
        difficulty: 'intermediate',
        howToPractice: [
          '1. 「tu（トゥ）」の発音で単発のタンギング',
          '2. 音階で1音ずつタンギング',
          '3. 連続タンギングを練習（♩ = 60で8分音符）',
          '4. ダブルタンギング「tu-ku」に挑戦',
          '5. トリプルタンギング「tu-ku-tu」'
        ],
        recommendedTempo: '♩ = 60〜120',
        duration: '10〜15分',
        tips: ['舌は軽く触れるだけ', '息の流れを止めない', '舌と息を分離して考える']
      },
      { 
        id: 'flute-overtones', 
        title: '倍音練習', 
        description: '共鳴と高音域のコントロール', 
        points: ['息圧の調整', '口腔内の形', '耳で合わせる'], 
        difficulty: 'advanced',
        howToPractice: [
          '1. 低音Cから始める',
          '2. 指使いを変えずに息の角度だけで倍音を出す',
          '3. 第1倍音、第2倍音と順番に',
          '4. 各倍音の音程を確認',
          '5. 全ての音で倍音が出せるように'
        ],
        recommendedTempo: 'なし（ゆっくり確認）',
        duration: '10〜15分',
        tips: ['息の角度と速度が鍵', '口腔内の共鳴を意識', '高音域のコントロールに直結']
      },
    ],
    drums: [
      { 
        id: 'drums-stick', 
        title: 'スティックコントロール', 
        description: 'リバウンド活用と均一な粒', 
        points: ['Moeller基礎', 'グリップの確認', 'メトロノーム練習'], 
        difficulty: 'beginner',
        howToPractice: [
          '1. スティックの持ち方を確認（支点と力点）',
          '2. シングルストロークを練習（R-L-R-L）',
          '3. ダブルストロークを練習（RR-LL-RR-LL）',
          '4. リバウンドを活用してリラックス',
          '5. メトロノームで正確なリズムを'
        ],
        recommendedTempo: '♩ = 60〜120',
        duration: '15〜20分',
        tips: ['力まない', 'リバウンドを感じる', '左右の音量を揃える']
      },
      { 
        id: 'drums-rudiments', 
        title: 'ルーディメンツ', 
        description: 'パラディドル/フラム等', 
        points: ['左右のバランス', '音量コントロール', 'テンポ段階上げ'], 
        difficulty: 'intermediate',
        howToPractice: [
          '1. パラディドル（RLRR-LRLL）から始める',
          '2. ゆっくりとしたテンポで正確に',
          '3. フラム、ドラッグなど他のルーディメンツ',
          '4. 左右の音量を均等に',
          '5. テンポを上げて実際のビートで応用'
        ],
        recommendedTempo: '♩ = 60〜120',
        duration: '15〜20分',
        tips: ['40種類のルーディメンツを順番に', 'パッドで練習', '実際のドラムセットで応用']
      },
      { 
        id: 'drums-independence', 
        title: '手足インディペンデンス', 
        description: 'パターン分解と統合', 
        points: ['ゆっくり精緻に', '身体の分離', 'クリック活用'], 
        difficulty: 'advanced',
        howToPractice: [
          '1. ハイハットで8分音符を刻む',
          '2. バスドラムで4分音符を追加',
          '3. スネアで2,4拍を追加',
          '4. パターンを複雑化（シンコペーションなど）',
          '5. 曲に合わせて演奏'
        ],
        recommendedTempo: '♩ = 60〜100',
        duration: '20〜30分',
        tips: ['1つずつ追加', '体の各部分を分離して意識', 'ゆっくりから確実に']
      },
    ],
    trumpet: [
      { 
        id: 'tp-longtone', 
        title: 'ロングトーン', 
        description: '息の支えと音程を安定', 
        points: ['口輪筋の使い方', '息圧の一定化', '倍音の意識'], 
        difficulty: 'beginner',
        howToPractice: [
          '1. チューナーでB♭（実音）のロングトーン',
          '2. 8拍間、音程と音色を保つ',
          '3. 口周りの筋肉を均等に使う',
          '4. 息の支えを腹筋で',
          '5. 低音域、中音域、高音域で'
        ],
        recommendedTempo: '♩ = 60（8拍キープ）',
        duration: '10〜15分',
        tips: ['アンブシュアを固めすぎない', '息の圧力を一定に', '音色の美しさを重視']
      },
      { 
        id: 'tp-flexibility', 
        title: 'リップスラー', 
        description: '柔軟性とスロット感', 
        points: ['喉を開く', '息のスピード', '刻み練習'], 
        difficulty: 'intermediate',
        howToPractice: [
          '1. 同じ指使いで2音の移動（B♭-F）',
          '2. 息のスピードだけで音を変える',
          '3. 上行・下行を繰り返す',
          '4. 徐々に音程を広げる',
          '5. 全音域でリップスラー'
        ],
        recommendedTempo: '♩ = 60〜80',
        duration: '10〜15分',
        tips: ['喉を開いたまま', 'アンブシュアは最小限の変化', '唇の柔軟性を育てる']
      },
      { 
        id: 'tp-high', 
        title: 'ハイトーンコントロール', 
        description: '上音域の省エネ奏法', 
        points: ['口角の安定', 'アパチュア調整', '短時間集中'], 
        difficulty: 'advanced',
        howToPractice: [
          '1. 中音域から徐々に上へ',
          '2. 高音に近づくほど息のスピードを上げる',
          '3. アパチュアは小さく、口角は固める',
          '4. 長時間練習せず、短時間で休憩',
          '5. 疲労したらすぐ中止'
        ],
        recommendedTempo: 'ゆっくり（♩ = 60）',
        duration: '5〜10分（短時間集中）',
        tips: ['無理は禁物', '力まない', '息の支えで音程を作る']
      },
    ],
    saxophone: [
      { 
        id: 'sax-longtone', 
        title: 'ロングトーン', 
        description: 'アンブシュアと息の流れ', 
        points: ['マウスピースの咥え', '空気のスピード', 'ビブラート練習'], 
        difficulty: 'beginner',
        howToPractice: [
          '1. 中音域（G）でロングトーンを8拍',
          '2. チューナーで音程を確認',
          '3. アンブシュアを一定に保つ',
          '4. クレッシェンド・デクレッシェンドを加える',
          '5. 全音域で同様に練習'
        ],
        recommendedTempo: '♩ = 60（8拍キープ）',
        duration: '10〜15分',
        tips: ['下唇に適度な圧力', '喉を開く', '豊かな音色を目指す']
      },
      { 
        id: 'sax-scale', 
        title: 'スケール/クロマチック', 
        description: '指回しとタンギング', 
        points: ['指替えの最短化', 'タング位置', 'テンポ段階上げ'], 
        difficulty: 'intermediate',
        howToPractice: [
          '1. B♭ majorから始める',
          '2. 正確な指使いで音階練習',
          '3. タンギングで各音を明瞭に',
          '4. クロマチックスケールも練習',
          '5. 全調で練習'
        ],
        recommendedTempo: '♩ = 60〜120',
        duration: '15〜20分',
        tips: ['指は鍵盤の近くに', 'タングと指を同時に', 'メトロノーム必須']
      },
      { 
        id: 'sax-overtone', 
        title: '倍音/サブトーン', 
        description: '音色の幅を広げる', 
        points: ['喉/口腔のフォーム', '息の角度', '記録してチェック'], 
        difficulty: 'advanced',
        howToPractice: [
          '1. 低音で倍音を出す練習（指使い固定）',
          '2. 口腔内の形と息の角度で調整',
          '3. サブトーンの練習（息を多めに、音を柔らかく）',
          '4. 倍音とサブトーンを使い分ける',
          '5. 曲で音色の変化を表現'
        ],
        recommendedTempo: 'なし（ゆっくり確認）',
        duration: '10〜15分',
        tips: ['音色のパレットを広げる', '録音して確認', 'ジャズでは特に重要']
      },
    ],
    horn: [
      { 
        id: 'hn-longtone', 
        title: 'ロングトーン', 
        description: 'ハンドストップと響き', 
        points: ['手の位置', '息圧とベル方向', '共鳴を聴く'], 
        difficulty: 'beginner',
        howToPractice: [
          '1. 中音域でロングトーン（手の位置を確認）',
          '2. ベル内での手の位置で音色が変わることを確認',
          '3. 8拍間、安定した音を',
          '4. チューナーで音程確認',
          '5. 低音域、高音域でも'
        ],
        recommendedTempo: '♩ = 60（8拍）',
        duration: '10〜15分',
        tips: ['手はベルの中央に', '右手のリラックスが重要', '豊かな響きを追求']
      },
      { 
        id: 'hn-flex', 
        title: 'フレキシビリティ', 
        description: '自然倍音間の移動', 
        points: ['アタックを小さく', '息で誘導', '響き優先'], 
        difficulty: 'intermediate',
        howToPractice: [
          '1. 同じ指使いで倍音列を上下する',
          '2. 息のスピードだけで音程を変える',
          '3. レガートでつなげる',
          '4. アタックを最小限に',
          '5. 全ての倍音列で練習'
        ],
        recommendedTempo: '♩ = 60〜80',
        duration: '10〜15分',
        tips: ['唇は柔軟に', '息の支えが重要', 'スムーズな移動を']
      },
      { 
        id: 'hn-stopping', 
        title: 'ストップ音', 
        description: '音程と色彩', 
        points: ['手の角度', '開閉の量', '耳で補正'], 
        difficulty: 'advanced',
        howToPractice: [
          '1. 開放音でストップ音の音色を確認',
          '2. 手でベルを閉じる量を調整',
          '3. 音程が半音上がることを確認',
          '4. ストップとオープンを交互に',
          '5. 曲中での使用を練習'
        ],
        recommendedTempo: 'ゆっくり（♩ = 60）',
        duration: '10〜15分',
        tips: ['手の閉じ方で音色が変わる', '音程補正が必要', 'オーケストラ曲で重要']
      },
    ],
    clarinet: [
      { 
        id: 'cl-longtone', 
        title: 'ロングトーン', 
        description: 'アンブシュアと息の支え', 
        points: ['下唇の厚み', '息の方向', 'ノイズ除去'], 
        difficulty: 'beginner',
        howToPractice: [
          '1. 中音域（G）でロングトーンを8拍',
          '2. 下唇の厚みを調整してノイズを除去',
          '3. 息の流れを一定に',
          '4. チューナーで音程確認',
          '5. 全音域で練習'
        ],
        recommendedTempo: '♩ = 60（8拍）',
        duration: '10〜15分',
        tips: ['下唇は適度なクッション', '息の方向を意識', '美しい音色を追求']
      },
      { 
        id: 'cl-register', 
        title: 'レジスター練習', 
        description: 'レガートと跳躍', 
        points: ['指の開閉最小化', '息圧キープ', 'ブレス位置'], 
        difficulty: 'intermediate',
        howToPractice: [
          '1. 低音域と中音域のレジスター移動を練習',
          '2. レジスターキーを押すタイミングを正確に',
          '3. 息圧を一定に保つ',
          '4. レガートで滑らかに',
          '5. 音階で上下する'
        ],
        recommendedTempo: '♩ = 60〜100',
        duration: '10〜15分',
        tips: ['レジスターキーの動きを最小限に', '息の流れを止めない', '音程の跳躍を滑らかに']
      },
      { 
        id: 'cl-finger', 
        title: 'フィンガリング高速化', 
        description: 'タンギング併用', 
        points: ['最短動作', 'メトロノーム', '録音チェック'], 
        difficulty: 'advanced',
        howToPractice: [
          '1. ゆっくりと音階を練習',
          '2. 指の動きを最小限に',
          '3. タンギングと指を完全に同期',
          '4. 徐々にテンポを上げる',
          '5. 速いパッセージで応用'
        ],
        recommendedTempo: '♩ = 60〜140',
        duration: '15〜20分',
        tips: ['指は鍵の近くに', '力まない', 'メトロノーム必須']
      },
    ],
    tuba: [
      { 
        id: 'tb-breath', 
        title: '呼吸/ロングトーン', 
        description: '低音域の安定', 
        points: ['深いブレス', '息の太さ', '姿勢'], 
        difficulty: 'beginner',
        howToPractice: [
          '1. 深い腹式呼吸を確認',
          '2. 低音域でロングトーンを8拍',
          '3. 息の量を十分に',
          '4. 姿勢を正しく保つ',
          '5. チューナーで音程確認'
        ],
        recommendedTempo: '♩ = 60（8拍）',
        duration: '10〜15分',
        tips: ['大量の息が必要', '姿勢が音色に直結', '深い呼吸を意識']
      },
      { 
        id: 'tb-interval', 
        title: 'インターバル', 
        description: '音程感とスライド感覚', 
        points: ['耳重視', '息の角度', 'リップスラー'], 
        difficulty: 'intermediate',
        howToPractice: [
          '1. 2音間の移動を練習（C-G など）',
          '2. 耳で音程を確認',
          '3. リップスラーで滑らかに',
          '4. スライドポジションの正確性',
          '5. 音階で応用'
        ],
        recommendedTempo: '♩ = 60〜80',
        duration: '10〜15分',
        tips: ['音程は耳で', 'スライドは素早く正確に', '息の支えを保つ']
      },
      { 
        id: 'tb-articulation', 
        title: '発音練習', 
        description: 'タンギング精度', 
        points: ['舌の位置', '息と同調', 'リズム正確'], 
        difficulty: 'advanced',
        howToPractice: [
          '1. 「tu（トゥ）」の発音でタンギング',
          '2. 音階で各音をタンギング',
          '3. 連続タンギングの練習',
          '4. リズムパターンで練習',
          '5. 曲中のアーティキュレーション'
        ],
        recommendedTempo: '♩ = 60〜100',
        duration: '10〜15分',
        tips: ['舌は軽く触れる', '息の流れを止めない', 'メトロノーム使用']
      },
    ],
    cello: [
      { 
        id: 'vc-open', 
        title: '開放弦ボウイング', 
        description: '弓と音色', 
        points: ['直線', '接点', '圧/速/接点のバランス'], 
        difficulty: 'beginner',
        howToPractice: [
          '1. 各開放弦でロングトーン（全弓）',
          '2. 弓を弦に対して直角に',
          '3. 弓の圧力、速度、接点を調整',
          '4. 美しい音色を追求',
          '5. 全弓、半弓で練習'
        ],
        recommendedTempo: 'ロングトーン（♩ = 60で4拍）',
        duration: '10〜15分',
        tips: ['右腕をリラックス', '弓の重さを使う', '均一な音を']
      },
      { 
        id: 'vc-shift', 
        title: 'シフティング', 
        description: '移動の滑らかさ', 
        points: ['指の準備', 'ポルタメント', '肘の誘導'], 
        difficulty: 'intermediate',
        howToPractice: [
          '1. 1ポジションから3ポジションへ移動',
          '2. シフト前に次の音をイメージ',
          '3. 親指と肘で誘導',
          '4. 音を途切れさせない',
          '5. 音階で応用'
        ],
        recommendedTempo: '♩ = 60〜80',
        duration: '10〜15分',
        tips: ['親指が先導', '肘の動きが重要', '音程は耳で確認']
      },
      { 
        id: 'vc-double', 
        title: '重音', 
        description: '指の独立', 
        points: ['押さえ過ぎない', '和声感', 'ボウイング配分'], 
        difficulty: 'advanced',
        howToPractice: [
          '1. 3度の重音から始める',
          '2. 両方の弦を同時に鳴らす',
          '3. 各音の音程を確認',
          '4. 6度、8度と進む',
          '5. 和音の響きを聴く'
        ],
        recommendedTempo: 'ゆっくり（♩ = 40〜60）',
        duration: '15〜20分',
        tips: ['指は押さえすぎない', '弓の角度が鍵', '和声の響きを重視']
      },
    ],
    bassoon: [
      { 
        id: 'fg-tone', 
        title: 'ロングトーン', 
        description: '息とリードのマッチ', 
        points: ['息圧の一定', '口形の安定', '音程の補正'], 
        difficulty: 'beginner',
        howToPractice: [
          '1. 中音域でロングトーンを8拍',
          '2. リードと口の接点を確認',
          '3. 息圧を一定に',
          '4. チューナーで音程確認',
          '5. 全音域で練習'
        ],
        recommendedTempo: '♩ = 60（8拍）',
        duration: '10〜15分',
        tips: ['リードの選択が重要', '口形を安定', '深い響きを']
      },
      { 
        id: 'fg-scale', 
        title: '運指/スケール', 
        description: '指の独立', 
        points: ['替指の研究', '手のフォーム', '短く区切る'], 
        difficulty: 'intermediate',
        howToPractice: [
          '1. 音階を正確な指使いで',
          '2. 替え指のパターンを研究',
          '3. 指の独立した動きを',
          '4. テンポを徐々に上げる',
          '5. 全調で練習'
        ],
        recommendedTempo: '♩ = 60〜100',
        duration: '15〜20分',
        tips: ['ファゴット特有の運指に慣れる', '替え指を活用', '指の形を保つ']
      },
      { 
        id: 'fg-artic', 
        title: 'タンギング', 
        description: '明瞭さと音色', 
        points: ['舌の当て方', '息のコア', '速度段階上げ'], 
        difficulty: 'advanced',
        howToPractice: [
          '1. シングルタンギングを練習',
          '2. 舌の位置と当て方を確認',
          '3. 音階でタンギング',
          '4. 連続タンギングを速く',
          '5. 曲で応用'
        ],
        recommendedTempo: '♩ = 60〜120',
        duration: '10〜15分',
        tips: ['舌は軽く', '息の流れを止めない', 'ダブルタンギングも']
      },
    ],
    trombone: [
      { 
        id: 'tbm-long', 
        title: 'ロングトーン', 
        description: 'スライドと音程', 
        points: ['耳で補正', 'ビブラート', '支え'], 
        difficulty: 'beginner',
        howToPractice: [
          '1. 各ポジションでロングトーン',
          '2. チューナーで音程確認',
          '3. スライドの正確な位置を覚える',
          '4. 息の支えを保つ',
          '5. 全音域で練習'
        ],
        recommendedTempo: '♩ = 60（8拍）',
        duration: '10〜15分',
        tips: ['音程は耳で微調整', 'スライド位置を体で覚える', '安定した音を']
      },
      { 
        id: 'tbm-slide', 
        title: 'スライド練習', 
        description: '最短ルート', 
        points: ['位置感', 'アタック軽く', '移動の滑らかさ'], 
        difficulty: 'intermediate',
        howToPractice: [
          '1. ポジション間の移動を練習',
          '2. 最短距離で移動',
          '3. スライド中も音を保つ（グリッサンド）',
          '4. 速い移動でも正確に',
          '5. 音階で応用'
        ],
        recommendedTempo: '♩ = 60〜100',
        duration: '10〜15分',
        tips: ['スライドは素早く正確に', '移動中の音も美しく', 'ポジション感を養う']
      },
      { 
        id: 'tbm-flex', 
        title: 'フレキシビリティ', 
        description: '倍音移動', 
        points: ['息先行', '口形一定', '短時間反復'], 
        difficulty: 'advanced',
        howToPractice: [
          '1. 同じポジションで倍音列を練習',
          '2. 息のスピードで音程を変える',
          '3. レガートでつなげる',
          '4. 広い音程の移動も',
          '5. 全ポジションで'
        ],
        recommendedTempo: '♩ = 60〜80',
        duration: '10〜15分',
        tips: ['唇の柔軟性を育てる', '息の支えが重要', 'スムーズな移動を']
      },
    ],
    oboe: [
      { 
        id: 'ob-tone', 
        title: 'ロングトーン', 
        description: 'リードと息', 
        points: ['圧のコントロール', '口形', '姿勢'], 
        difficulty: 'beginner',
        howToPractice: [
          '1. 中音域でロングトーン',
          '2. リードへの圧力を調整',
          '3. 息の量をコントロール',
          '4. 8拍間安定した音を',
          '5. 全音域で練習'
        ],
        recommendedTempo: '♩ = 60（8拍）',
        duration: '10〜15分',
        tips: ['リード選びが重要', '口の圧力を均等に', '姿勢を正しく']
      },
      { 
        id: 'ob-scale', 
        title: 'スケール/運指', 
        description: '替指と音色', 
        points: ['指の独立', 'タッチ軽く', '音程管理'], 
        difficulty: 'intermediate',
        howToPractice: [
          '1. 音階を正確な指使いで',
          '2. 替え指のパターンを学ぶ',
          '3. 指のタッチを軽く',
          '4. テンポを上げる',
          '5. 全調で練習'
        ],
        recommendedTempo: '♩ = 60〜100',
        duration: '15〜20分',
        tips: ['オーボエ特有の運指', '音程管理が重要', '指は軽く']
      },
      { 
        id: 'ob-artic', 
        title: 'アーティキュレーション', 
        description: '発音の明瞭', 
        points: ['舌の支点', '息のスピード', 'クリック練習'], 
        difficulty: 'advanced',
        howToPractice: [
          '1. タンギングの練習',
          '2. 舌の位置を確認',
          '3. 音階でアーティキュレーション',
          '4. スタッカート、レガートを明確に',
          '5. 曲で応用'
        ],
        recommendedTempo: '♩ = 60〜120',
        duration: '10〜15分',
        tips: ['舌は軽く触れる', '息の流れを保つ', '明瞭な発音を']
      },
    ],
    harp: [
      { 
        id: 'hp-finger', 
        title: 'フィンガリング基礎', 
        description: '手の形と独立', 
        points: ['関節を立てる', '音のつながり', '脱力'], 
        difficulty: 'beginner',
        howToPractice: [
          '1. C majorの音階を片手ずつ',
          '2. 指の関節を立てる',
          '3. 各指を独立して動かす',
          '4. レガートで音をつなげる',
          '5. 両手で練習'
        ],
        recommendedTempo: '♩ = 60〜80',
        duration: '10〜15分',
        tips: ['手の形を保つ', '脱力が重要', '指先で弦を捉える']
      },
      { 
        id: 'hp-arpeggio', 
        title: 'アルペジオ/グリッサンド', 
        description: '均一な響き', 
        points: ['腕の軌道', '手首の可動', 'リズムの均一'], 
        difficulty: 'intermediate',
        howToPractice: [
          '1. C majorのアルペジオ',
          '2. 均一な音量で',
          '3. 手首を柔軟に',
          '4. グリッサンドの練習',
          '5. 曲で応用'
        ],
        recommendedTempo: '♩ = 60〜100',
        duration: '10〜15分',
        tips: ['腕の動きを滑らかに', 'リズムを均等に', 'グリッサンドは親指で']
      },
      { 
        id: 'hp-voicing', 
        title: '和声音量バランス', 
        description: 'メロディの浮き立たせ', 
        points: ['親指の扱い', '内声の処理', 'ペダル計画'], 
        difficulty: 'advanced',
        howToPractice: [
          '1. 和音を弾き、メロディラインを強調',
          '2. 内声の音量を調整',
          '3. 親指で低音のバランス',
          '4. ペダル操作を計画',
          '5. 曲全体で応用'
        ],
        recommendedTempo: 'ゆっくり（♩ = 60）',
        duration: '15〜20分',
        tips: ['各声部のバランス', 'メロディを浮き立たせる', 'ペダル操作も音楽の一部']
      },
    ],
    other: [
      { 
        id: 'gen-breath', 
        title: 'ブレス/姿勢', 
        description: 'どの楽器にも共通', 
        points: ['姿勢', '呼吸', 'リズム感'], 
        difficulty: 'beginner',
        howToPractice: [
          '1. 鏡で姿勢を確認',
          '2. 深い腹式呼吸を3回',
          '3. 楽器を構えて姿勢を保つ',
          '4. 演奏中も姿勢を意識',
          '5. 定期的に確認'
        ],
        recommendedTempo: 'なし',
        duration: '5〜10分',
        tips: ['良い姿勢は疲労軽減', '呼吸は音楽の基本', '毎日確認']
      },
      { 
        id: 'gen-scale', 
        title: 'スケール/分解練習', 
        description: '反復で基礎力アップ', 
        points: ['遅く正確に', 'クリック', '段階アップ'], 
        difficulty: 'intermediate',
        howToPractice: [
          '1. 基本的な音階から',
          '2. ゆっくりと正確に',
          '3. メトロノームで練習',
          '4. テンポを徐々に上げる',
          '5. 楽器特有のパターンを追加'
        ],
        recommendedTempo: '♩ = 60〜100',
        duration: '15〜20分',
        tips: ['基礎の反復が大切', 'メトロノーム必須', '正確性を重視']
      },
      { 
        id: 'gen-memo', 
        title: '録音/メモ分析', 
        description: '自己評価と修正', 
        points: ['録る→聴く→直す', '目的を言語化', '短時間集中'], 
        difficulty: 'advanced',
        howToPractice: [
          '1. 演奏を録音',
          '2. 客観的に聴く',
          '3. 改善点をメモ',
          '4. その点だけ集中して修正',
          '5. 再度録音して確認'
        ],
        recommendedTempo: '曲による',
        duration: '30〜45分',
        tips: ['客観的な視点で', '改善点は具体的に', '継続が力に']
      },
    ],
  };

  // 楽器別の基礎情報（姿勢・持ち方）
};
