/**
 * 練習メニューデータ定義
 */
import { PracticeItem } from '../_types';

// 共通（デフォルト）練習メニュー
export const genericMenus: PracticeItem[] = [
  // 初級メニュー
  {
    id: 'hanon-basic',
    title: 'ハノン（指の独立）',
    description: '指の独立と基本的なテクニックを身につける',
    points: ['正しい指の形を保つ', 'ゆっくりと確実に', '毎日継続する'],
    videoUrl: 'https://www.youtube.com/watch?v=example1',
    difficulty: 'beginner',
    howToPractice: [
      '1. 椅子に正しく座り、手首と腕の高さを調整する',
      '2. 第1番から順番に、ゆっくりとしたテンポで始める',
      '3. 各指の動きを意識し、独立した動きを確認する',
      '4. 慣れてきたら徐々にテンポを上げる',
      '5. 完璧に弾けるようになったら次の番号に進む'
    ],
    recommendedTempo: '♩ = 60〜120',
    duration: '10〜15分',
    tips: ['指が疲れたら休憩を取る', '力まないことが最も重要', '音の粒を揃えることを意識']
  },
  {
    id: 'scales-basic',
    title: '音階練習（長調・短調）',
    description: '基本的な音階を習得する',
    points: ['正しい指使い', '均等な音量', 'リズムを保つ'],
    videoUrl: 'https://www.youtube.com/watch?v=example2',
    difficulty: 'beginner',
    howToPractice: [
      '1. ハ長調（C major）から始める',
      '2. 1オクターブをゆっくり上行・下行する',
      '3. 指使いを確実に覚える（親指のくぐりに注意）',
      '4. 各音が均等な音量になるよう意識する',
      '5. 慣れたら他の調（G, D, F, B♭など）に進む'
    ],
    recommendedTempo: '♩ = 60〜100',
    duration: '10〜20分',
    tips: ['メトロノームを使用して正確なリズムで', '親指のくぐりをスムーズに', '最初は片手ずつ練習']
  },
  {
    id: 'arpeggios-basic',
    title: 'アルペジオ練習',
    description: '和音の分散奏法を習得する',
    points: ['手首の柔軟性', '指の動きの滑らかさ', '音のつながり'],
    videoUrl: 'https://www.youtube.com/watch?v=example3',
    difficulty: 'beginner',
    howToPractice: [
      '1. C majorのアルペジオから始める（ド・ミ・ソ・ド）',
      '2. 手首を柔らかく保ち、スムーズな動きを意識',
      '3. 各音をレガートでつなげる',
      '4. 上行・下行を繰り返す',
      '5. 他の調（G, F, D minorなど）にも挑戦'
    ],
    recommendedTempo: '♩ = 60〜90',
    duration: '5〜10分',
    tips: ['手首の回転を使う', '音がバラバラにならないよう注意', '最初はゆっくり、音のつながりを重視']
  },
  {
    id: 'rhythm-basic',
    title: 'リズム基礎（手拍子・カウント）',
    description: '基礎的な拍とサブディビジョンを体に入れる',
    points: ['1拍を刻む', '2分割/3分割/4分割', '声に出して数える'],
    videoUrl: 'https://www.youtube.com/watch?v=example10',
    difficulty: 'beginner',
    howToPractice: [
      '1. メトロノームに合わせて手拍子で1拍を刻む',
      '2. 声に出して「1, 2, 3, 4」とカウントする',
      '3. 2分割（8分音符）で「1と2と3と4と」',
      '4. 3分割（3連符）で「1タタ2タタ3タタ4タタ」',
      '5. 4分割（16分音符）で「1エアン2エアン...」'
    ],
    recommendedTempo: '♩ = 60〜80',
    duration: '5〜10分',
    tips: ['体全体でリズムを感じる', 'メトロノームに頼りすぎない', '慣れたら楽器で同じ練習を']
  },
  {
    id: 'metronome-subdivision-basic',
    title: 'メトロノーム分割練習',
    description: 'クリック位置を拍頭/裏/2拍/小節に置き換える',
    points: ['裏クリック', '弱拍クリック', '小節頭クリック'],
    videoUrl: 'https://www.youtube.com/watch?v=example11',
    difficulty: 'beginner',
    howToPractice: [
      '1. メトロノームを拍の裏（2,4拍目）に設定',
      '2. 裏クリックだけで演奏する練習',
      '3. メトロノームを小節の頭だけに設定',
      '4. 1小節に1回のクリックで演奏',
      '5. クリックなしでも正確なテンポを保てるか確認'
    ],
    recommendedTempo: '♩ = 60〜100',
    duration: '5〜10分',
    tips: ['内なるビートを育てる', 'クリックに頼らない演奏力', '最終的にはクリックなしで演奏']
  },

  // 中級メニュー
  {
    id: 'hanon-intermediate',
    title: 'ハノン（応用編）',
    description: 'より高度なテクニックを習得する',
    points: ['テンポを上げる', '表現力の向上', '音楽性を意識'],
    videoUrl: 'https://www.youtube.com/watch?v=example4',
    difficulty: 'intermediate',
    howToPractice: [
      '1. 第20番以降の複雑なパターンに挑戦',
      '2. リズムパターンを変えて練習（付点、スタッカートなど）',
      '3. ダイナミクスをつけて表現力を追加',
      '4. テンポを徐々に上げ、最終的に速いテンポで',
      '5. 異なる調で移調練習'
    ],
    recommendedTempo: '♩ = 80〜140',
    duration: '15〜20分',
    tips: ['機械的にならないよう音楽性を', 'フレーズ感を持って', '速さだけでなく美しさも追求']
  },
  {
    id: 'etudes',
    title: 'エチュード練習',
    description: '技術と音楽性を同時に向上させる',
    points: ['楽譜の読み取り', '表現の工夫', '技術の確実性'],
    videoUrl: 'https://www.youtube.com/watch?v=example5',
    difficulty: 'intermediate',
    howToPractice: [
      '1. 自分のレベルに合ったエチュード集を選ぶ',
      '2. まず楽譜を読み、難所を特定する',
      '3. 難所を取り出してゆっくり練習',
      '4. 全体を通してテンポを徐々に上げる',
      '5. 音楽的表現を加えて仕上げる'
    ],
    recommendedTempo: '曲による（最初は♩ = 60程度）',
    duration: '20〜30分',
    tips: ['完璧を目指さず、8割の完成度で次へ', '録音して客観的に聴く', '1曲を長く練習しすぎない']
  },
  {
    id: 'sight-reading',
    title: '初見練習',
    description: '楽譜を素早く読み取る能力を養う',
    points: ['楽譜の把握', 'リズムの理解', '表現の即興性'],
    videoUrl: 'https://www.youtube.com/watch?v=example6',
    difficulty: 'intermediate',
    howToPractice: [
      '1. 自分より1〜2レベル下の楽譜を用意',
      '2. 演奏前に30秒間、楽譜全体を見る',
      '3. 止まらずに最後まで演奏（ミスしても続ける）',
      '4. 毎日違う曲で練習',
      '5. 徐々に難易度を上げる'
    ],
    recommendedTempo: 'ゆっくり（♩ = 60〜80）',
    duration: '10〜15分',
    tips: ['完璧を求めない', '止まらないことが最優先', '調号と拍子を事前確認']
  },
  {
    id: 'dynamics-control',
    title: 'ダイナミクス・音量コントロール',
    description: 'pp〜ffのコントロールとレンジの拡張',
    points: ['均一なクレッシェンド', 'ppで音色維持', 'ffで潰さない'],
    videoUrl: 'https://www.youtube.com/watch?v=example13',
    difficulty: 'intermediate',
    howToPractice: [
      '1. ロングトーンでpp、mp、mf、fを吹き分ける',
      '2. 音階でクレッシェンド・デクレッシェンド',
      '3. ppでも音色が変わらないよう息の速度を調整',
      '4. ffでも音が潰れないようアンブシュアを保つ',
      '5. 曲のフレーズで実際に応用'
    ],
    recommendedTempo: 'ゆっくり（♩ = 60）',
    duration: '10〜15分',
    tips: ['録音して音量差を確認', '体の使い方で音量調整', 'ppは弱いだけでなく遠くへ']
  },
  {
    id: 'articulation-variations',
    title: 'アーティキュレーションのバリエーション',
    description: 'レガート/スタッカート/テヌート/アクセントの精度',
    points: ['長さと強さを分けて考える', 'パターン反復', '記号の意味を統一'],
    videoUrl: 'https://www.youtube.com/watch?v=example14',
    difficulty: 'intermediate',
    howToPractice: [
      '1. 同じフレーズをレガートで演奏',
      '2. 同じフレーズをスタッカートで演奏',
      '3. テヌート、アクセントでも演奏',
      '4. 各記号の違いを明確に表現',
      '5. 実際の曲で記号通りに演奏できるか確認'
    ],
    recommendedTempo: '♩ = 60〜100',
    duration: '10〜15分',
    tips: ['舌の使い方で区別', '息のスピードと量を調整', '極端に練習して感覚をつかむ']
  },
  {
    id: 'scales-intervals',
    title: '音階の3度/4度/6度',
    description: 'インターバルで音階を練習し、音程と運指を鍛える',
    points: ['縦の音程を聴く', '移動前に準備', 'つながり重視'],
    videoUrl: 'https://www.youtube.com/watch?v=example15',
    difficulty: 'intermediate',
    howToPractice: [
      '1. C majorで3度音程の練習（ド-ミ、レ-ファ...）',
      '2. 同様に4度、6度でも練習',
      '3. 音程が正確か耳で確認',
      '4. レガートで滑らかにつなげる',
      '5. 他の調でも同様に練習'
    ],
    recommendedTempo: '♩ = 60〜90',
    duration: '10〜15分',
    tips: ['音程を歌ってから演奏', '跳躍の前に次の音をイメージ', '指使いのパターンを覚える']
  },

  // 上級メニュー
  {
    id: 'hanon-advanced',
    title: 'ハノン（上級編）',
    description: '最高レベルのテクニックを習得する',
    points: ['極限の速度', '完璧なコントロール', '芸術性の追求'],
    videoUrl: 'https://www.youtube.com/watch?v=example7',
    difficulty: 'advanced',
    howToPractice: [
      '1. 第39番以降のトリルや装飾音の練習',
      '2. 高速テンポ（♩ = 120以上）で正確に',
      '3. アクセントやダイナミクスを加える',
      '4. 異なるリズムパターンで変奏',
      '5. 30分間連続で弾き続ける持久力訓練'
    ],
    recommendedTempo: '♩ = 120〜180',
    duration: '20〜30分',
    tips: ['体の無駄な動きを削る', '音楽的に聴こえるよう工夫', '疲労に注意、適度な休憩を']
  },
  {
    id: 'virtuoso',
    title: 'ヴィルトゥオーゾ練習',
    description: '超絶技巧を習得する',
    points: ['技術の極限', '表現の深さ', '音楽の本質'],
    videoUrl: 'https://www.youtube.com/watch?v=example8',
    difficulty: 'advanced',
    howToPractice: [
      '1. リストやショパンなどの超絶技巧曲から難所を抜粋',
      '2. ゆっくりと完璧に弾けるまで反復',
      '3. 徐々にテンポを上げる（メトロノームで確認）',
      '4. 表現を加えながら演奏',
      '5. 原曲のテンポで演奏できるまで継続'
    ],
    recommendedTempo: '最初♩ = 60、最終♩ = 140以上',
    duration: '30〜60分',
    tips: ['焦らず段階的に', '録音して進捗を確認', '手や腕のケアを忘れずに']
  },
  {
    id: 'interpretation',
    title: '解釈・表現練習',
    description: '音楽の解釈と表現力を高める',
    points: ['楽曲の理解', '表現の独創性', '聴衆への伝達'],
    videoUrl: 'https://www.youtube.com/watch?v=example9',
    difficulty: 'advanced',
    howToPractice: [
      '1. 曲の背景（作曲者、時代、意図）を研究',
      '2. 複数の演奏家の録音を聴き比べ',
      '3. 自分なりの解釈を考える',
      '4. フレーズごとに表現を試す',
      '5. 全体を通して一貫性のある表現に仕上げる'
    ],
    recommendedTempo: '曲の指定テンポ',
    duration: '30〜60分',
    tips: ['楽譜に書かれていないことを読み取る', '自分の感情を込める', '聴衆を意識した演奏']
  },
  {
    id: 'polyrhythm-advanced',
    title: 'ポリリズム/テンポシフト',
    description: '3:2/4:3など複合リズムの感覚を養う',
    points: ['足/手で分離', '小さく精密に', 'クリック活用'],
    videoUrl: 'https://www.youtube.com/watch?v=example16',
    difficulty: 'advanced',
    howToPractice: [
      '1. 3:2のポリリズムから始める（右手で3、左手で2）',
      '2. ゆっくりとしたテンポで正確に',
      '3. メトロノームで基準のビートを確認',
      '4. 4:3、5:4など複雑なパターンに挑戦',
      '5. 実際の曲で応用'
    ],
    recommendedTempo: '♩ = 40〜60（最初はゆっくり）',
    duration: '15〜20分',
    tips: ['片方ずつ確実に', '体でリズムを刻む', '最小公倍数で理解する']
  },
  {
    id: 'phrasing-advanced',
    title: 'フレージング・呼吸の設計',
    description: '句読点と方向性を持った流れを作る',
    points: ['山と谷を決める', '語尾の処理', '長い線で聴く'],
    videoUrl: 'https://www.youtube.com/watch?v=example17',
    difficulty: 'advanced',
    howToPractice: [
      '1. 楽譜にフレーズの切れ目を書き込む',
      '2. 各フレーズの頂点（山）を決める',
      '3. 頂点に向かうクレッシェンド、終わりのデクレッシェンドを設計',
      '4. 語尾の処理（切る/伸ばす/繋げる）を決める',
      '5. 全体を通して自然な流れになるか確認'
    ],
    recommendedTempo: '曲の指定テンポ',
    duration: '20〜30分',
    tips: ['歌うように演奏', '呼吸と音楽を連動させる', '大きな流れを意識']
  },
  {
    id: 'recording-review-advanced',
    title: '録音→振り返り→修正サイクル',
    description: '録音で客観視し、具体的な修正点を抽出する',
    points: ['1フレーズ単位で評価', '数値化する', '翌日再検証'],
    videoUrl: 'https://www.youtube.com/watch?v=example18',
    difficulty: 'advanced',
    howToPractice: [
      '1. フレーズを録音する',
      '2. 録音を聴いて、改善点を3つ具体的に書く',
      '3. その改善点だけに集中して再度録音',
      '4. 改善されたか確認（Before/After比較）',
      '5. 翌日、もう一度確認して定着を確認'
    ],
    recommendedTempo: '曲の指定テンポ',
    duration: '30〜45分',
    tips: ['客観的に聴く（他人の演奏と思って）', '改善点は3つまで', '完璧を求めず継続']
  },
];

