// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView,
  Modal,
  Alert,
  Dimensions
} from 'react-native';
import { 
  ChevronLeft, 
  Play, 
  Target, 
  Star,
  BookOpen,
  Music,
  Zap,
  Camera
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import InstrumentHeader from '@/components/InstrumentHeader';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { useLanguage } from '@/components/LanguageContext';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PostureCameraModal from '@/components/PostureCameraModal';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import { useAuthAdvanced } from '@/hooks/useAuthAdvanced';
import { practiceService } from '@/services/practiceService';

interface PracticeItem {
  id: string;
  title: string;
  description: string;
  points: string[];
  videoUrl?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  howToPractice?: string[]; // 練習の仕方
  recommendedTempo?: string; // 推奨テンポ
  duration?: string; // 推奨練習時間
  tips?: string[]; // 追加のヒント
}

interface Level {
  id: 'beginner' | 'intermediate' | 'advanced';
  label: string;
  description: string;
}

export default function BasicPracticeScreen() {
  const router = useRouter();
  const { currentTheme, selectedInstrument } = useInstrumentTheme();
  const { t } = useLanguage();
  const { user } = useAuthAdvanced();
  const [selectedLevel, setSelectedLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [userLevel, setUserLevel] = useState<string | null>(null);
  const [hasSelectedLevel, setHasSelectedLevel] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState<PracticeItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const LEVEL_CACHE_KEY = 'user_practice_level';

  // レベル定義
  const levels: Level[] = [
    {
      id: 'beginner',
      label: '初級',
      description: '基礎を固める段階',
    },
    {
      id: 'intermediate',
      label: '中級',
      description: '技術を向上させる段階',
    },
    {
      id: 'advanced',
      label: 'マスター',
      description: '表現力を高める段階',
    }
  ];


  // 楽器ID(選択ID) → 楽器キーへの変換
  const getInstrumentKey = () => {
    // UUID → 楽器キーの対応（instrument-selection.tsx で使用している固定UUID）
    const id = selectedInstrument;
    const map: { [key: string]: string } = {
      '550e8400-e29b-41d4-a716-446655440001': 'piano',
      '550e8400-e29b-41d4-a716-446655440002': 'guitar',
      '550e8400-e29b-41d4-a716-446655440003': 'violin',
      '550e8400-e29b-41d4-a716-446655440004': 'flute',
      '550e8400-e29b-41d4-a716-446655440005': 'trumpet',
      '550e8400-e29b-41d4-a716-446655440006': 'drums',
      '550e8400-e29b-41d4-a716-446655440007': 'saxophone',
      '550e8400-e29b-41d4-a716-446655440008': 'horn',
      '550e8400-e29b-41d4-a716-446655440009': 'clarinet',
      '550e8400-e29b-41d4-a716-446655440010': 'tuba',
      '550e8400-e29b-41d4-a716-446655440011': 'cello',
      '550e8400-e29b-41d4-a716-446655440012': 'bassoon',
      '550e8400-e29b-41d4-a716-446655440013': 'trombone',
      // TODO: 実装完了後にコメントアウトを解除
      // '550e8400-e29b-41d4-a716-446655440014': 'harp',
      // '550e8400-e29b-41d4-a716-446655440015': 'harp',
      '550e8400-e29b-41d4-a716-446655440016': 'other',
    };
    return map[id] || id || 'other';
  };

  // 楽器名を取得する関数
  const getInstrumentName = () => {
    const instrumentKey = getInstrumentKey();
    const instrumentNames: { [key: string]: string } = {
      'piano': 'ピアノ',
      'guitar': 'ギター',
      'violin': 'バイオリン',
      'flute': 'フルート',
      'trumpet': 'トランペット',
      'drums': '打楽器',
      'saxophone': 'サックス',
      'horn': 'ホルン',
      'clarinet': 'クラリネット',
      'tuba': 'チューバ',
      'cello': 'チェロ',
      'bassoon': 'ファゴット',
      'trombone': 'トロンボーン',
      'oboe': 'オーボエ',
      'harp': 'ハープ',
      'other': '楽器'
    };
    return instrumentNames[instrumentKey] || '楽器';
  };

  // カメラ機能を起動して姿勢確認
  const openCameraForPostureCheck = () => {
    setShowCameraModal(true);
  };

  // 共通（デフォルト）練習メニュー
  const genericMenus: PracticeItem[] = [
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

  // 楽器別の上書き/専用メニュー
  const instrumentSpecificMenus: { [key: string]: PracticeItem[] } = {
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
  const instrumentBasics: { [key: string]: { posture: string; grip: string; tips: string[] } } = {
    piano: {
      posture: '背筋を伸ばし、椅子の前1/3に座る。足は床にしっかりとつけ、手首は鍵盤と同じ高さにする。',
      grip: '指の腹で鍵盤を押し、手首を柔軟に保つ。親指と他の指で支点を作り、重みを使って音を出す。',
      tips: ['肩の力を抜く', '指の形を保つ', '手首の高さを一定に']
    },
    guitar: {
      posture: '背筋を伸ばし、椅子に深く座る。ギターを右太ももの上に安定させ、左足を少し前に出す。',
      grip: '左手は親指をネックの後ろに置き、指先で弦を押さえる。右手は弦の上に軽く置き、ピックは軽く持つ。',
      tips: ['ネックは上向きに', '左腕はリラックス', '右手の位置を一定に']
    },
    violin: {
      posture: '背筋を伸ばし、足を肩幅に開く。猫背にならない。',
      grip: '左手は親指をネックの下に置き、指先で弦を押さえる。右手は弓を親指と中指で支え、小指でバランスを取る。',
      tips: ['顎当てを正しく使う', '弓は弦に直角に', '左腕は自由に動かせるように']
    },
    flute: {
      posture: '背筋を伸ばし、足を肩幅に開いて立つ。楽器を水平に持ち、口元は自然な位置に保つ。',
      grip: '左手は楽器の上部を支え、右手は下部を支える。指はキーの上に軽く置き、無駄な力を入れない。',
      tips: ['息はまっすぐ吹く', '唇は自然な形', '指の位置を正確に']
    },
    trumpet: {
      posture: '背筋を伸ばし、足を肩幅に開いて立つ。楽器を両手で支え、マウスピースを唇に軽く当てる。',
      grip: '左手は楽器のバルブ部分を支え、右手はバルブを操作する。マウスピースは唇に軽く押し当てる。',
      tips: ['息は速く、一定に', '唇は柔軟に', 'アンブシュアを保つ']
    },
    saxophone: {
      posture: '背筋を伸ばし、足を肩幅に開いて立つ。楽器を首から掛け、マウスピースを口に含む。',
      grip: '左手は上部のキーを操作し、右手は下部のキーを操作する。マウスピースは適度に含む。',
      tips: ['息は一定に', 'リードの位置を確認', '指の位置を正確に']
    },
    drums: {
      posture: '背筋を伸ばし、椅子に深く座る。太ももは地面と平行にし、足はペダルの上に置く。',
      grip: 'スティックは親指と人差し指で支え、他の指で包む。手首を柔軟に保ち、リバウンドを活用する。',
      tips: ['リラックスして持つ', '手首の動きを活用', '左右のバランスを保つ']
    },
    clarinet: {
      posture: '背筋を伸ばし、足を肩幅に開いて立つ。楽器を垂直に持ち、口元は自然な位置に保つ。',
      grip: '左手は上部のキーを操作し、右手は下部のキーを操作する。マウスピースは適度に含む。',
      tips: ['息は一定に', 'リードの位置を確認', '指の位置を正確に']
    },
    oboe: {
      posture: '背筋を伸ばし、足を肩幅に開いて立つ。楽器を垂直に持ち、口元は自然な位置に保つ。',
      grip: '左手は上部のキーを操作し、右手は下部のキーを操作する。リードは適度に含む。',
      tips: ['息は一定に', 'リードの位置を確認', '指の位置を正確に']
    },
    bassoon: {
      posture: '背筋を伸ばし、足を肩幅に開いて立つ。楽器を斜めに持ち、口元は自然な位置に保つ。',
      grip: '左手は上部のキーを操作し、右手は下部のキーを操作する。リードは適度に含む。',
      tips: ['息は一定に', 'リードの位置を確認', '指の位置を正確に']
    },
    cello: {
      posture: '背筋を伸ばし、椅子に深く座る。楽器を両膝で支え、首を自然な位置に保つ。',
      grip: '左手は親指をネックの後ろに置き、指先で弦を押さえる。右手は弓を親指と中指で支える。',
      tips: ['顎当てを正しく使う', '弓は弦に直角に', '左腕は自由に動かせるように']
    },
    viola: {
      posture: '背筋を伸ばし、足を肩幅に開いて立つ。楽器を左肩と顎で支え、首を自然な位置に保つ。',
      grip: '左手は親指をネックの下に置き、指先で弦を押さえる。右手は弓を親指と中指で支える。',
      tips: ['顎当てを正しく使う', '弓は弦に直角に', '左腕は自由に動かせるように']
    },
    bass: {
      posture: '背筋を伸ばし、足を肩幅に開いて立つ。楽器を左肩と顎で支え、首を自然な位置に保つ。',
      grip: '左手は親指をネックの下に置き、指先で弦を押さえる。右手は弓を親指と中指で支える。',
      tips: ['顎当てを正しく使う', '弓は弦に直角に', '左腕は自由に動かせるように']
    },
    trombone: {
      posture: '背筋を伸ばし、足を肩幅に開いて立つ。楽器を両手で支え、マウスピースを唇に軽く当てる。',
      grip: '左手は楽器のバルブ部分を支え、右手はスライドを操作する。マウスピースは唇に軽く押し当てる。',
      tips: ['息は速く、一定に', '唇は柔軟に', 'アンブシュアを保つ']
    },
    french_horn: {
      posture: '背筋を伸ばし、足を肩幅に開いて立つ。楽器を両手で支え、マウスピースを唇に軽く当てる。',
      grip: '左手は楽器のバルブ部分を支え、右手はバルブを操作する。マウスピースは唇に軽く押し当てる。',
      tips: ['息は速く、一定に', '唇は柔軟に', 'アンブシュアを保つ']
    },
    tuba: {
      posture: '背筋を伸ばし、足を肩幅に開いて立つ。楽器を両手で支え、マウスピースを唇に軽く当てる。',
      grip: '左手は楽器のバルブ部分を支え、右手はバルブを操作する。マウスピースは唇に軽く押し当てる。',
      tips: ['息は速く、一定に', '唇は柔軟に', 'アンブシュアを保つ']
    },
    harp: {
      posture: '背筋を伸ばし、椅子に深く座る。楽器を両膝で支え、手首は自然な位置に保つ。',
      grip: '左手は低音弦を、右手は高音弦を操作する。指は弦の上に軽く置き、無駄な力を入れない。',
      tips: ['指の位置を正確に', '手首を柔軟に', '左右のバランスを保つ']
    },
    other: {
      posture: '背筋を伸ばし、楽器に適した姿勢を保つ。無理な姿勢は避け、長時間でも疲れない姿勢を心がける。',
      grip: '楽器の特性に合わせて正しく持ち、無駄な力を入れない。安定して演奏できる持ち方を身につける。',
      tips: ['楽器の特性を理解', '正しい持ち方を身につける', '無理な姿勢は避ける']
    }
  };

  // 選択された楽器キーでメニューを差し替え
  const instrumentKey = getInstrumentKey();
  const sourceMenus = [
    ...(instrumentSpecificMenus[instrumentKey] || []),
    ...genericMenus,
  ];
  // 選択されたレベルの練習メニューをフィルタリング
  const filteredPracticeMenus = sourceMenus
    .filter(menu => menu.difficulty === selectedLevel);

  // レベル変更時の確認ダイアログ
  const handleLevelChange = (newLevel: 'beginner' | 'intermediate' | 'advanced') => {
    if (newLevel === selectedLevel) return;
    
    Alert.alert(
      'レベル変更の確認',
      `${levels.find(l => l.id === newLevel)?.label}に変更しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: '変更する', 
          onPress: async () => {
            try {
              // レベル設定
              setSelectedLevel(newLevel);
              setUserLevel(newLevel);
              
              // 即時ローカル保存（オフラインでも次回反映）
              try { 
                await AsyncStorage.setItem(LEVEL_CACHE_KEY, newLevel);
                logger.debug('ローカルストレージに保存完了:', newLevel);
              } catch (storageError) {
                ErrorHandler.handle(storageError, 'ローカルストレージ保存', false);
              }
              
              // ユーザープロフィールに演奏レベルを保存
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                const { error } = await supabase
                  .from('user_profiles')
                  .update({
                    practice_level: newLevel,
                    updated_at: new Date().toISOString()
                  })
                  .eq('user_id', user.id);

                if (error) {
                  ErrorHandler.handle(error, 'データベース更新', false);
                } else {
                  logger.debug('データベースに更新完了:', newLevel);
                }
              }
              
              // レベル変更完了の確認
              logger.debug('レベル変更完了:', newLevel);
            } catch (error) {
              // レベル変更処理エラー
              ErrorHandler.handle(error, 'レベル変更', false);
            }
          }
        }
      ]
    );
  };

  // 初回レベル選択の決定
  const handleLevelSelection = async (level: 'beginner' | 'intermediate' | 'advanced') => {
    try {
      logger.debug('レベル選択開始:', level);
      
      // モーダルを先に閉じる
      setShowLevelModal(false);
      
      // レベル設定
      setSelectedLevel(level);
      setUserLevel(level);
      setHasSelectedLevel(true); // レベル選択完了
      setIsFirstTime(false);
      
      // 即時ローカル保存（オフラインでも次回反映）
      try { 
        await AsyncStorage.setItem(LEVEL_CACHE_KEY, level);
        logger.debug('ローカルストレージに保存完了:', level);
      } catch (storageError) {
        ErrorHandler.handle(storageError, 'ローカルストレージ保存', false);
      }

      // ユーザープロフィールに演奏レベルを保存
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('user_profiles')
          .update({
            practice_level: level,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        if (error) {
          ErrorHandler.handle(error, 'データベース保存', false);
        } else {
          logger.debug('データベースに保存完了:', level);
        }
      }
      
      logger.debug('レベル選択完了:', level);
    } catch (error) {
      ErrorHandler.handle(error, 'レベル選択', false);
    }
  };


  // 楽器名の日本語表示

  const goBack = () => {
    router.back();
  };

  // ユーザーの演奏レベルを確認
  useEffect(() => {
    checkUserLevel();
  }, []);

  // レベル選択後の処理を分離
  useEffect(() => {
    if (userLevel && !isFirstTime) {
      logger.debug('レベル選択完了:', userLevel);
    }
  }, [userLevel, isFirstTime]);

  // ユーザーの演奏レベルを確認する関数
  const checkUserLevel = async () => {
    try {
      logger.debug('ユーザーレベル確認開始');

      // オフライン対応: まずローカルから読み込み
      const cached = await AsyncStorage.getItem(LEVEL_CACHE_KEY);
      logger.debug('ローカルキャッシュ:', cached);

      if (cached && cached !== '') {
        setUserLevel(cached);
        setSelectedLevel(cached as 'beginner' | 'intermediate' | 'advanced');
        setHasSelectedLevel(true);
        setIsFirstTime(false);
        logger.debug('ローカルキャッシュからレベル復元:', cached);
        return;
      }

      // オンラインなら最新を取得
      logger.debug('データベースからレベル取得中...');
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('practice_level')
          .eq('user_id', user.id)
          .maybeSingle();

        logger.debug('データベースのレベル:', profile?.practice_level);

        if (profile?.practice_level) {
          setUserLevel(profile.practice_level);
          setSelectedLevel(profile.practice_level as 'beginner' | 'intermediate' | 'advanced');
          setHasSelectedLevel(true);
          setIsFirstTime(false);
          await AsyncStorage.setItem(LEVEL_CACHE_KEY, profile.practice_level);
          logger.debug('データベースからレベル復元:', profile.practice_level);
          return;
        }
      }

      // ここまで来たら未設定: チェック完了後にのみモーダルを表示
      logger.warn('レベル未設定。モーダルを表示');
      setIsFirstTime(true);
      setHasSelectedLevel(false);
      setUserLevel(null);
      setShowLevelModal(true);
    } catch (error) {
      logger.error('ユーザーレベル確認エラー:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <InstrumentHeader />
      
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <ChevronLeft size={24} color={currentTheme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: currentTheme.text }]}>
          {getInstrumentName()}の基礎練メニュー
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* メインコンテンツ - 全体をスクロール可能にする */}
      <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={false}>
        {/* レベル切り替えタブ */}
        <View style={styles.levelTabs}>
          {userLevel ? (
            <TouchableOpacity 
              style={[styles.levelTab, { backgroundColor: currentTheme.primary, alignSelf: 'center', width: '92%' }]}
              onPress={() => setShowLevelModal(true)}
            >
              <Text style={[styles.levelTabText, { color: currentTheme.surface }]}>
                {levels.find(l => l.id === selectedLevel)?.label}
              </Text>
              {/* 経験年数表示は不要のため非表示 */}
            </TouchableOpacity>
          ) : (
            levels.map((level) => (
              <TouchableOpacity
                key={level.id}
                style={[
                  styles.levelTab,
                  selectedLevel === level.id && { backgroundColor: currentTheme.primary }
                ]}
                onPress={() => handleLevelSelection(level.id)}
              >
                <Text
                  style={[
                    styles.levelTabText,
                    { color: selectedLevel === level.id ? currentTheme.surface : currentTheme.text }
                  ]}
                >
                  {level.label}
                </Text>
                {/* 経験年数表示は削除 */}
              </TouchableOpacity>
            ))
          )}
        </View>

        {userLevel && (
          <Text style={[styles.levelFixedNotice, { color: currentTheme.textSecondary }]}>
            演奏レベルは設定から変更できます
          </Text>
        )}

        {/* 基礎情報セクション - マスターレベルでは表示しない */}
        {userLevel && userLevel !== 'advanced' && (
          <View style={[styles.basicInfoSection, { backgroundColor: currentTheme.surface, borderColor: currentTheme.primary }]}>
            <View style={styles.basicInfoHeader}>
              <Target size={16} color={currentTheme.primary} />
              <Text style={[styles.basicInfoTitle, { color: currentTheme.primary }]}>基礎・姿勢・楽器の持ち方</Text>
            </View>
            
            <View style={styles.basicInfoContent}>
              <View style={styles.basicInfoItem}>
                <View style={styles.basicInfoItemHeader}>
                  <Text style={[styles.basicInfoLabel, { color: currentTheme.text }]}>正しい姿勢</Text>
                  <TouchableOpacity 
                    style={[styles.cameraButton, { backgroundColor: currentTheme.primary }]}
                    onPress={openCameraForPostureCheck}
                  >
                    <Camera size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.basicInfoText, { color: currentTheme.textSecondary }]}>
                  {instrumentBasics[instrumentKey]?.posture || instrumentBasics.other.posture}
                </Text>
              </View>
              
              <View style={styles.basicInfoItem}>
                <Text style={[styles.basicInfoLabel, { color: currentTheme.text }]}>楽器の持ち方</Text>
                <Text style={[styles.basicInfoText, { color: currentTheme.textSecondary }]}>
                  {instrumentBasics[instrumentKey]?.grip || instrumentBasics.other.grip}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* 練習メニュー一覧 */}
        <View style={styles.practiceList}>
        {filteredPracticeMenus.map((item, index) => {
          return (
            <TouchableOpacity 
              key={item.id} 
              style={[styles.compactCard, { backgroundColor: currentTheme.surface, borderLeftColor: currentTheme.primary }]}
              activeOpacity={0.7}
              onPress={() => {
                setSelectedMenu(item);
                setShowDetailModal(true);
              }}
            >
              <View style={styles.compactCardContent}>
                <View style={styles.compactCardLeft}>
                  <Text style={[styles.compactCardTitle, { color: currentTheme.text }]}>
                    {item.title}
                  </Text>
                  <Text style={[styles.compactCardDescription, { color: currentTheme.textSecondary }]}>
                    {item.description}
                  </Text>
                </View>
                <View style={styles.compactCardRight}>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
        </View>
      </ScrollView>

      {/* 初回レベル選択モーダル */}
      <Modal
        visible={showLevelModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme.surface }]}>
            <Text style={[styles.modalTitle, { color: currentTheme.text }]}>
              あなたの演奏レベルを選んでください
            </Text>
            
            <View style={styles.levelSelectionContainer}>
              {levels.map((level) => {
                return (
                  <TouchableOpacity
                    key={level.id}
                    style={[styles.levelSelectionButton, { borderColor: currentTheme.primary }]}
                    onPress={() => handleLevelSelection(level.id)}
                  >
                    <Text style={[styles.levelSelectionLabel, { color: currentTheme.text }]}>
                      {level.label}
                    </Text>
                    <Text style={[styles.levelSelectionDescription, { color: currentTheme.textSecondary }]}>
                      {level.description}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* 練習メニュー詳細モーダル */}
      <Modal
        visible={showDetailModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.detailModalOverlay}>
          <View style={[styles.detailModalContent, { backgroundColor: currentTheme.background }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* ヘッダー */}
              <View style={[styles.detailHeader, { backgroundColor: currentTheme.primary }]}>
                <TouchableOpacity 
                  onPress={() => setShowDetailModal(false)}
                  style={styles.detailCloseButton}
                >
                  <Text style={styles.detailCloseText}>✕</Text>
                </TouchableOpacity>
                <Text style={styles.detailTitle}>{selectedMenu?.title}</Text>
                <View style={styles.detailHeaderSpacer} />
              </View>

              <View style={styles.detailBody}>
                {/* 概要 */}
                <View style={styles.detailSection}>
                  <Text style={[styles.detailSectionTitle, { color: currentTheme.text }]}>概要</Text>
                  <Text style={[styles.detailSectionText, { color: currentTheme.textSecondary }]}>
                    {selectedMenu?.description}
                  </Text>
                </View>

                {/* YouTube動画 */}
                {selectedMenu?.videoUrl && (
                  <View style={styles.detailSection}>
                    <Text style={[styles.detailSectionTitle, { color: currentTheme.text }]}>参考動画</Text>
                    <TouchableOpacity
                      style={[styles.youtubeButton, { backgroundColor: '#FF0000' }]}
                      onPress={() => {
                        if (selectedMenu?.videoUrl) {
                          Alert.alert('YouTube再生', 'ブラウザでYouTube動画を開きます', [
                            { text: 'キャンセル' },
                            { text: '開く', onPress: () => {
                              // 実際のアプリではLinking.openURL(selectedMenu.videoUrl)を使用
                              logger.debug('Opening:', selectedMenu.videoUrl);
                            }}
                          ]);
                        }
                      }}
                    >
                      <Play size={20} color="#FFFFFF" />
                      <Text style={styles.youtubeButtonText}>YouTubeで見る</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* 練習の仕方 */}
                {selectedMenu?.howToPractice && selectedMenu.howToPractice.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={[styles.detailSectionTitle, { color: currentTheme.text }]}>練習の仕方</Text>
                    {selectedMenu.howToPractice.map((step, index) => (
                      <View key={index} style={styles.stepItem}>
                        <Text style={[styles.stepText, { color: currentTheme.textSecondary }]}>{step}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* 推奨テンポ・時間 */}
                <View style={styles.detailInfoRow}>
                  {selectedMenu?.recommendedTempo && (
                    <View style={[styles.detailInfoCard, { backgroundColor: currentTheme.surface }]}>
                      <Text style={[styles.detailInfoLabel, { color: currentTheme.textSecondary }]}>推奨テンポ</Text>
                      <Text style={[styles.detailInfoValue, { color: currentTheme.primary }]}>
                        {selectedMenu.recommendedTempo}
                      </Text>
                    </View>
                  )}
                  {selectedMenu?.duration && (
                    <View style={[styles.detailInfoCard, { backgroundColor: currentTheme.surface }]}>
                      <Text style={[styles.detailInfoLabel, { color: currentTheme.textSecondary }]}>練習時間</Text>
                      <Text style={[styles.detailInfoValue, { color: currentTheme.primary }]}>
                        {selectedMenu.duration}
                      </Text>
                    </View>
                  )}
                </View>

                {/* 練習ポイント */}
                {selectedMenu?.points && selectedMenu.points.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={[styles.detailSectionTitle, { color: currentTheme.text }]}>練習ポイント</Text>
                    {selectedMenu.points.map((point, index) => (
                      <View key={index} style={styles.detailPointItem}>
                        <View style={[styles.detailPointBullet, { backgroundColor: currentTheme.primary }]} />
                        <Text style={[styles.detailPointText, { color: currentTheme.textSecondary }]}>{point}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* 追加のヒント */}
                {selectedMenu?.tips && selectedMenu.tips.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={[styles.detailSectionTitle, { color: currentTheme.text }]}>💡 追加のヒント</Text>
                    {selectedMenu.tips.map((tip, index) => (
                      <View key={index} style={styles.tipItem}>
                        <Text style={[styles.tipText, { color: currentTheme.textSecondary }]}>• {tip}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* アクションボタン */}
                <View style={styles.detailActions}>
                  <TouchableOpacity
                    style={[styles.detailStartButton, { backgroundColor: currentTheme.primary }]}
                    onPress={async () => {
                      if (!user) {
                        Alert.alert('エラー', 'ログインが必要です');
                        return;
                      }

                      if (!selectedMenu) {
                        return;
                      }

                      try {
                        // 基礎練の完了を記録（時間は追加しない、✅マークだけ）
                        const today = new Date().toISOString().split('T')[0];
                        
                        // 今日の既存の練習記録を取得
                        const { data: { user: authUser } } = await supabase.auth.getUser();
                        if (!authUser) {
                          Alert.alert('エラー', 'ログインが必要です');
                          return;
                        }

                        let query = supabase
                          .from('practice_sessions')
                          .select('id, duration_minutes, content')
                          .eq('user_id', authUser.id)
                          .eq('practice_date', today);
                        
                        if (selectedInstrument) {
                          query = query.eq('instrument_id', selectedInstrument);
                        } else {
                          query = query.is('instrument_id', null);
                        }
                        
                        const { data: existingRecords, error: fetchError } = await query;
                        
                        if (fetchError) {
                          logger.error('練習記録取得エラー:', fetchError);
                          Alert.alert('エラー', '練習記録の取得に失敗しました');
                          return;
                        }

                        if (existingRecords && existingRecords.length > 0) {
                          // 既存の記録がある場合は、時間を追加せずcontentだけを更新
                          const existing = existingRecords[0];
                          let existingContent = existing.content || '';
                          
                          // 既存のcontentから時間詳細を削除（「累計XX分」「XX分」などを削除）
                          existingContent = existingContent
                            .replace(/\s*\(累計\d+分\)/g, '') // 「（累計XX分）」を削除
                            .replace(/\s*累計\d+分/g, '') // 「累計XX分」を削除
                            .replace(/\s*\+\s*[^,]+?\d+分/g, '') // 「+ XX分」を削除
                            .replace(/\s*[^,]+?\d+分/g, '') // 「XX分」を含む文字列を削除
                            .replace(/練習記録/g, '') // 「練習記録」を削除
                            .replace(/^[\s,]+|[\s,]+$/g, '') // 前後のカンマとスペースを削除
                            .replace(/,\s*,/g, ',') // 連続するカンマを1つに
                            .trim();
                          
                          // 基礎練のメニュー名を追加
                          const newContent = existingContent 
                            ? `${existingContent}, ${selectedMenu.title}`
                            : selectedMenu.title;
                          
                          const { error: updateError } = await supabase
                            .from('practice_sessions')
                            .update({
                              content: newContent,
                            })
                            .eq('id', existing.id);
                          
                          if (updateError) {
                            logger.error('練習記録更新エラー:', updateError);
                            Alert.alert('エラー', '練習記録の更新に失敗しました');
                            return;
                          }
                        } else {
                          // 新規記録を作成（基礎練は時間を追加しないため、duration_minutes: 0）
                          const { error: insertError } = await supabase
                            .from('practice_sessions')
                            .insert({
                              user_id: authUser.id,
                              practice_date: today,
                              duration_minutes: 0, // 基礎練は時間を追加しない
                              content: selectedMenu.title,
                              input_method: 'preset',
                              instrument_id: selectedInstrument || null,
                            });
                          
                          if (insertError) {
                            logger.error('練習記録作成エラー:', insertError);
                            Alert.alert('エラー', '練習記録の作成に失敗しました');
                            return;
                          }
                        }

                        // 統計画面の更新通知を発火
                        if (typeof window !== 'undefined') {
                          const event = new CustomEvent('practiceRecordUpdated', {
                            detail: { 
                              action: 'practice_saved',
                              content: selectedMenu.title
                            }
                          });
                          window.dispatchEvent(event);
                        }

                        setShowDetailModal(false);
                        Alert.alert('保存完了', `${selectedMenu.title}の練習記録を保存しました！`);
                      } catch (error) {
                        logger.error('練習記録保存エラー:', error);
                        Alert.alert('エラー', '練習記録の保存に失敗しました');
                      }
                    }}
                  >
                    <Play size={20} color="#FFFFFF" />
                    <Text style={styles.detailStartButtonText}>練習した！</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* カメラモーダル */}
      <PostureCameraModal
        visible={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        instrumentName={getInstrumentName()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  mainContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  levelTabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    gap: 8,
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelTab: {
    // flex: 1, // コンテンツサイズに合わせるため削除
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  levelTabText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  levelTabExperience: {
    fontSize: 11,
    fontWeight: '400',
  },
  practiceList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  levelFixedNotice: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 0,
  },
  practiceCard: {
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    lineHeight: 24,
  },
  difficultyBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  videoButton: {
    padding: 10,
    borderRadius: 12,
    marginLeft: 12,
    elevation: 3,
  },
  cardDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  pointsSection: {
    marginBottom: 16,
  },
  pointsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  pointsList: {
    gap: 6,
  },
  pointItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pointBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pointText: {
    fontSize: 14,
    lineHeight: 18,
    flex: 1,
  },
  morePointsText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    elevation: 3,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    
    
    
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
  },
  levelSelectionContainer: {
    gap: 16,
    marginBottom: 24,
  },
  levelSelectionButton: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  levelSelectionLabel: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  levelSelectionExperience: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  levelSelectionDescription: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  modalButtons: {
    alignItems: 'center',
  },
  skipButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'solid',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // コンパクトカードスタイル
  compactCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    elevation: 2,
  },
  compactCardContent: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compactCardLeft: {
    flex: 1,
  },
  compactCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  compactCardDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  compactCardRight: {
    marginLeft: 12,
  },
  // 詳細モーダルスタイル
  detailModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  detailModalContent: {
    flex: 1,
    marginTop: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  detailCloseButton: {
    padding: 8,
    width: 40,
  },
  detailCloseText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  detailHeaderSpacer: {
    width: 40,
  },
  detailBody: {
    padding: 20,
  },
  detailSection: {
    marginBottom: 24,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  detailSectionText: {
    fontSize: 14,
    lineHeight: 22,
  },
  youtubeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    elevation: 3,
  },
  youtubeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  stepItem: {
    marginBottom: 12,
    paddingLeft: 8,
  },
  stepText: {
    fontSize: 14,
    lineHeight: 22,
  },
  detailInfoRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  detailInfoCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  detailInfoLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  detailInfoValue: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  detailPointItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 10,
  },
  detailPointBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  detailPointText: {
    fontSize: 14,
    lineHeight: 22,
    flex: 1,
  },
  tipItem: {
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    lineHeight: 22,
  },
  detailActions: {
    marginTop: 20,
    marginBottom: 40,
  },
  detailStartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    elevation: 3,
  },
  detailStartButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // 基礎情報セクションのスタイル
  basicInfoSection: {
    margin: 12,
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 1,
    elevation: 3,
  },
  basicInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    gap: 8,
  },
  basicInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  basicInfoContent: {
    padding: 12,
    paddingTop: 8,
  },
  basicInfoItem: {
    marginBottom: 12,
  },
  basicInfoItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cameraButton: {
    padding: 6,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    marginLeft: -4,
    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.2)',
    marginRight: 8,
  },
  basicInfoLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  basicInfoText: {
    fontSize: 13,
    lineHeight: 18,
  },
  basicInfoTips: {
    marginTop: 4,
  },
  basicInfoTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 8,
  },
  basicInfoTipBullet: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 2,
  },
  basicInfoTipText: {
    fontSize: 14,
    lineHeight: 18,
    flex: 1,
  },
});
