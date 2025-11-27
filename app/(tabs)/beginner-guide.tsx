import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, BookOpen, Music, Target, Heart, History, Star, Play, Wrench, Lightbulb, Youtube, Image as ImageIcon, Camera } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import InstrumentHeader from '@/components/InstrumentHeader';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { useLanguage } from '@/components/LanguageContext';
import TuningSoundPlayer from '@/components/TuningSoundPlayer';
import PostureCameraModal from '@/components/PostureCameraModal';

export default function BeginnerGuideScreen() {
  const router = useRouter();
  const { currentTheme, selectedInstrument } = useInstrumentTheme();
  const { t } = useLanguage();
  const [activeSection, setActiveSection] = useState('overview');
  const [showFingeringChart, setShowFingeringChart] = useState(false);
  const [showMaintenanceTips, setShowMaintenanceTips] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);

  // 楽器別ガイドデータ
  const instrumentGuides = {
    violin: {
      name: 'バイオリン',
      nameEn: 'Violin',
      emoji: '🎻',
      color: '#4CAF50',
      hero: {
        tagline: '歌うように奏でる弦の響き',
        subtitle: '姿勢・ボウイング・音程づくりを最速で身につけよう',
      },
      overview: {
        structure: 'バイオリンは4本の弦（G線、D線、A線、E線）を持つ弦楽器です。弓で弦を擦って音を出します。',
        charm: '美しい音色と表現力の豊かさが魅力です。独奏からオーケストラまで幅広く活躍できます。',
        history: '16世紀頃にイタリアで発展し、現在の形になりました。クラシック音楽の中心的な楽器です。',
        features: '高音域から低音域まで幅広い音域を持ち、感情表現が豊かです。',
        famous: 'パガニーニ、ハイフェッツ、メニューインなどの名演奏家がいます。',
        yourCharm: 'あなたのバイオリンは、練習を重ねることで美しい音色を奏でるようになります。'
      },
      basicPlaying: {
        hold: {
          description: '左肩に楽器を置き、顎で支えます。左手でネックを握り、右手で弓を持ちます。',
          posture: '胸を張って前かがみにならないようにします。背筋を伸ばし、楽器が水平になるよう調整します。',
          bowHold: '弓の持ち方：親指と中指で弓を支え、人差し指を軽く添えます。手首は柔らかく保ちます。',
          image: 'violin_hold.jpg'
        },
        sound: '弓を弦に対して直角に当て、適度な圧力で擦ります。弓の速度と圧力で音色を調整します。',
        fingering: '左手の指で弦を押さえて音程を変えます。親指はネックの下で支えます。',
        bowing: '弓の上下運動で音を出します。弓の位置、速度、圧力で表現を変えます。'
      },
      fingering: {
        basic: '最初に覚える音：A線の開放弦（A音）、1の指（B音）、2の指（C音）、3の指（D音）',
        chart: '各弦の運指表を参考に、基本的な音階を練習しましょう。',
        tips: '正しい指の形と位置を意識して練習することが大切です。'
      },
      tuning: {
        reference: '各弦の基準音：G線（G3）、D線（D4）、A線（A4）、E線（E5）',
        individual: '各弦を個別にチューニングできます。',
        adjustment: 'ペグを回して弦の張力を調整します。'
      },
      maintenance: {
        daily: '演奏後は必ず松脂を拭き取り、弦の汚れを落とします。',
        storage: '湿度管理が重要です。楽器ケースに乾燥剤を入れて保管します。',
        attention: '弦の張力が強いので、定期的な弦の交換が必要です。',
        supplies: '松脂、クロス、弦、弓の毛替え用品が必要です。'
      },
      tips: {
        practice: '毎日少しずつでも練習を続けることが上達の秘訣です。',
        mistakes: '弓の角度や指の位置を意識して、正しいフォームを身につけましょう。',
        improvement: '音階練習とエチュードを並行して練習すると効果的です。'
      },
      resources: {
        videos: [
          { title: 'バイオリンの持ち方・構え方', url: 'https://www.youtube.com/watch?v=example1' },
          { title: '基本的な弓の使い方', url: 'https://www.youtube.com/watch?v=example2' },
          { title: '運指の基礎', url: 'https://www.youtube.com/watch?v=example3' }
        ],
        images: [
          'バイオリンの基本構造図',
          '正しい持ち方の図解',
          '運指表・音階表'
        ]
      },
      repertoire: {
        beginner: [
          'きらきら星',
          'メリーさんの羊',
          'かえるの歌',
          'チューリップ',
          'ロンドン橋',
          'むすんでひらいて',
          'ちょうちょう',
          '春の小川'
        ],
        intermediate: [
          'アニー・ローリー',
          'ロング・ロング・アゴー',
          'アマリリス',
          '愛のあいさつ',
          'G線上のアリア',
          'カノン',
          '四季「春」',
          'ユーモレスク'
        ],
        advanced: [
          'バッハ：無伴奏パルティータ',
          'パガニーニ：カプリース',
          'チャイコフスキー：ヴァイオリン協奏曲',
          'メンデルスゾーン：ヴァイオリン協奏曲'
        ],
        tips: '初心者は開放弦から始めて、徐々に指を使った演奏に進みましょう。'
      },
      faq: [
        { q: '左手が痛くなる', a: '親指で強く握らず、首と肩で支える比率を上げます。1分毎に力を抜いて再セット。' },
        { q: '音程が不安定', a: '開放弦との重音で縦の音程を毎回確認し、耳の基準を作る。' },
        { q: '弓が斜めになる', a: '鏡を使い弓の軌道をチェック。弓先/根元で肘の高さを微調整。' },
      ],
      roadmap: {
        weeks: [
          { title: 'Week 1: 姿勢と開放弦', items: ['立ち姿勢/肩当て調整', '開放弦ロングトーン 5分×2', '弓の直線運動'] },
          { title: 'Week 2: A線の1〜3指', items: ['指置き位置の定着', '0-1-2-3のパターン', 'メトロノームで均等'] },
          { title: 'Week 3: 2弦移弦', items: ['A/D線の移弦基本', '弓圧/速度の維持', '簡単メロディ'] },
          { title: 'Week 4: 音階/重音', items: ['A-D音階1オクターブ', '開放弦との重音で音程確認', '簡単エチュード'] },
        ]
      }
    },
    piano: {
      name: 'ピアノ',
      nameEn: 'Piano',
      emoji: '🎹',
      color: '#E91E63',
      hero: {
        tagline: '鍵盤で描く色彩とハーモニー',
        subtitle: '姿勢・タッチ・音階から最短で整えるロードマップ',
      },
      overview: {
        structure: 'ピアノは88鍵の鍵盤楽器です。鍵盤を押すとハンマーが弦を叩いて音を出します。',
        charm: '豊かな音色と表現力、和音演奏が可能な万能楽器です。',
        history: '18世紀にイタリアのクリストフォリによって発明されました。',
        features: '音の強弱、音色の変化、和音演奏が自由自在です。',
        famous: 'モーツァルト、ベートーヴェン、ショパン、リストなどの作曲家がいます。',
        yourCharm: 'あなたのピアノは、練習を重ねることで美しい音楽を奏でるようになります。'
      },
      basicPlaying: {
        hold: {
          description: '椅子に深く座り、肘を鍵盤と同じ高さに保ちます。手首は自然な形を保ちます。',
          posture: '背筋を伸ばし、肩の力を抜きます。足は床にしっかりと着け、安定した姿勢を保ちます。',
          handPosition: '手の形：卵を包むような自然な形で、指先で鍵盤を押します。手首は鍵盤より少し高く保ちます。',
          image: 'piano_posture.jpg'
        },
        sound: '鍵盤を押す強さと速度で音の強弱を調整します。ペダルで音の響きをコントロールします。',
        fingering: '親指から小指まで、正しい指番号で演奏します。手の形を保ちながら移動します。',
        breathing: 'フレーズの呼吸を意識して、音楽の流れを作ります。'
      },
      fingering: {
        basic: '最初に覚える音：中央のド（C4）から始まるドレミファソラシド',
        chart: '各音の指使いを覚えて、基本的な音階を練習しましょう。',
        tips: '手の形を保ちながら、指の独立を意識して練習します。'
      },
      tuning: {
        reference: '基準音：A4（440Hz）',
        individual: '各鍵盤の音程は調律師によって調整されます。',
        adjustment: '定期的な調律が必要です。'
      },
      maintenance: {
        daily: '演奏後は鍵盤を軽く拭き、埃を落とします。',
        storage: '湿度管理が重要です。エアコンや除湿機で適切な環境を保ちます。',
        attention: '鍵盤の汚れや埃の蓄積に注意します。',
        supplies: '鍵盤クリーナー、クロス、調律用品が必要です。'
      },
      tips: {
        practice: '毎日少しずつでも練習を続けることが上達の秘訣です。',
        mistakes: '正しい手の形と指の使い方を意識して練習しましょう。',
        improvement: '音階練習とエチュードを並行して練習すると効果的です。'
      },
      resources: {
        videos: [
          { title: 'ピアノの正しい座り方・手の形', url: 'https://www.youtube.com/watch?v=example4' },
          { title: '基本的な指の使い方', url: 'https://www.youtube.com/watch?v=example5' },
          { title: '音階練習の方法', url: 'https://www.youtube.com/watch?v=example6' }
        ],
        images: [
          'ピアノの基本構造図',
          '正しい手の形の図解',
          '運指表・音階表'
        ]
      },
      repertoire: {
        beginner: [
          'きらきら星',
          'メリーさんの羊',
          'かえるの歌',
          'チューリップ',
          'ロンドン橋',
          'むすんでひらいて',
          'ちょうちょう',
          '春の小川'
        ],
        intermediate: [
          'アニー・ローリー',
          'ロング・ロング・アゴー',
          'アマリリス',
          '愛のあいさつ',
          '夢路より',
          'トルコ行進曲',
          'エリーゼのために',
          '月光ソナタ'
        ],
        advanced: [
          'ショパン：幻想即興曲',
          'リスト：ラ・カンパネラ',
          'ベートーヴェン：皇帝協奏曲',
          'ラフマニノフ：ピアノ協奏曲第2番'
        ],
        tips: '右手から始めて、徐々に左手も使った演奏に進みましょう。'
      },
      faq: [
        { q: '手首が固い', a: '鍵盤からの戻りで手首を脱力し、腕の重さで押す感覚を身につける。' },
        { q: '音がガタつく', a: '指の独立練習（ハノン）をゆっくり。打鍵は深さを一定に。' },
        { q: 'テンポが揺れる', a: 'メトロノームを弱拍に置く練習で内部の拍感を強化。' },
      ],
      roadmap: {
        weeks: [
          { title: 'Week 1: 姿勢とタッチ', items: ['椅子の高さ/距離調整', '5指ポジション', 'ppで均一な音'] },
          { title: 'Week 2: スケール入門', items: ['Cメジャー/Am 1オクターブ', 'メトロノーム=60', '指替えの滑らかさ'] },
          { title: 'Week 3: 両手の合わせ', items: ['片手で確実→両手', '和音のバランス', '簡単伴奏型'] },
          { title: 'Week 4: ペダル基礎', items: ['ハーフペダル感覚', '音の濁りチェック', '短い曲を仕上げ'] },
        ]
      }
    },
    guitar: {
      name: 'ギター',
      nameEn: 'Guitar',
      emoji: '🎸',
      color: '#FF9800',
      hero: {
        tagline: 'コードとメロディで広がる世界',
        subtitle: 'フォームとリズム先行で、弾ける手を作る',
      },
      overview: {
        structure: 'ギターは6本の弦を持つ弦楽器です。指で弦を弾いて音を出します。',
        charm: 'ポップスからクラシックまで幅広いジャンルで活躍できる楽器です。',
        history: '古代から存在し、現在の形は16世紀頃に確立されました。',
        features: 'コード演奏とメロディ演奏の両方が可能で、伴奏楽器としても優秀です。',
        famous: 'ジミ・ヘンドリックス、エリック・クラプトン、アンドレス・セゴビアなどがいます。',
        yourCharm: 'あなたのギターは、練習を重ねることで美しい音楽を奏でるようになります。'
      },
      basicPlaying: {
        hold: {
          description: '椅子に座り、ギターを太ももの上に置きます。左手でネックを握り、右手で弦を弾きます。',
          posture: '背筋を伸ばし、楽器を体に密着させます。右腕で楽器を支え、安定した姿勢を保ちます。',
          leftHand: '左手の親指はネックの裏側に軽く添え、他の指で弦を押さえます。指は立てて弦を押さえます。',
          image: 'guitar_hold.jpg'
        },
        sound: '右手の指またはピックで弦を弾いて音を出します。弦の位置と強さで音色を調整します。',
        fingering: '左手の指で弦を押さえて音程を変えます。正しい指の形を保ちます。',
        strumming: '右手で弦を上下に弾いてコードを演奏します。リズムを意識しましょう。'
      },
      fingering: {
        basic: '最初に覚える音：6弦の開放弦（E音）、1の指（F音）、3の指（G音）',
        chart: '各弦の運指表を参考に、基本的なコードを練習しましょう。',
        tips: '正しい指の形と位置を意識して練習することが大切です。'
      },
      tuning: {
        reference: '各弦の基準音：6弦（E2）、5弦（A2）、4弦（D3）、3弦（G3）、2弦（B3）、1弦（E4）',
        individual: '各弦を個別にチューニングできます。',
        adjustment: 'ペグを回して弦の張力を調整します。'
      },
      maintenance: {
        daily: '演奏後は弦の汚れを落とし、ネックを軽く拭きます。',
        storage: '湿度管理が重要です。楽器ケースに乾燥剤を入れて保管します。',
        attention: '弦の張力が強いので、定期的な弦の交換が必要です。',
        supplies: '弦、クロス、弦交換用品、チューナーが必要です。'
      },
      tips: {
        practice: '毎日少しずつでも練習を続けることが上達の秘訣です。',
        mistakes: '正しい指の形と弦の押さえ方を意識して練習しましょう。',
        improvement: 'コード練習とスケール練習を並行して練習すると効果的です。'
      },
      resources: {
        videos: [
          { title: 'ギターの持ち方・構え方', url: 'https://www.youtube.com/watch?v=example7' },
          { title: '基本的な弦の弾き方', url: 'https://www.youtube.com/watch?v=example8' },
          { title: 'コードの押さえ方', url: 'https://www.youtube.com/watch?v=example9' }
        ],
        images: [
          'ギターの基本構造図',
          '正しい持ち方の図解',
          '運指表・コード表'
        ]
      },
      repertoire: {
        beginner: [
          'きらきら星',
          'メリーさんの羊',
          'かえるの歌',
          'チューリップ',
          'ロンドン橋',
          'むすんでひらいて',
          'ちょうちょう',
          '春の小川'
        ],
        intermediate: [
          'アニー・ローリー',
          'ロング・ロング・アゴー',
          'アマリリス',
          '愛のあいさつ',
          '夢路より',
          '禁じられた遊び',
          'アルハンブラの思い出',
          'アストゥリアス'
        ],
        advanced: [
          'タレガ：グラン・ホタ',
          'バッハ：シャコンヌ',
          'バリオス：大聖堂',
          'ロドリゴ：アランフエス協奏曲'
        ],
        tips: 'コードから始めて、徐々にメロディ演奏に進みましょう。'
      },
      faq: [
        { q: 'コードが押さえにくい', a: 'ナット寄りを避け、フレット直前を押さえる。親指はネック裏の中心へ。' },
        { q: '音がビビる', a: '押さえ込み不足/角度を修正。不要弦は軽くミュート。' },
        { q: 'リズムがもたる', a: '右手のストロークのみでメトロノーム練習。アクセント位置を固定。' },
      ],
      roadmap: {
        weeks: [
          { title: 'Week 1: 姿勢と右手', items: ['ピックの角度', 'ダウン/アップ均一', '8ビートの土台'] },
          { title: 'Week 2: 基本コード', items: ['C/G/Am/Em', '2拍/4拍ストローク', 'コードチェンジ省エネ'] },
          { title: 'Week 3: ミュートとリズム', items: ['ブリッジ/左手ミュート', '16分の刻み入門', '簡単リフ'] },
          { title: 'Week 4: 短い曲を完成', items: ['イントロ/サビを決める', '録音してチェック', 'テンポを上げる'] },
        ]
      }
    },
    flute: {
      name: 'フルート',
      nameEn: 'Flute',
      emoji: '🎶',
      color: '#2196F3',
      hero: {
        tagline: '澄んだ息で描くレガート',
        subtitle: 'アンブシュアとロングトーンで基礎の柱を作る',
      },
      overview: {
        structure: 'フルートは横笛の木管楽器です。金属製の管にキーが付いており、横に構えて演奏します。',
        charm: '澄んだ音色と優雅な表現力が魅力です。オーケストラや吹奏楽で重要な役割を果たします。',
        history: '古代から存在し、現在の形は19世紀にベームによって改良されました。',
        features: '高音域の美しい音色と、軽やかなパッセージが得意です。',
        famous: 'ガラム、ランパル、ニコレなどの名演奏家がいます。',
        yourCharm: 'あなたのフルートは、練習を重ねることで美しい音色を奏でるようになります。'
      },
      basicPlaying: {
        hold: {
          description: '左手で楽器の上部を支え、右手で下部を支えます。唇をアンブシュアに当てて息を吹き込みます。',
          posture: '背筋を伸ばし、楽器を水平に保ちます。腕の力を抜き、自然な姿勢で演奏します。',
          embouchure: 'アンブシュア：唇を小さくすぼめて、息の流れをコントロールします。口角を安定させます。',
          image: 'flute_hold.jpg'
        },
        sound: '唇の形と息の強さで音色を調整します。息の方向と圧力が重要です。',
        fingering: '両手の指でキーを押さえて音程を変えます。正しい指の形を保ちます。',
        breathing: '腹式呼吸で安定した息の流れを作ります。フレーズの呼吸を意識しましょう。'
      },
      fingering: {
        basic: '最初に覚える音：中音域のド（C5）、レ（D5）、ミ（E5）、ファ（F5）',
        chart: '各音の運指表を参考に、基本的な音階を練習しましょう。',
        tips: '正しい指の形と息の使い方を意識して練習することが大切です。'
      },
      tuning: {
        reference: '基準音：A5（880Hz）',
        individual: '各音を個別にチューニングできます。',
        adjustment: 'ヘッドジョイントの調整で音程を微調整します。'
      },
      maintenance: {
        daily: '演奏後は必ず楽器を分解して水分を拭き取り、乾燥させます。',
        storage: '湿度管理が重要です。楽器ケースに乾燥剤を入れて保管します。',
        attention: 'キーの動作とパッドの状態を定期的にチェックします。',
        supplies: 'スワブ、クロス、キーオイル、パッド交換用品が必要です。'
      },
      tips: {
        practice: '毎日少しずつでも練習を続けることが上達の秘訣です。',
        mistakes: '正しいアンブシュアと息の使い方を意識して練習しましょう。',
        improvement: 'ロングトーンと音階練習を並行して練習すると効果的です。'
      },
      resources: {
        videos: [
          { title: 'フルートの持ち方・構え方', url: 'https://www.youtube.com/watch?v=example10' },
          { title: '基本的な息の使い方', url: 'https://www.youtube.com/watch?v=example11' },
          { title: '運指の基礎', url: 'https://www.youtube.com/watch?v=example12' }
        ],
        images: [
          'フルートの基本構造図',
          '正しい持ち方の図解',
          '運指表・音階表'
        ]
      },
      repertoire: {
        beginner: [
          'きらきら星',
          'メリーさんの羊',
          'かえるの歌',
          'チューリップ',
          'ロンドン橋',
          'むすんでひらいて',
          'ちょうちょう',
          '春の小川'
        ],
        intermediate: [
          'アニー・ローリー',
          'ロング・ロング・アゴー',
          'アマリリス',
          '愛のあいさつ',
          '夢路より',
          'シチリアーノ',
          'フルート協奏曲第2番',
          'フルート協奏曲第1番'
        ],
        advanced: [
          'モーツァルト：フルート協奏曲第1番',
          'モーツァルト：フルート協奏曲第2番',
          'ドビュッシー：シランクス',
          'イベール：フルート協奏曲'
        ],
        tips: 'ロングトーンから始めて、徐々に音階練習に進みましょう。'
      },
      faq: [
        { q: '高音がかすれる', a: '息の角度をやや下へ、口角を安定。息圧は一定で。' },
        { q: '音程が上ずる', a: '頭部管の抜き差しを微調整。耳で基準を確認。' },
        { q: 'タンギングが曖昧', a: '舌先の位置をt/dで確認。短い音価でクリアに区切る。' },
      ],
      roadmap: {
        weeks: [
          { title: 'Week 1: アンブシュア', items: ['鏡で口形確認', '低音ロングトーン', '呼吸法の定着'] },
          { title: 'Week 2: 音階基礎', items: ['C/Gメジャー', '音のつながり', 'タンギング単発'] },
          { title: 'Week 3: タンギング連続', items: ['タタタ/トゥトゥ', 'テンポ段階上げ', '簡単フレーズ'] },
          { title: 'Week 4: 中高音域', items: ['倍音練習入門', '音程補正', '短い小品'] },
        ]
      }
    },
    trumpet: {
      name: 'トランペット',
      nameEn: 'Trumpet',
      emoji: '🎺',
      color: '#FFC107',
      hero: {
        tagline: '輝くリードで響くブラスの花形',
        subtitle: '息のスピードとアンブシュアで土台を固める',
      },
      overview: {
        structure: 'トランペットは金管楽器で、3つのピストンバルブとマウスピースで構成されています。',
        charm: '華やかな音色と力強い表現力が魅力です。オーケストラや吹奏楽で重要な役割を果たします。',
        history: '古代から存在し、現在の形は19世紀に確立されました。',
        features: '高音域の輝かしい音色と、華やかなファンファーレが得意です。',
        famous: 'マイルス・デイビス、ルイ・アームストロング、モーリス・アンドレなどがいます。',
        yourCharm: 'あなたのトランペットは、練習を重ねることで力強い音色を奏でるようになります。'
      },
      basicPlaying: {
        hold: {
          description: '左手で楽器を支え、右手でピストンを操作します。唇をマウスピースに当てて息を吹き込みます。',
          posture: '背筋を伸ばし、楽器を安定して支えます。肩の力を抜き、リラックスした姿勢を保ちます。',
          embouchure: 'アンブシュア：唇を軽く合わせ、マウスピースを当てます。息の流れをコントロールします。',
          image: 'trumpet_hold.jpg'
        },
        sound: '唇の振動と息の強さで音色を調整します。アンブシュアの形成が重要です。',
        fingering: '右手の指でピストンを押して音程を変えます。正しい指の形を保ちます。',
        breathing: '腹式呼吸で安定した息の流れを作ります。フレーズの呼吸を意識しましょう。'
      },
      fingering: {
        basic: '最初に覚える音：中音域のド（C4）、レ（D4）、ミ（E4）、ファ（F4）',
        chart: '各音の運指表を参考に、基本的な音階を練習しましょう。',
        tips: '正しいアンブシュアと息の使い方を意識して練習することが大切です。'
      },
      tuning: {
        reference: '基準音：A4（440Hz）',
        individual: '各音を個別にチューニングできます。',
        adjustment: 'スライドの調整で音程を微調整します。'
      },
      maintenance: {
        daily: '演奏後は必ず楽器を分解して水分を拭き取り、乾燥させます。',
        storage: '湿度管理が重要です。楽器ケースに乾燥剤を入れて保管します。',
        attention: 'ピストンの動作とバルブオイルの状態を定期的にチェックします。',
        supplies: 'スワブ、クロス、バルブオイル、スライドグリスが必要です。'
      },
      tips: {
        practice: '毎日少しずつでも練習を続けることが上達の秘訣です。',
        mistakes: '正しいアンブシュアと息の使い方を意識して練習しましょう。',
        improvement: 'ロングトーンと音階練習を並行して練習すると効果的です。'
      },
      resources: {
        videos: [
          { title: 'トランペットの持ち方・構え方', url: 'https://www.youtube.com/watch?v=example13' },
          { title: '基本的な息の使い方', url: 'https://www.youtube.com/watch?v=example14' },
          { title: 'ピストンの使い方', url: 'https://www.youtube.com/watch?v=example15' }
        ],
        images: [
          'トランペットの基本構造図',
          '正しい持ち方の図解',
          '運指表・音階表'
        ]
      },
      repertoire: {
        beginner: [
          'きらきら星',
          'メリーさんの羊',
          'かえるの歌',
          'チューリップ',
          'ロンドン橋',
          'むすんでひらいて',
          'ちょうちょう',
          '春の小川'
        ],
        intermediate: [
          'アニー・ローリー',
          'ロング・ロング・アゴー',
          'アマリリス',
          '愛のあいさつ',
          '夢路より',
          'トランペット協奏曲',
          'ファンファーレ',
          'トランペット吹きの休日'
        ],
        advanced: [
          'ハイドン：トランペット協奏曲',
          'フンメル：トランペット協奏曲',
          'アルビノーニ：トランペット協奏曲',
          'コープランド：トランペット協奏曲'
        ],
        tips: 'ロングトーンから始めて、徐々に音階練習に進みましょう。'
      },
      faq: [
        { q: '高音が出ない', a: '息のスピードを上げ、口角を軽く締める。力で押さずに短時間集中で。' },
        { q: '唇がすぐ疲れる', a: '1分吹いて1分休むリズム。低音の響きを先に作る。' },
        { q: 'ピッチが揺れる', a: 'ロングトーンでチューナー確認、スライド微調整の癖付け。' },
      ],
      roadmap: {
        weeks: [
          { title: 'Week 1: 息とロングトーン', items: ['呼吸法/姿勢', 'C/Gのロングトーン', 'タイムを区切る'] },
          { title: 'Week 2: リップスラー', items: ['低〜中音域中心', 'アタック小さく', 'スロット感覚'] },
          { title: 'Week 3: 音階と発音', items: ['C/Am音階', 'タタン/トゥトゥ', 'メトロノーム'] },
          { title: 'Week 4: 短いフレーズ', items: ['8小節課題', '録音チェック', '無理せず休息'] },
        ]
      }
    },
    viola: {
      name: 'ヴィオラ',
      nameEn: 'Viola',
      emoji: '🎻',
      color: '#7A3D1F',
      hero: {
        tagline: '温かみのある中音域の響き',
        subtitle: '姿勢・ボウイング・音程づくりを最速で身につけよう',
      },
      overview: {
        structure: 'ヴィオラは4本の弦（C線、G線、D線、A線）を持つ弦楽器です。バイオリンより少し大きく、低い音域を持ちます。',
        charm: '温かみのある中音域の音色と豊かな表現力が魅力です。オーケストラで重要な役割を果たします。',
        history: '16世紀頃にバイオリンと共に発展し、現在の形になりました。室内楽やオーケストラで欠かせない楽器です。',
        features: '中音域の美しい音色と、和音演奏での重要な役割を持ちます。',
        famous: 'プリムローズ、バッシュメット、ナッシュなどの名演奏家がいます。',
        yourCharm: 'あなたのヴィオラは、練習を重ねることで温かみのある音色を奏でるようになります。'
      },
      basicPlaying: {
        hold: {
          description: '左肩に楽器を置き、顎で支えます。左手でネックを握り、右手で弓を持ちます。',
          posture: '胸を張って前かがみにならないようにします。背筋を伸ばし、楽器が水平になるよう調整します。',
          bowHold: '弓の持ち方：親指と中指で弓を支え、人差し指を軽く添えます。手首は柔らかく保ちます。',
          image: 'viola_hold.jpg'
        },
        sound: '弓を弦に対して直角に当て、適度な圧力で擦ります。弓の速度と圧力で音色を調整します。',
        fingering: '左手の指で弦を押さえて音程を変えます。親指はネックの下で支えます。',
        bowing: '弓の上下運動で音を出します。弓の位置、速度、圧力で表現を変えます。'
      },
      fingering: {
        basic: '最初に覚える音：A線の開放弦（A音）、1の指（B音）、2の指（C音）、3の指（D音）',
        chart: '各弦の運指表を参考に、基本的な音階を練習しましょう。',
        tips: '正しい指の形と位置を意識して練習することが大切です。'
      },
      tuning: {
        reference: '各弦の基準音：C線（C3）、G線（G3）、D線（D4）、A線（A4）',
        individual: '各弦を個別にチューニングできます。',
        adjustment: 'ペグを回して弦の張力を調整します。'
      },
      maintenance: {
        daily: '演奏後は必ず松脂を拭き取り、弦の汚れを落とします。',
        storage: '湿度管理が重要です。楽器ケースに乾燥剤を入れて保管します。',
        attention: '弦の張力が強いので、定期的な弦の交換が必要です。',
        supplies: '松脂、クロス、弦、弓の毛替え用品が必要です。'
      },
      tips: {
        practice: '毎日少しずつでも練習を続けることが上達の秘訣です。',
        mistakes: '弓の角度や指の位置を意識して、正しいフォームを身につけましょう。',
        improvement: '音階練習とエチュードを並行して練習すると効果的です。'
      },
      resources: {
        videos: [
          { title: 'ヴィオラの持ち方・構え方', url: 'https://www.youtube.com/watch?v=example1' },
          { title: '基本的な弓の使い方', url: 'https://www.youtube.com/watch?v=example2' },
          { title: '運指の基礎', url: 'https://www.youtube.com/watch?v=example3' }
        ],
        images: [
          'ヴィオラの基本構造図',
          '正しい持ち方の図解',
          '運指表・音階表'
        ]
      },
      repertoire: {
        beginner: [
          'きらきら星',
          'メリーさんの羊',
          'かえるの歌',
          'チューリップ'
        ],
        intermediate: [
          'アニー・ローリー',
          'ロング・ロング・アゴー',
          'アマリリス'
        ],
        tips: '初心者は開放弦から始めて、徐々に指を使った演奏に進みましょう。'
      },
      faq: [
        { q: '左手が痛くなる', a: '親指で強く握らず、首と肩で支える比率を上げます。1分毎に力を抜いて再セット。' },
        { q: '音程が不安定', a: '開放弦との重音で縦の音程を毎回確認し、耳の基準を作る。' },
        { q: '弓が斜めになる', a: '鏡を使い弓の軌道をチェック。弓先/根元で肘の高さを微調整。' },
      ],
      roadmap: {
        weeks: [
          { title: 'Week 1: 姿勢と開放弦', items: ['立ち姿勢/肩当て調整', '開放弦ロングトーン 5分×2', '弓の直線運動'] },
          { title: 'Week 2: A線の1〜3指', items: ['指置き位置の定着', '0-1-2-3のパターン', 'メトロノームで均等'] },
          { title: 'Week 3: 2弦移弦', items: ['A/D線の移弦基本', '弓圧/速度の維持', '簡単メロディ'] },
          { title: 'Week 4: 音階/重音', items: ['A-D音階1オクターブ', '開放弦との重音で音程確認', '簡単エチュード'] },
        ]
      }
    },
    
    // 不足している楽器のガイドデータを追加
    trombone: {
      name: 'トロンボーン',
      nameEn: 'Trombone',
      emoji: '🎺',
      color: '#FF9800',
      hero: {
        tagline: 'スライドで奏でる雄大な響き',
        subtitle: 'アンブシュアとスライドポジションで基礎を固める',
      },
      overview: {
        structure: 'トロンボーンは金管楽器で、U字型のスライドで音程を変えます。',
        charm: '豊かな音色と滑らかなグリッサンドが魅力です。',
        history: '15世紀頃に発展した楽器です。',
        features: 'スライドの位置で音程を変える独特の演奏方法が特徴です。',
        famous: 'トロンボーンの名演奏家がいます。',
        yourCharm: 'あなたのトロンボーンは、練習を重ねることで美しい音色を奏でるようになります。'
      },
      basicPlaying: {
        hold: {
          description: '左手で楽器を支え、右手でスライドを操作します。',
          posture: '背筋を伸ばし、楽器を安定して支えます。',
          embouchure: 'アンブシュア：唇を軽く合わせ、マウスピースを当てます。',
          image: 'trombone_hold.jpg'
        },
        sound: '唇の振動と息の強さで音色を調整します。',
        fingering: 'スライドの位置で音程を変えます。',
        breathing: '腹式呼吸で安定した息の流れを作ります。'
      },
      fingering: {
        basic: '最初に覚える音：B♭音から始まる基本的な音階',
        chart: 'スライドポジション表を参考に、基本的な音階を練習しましょう。',
        tips: '正しいアンブシュアと息の使い方を意識して練習することが大切です。'
      },
      tuning: {
        reference: '基準音：B♭1（58.27Hz）',
        individual: '各音を個別にチューニングできます。',
        adjustment: 'スライドの調整で音程を微調整します。'
      },
      maintenance: {
        daily: '演奏後は必ず楽器を分解して水分を拭き取り、乾燥させます。',
        storage: '湿度管理が重要です。楽器ケースに乾燥剤を入れて保管します。',
        attention: 'スライドの動作とバルブオイルの状態を定期的にチェックします。',
        supplies: 'スワブ、クロス、スライドグリスが必要です。'
      },
      tips: {
        practice: '毎日少しずつでも練習を続けることが上達の秘訣です。',
        mistakes: '正しいアンブシュアと息の使い方を意識して練習しましょう。',
        improvement: 'ロングトーンと音階練習を並行して練習すると効果的です。'
      },
      resources: {
        videos: [
          { title: 'トロンボーンの持ち方・構え方', url: 'https://www.youtube.com/watch?v=example1' },
          { title: '基本的なスライドの使い方', url: 'https://www.youtube.com/watch?v=example2' },
          { title: 'スライドポジションの基礎', url: 'https://www.youtube.com/watch?v=example3' }
        ],
        images: [
          'トロンボーンの基本構造図',
          '正しい持ち方の図解',
          'スライドポジション表'
        ]
      },
      repertoire: {
        beginner: [
          'きらきら星',
          'メリーさんの羊',
          'かえるの歌'
        ],
        intermediate: [
          'アニー・ローリー',
          'ロング・ロング・アゴー'
        ],
        tips: 'ロングトーンから始めて、徐々に音階練習に進みましょう。'
      },
      faq: [
        { q: '唇が疲れる', a: 'アンブシュアの形成を正しく行い、適度な休憩を取ります。' },
        { q: 'スライドが重い', a: 'スライドグリスを適切に塗り、定期的にメンテナンスします。' }
      ],
      roadmap: {
        weeks: [
          { title: 'Week 1: 姿勢とロングトーン', items: ['立ち姿勢/楽器の持ち方', 'B♭音ロングトーン 5分×2', 'アンブシュアの安定'] },
          { title: 'Week 2: スライドポジション', items: ['第1〜第7ポジションの確認', 'B♭音階の練習', 'メトロノームで均等'] },
          { title: 'Week 3: 音階練習', items: ['F音階の練習', 'スライドの滑らかな動き', '簡単メロディ'] },
          { title: 'Week 4: 応用練習', items: ['音程の確認', 'スライドの正確性向上', '簡単エチュード'] }
        ]
      }
    },
    
    cello: {
      name: 'チェロ',
      nameEn: 'Cello',
      emoji: '🎻',
      color: '#4CAF50',
      hero: {
        tagline: '豊かな低音で奏でる弦の響き',
        subtitle: '姿勢・ボウイング・音程づくりを最速で身につけよう',
      },
      overview: {
        structure: 'チェロは4本の弦を持つ弦楽器です。弓で弦を擦って音を出します。',
        charm: '豊かな低音と美しい音色が魅力です。',
        history: '16世紀頃にイタリアで発展し、現在の形になりました。',
        features: '低音域から高音域まで幅広い音域を持ち、感情表現が豊かです。',
        famous: 'チェロの名演奏家がいます。',
        yourCharm: 'あなたのチェロは、練習を重ねることで美しい音色を奏でるようになります。'
      },
      basicPlaying: {
        hold: {
          description: '椅子に座り、チェロを膝の間に挟みます。左手でネックを握り、右手で弓を持ちます。',
          posture: '背筋を伸ばし、楽器を安定して支えます。',
          bowHold: '弓の持ち方：親指と中指で弓を支え、人差し指を軽く添えます。',
          image: 'cello_hold.jpg'
        },
        sound: '弓を弦に対して直角に当て、適度な圧力で擦ります。',
        fingering: '左手の指で弦を押さえて音程を変えます。',
        bowing: '弓の上下運動で音を出します。'
      },
      fingering: {
        basic: '最初に覚える音：A線の開放弦（A音）、1の指（B音）、2の指（C音）、3の指（D音）',
        chart: '各弦の運指表を参考に、基本的な音階を練習しましょう。',
        tips: '正しい指の形と位置を意識して練習することが大切です。'
      },
      tuning: {
        reference: '各弦の基準音：C線（C2）、G線（G2）、D線（D3）、A線（A3）',
        individual: '各弦を個別にチューニングできます。',
        adjustment: 'ペグを回して弦の張力を調整します。'
      },
      maintenance: {
        daily: '演奏後は必ず松脂を拭き取り、弦の汚れを落とします。',
        storage: '湿度管理が重要です。楽器ケースに乾燥剤を入れて保管します。',
        attention: '弦の張力が強いので、定期的な弦の交換が必要です。',
        supplies: '松脂、クロス、弦、弓の毛替え用品が必要です。'
      },
      tips: {
        practice: '毎日少しずつでも練習を続けることが上達の秘訣です。',
        mistakes: '弓の角度や指の位置を意識して、正しいフォームを身につけましょう。',
        improvement: '音階練習とエチュードを並行して練習すると効果的です。'
      },
      resources: {
        videos: [
          { title: 'チェロの持ち方・構え方', url: 'https://www.youtube.com/watch?v=example1' },
          { title: '基本的な弓の使い方', url: 'https://www.youtube.com/watch?v=example2' },
          { title: '運指の基礎', url: 'https://www.youtube.com/watch?v=example3' }
        ],
        images: [
          'チェロの基本構造図',
          '正しい持ち方の図解',
          '運指表・音階表'
        ]
      },
      repertoire: {
        beginner: [
          'きらきら星',
          'メリーさんの羊',
          'かえるの歌'
        ],
        intermediate: [
          'アニー・ローリー',
          'ロング・ロング・アゴー'
        ],
        tips: '初心者は開放弦から始めて、徐々に指を使った演奏に進みましょう。'
      },
      faq: [
        { q: '左手が痛くなる', a: '親指で強く握らず、首と肩で支える比率を上げます。' },
        { q: '音程が不安定', a: '開放弦との重音で縦の音程を毎回確認し、耳の基準を作る。' }
      ],
      roadmap: {
        weeks: [
          { title: 'Week 1: 姿勢と開放弦', items: ['座り姿勢/楽器の持ち方', '開放弦ロングトーン 5分×2', '弓の直線運動'] },
          { title: 'Week 2: A線の1〜3指', items: ['指置き位置の定着', '0-1-2-3のパターン', 'メトロノームで均等'] },
          { title: 'Week 3: 2弦移弦', items: ['A/D線の移弦基本', '弓圧/速度の維持', '簡単メロディ'] },
          { title: 'Week 4: 音階/重音', items: ['A-D音階1オクターブ', '開放弦との重音で音程確認', '簡単エチュード'] }
        ]
      }
    },
    
    contrabass: {
      name: 'コントラバス',
      nameEn: 'Contrabass',
      emoji: '🎻',
      color: '#795548',
      hero: {
        tagline: '深い低音で支える音楽の土台',
        subtitle: '姿勢・ボウイング・音程づくりを最速で身につけよう',
      },
      overview: {
        structure: 'コントラバスは4本の弦を持つ弦楽器です。弓で弦を擦って音を出します。',
        charm: '深い低音と豊かな響きが魅力です。',
        history: '16世紀頃にイタリアで発展し、現在の形になりました。',
        features: '最も低い音域を持つ弦楽器で、音楽の土台を支えます。',
        famous: 'コントラバスの名演奏家がいます。',
        yourCharm: 'あなたのコントラバスは、練習を重ねることで深い音色を奏でるようになります。'
      },
      basicPlaying: {
        hold: {
          description: '立って演奏し、コントラバスを体の前に置きます。左手でネックを握り、右手で弓を持ちます。',
          posture: '背筋を伸ばし、楽器を安定して支えます。',
          bowHold: '弓の持ち方：親指と中指で弓を支え、人差し指を軽く添えます。',
          image: 'contrabass_hold.jpg'
        },
        sound: '弓を弦に対して直角に当て、適度な圧力で擦ります。',
        fingering: '左手の指で弦を押さえて音程を変えます。',
        bowing: '弓の上下運動で音を出します。'
      },
      fingering: {
        basic: '最初に覚える音：A線の開放弦（A音）、1の指（B音）、2の指（C音）、3の指（D音）',
        chart: '各弦の運指表を参考に、基本的な音階を練習しましょう。',
        tips: '正しい指の形と位置を意識して練習することが大切です。'
      },
      tuning: {
        reference: '各弦の基準音：E線（E1）、A線（A1）、D線（D2）、G線（G2）',
        individual: '各弦を個別にチューニングできます。',
        adjustment: 'ペグを回して弦の張力を調整します。'
      },
      maintenance: {
        daily: '演奏後は必ず松脂を拭き取り、弦の汚れを落とします。',
        storage: '湿度管理が重要です。楽器ケースに乾燥剤を入れて保管します。',
        attention: '弦の張力が強いので、定期的な弦の交換が必要です。',
        supplies: '松脂、クロス、弦、弓の毛替え用品が必要です。'
      },
      tips: {
        practice: '毎日少しずつでも練習を続けることが上達の秘訣です。',
        mistakes: '弓の角度や指の位置を意識して、正しいフォームを身につけましょう。',
        improvement: '音階練習とエチュードを並行して練習すると効果的です。'
      },
      resources: {
        videos: [
          { title: 'コントラバスの持ち方・構え方', url: 'https://www.youtube.com/watch?v=example1' },
          { title: '基本的な弓の使い方', url: 'https://www.youtube.com/watch?v=example2' },
          { title: '運指の基礎', url: 'https://www.youtube.com/watch?v=example3' }
        ],
        images: [
          'コントラバスの基本構造図',
          '正しい持ち方の図解',
          '運指表・音階表'
        ]
      },
      repertoire: {
        beginner: [
          'きらきら星',
          'メリーさんの羊',
          'かえるの歌'
        ],
        intermediate: [
          'アニー・ローリー',
          'ロング・ロング・アゴー'
        ],
        tips: '初心者は開放弦から始めて、徐々に指を使った演奏に進みましょう。'
      },
      faq: [
        { q: '左手が痛くなる', a: '親指で強く握らず、首と肩で支える比率を上げます。' },
        { q: '音程が不安定', a: '開放弦との重音で縦の音程を毎回確認し、耳の基準を作る。' }
      ],
      roadmap: {
        weeks: [
          { title: 'Week 1: 姿勢と開放弦', items: ['立ち姿勢/楽器の持ち方', '開放弦ロングトーン 5分×2', '弓の直線運動'] },
          { title: 'Week 2: A線の1〜3指', items: ['指置き位置の定着', '0-1-2-3のパターン', 'メトロノームで均等'] },
          { title: 'Week 3: 2弦移弦', items: ['A/D線の移弦基本', '弓圧/速度の維持', '簡単メロディ'] },
          { title: 'Week 4: 音階/重音', items: ['A-D音階1オクターブ', '開放弦との重音で音程確認', '簡単エチュード'] }
        ]
      }
    },
    
    saxophone: {
      name: 'サックス',
      nameEn: 'Saxophone',
      emoji: '🎷',
      color: '#FF5722',
      hero: {
        tagline: '情熱的な音色で奏でるジャズの魂',
        subtitle: 'アンブシュアとタンギングで基礎を固める',
      },
      overview: {
        structure: 'サックスは金属製の管楽器で、リードとマウスピースで音を出します。',
        charm: '情熱的な音色と豊かな表現力が魅力です。',
        history: '19世紀にアドルフ・サックスによって発明されました。',
        features: 'ジャズからクラシックまで幅広いジャンルで活躍できます。',
        famous: 'チャーリー・パーカー、ジョン・コルトレーン、ケニー・Gなどがいます。',
        yourCharm: 'あなたのサックスは、練習を重ねることで情熱的な音色を奏でるようになります。'
      },
      basicPlaying: {
        hold: {
          description: 'ネックストラップで楽器を支え、左手で上部を、右手で下部を支えます。',
          posture: '背筋を伸ばし、楽器を安定して支えます。',
          embouchure: 'アンブシュア：唇を軽く包み、マウスピースを当てます。',
          image: 'saxophone_hold.jpg'
        },
        sound: 'リードの振動と息の強さで音色を調整します。',
        fingering: '両手の指でキーを押さえて音程を変えます。',
        breathing: '腹式呼吸で安定した息の流れを作ります。'
      },
      fingering: {
        basic: '最初に覚える音：中音域のド（C4）、レ（D4）、ミ（E4）、ファ（F4）',
        chart: '各音の運指表を参考に、基本的な音階を練習しましょう。',
        tips: '正しい指の形と息の使い方を意識して練習することが大切です。'
      },
      tuning: {
        reference: '基準音：A4（440Hz）',
        individual: '各音を個別にチューニングできます。',
        adjustment: 'マウスピースの位置で音程を微調整します。'
      },
      maintenance: {
        daily: '演奏後は必ずリードを外して乾燥させ、楽器を分解して水分を拭き取ります。',
        storage: '湿度管理が重要です。楽器ケースに乾燥剤を入れて保管します。',
        attention: 'キーの動作とパッドの状態を定期的にチェックします。',
        supplies: 'リード、スワブ、クロス、キーオイル、パッド交換用品が必要です。'
      },
      tips: {
        practice: '毎日少しずつでも練習を続けることが上達の秘訣です。',
        mistakes: '正しいアンブシュアと息の使い方を意識して練習しましょう。',
        improvement: 'ロングトーンと音階練習を並行して練習すると効果的です。'
      },
      resources: {
        videos: [
          { title: 'サックスの持ち方・構え方', url: 'https://www.youtube.com/watch?v=example1' },
          { title: '基本的なアンブシュア', url: 'https://www.youtube.com/watch?v=example2' },
          { title: '運指の基礎', url: 'https://www.youtube.com/watch?v=example3' }
        ],
        images: [
          'サックスの基本構造図',
          '正しい持ち方の図解',
          '運指表・音階表'
        ]
      },
      repertoire: {
        beginner: [
          'きらきら星',
          'メリーさんの羊',
          'かえるの歌'
        ],
        intermediate: [
          'アニー・ローリー',
          'ロング・ロング・アゴー'
        ],
        tips: 'ロングトーンから始めて、徐々に音階練習に進みましょう。'
      },
      faq: [
        { q: '唇が疲れる', a: 'アンブシュアの形成を正しく行い、適度な休憩を取ります。' },
        { q: '音程が不安定', a: 'マウスピースの位置と息の使い方を意識して練習します。' }
      ],
      roadmap: {
        weeks: [
          { title: 'Week 1: 姿勢とロングトーン', items: ['立ち姿勢/楽器の持ち方', 'ロングトーン 5分×2', 'アンブシュアの安定'] },
          { title: 'Week 2: 基本音階', items: ['ドレミファソラシドの練習', '指の動きの確認', 'メトロノームで均等'] },
          { title: 'Week 3: タンギング', items: ['タンギングの基本', '音の切り替え練習', '簡単メロディ'] },
          { title: 'Week 4: 応用練習', items: ['音程の確認', '表現の練習', '簡単エチュード'] }
        ]
      }
    },
    
    clarinet: {
      name: 'クラリネット',
      nameEn: 'Clarinet',
      emoji: '🎵',
      color: '#9C27B0',
      hero: {
        tagline: '美しい音色で奏でる木管の華',
        subtitle: 'アンブシュアとタンギングで基礎を固める',
      },
      overview: {
        structure: 'クラリネットは木管楽器で、リードとマウスピースで音を出します。',
        charm: '美しい音色と豊かな表現力が魅力です。',
        history: '18世紀にドイツで発明されました。',
        features: 'クラシックからジャズまで幅広いジャンルで活躍できます。',
        famous: 'ベニー・グッドマン、アート・ペッパー、リチャード・ストルツマンなどがいます。',
        yourCharm: 'あなたのクラリネットは、練習を重ねることで美しい音色を奏でるようになります。'
      },
      basicPlaying: {
        hold: {
          description: '左手で楽器の上部を、右手で下部を支えます。',
          posture: '背筋を伸ばし、楽器を安定して支えます。',
          embouchure: 'アンブシュア：唇を軽く包み、マウスピースを当てます。',
          image: 'clarinet_hold.jpg'
        },
        sound: 'リードの振動と息の強さで音色を調整します。',
        fingering: '両手の指でキーを押さえて音程を変えます。',
        breathing: '腹式呼吸で安定した息の流れを作ります。'
      },
      fingering: {
        basic: '最初に覚える音：中音域のド（C4）、レ（D4）、ミ（E4）、ファ（F4）',
        chart: '各音の運指表を参考に、基本的な音階を練習しましょう。',
        tips: '正しい指の形と息の使い方を意識して練習することが大切です。'
      },
      tuning: {
        reference: '基準音：A4（440Hz）',
        individual: '各音を個別にチューニングできます。',
        adjustment: 'マウスピースの位置で音程を微調整します。'
      },
      maintenance: {
        daily: '演奏後は必ずリードを外して乾燥させ、楽器を分解して水分を拭き取ります。',
        storage: '湿度管理が重要です。楽器ケースに乾燥剤を入れて保管します。',
        attention: 'キーの動作とパッドの状態を定期的にチェックします。',
        supplies: 'リード、スワブ、クロス、キーオイル、パッド交換用品が必要です。'
      },
      tips: {
        practice: '毎日少しずつでも練習を続けることが上達の秘訣です。',
        mistakes: '正しいアンブシュアと息の使い方を意識して練習しましょう。',
        improvement: 'ロングトーンと音階練習を並行して練習すると効果的です。'
      },
      resources: {
        videos: [
          { title: 'クラリネットの持ち方・構え方', url: 'https://www.youtube.com/watch?v=example1' },
          { title: '基本的なアンブシュア', url: 'https://www.youtube.com/watch?v=example2' },
          { title: '運指の基礎', url: 'https://www.youtube.com/watch?v=example3' }
        ],
        images: [
          'クラリネットの基本構造図',
          '正しい持ち方の図解',
          '運指表・音階表'
        ]
      },
      repertoire: {
        beginner: [
          'きらきら星',
          'メリーさんの羊',
          'かえるの歌'
        ],
        intermediate: [
          'アニー・ローリー',
          'ロング・ロング・アゴー'
        ],
        tips: 'ロングトーンから始めて、徐々に音階練習に進みましょう。'
      },
      faq: [
        { q: '唇が疲れる', a: 'アンブシュアの形成を正しく行い、適度な休憩を取ります。' },
        { q: '音程が不安定', a: 'マウスピースの位置と息の使い方を意識して練習します。' }
      ],
      roadmap: {
        weeks: [
          { title: 'Week 1: 姿勢とロングトーン', items: ['立ち姿勢/楽器の持ち方', 'ロングトーン 5分×2', 'アンブシュアの安定'] },
          { title: 'Week 2: 基本音階', items: ['ドレミファソラシドの練習', '指の動きの確認', 'メトロノームで均等'] },
          { title: 'Week 3: タンギング', items: ['タンギングの基本', '音の切り替え練習', '簡単メロディ'] },
          { title: 'Week 4: 応用練習', items: ['音程の確認', '表現の練習', '簡単エチュード'] }
        ]
      }
    },
    
    oboe: {
      name: 'オーボエ',
      nameEn: 'Oboe',
      emoji: '🎵',
      color: '#607D8B',
      hero: {
        tagline: '繊細な音色で奏でる木管の貴公子',
        subtitle: 'アンブシュアとタンギングで基礎を固める',
      },
      overview: {
        structure: 'オーボエは木管楽器で、ダブルリードで音を出します。',
        charm: '繊細で美しい音色が魅力です。',
        history: '17世紀にフランスで発展しました。',
        features: 'オーケストラで重要な役割を果たす楽器です。',
        famous: 'オーボエの名演奏家がいます。',
        yourCharm: 'あなたのオーボエは、練習を重ねることで繊細な音色を奏でるようになります。'
      },
      basicPlaying: {
        hold: {
          description: '左手で楽器の上部を、右手で下部を支えます。',
          posture: '背筋を伸ばし、楽器を安定して支えます。',
          embouchure: 'アンブシュア：唇を軽く包み、リードを当てます。',
          image: 'oboe_hold.jpg'
        },
        sound: 'リードの振動と息の強さで音色を調整します。',
        fingering: '両手の指でキーを押さえて音程を変えます。',
        breathing: '腹式呼吸で安定した息の流れを作ります。'
      },
      fingering: {
        basic: '最初に覚える音：中音域のド（C4）、レ（D4）、ミ（E4）、ファ（F4）',
        chart: '各音の運指表を参考に、基本的な音階を練習しましょう。',
        tips: '正しい指の形と息の使い方を意識して練習することが大切です。'
      },
      tuning: {
        reference: '基準音：A4（440Hz）',
        individual: '各音を個別にチューニングできます。',
        adjustment: 'リードの調整で音程を微調整します。'
      },
      maintenance: {
        daily: '演奏後は必ずリードを外して乾燥させ、楽器を分解して水分を拭き取ります。',
        storage: '湿度管理が重要です。楽器ケースに乾燥剤を入れて保管します。',
        attention: 'キーの動作とパッドの状態を定期的にチェックします。',
        supplies: 'リード、スワブ、クロス、キーオイル、パッド交換用品が必要です。'
      },
      tips: {
        practice: '毎日少しずつでも練習を続けることが上達の秘訣です。',
        mistakes: '正しいアンブシュアと息の使い方を意識して練習しましょう。',
        improvement: 'ロングトーンと音階練習を並行して練習すると効果的です。'
      },
      resources: {
        videos: [
          { title: 'オーボエの持ち方・構え方', url: 'https://www.youtube.com/watch?v=example1' },
          { title: '基本的なアンブシュア', url: 'https://www.youtube.com/watch?v=example2' },
          { title: '運指の基礎', url: 'https://www.youtube.com/watch?v=example3' }
        ],
        images: [
          'オーボエの基本構造図',
          '正しい持ち方の図解',
          '運指表・音階表'
        ]
      },
      repertoire: {
        beginner: [
          'きらきら星',
          'メリーさんの羊',
          'かえるの歌'
        ],
        intermediate: [
          'アニー・ローリー',
          'ロング・ロング・アゴー'
        ],
        tips: 'ロングトーンから始めて、徐々に音階練習に進みましょう。'
      },
      faq: [
        { q: '唇が疲れる', a: 'アンブシュアの形成を正しく行い、適度な休憩を取ります。' },
        { q: '音程が不安定', a: 'リードの調整と息の使い方を意識して練習します。' }
      ],
      roadmap: {
        weeks: [
          { title: 'Week 1: 姿勢とロングトーン', items: ['立ち姿勢/楽器の持ち方', 'ロングトーン 5分×2', 'アンブシュアの安定'] },
          { title: 'Week 2: 基本音階', items: ['ドレミファソラシドの練習', '指の動きの確認', 'メトロノームで均等'] },
          { title: 'Week 3: タンギング', items: ['タンギングの基本', '音の切り替え練習', '簡単メロディ'] },
          { title: 'Week 4: 応用練習', items: ['音程の確認', '表現の練習', '簡単エチュード'] }
        ]
      }
    },
    
    bassoon: {
      name: 'ファゴット',
      nameEn: 'Bassoon',
      emoji: '🎵',
      color: '#795548',
      hero: {
        tagline: '深い音色で奏でる木管の低音',
        subtitle: 'アンブシュアとタンギングで基礎を固める',
      },
      overview: {
        structure: 'ファゴットは木管楽器で、ダブルリードで音を出します。',
        charm: '深く豊かな音色が魅力です。',
        history: '16世紀にイタリアで発展しました。',
        features: 'オーケストラの低音部を支える重要な楽器です。',
        famous: 'ファゴットの名演奏家がいます。',
        yourCharm: 'あなたのファゴットは、練習を重ねることで深い音色を奏でるようになります。'
      },
      basicPlaying: {
        hold: {
          description: '左手で楽器の上部を、右手で下部を支えます。',
          posture: '背筋を伸ばし、楽器を安定して支えます。',
          embouchure: 'アンブシュア：唇を軽く包み、リードを当てます。',
          image: 'bassoon_hold.jpg'
        },
        sound: 'リードの振動と息の強さで音色を調整します。',
        fingering: '両手の指でキーを押さえて音程を変えます。',
        breathing: '腹式呼吸で安定した息の流れを作ります。'
      },
      fingering: {
        basic: '最初に覚える音：低音域のド（C3）、レ（D3）、ミ（E3）、ファ（F3）',
        chart: '各音の運指表を参考に、基本的な音階を練習しましょう。',
        tips: '正しい指の形と息の使い方を意識して練習することが大切です。'
      },
      tuning: {
        reference: '基準音：A3（220Hz）',
        individual: '各音を個別にチューニングできます。',
        adjustment: 'リードの調整で音程を微調整します。'
      },
      maintenance: {
        daily: '演奏後は必ずリードを外して乾燥させ、楽器を分解して水分を拭き取ります。',
        storage: '湿度管理が重要です。楽器ケースに乾燥剤を入れて保管します。',
        attention: 'キーの動作とパッドの状態を定期的にチェックします。',
        supplies: 'リード、スワブ、クロス、キーオイル、パッド交換用品が必要です。'
      },
      tips: {
        practice: '毎日少しずつでも練習を続けることが上達の秘訣です。',
        mistakes: '正しいアンブシュアと息の使い方を意識して練習しましょう。',
        improvement: 'ロングトーンと音階練習を並行して練習すると効果的です。'
      },
      resources: {
        videos: [
          { title: 'ファゴットの持ち方・構え方', url: 'https://www.youtube.com/watch?v=example1' },
          { title: '基本的なアンブシュア', url: 'https://www.youtube.com/watch?v=example2' },
          { title: '運指の基礎', url: 'https://www.youtube.com/watch?v=example3' }
        ],
        images: [
          'ファゴットの基本構造図',
          '正しい持ち方の図解',
          '運指表・音階表'
        ]
      },
      repertoire: {
        beginner: [
          'きらきら星',
          'メリーさんの羊',
          'かえるの歌'
        ],
        intermediate: [
          'アニー・ローリー',
          'ロング・ロング・アゴー'
        ],
        tips: 'ロングトーンから始めて、徐々に音階練習に進みましょう。'
      },
      faq: [
        { q: '唇が疲れる', a: 'アンブシュアの形成を正しく行い、適度な休憩を取ります。' },
        { q: '音程が不安定', a: 'リードの調整と息の使い方を意識して練習します。' }
      ],
      roadmap: {
        weeks: [
          { title: 'Week 1: 姿勢とロングトーン', items: ['立ち姿勢/楽器の持ち方', 'ロングトーン 5分×2', 'アンブシュアの安定'] },
          { title: 'Week 2: 基本音階', items: ['ドレミファソラシドの練習', '指の動きの確認', 'メトロノームで均等'] },
          { title: 'Week 3: タンギング', items: ['タンギングの基本', '音の切り替え練習', '簡単メロディ'] },
          { title: 'Week 4: 応用練習', items: ['音程の確認', '表現の練習', '簡単エチュード'] }
        ]
      }
    },
    
    harp: {
      name: 'ハープ',
      nameEn: 'Harp',
      emoji: '🎶',
      color: '#E91E63',
      hero: {
        tagline: '天使の音色で奏でる弦の調べ',
        subtitle: '姿勢と指使いで基礎を固める',
      },
      overview: {
        structure: 'ハープは多数の弦を持つ弦楽器です。指で弦を弾いて音を出します。',
        charm: '美しく神秘的な音色が魅力です。',
        history: '古代から存在し、現在の形は19世紀に確立されました。',
        features: '和音演奏とアルペジオが得意で、美しい響きを作ります。',
        famous: 'ハープの名演奏家がいます。',
        yourCharm: 'あなたのハープは、練習を重ねることで美しい音色を奏でるようになります。'
      },
      basicPlaying: {
        hold: {
          description: '椅子に座り、ハープを右肩に当てて支えます。',
          posture: '背筋を伸ばし、楽器を安定して支えます。',
          handPosition: '手の形：指を自然に曲げ、指先で弦を弾きます。',
          image: 'harp_hold.jpg'
        },
        sound: '指で弦を弾いて音を出します。弦の位置と強さで音色を調整します。',
        fingering: '両手の指で弦を弾いて音程を変えます。',
        pedals: 'ペダルで弦の音程を変えます。'
      },
      fingering: {
        basic: '最初に覚える音：中央のド（C4）から始まる基本的な音階',
        chart: '各弦の位置を覚えて、基本的な音階を練習しましょう。',
        tips: '正しい指の形と弦の弾き方を意識して練習することが大切です。'
      },
      tuning: {
        reference: '基準音：各弦の音程はペダルで調整します',
        individual: '各弦を個別にチューニングできます。',
        adjustment: 'ペダルの調整で音程を変えます。'
      },
      maintenance: {
        daily: '演奏後は弦の汚れを落とし、楽器を軽く拭きます。',
        storage: '湿度管理が重要です。楽器ケースに乾燥剤を入れて保管します。',
        attention: '弦の張力とペダルの動作を定期的にチェックします。',
        supplies: '弦、クロス、ペダル調整用品が必要です。'
      },
      tips: {
        practice: '毎日少しずつでも練習を続けることが上達の秘訣です。',
        mistakes: '正しい指の形と弦の弾き方を意識して練習しましょう。',
        improvement: '音階練習とアルペジオ練習を並行して練習すると効果的です。'
      },
      resources: {
        videos: [
          { title: 'ハープの持ち方・構え方', url: 'https://www.youtube.com/watch?v=example1' },
          { title: '基本的な指使い', url: 'https://www.youtube.com/watch?v=example2' },
          { title: 'ペダルの使い方', url: 'https://www.youtube.com/watch?v=example3' }
        ],
        images: [
          'ハープの基本構造図',
          '正しい持ち方の図解',
          '指使い表・音階表'
        ]
      },
      repertoire: {
        beginner: [
          'きらきら星',
          'メリーさんの羊',
          'かえるの歌'
        ],
        intermediate: [
          'アニー・ローリー',
          'ロング・ロング・アゴー'
        ],
        tips: '基本的な指使いから始めて、徐々に和音演奏に進みましょう。'
      },
      faq: [
        { q: '指が痛くなる', a: '正しい指の形を保ち、適度な休憩を取ります。' },
        { q: '音程が不安定', a: 'ペダルの位置と弦の弾き方を意識して練習します。' }
      ],
      roadmap: {
        weeks: [
          { title: 'Week 1: 姿勢と基本指使い', items: ['座り姿勢/楽器の持ち方', '基本指使いの練習', '弦の位置確認'] },
          { title: 'Week 2: 音階練習', items: ['ドレミファソラシドの練習', '指の動きの確認', 'メトロノームで均等'] },
          { title: 'Week 3: アルペジオ', items: ['アルペジオの基本', '和音の練習', '簡単メロディ'] },
          { title: 'Week 4: 応用練習', items: ['ペダルの使い方', '表現の練習', '簡単エチュード'] }
        ]
      }
    },
    
    drums: {
      name: '打楽器',
      nameEn: 'Drums',
      emoji: '🥁',
      color: '#795548',
      hero: {
        tagline: 'リズムで奏でる音楽の心臓',
        subtitle: '基本ストロークとリズムで基礎を固める',
      },
      overview: {
        structure: 'ドラムセットは複数の太鼓とシンバルで構成される打楽器です。',
        charm: 'リズムの中心となる力強い音色が魅力です。',
        history: '20世紀にジャズと共に発展しました。',
        features: 'リズムの要となる楽器で、様々なジャンルで活躍します。',
        famous: 'バディ・リッチ、ジーン・クルーパ、リンゴ・スターなどがいます。',
        yourCharm: 'あなたのドラムは、練習を重ねることで力強いリズムを奏でるようになります。'
      },
      basicPlaying: {
        hold: {
          description: '椅子に座り、スティックを正しく握ります。',
          posture: '背筋を伸ばし、楽器を安定して演奏します。',
          stickHold: 'スティックの持ち方：親指と人差し指で支え、他の指で補助します。',
          image: 'drums_hold.jpg'
        },
        sound: 'スティックで太鼓やシンバルを叩いて音を出します。',
        rudiments: '基本的なストロークを覚えて、リズムを作ります。',
        coordination: '両手両足の協調性を養います。'
      },
      fingering: {
        basic: '最初に覚えるストローク：シングルストローク、ダブルストローク',
        chart: '基本的なストロークパターンを練習しましょう。',
        tips: '正しいスティックの持ち方と腕の使い方を意識して練習することが大切です。'
      },
      tuning: {
        reference: '各太鼓の音程調整',
        individual: '各太鼓を個別にチューニングできます。',
        adjustment: 'ヘッドの張力で音程を調整します。'
      },
      maintenance: {
        daily: '演奏後はスティックを拭き、楽器を軽く掃除します。',
        storage: '湿度管理が重要です。楽器ケースに乾燥剤を入れて保管します。',
        attention: 'ヘッドの張力とハードウェアの状態を定期的にチェックします。',
        supplies: 'スティック、ヘッド、チューニングキーが必要です。'
      },
      tips: {
        practice: '毎日少しずつでも練習を続けることが上達の秘訣です。',
        mistakes: '正しいスティックの持ち方と腕の使い方を意識して練習しましょう。',
        improvement: '基本ストロークとリズム練習を並行して練習すると効果的です。'
      },
      resources: {
        videos: [
          { title: 'ドラムの持ち方・構え方', url: 'https://www.youtube.com/watch?v=example1' },
          { title: '基本的なストローク', url: 'https://www.youtube.com/watch?v=example2' },
          { title: 'リズムの基礎', url: 'https://www.youtube.com/watch?v=example3' }
        ],
        images: [
          'ドラムセットの基本構造図',
          '正しい持ち方の図解',
          'ストローク表・リズム表'
        ]
      },
      repertoire: {
        beginner: [
          '基本的な4拍子',
          '簡単なリズムパターン',
          'ロックビート'
        ],
        intermediate: [
          'ジャズビート',
          'ラテンビート',
          'フィルイン'
        ],
        tips: '基本ストロークから始めて、徐々にリズムパターンに進みましょう。'
      },
      faq: [
        { q: '腕が疲れる', a: '正しいスティックの持ち方を保ち、適度な休憩を取ります。' },
        { q: 'リズムが不安定', a: 'メトロノームを使って正確なリズムを身につけましょう。' }
      ],
      roadmap: {
        weeks: [
          { title: 'Week 1: 姿勢と基本ストローク', items: ['座り姿勢/スティックの持ち方', 'シングルストローク練習', '腕の動き確認'] },
          { title: 'Week 2: リズム練習', items: ['4拍子の基本', 'メトロノームで均等', '簡単なパターン'] },
          { title: 'Week 3: フィルイン', items: ['フィルインの基本', 'リズムの変化', '簡単メロディ'] },
          { title: 'Week 4: 応用練習', items: ['協調性の練習', '表現の練習', '簡単エチュード'] }
        ]
      }
    },
    
    horn: {
      name: 'ホルン',
      nameEn: 'Horn',
      emoji: '📯',
      color: '#FF9800',
      hero: {
        tagline: '豊かな音色で奏でる金管の調べ',
        subtitle: 'アンブシュアとバルブで基礎を固める',
      },
      overview: {
        structure: 'ホルンは金管楽器で、3つのバルブとマウスピースで構成されています。',
        charm: '豊かで温かい音色が魅力です。',
        history: '古代から存在し、現在の形は19世紀に確立されました。',
        features: 'オーケストラで重要な役割を果たす楽器です。',
        famous: 'ホルンの名演奏家がいます。',
        yourCharm: 'あなたのホルンは、練習を重ねることで豊かな音色を奏でるようになります。'
      },
      basicPlaying: {
        hold: {
          description: '左手で楽器を支え、右手でバルブを操作します。',
          posture: '背筋を伸ばし、楽器を安定して支えます。',
          embouchure: 'アンブシュア：唇を軽く合わせ、マウスピースを当てます。',
          image: 'horn_hold.jpg'
        },
        sound: '唇の振動と息の強さで音色を調整します。',
        fingering: '左手の指でバルブを押して音程を変えます。',
        breathing: '腹式呼吸で安定した息の流れを作ります。'
      },
      fingering: {
        basic: '最初に覚える音：中音域のド（C4）、レ（D4）、ミ（E4）、ファ（F4）',
        chart: '各音の運指表を参考に、基本的な音階を練習しましょう。',
        tips: '正しいアンブシュアと息の使い方を意識して練習することが大切です。'
      },
      tuning: {
        reference: '基準音：A4（440Hz）',
        individual: '各音を個別にチューニングできます。',
        adjustment: 'スライドの調整で音程を微調整します。'
      },
      maintenance: {
        daily: '演奏後は必ず楽器を分解して水分を拭き取り、乾燥させます。',
        storage: '湿度管理が重要です。楽器ケースに乾燥剤を入れて保管します。',
        attention: 'バルブの動作とバルブオイルの状態を定期的にチェックします。',
        supplies: 'スワブ、クロス、バルブオイル、スライドグリスが必要です。'
      },
      tips: {
        practice: '毎日少しずつでも練習を続けることが上達の秘訣です。',
        mistakes: '正しいアンブシュアと息の使い方を意識して練習しましょう。',
        improvement: 'ロングトーンと音階練習を並行して練習すると効果的です。'
      },
      resources: {
        videos: [
          { title: 'ホルンの持ち方・構え方', url: 'https://www.youtube.com/watch?v=example1' },
          { title: '基本的なアンブシュア', url: 'https://www.youtube.com/watch?v=example2' },
          { title: '運指の基礎', url: 'https://www.youtube.com/watch?v=example3' }
        ],
        images: [
          'ホルンの基本構造図',
          '正しい持ち方の図解',
          '運指表・音階表'
        ]
      },
      repertoire: {
        beginner: [
          'きらきら星',
          'メリーさんの羊',
          'かえるの歌'
        ],
        intermediate: [
          'アニー・ローリー',
          'ロング・ロング・アゴー'
        ],
        tips: 'ロングトーンから始めて、徐々に音階練習に進みましょう。'
      },
      faq: [
        { q: '唇が疲れる', a: 'アンブシュアの形成を正しく行い、適度な休憩を取ります。' },
        { q: '音程が不安定', a: 'マウスピースの位置と息の使い方を意識して練習します。' }
      ],
      roadmap: {
        weeks: [
          { title: 'Week 1: 姿勢とロングトーン', items: ['立ち姿勢/楽器の持ち方', 'ロングトーン 5分×2', 'アンブシュアの安定'] },
          { title: 'Week 2: 基本音階', items: ['ドレミファソラシドの練習', '指の動きの確認', 'メトロノームで均等'] },
          { title: 'Week 3: タンギング', items: ['タンギングの基本', '音の切り替え練習', '簡単メロディ'] },
          { title: 'Week 4: 応用練習', items: ['音程の確認', '表現の練習', '簡単エチュード'] }
        ]
      }
    }
  };

  // 楽器ID(選択ID) → 楽器キーへの変換
  const getInstrumentKey = () => {
    // UUID → 楽器キーの対応（instrument-selection.tsx で使用している固定UUID）
    const id = selectedInstrument;
    const map: { [key: string]: string } = {
      '550e8400-e29b-41d4-a716-446655440001': 'piano',     // ピアノ
      '550e8400-e29b-41d4-a716-446655440002': 'guitar',    // ギター
      '550e8400-e29b-41d4-a716-446655440003': 'violin',    // バイオリン
      '550e8400-e29b-41d4-a716-446655440004': 'flute',     // フルート
      '550e8400-e29b-41d4-a716-446655440005': 'trumpet',   // トランペット
      '550e8400-e29b-41d4-a716-446655440006': 'drums',     // 打楽器
      '550e8400-e29b-41d4-a716-446655440007': 'saxophone', // サックス
      '550e8400-e29b-41d4-a716-446655440008': 'horn',      // ホルン
      '550e8400-e29b-41d4-a716-446655440009': 'clarinet',  // クラリネット
      '550e8400-e29b-41d4-a716-446655440010': 'trombone',  // トロンボーン
      '550e8400-e29b-41d4-a716-446655440011': 'cello',     // チェロ
      '550e8400-e29b-41d4-a716-446655440012': 'bassoon',   // ファゴット
      '550e8400-e29b-41d4-a716-446655440013': 'oboe',      // オーボエ
      '550e8400-e29b-41d4-a716-446655440014': 'harp',      // ハープ
      '550e8400-e29b-41d4-a716-446655440015': 'contrabass', // コントラバス
      '550e8400-e29b-41d4-a716-446655440016': 'guitar',    // その他（ギターとして）
      '550e8400-e29b-41d4-a716-446655440018': 'viola',     // ヴィオラ
      '550e8400-e29b-41d4-a716-446655440019': 'guitar',    // 琴（ギターとして）
      '550e8400-e29b-41d4-a716-446655440020': 'piano',     // シンセサイザー（ピアノとして）
      '550e8400-e29b-41d4-a716-446655440021': 'drums',     // 太鼓（打楽器として）
    };
    return map[id] || 'violin';
  };

  const currentGuide = instrumentGuides[getInstrumentKey() as keyof typeof instrumentGuides] || instrumentGuides.violin;
  

  const goBack = () => {
    router.back();
  };

  const openVideo = (url: string) => {
    Linking.openURL(url);
  };

  // カメラ機能を起動して姿勢確認
  const openCameraForPostureCheck = () => {
    setShowCameraModal(true);
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'faq':
        return (
          <View style={[styles.section, { backgroundColor: currentTheme.surface }]}> 
            <View style={styles.sectionHeader}>
              <View style={[styles.iconContainer, { backgroundColor: `${currentGuide.color}20` }]}>
                <Star size={24} color={currentGuide.color} />
              </View>
              <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>よくあるQ&A</Text>
            </View>
            <View style={styles.infoGrid}>
              {(currentGuide as any).faq?.map((qa: any, idx: number) => (
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>Q. {qa.q}</Text>
                  <Text style={[styles.infoText, { color: currentTheme.text }]}>A. {qa.a}</Text>
                </View>
              ))}
            </View>
          </View>
        );

      case 'roadmap':
        return (
          <View style={[styles.section, { backgroundColor: currentTheme.surface }]}> 
            <View style={styles.sectionHeader}>
              <View style={[styles.iconContainer, { backgroundColor: `${currentGuide.color}20` }]}>
                <History size={24} color={currentGuide.color} />
              </View>
              <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>4週間ロードマップ</Text>
            </View>
            <View style={styles.infoGrid}>
              {(currentGuide as any).roadmap?.weeks?.map((wk: any) => (
                <View style={styles.infoItem}>
                  <Text style={[styles.resourcesTitle, { color: currentTheme.text }]}>{wk.title}</Text>
                  {wk.items.map((it: string) => (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: currentGuide.color }} />
                      <Text style={[styles.infoText, { color: currentTheme.text }]}>{it}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </View>
        );
      case 'overview':
        return (
          <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.iconContainer, { backgroundColor: `${currentGuide.color}20` }]}>
                <BookOpen size={24} color={currentGuide.color} />
              </View>
              <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>楽器の基本情報</Text>
            </View>
            
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>基本構造</Text>
                <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.overview.structure}</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>魅力</Text>
                <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.overview.charm}</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>歴史・背景</Text>
                <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.overview.history}</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>特徴</Text>
                <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.overview.features}</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>有名な演奏家</Text>
                <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.overview.famous}</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>あなたの楽器の魅力</Text>
                <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.overview.yourCharm}</Text>
              </View>
            </View>
          </View>
        );

      case 'basicPlaying':
        return (
          <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.iconContainer, { backgroundColor: `${currentGuide.color}20` }]}>
                <Music size={24} color={currentGuide.color} />
              </View>
              <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>基本的な演奏方法</Text>
            </View>
            
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <View style={styles.infoHeader}>
                  <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>楽器の持ち方・構え方</Text>
                  <TouchableOpacity 
                    style={[styles.cameraButton, getCameraButtonStyle(), { backgroundColor: currentTheme.primary }]}
                    onPress={openCameraForPostureCheck}
                  >
                    <Camera size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.infoText, { color: currentTheme.text }]}>
                  {typeof currentGuide.basicPlaying.hold === 'string' 
                    ? currentGuide.basicPlaying.hold 
                    : currentGuide.basicPlaying.hold.description}
                </Text>
                
                {typeof currentGuide.basicPlaying.hold === 'object' && (
                  <>
                    <Text style={[styles.infoSubLabel, { color: currentTheme.textSecondary }]}>正しい姿勢</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.basicPlaying.hold.posture}</Text>
                    
                    {'bowHold' in currentGuide.basicPlaying.hold && (
                      <>
                        <Text style={[styles.infoSubLabel, { color: currentTheme.textSecondary }]}>弓の持ち方</Text>
                        <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.basicPlaying.hold.bowHold}</Text>
                      </>
                    )}
                    
                    {'handPosition' in currentGuide.basicPlaying.hold && (
                      <>
                        <Text style={[styles.infoSubLabel, { color: currentTheme.textSecondary }]}>手の位置</Text>
                        <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.basicPlaying.hold.handPosition}</Text>
                      </>
                    )}
                    
                    {'leftHand' in currentGuide.basicPlaying.hold && (
                      <>
                        <Text style={[styles.infoSubLabel, { color: currentTheme.textSecondary }]}>左手の使い方</Text>
                        <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.basicPlaying.hold.leftHand}</Text>
                      </>
                    )}
                    
                    {'embouchure' in currentGuide.basicPlaying.hold && (
                      <>
                        <Text style={[styles.infoSubLabel, { color: currentTheme.textSecondary }]}>アンブシュア</Text>
                        <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.basicPlaying.hold.embouchure}</Text>
                      </>
                    )}
                  </>
                )}
              </View>
              
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>基本的な音の出し方</Text>
                <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.basicPlaying.sound}</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>指の使い方・運指の基礎</Text>
                <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.basicPlaying.fingering}</Text>
              </View>
              
              {'bowing' in currentGuide.basicPlaying && currentGuide.basicPlaying.bowing && (
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>ボウイング（弦楽器）</Text>
                  <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.basicPlaying.bowing}</Text>
                </View>
              )}
              
              {'strumming' in currentGuide.basicPlaying && currentGuide.basicPlaying.strumming && (
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>ストラミング（ギター）</Text>
                  <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.basicPlaying.strumming}</Text>
                </View>
              )}
              
              {'breathing' in currentGuide.basicPlaying && currentGuide.basicPlaying.breathing && (
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>呼吸法（管楽器）</Text>
                  <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.basicPlaying.breathing}</Text>
                </View>
              )}
            </View>
          </View>
        );

      case 'fingering':
        return (
          <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.iconContainer, { backgroundColor: `${currentGuide.color}20` }]}>
                <Target size={24} color={currentGuide.color} />
              </View>
              <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>運指表・音階表</Text>
            </View>
            
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>基本的な運指表</Text>
                <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.fingering.basic}</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>運指表の使い方</Text>
                <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.fingering.chart}</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>練習のコツ</Text>
                <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.fingering.tips}</Text>
              </View>
            </View>
          </View>
        );

      case 'tuning':
        return (
          <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.iconContainer, { backgroundColor: `${currentGuide.color}20` }]}>
                <Play size={24} color={currentGuide.color} />
              </View>
              <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>チューニング音機能</Text>
            </View>
            
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>楽器別の基準音再生</Text>
                <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.tuning.reference}</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>チューニング用の音源提供</Text>
                <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.tuning.individual}</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>音の長さ・音量調整機能</Text>
                <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.tuning.adjustment}</Text>
              </View>
            </View>
            
            {/* チューニング音プレイヤー */}
            <TuningSoundPlayer instrumentId={selectedInstrument || 'violin'} />
          </View>
        );

      case 'maintenance':
        return (
          <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.iconContainer, { backgroundColor: `${currentGuide.color}20` }]}>
                <Wrench size={24} color={currentGuide.color} />
              </View>
              <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>お手入れ方法</Text>
            </View>
            
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>日常的なお手入れ手順</Text>
                <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.maintenance.daily}</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>楽器の保管方法</Text>
                <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.maintenance.storage}</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>注意すべきポイント</Text>
                <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.maintenance.attention}</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>お手入れ用品の紹介</Text>
                <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.maintenance.supplies}</Text>
              </View>
            </View>
          </View>
        );

      case 'tips':
        return (
          <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.iconContainer, { backgroundColor: `${currentGuide.color}20` }]}>
                <Lightbulb size={24} color={currentGuide.color} />
              </View>
              <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>初心者向けアドバイス</Text>
            </View>
            
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>練習のコツ・心構え</Text>
                <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.tips.practice}</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>よくある間違いと対策</Text>
                <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.tips.mistakes}</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>上達のためのポイント</Text>
                <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.tips.improvement}</Text>
              </View>
            </View>
          </View>
        );

      case 'resources':
        return (
          <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.iconContainer, { backgroundColor: `${currentGuide.color}20` }]}>
                <Youtube size={24} color={currentGuide.color} />
              </View>
              <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>参考資料</Text>
            </View>
            
            <View style={styles.resourcesContainer}>
              <Text style={[styles.resourcesTitle, { color: currentTheme.text }]}>解説動画</Text>
              {currentGuide.resources.videos.map((video, index) => (
                <TouchableOpacity
                  style={styles.videoItem}
                  onPress={() => openVideo(video.url)}
                >
                  <Youtube size={20} color="#FF0000" />
                  <Text style={[styles.videoTitle, { color: currentTheme.text }]}>{video.title}</Text>
                </TouchableOpacity>
              ))}
              
              <Text style={[styles.resourcesTitle, { color: currentTheme.text }]}>図解・イラスト</Text>
              {currentGuide.resources.images.map((image, index) => (
                <View style={styles.imageItem}>
                  <ImageIcon size={20} color={currentGuide.color} />
                  <Text style={[styles.imageTitle, { color: currentTheme.text }]}>{image}</Text>
                </View>
              ))}
            </View>
          </View>
        );

      case 'repertoire':
        return (
          <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.iconContainer, { backgroundColor: `${currentGuide.color}20` }]}>
                <Music size={24} color={currentGuide.color} />
              </View>
              <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>練習曲・レパートリー</Text>
            </View>
            
            <View style={styles.repertoireContainer}>
              <Text style={[styles.repertoireTitle, { color: currentTheme.text }]}>初心者向け曲</Text>
              <View style={styles.songList}>
                {currentGuide.repertoire.beginner.map((song, index) => (
                  <View style={styles.songItem}>
                    <Text style={[styles.songName, { color: currentTheme.text }]}>{song}</Text>
                    <Text style={[styles.songLevel, { color: currentTheme.textSecondary }]}>初級</Text>
                  </View>
                ))}
              </View>
              
              <Text style={[styles.repertoireTitle, { color: currentTheme.text }]}>中級者向け曲</Text>
              <View style={styles.songList}>
                {currentGuide.repertoire.intermediate.map((song, index) => (
                  <View style={styles.songItem}>
                    <Text style={[styles.songName, { color: currentTheme.text }]}>{song}</Text>
                    <Text style={[styles.songLevel, { color: currentTheme.textSecondary }]}>中級</Text>
                  </View>
                ))}
              </View>
              
              <View style={[styles.tipsBox, { backgroundColor: currentTheme.background }]}>
                <Text style={[styles.tipsTitle, { color: currentTheme.text }]}>練習のコツ</Text>
                <Text style={[styles.tipsText, { color: currentTheme.textSecondary }]}>
                  {currentGuide.repertoire.tips}
                </Text>
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <InstrumentHeader />
      
      <View style={[styles.header, { borderBottomColor: currentTheme.secondary }]}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <ArrowLeft size={24} color={currentTheme.text} />
        </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: currentTheme.text }]}>
            {currentGuide.name}ガイド
          </Text>
        <View style={styles.placeholder} />
      </View>


      <View style={styles.navigation}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { id: 'overview', label: '基本情報', icon: BookOpen },
            { id: 'basicPlaying', label: '演奏方法', icon: Music },
            { id: 'fingering', label: '運指表', icon: Target },
            { id: 'tuning', label: 'チューニング', icon: Play },
            { id: 'maintenance', label: 'お手入れ', icon: Wrench },
            { id: 'tips', label: 'アドバイス', icon: Lightbulb },
            { id: 'repertoire', label: '練習曲', icon: Music },
            { id: 'resources', label: '参考資料', icon: Youtube },
            { id: 'faq', label: 'Q&A', icon: Star },
            { id: 'roadmap', label: 'ロードマップ', icon: History }
          ].map((item) => (
            <TouchableOpacity
              style={[
                styles.navItem,
                activeSection === item.id && { 
                  backgroundColor: currentGuide.color,
                  borderColor: currentGuide.color,

                  
                  elevation: 4
                }
              ]}
              onPress={() => setActiveSection(item.id)}
            >
              <item.icon size={18} color={activeSection === item.id ? '#FFFFFF' : currentTheme.textSecondary} />
              <Text style={[
                styles.navLabel,
                { color: activeSection === item.id ? '#FFFFFF' : currentTheme.textSecondary }
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {renderSection()}
      </ScrollView>

      {/* カメラモーダル */}
      <PostureCameraModal
        visible={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        instrumentName={currentGuide.name}
      />
    </SafeAreaView>
  );
}

// 動的なスタイルを定義（Platformに依存するため）
const getCameraButtonStyle = () => ({
  padding: 8,
  borderRadius: 20,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  elevation: 2,
  // Web環境用のboxShadow（shadow*プロパティの代わり）
  ...(Platform.OS === 'web' ? {
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
  } : {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  }),
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    minHeight: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    
    
    
    elevation: 2,
  },
  backButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333333',
  },
  placeholder: {
    width: 44,
  },
  navigation: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 6,
    borderRadius: 25,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    
    
    
    elevation: 1,
  },
  navLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 10,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
    minHeight: '100%',
  },
  section: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    
    
    
    elevation: 6,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 16,
    color: '#333333',
  },
  infoGrid: {
    gap: 20,
  },
  infoItem: {
    padding: 20,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    color: '#495057',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#6C757D',
  },
  resourcesContainer: {
    gap: 24,
  },
  resourcesTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    color: '#333333',
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#E9ECEF',
  },
  videoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    
    
    
    elevation: 2,
  },
  videoTitle: {
    fontSize: 15,
    marginLeft: 16,
    flex: 1,
    fontWeight: '600',
    color: '#495057',
  },
  imageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    
    
    
    elevation: 2,
  },
  imageTitle: {
    fontSize: 15,
    marginLeft: 16,
    flex: 1,
    fontWeight: '600',
    color: '#495057',
  },
  repertoireContainer: {
    gap: 24,
  },
  repertoireTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    color: '#333333',
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#E9ECEF',
  },
  songList: {
    gap: 12,
    marginBottom: 20,
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    
    
    
    elevation: 2,
  },
  songName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
  },
  songLevel: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#E3F2FD',
    borderRadius: 16,
    color: '#1976D2',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tipsBox: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#E8F5E8',
    borderWidth: 1,
    borderColor: '#C8E6C9',
    
    
    
    elevation: 2,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    color: '#2E7D32',
  },
  tipsText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#388E3C',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    
    
    
    elevation: 2,
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cameraButton: {
    padding: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  infoSubLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    color: '#495057',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
});
