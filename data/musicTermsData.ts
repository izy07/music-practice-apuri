/**
 * 音楽用語のデフォルトデータ
 * 記号ごとに分類され、楽器区分に応じて内容が変わる
 */

import { InstrumentCategory } from '@/lib/instrumentUtils';

export interface MusicTermData {
  term_ja: string;
  term_en?: string;
  symbol?: string;
  description_ja: string;
  description_en?: string;
  example_usage?: string;
  categories?: InstrumentCategory[]; // この用語を表示する楽器区分（undefinedの場合は全楽器）
  requiresSyncopation?: boolean; // シンコペーションが必要な楽器のみに表示
}

export type MusicTermCategory = 
  | 'dynamics'      // 強弱記号
  | 'tempo'         // 速度記号
  | 'expression'    // 発想記号
  | 'articulation'  // アーティキュレーション
  | 'repeat'        // 反復記号
  | 'technique';    // 奏法指示・その他

export const MUSIC_TERM_CATEGORIES: Record<MusicTermCategory, { label: string; labelEn: string }> = {
  dynamics: { label: '強弱記号', labelEn: 'Dynamics' },
  tempo: { label: '速度記号', labelEn: 'Tempo' },
  expression: { label: '発想記号', labelEn: 'Expression' },
  articulation: { label: 'アーティキュレーション', labelEn: 'Articulation' },
  repeat: { label: '反復記号', labelEn: 'Repeat Signs' },
  technique: { label: '奏法指示・その他', labelEn: 'Technique & Others' },
};

/**
 * デフォルトの音楽用語データ
 */
export const DEFAULT_MUSIC_TERMS: Record<MusicTermCategory, MusicTermData[]> = {
  dynamics: [
    {
      term_ja: 'p (piano)',
      term_en: 'piano',
      symbol: 'p',
      description_ja: '弱く',
      description_en: 'Softly',
    },
    {
      term_ja: 'f (forte)',
      term_en: 'forte',
      symbol: 'f',
      description_ja: '強く',
      description_en: 'Loudly',
    },
    {
      term_ja: 'mp (mezzo piano)',
      term_en: 'mezzo piano',
      symbol: 'mp',
      description_ja: 'やや弱く',
      description_en: 'Moderately soft',
    },
    {
      term_ja: 'mf (mezzo forte)',
      term_en: 'mezzo forte',
      symbol: 'mf',
      description_ja: 'やや強く',
      description_en: 'Moderately loud',
    },
    {
      term_ja: 'cresc. (crescendo)',
      term_en: 'crescendo',
      symbol: 'cresc.',
      description_ja: 'だんだん強く',
      description_en: 'Gradually louder',
    },
    {
      term_ja: 'dim. (diminuendo)',
      term_en: 'diminuendo',
      symbol: 'dim.',
      description_ja: 'だんだん弱く',
      description_en: 'Gradually softer',
    },
  ],
  tempo: [
    {
      term_ja: '♩=60',
      term_en: 'Metronome mark',
      symbol: '♩=60',
      description_ja: '1分間に4分音符が60個入る速さ',
      description_en: '60 quarter notes per minute',
    },
    {
      term_ja: 'Allegro（アレグロ）',
      term_en: 'Allegro',
      description_ja: '速く、快活に',
      description_en: 'Fast and lively',
    },
    {
      term_ja: 'Andante（アンダンテ）',
      term_en: 'Andante',
      description_ja: '歩くような速さで',
      description_en: 'At a walking pace',
    },
    {
      term_ja: 'Adagio（アダージョ）',
      term_en: 'Adagio',
      description_ja: 'ゆるやかに',
      description_en: 'Slowly and leisurely',
    },
  ],
  expression: [
    {
      term_ja: 'Espressivo',
      term_en: 'Espressivo',
      description_ja: '表情豊かに',
      description_en: 'Expressively',
    },
    {
      term_ja: 'Dolce',
      term_en: 'Dolce',
      description_ja: '甘く、やさしく',
      description_en: 'Sweetly, gently',
    },
    {
      term_ja: 'Cantabile',
      term_en: 'Cantabile',
      description_ja: '歌うように',
      description_en: 'In a singing style',
    },
    {
      term_ja: 'Legato',
      term_en: 'Legato',
      description_ja: '滑らかに、なめらかに',
      description_en: 'Smoothly, connected',
    },
    {
      term_ja: 'Grazioso',
      term_en: 'Grazioso',
      description_ja: '優雅に',
      description_en: 'Gracefully',
    },
    {
      term_ja: 'Maestoso',
      term_en: 'Maestoso',
      description_ja: '荘厳に、堂々と',
      description_en: 'Majestically',
    },
    {
      term_ja: 'Animato',
      term_en: 'Animato',
      description_ja: '活発に、生き生きと',
      description_en: 'Animatedly, lively',
    },
    {
      term_ja: 'Tranquillo',
      term_en: 'Tranquillo',
      description_ja: '静かに、穏やかに',
      description_en: 'Tranquilly, calmly',
    },
    {
      term_ja: 'Agitato',
      term_en: 'Agitato',
      description_ja: '激しく、興奮して',
      description_en: 'Agitated, excited',
    },
    {
      term_ja: 'Appassionato',
      term_en: 'Appassionato',
      description_ja: '情熱的に',
      description_en: 'Passionately',
    },
    {
      term_ja: 'Brillante',
      term_en: 'Brillante',
      description_ja: '輝かしく、華やかに',
      description_en: 'Brilliantly',
    },
    {
      term_ja: 'Calmato',
      term_en: 'Calmato',
      description_ja: '落ち着いて',
      description_en: 'Calmly',
    },
    {
      term_ja: 'Scherzando',
      term_en: 'Scherzando',
      description_ja: '軽快に、遊び心を持って',
      description_en: 'Playfully, in a light-hearted manner',
    },
    {
      term_ja: 'Sostenuto',
      term_en: 'Sostenuto',
      description_ja: '音を保持して、ゆっくりと',
      description_en: 'Sustained, slowly',
    },
    {
      term_ja: 'Con brio',
      term_en: 'Con brio',
      description_ja: '元気よく、力強く',
      description_en: 'With vigor, energetically',
    },
    {
      term_ja: 'Dolente',
      term_en: 'Dolente',
      description_ja: '悲しげに',
      description_en: 'Sorrowfully',
    },
  ],
  articulation: [
    {
      term_ja: 'スタッカート',
      term_en: 'Staccato',
      symbol: '.',
      description_ja: '音を短く切る',
      description_en: 'Play notes short and detached',
    },
    {
      term_ja: 'スラー',
      term_en: 'Slur',
      symbol: '曲線',
      description_ja: '滑らかに繋げる',
      description_en: 'Play smoothly connected',
    },
    {
      term_ja: 'アクセント',
      term_en: 'Accent',
      symbol: '>',
      description_ja: '音を強調する',
      description_en: 'Emphasize the note',
    },
    {
      term_ja: 'テヌート',
      term_en: 'Tenuto',
      symbol: '—',
      description_ja: '音を十分に保つ',
      description_en: 'Hold the note for its full value',
    },
  ],
  repeat: [
    {
      term_ja: 'リピート記号',
      term_en: 'Repeat sign',
      symbol: '||: :||',
      description_ja: '括弧内を繰り返す',
      description_en: 'Repeat the section',
    },
    {
      term_ja: 'D.C. (Da Capo)',
      term_en: 'Da Capo',
      symbol: 'D.C.',
      description_ja: '最初に戻る',
      description_en: 'Return to the beginning',
    },
    {
      term_ja: 'D.S. (Dal Segno)',
      term_en: 'Dal Segno',
      symbol: 'D.S.',
      description_ja: 'セーニョ記号（𝄋）から戻る',
      description_en: 'Return to the segno sign',
    },
    {
      term_ja: 'Coda',
      term_en: 'Coda',
      symbol: '◉',
      description_ja: '終結部へ',
      description_en: 'To the coda (ending section)',
    },
    {
      term_ja: 'Fine',
      term_en: 'Fine',
      symbol: 'Fine',
      description_ja: '終わり',
      description_en: 'The end',
    },
    {
      term_ja: 'Segno（セーニョ）',
      term_en: 'Segno',
      symbol: '𝄋',
      description_ja: '記号の位置をマーク',
      description_en: 'Marks a specific point in the music',
    },
    {
      term_ja: '1番カッコ',
      term_en: '1st ending',
      symbol: '1.',
      description_ja: '1回目の終わり（1回目はここで、2回目は2番カッコへ）',
      description_en: 'First ending (play this on first repeat, then skip to 2nd ending)',
    },
    {
      term_ja: '2番カッコ',
      term_en: '2nd ending',
      symbol: '2.',
      description_ja: '2回目の終わり（2回目以降はここを通る）',
      description_en: 'Second ending (play this on second and subsequent repeats)',
    },
    {
      term_ja: 'D.C. al Fine',
      term_en: 'D.C. al Fine',
      symbol: 'D.C. al Fine',
      description_ja: '最初に戻り、Fineまで演奏',
      description_en: 'Return to the beginning and play until Fine',
    },
    {
      term_ja: 'D.S. al Fine',
      term_en: 'D.S. al Fine',
      symbol: 'D.S. al Fine',
      description_ja: 'セーニョから戻り、Fineまで演奏',
      description_en: 'Return to the segno and play until Fine',
    },
    {
      term_ja: 'D.C. al Coda',
      term_en: 'D.C. al Coda',
      symbol: 'D.C. al Coda',
      description_ja: '最初に戻り、Coda記号で終結部へ',
      description_en: 'Return to the beginning, then jump to coda when coda sign appears',
    },
    {
      term_ja: 'D.S. al Coda',
      term_en: 'D.S. al Coda',
      symbol: 'D.S. al Coda',
      description_ja: 'セーニョから戻り、Coda記号で終結部へ',
      description_en: 'Return to the segno, then jump to coda when coda sign appears',
    },
    {
      term_ja: 'To Coda',
      term_en: 'To Coda',
      symbol: 'To Coda',
      description_ja: 'Coda（終結部）へ進む指示',
      description_en: 'Indication to jump to the coda section',
    },
  ],
  technique: [
    {
      term_ja: 'ペダル記号',
      term_en: 'Pedal mark',
      description_ja: 'ピアノのペダルの使用指示',
      description_en: 'Indication for piano pedal usage',
      categories: ['keyboard'],
    },
    {
      term_ja: 'トレモロ',
      term_en: 'Tremolo',
      description_ja: '同じ音を素早く繰り返す（音符の符幹に斜線を付けて表す）',
      description_en: 'Rapidly repeat the same note',
    },
    {
      term_ja: 'トリル',
      term_en: 'Trill',
      symbol: 'tr',
      description_ja: '記された音と2度上の音を素早く交互に演奏する装飾音',
      description_en: 'Rapidly alternate between the written note and the note above',
    },
    {
      term_ja: 'フェルマータ',
      term_en: 'Fermata',
      symbol: 'U',
      description_ja: '音や休符をのばす',
      description_en: 'Hold the note or rest longer',
    },
    {
      term_ja: 'ブレス（息継ぎ記号）',
      term_en: 'Breath mark',
      description_ja: '息継ぎの指示',
      description_en: 'Indication for breathing',
      categories: ['wind'],
    },
    {
      term_ja: 'シンコペーション',
      term_en: 'Syncopation',
      description_ja: '強拍と弱拍を入れ替えたリズム',
      description_en: 'Rhythm with emphasis on weak beats',
      requiresSyncopation: true,
    },
    // --- 基礎練メニューで出てくる用語（初心者向けに説明を追加） ---
    {
      term_ja: 'ロングトーン',
      term_en: 'Long tone',
      description_ja: '音を長くのばして、音の安定（音量・音程・音色）を整える練習',
      example_usage: '例: 1音を8秒のばして、音が揺れないか確認する',
      categories: ['wind', 'string'],
    },
    {
      term_ja: 'タンギング',
      term_en: 'Tonguing',
      description_ja: '舌を使って音のはじまりをハッキリさせる技術（息は止めない）',
      example_usage: '例: 「トゥ」と言う感じで、1音ずつ区切って吹く',
      categories: ['wind'],
    },
    {
      term_ja: 'ダブルタンギング',
      term_en: 'Double tonguing',
      description_ja: '「トゥ・ク」など2つの動きを交互に使って、速いタンギングをする方法',
      categories: ['wind'],
    },
    {
      term_ja: 'トリプルタンギング',
      term_en: 'Triple tonguing',
      description_ja: '「トゥ・ク・トゥ」など3つで回して、速いフレーズを吹きやすくする方法',
      categories: ['wind'],
    },
    {
      term_ja: 'アンブシュア',
      term_en: 'Embouchure',
      description_ja: '口の形・唇の当て方のこと（音色や音程に影響する）',
      example_usage: '例: 鏡で口の形を確認しながらロングトーンをする',
      categories: ['wind'],
    },
    {
      term_ja: 'リップスラー',
      term_en: 'Lip slur',
      description_ja: '指を変えずに、息や唇の使い方で音を移動する練習（唇の柔らかさを育てる）',
      categories: ['wind'],
    },
    {
      term_ja: 'スケール（音階）',
      term_en: 'Scale',
      description_ja: 'ドレミの並びを順番に上がったり下がったりする練習（音程と指使いの基礎）',
      example_usage: '例: Cメジャースケールをゆっくり、正確に弾く/吹く',
    },
    {
      term_ja: 'アルペジオ',
      term_en: 'Arpeggio',
      description_ja: '和音（コード）を1音ずつ順番に鳴らす練習（分散和音）',
      example_usage: '例: C-E-G-C のように順番に弾く',
      categories: ['keyboard', 'string'],
    },
    {
      term_ja: 'ビブラート',
      term_en: 'Vibrato',
      description_ja: '音を少し揺らして、歌うような表情をつける技術（最初は揺らさず練習も大事）',
      categories: ['wind', 'string'],
    },
    {
      term_ja: 'グリッサンド',
      term_en: 'Glissando',
      description_ja: '音をなめらかに滑らせて移動する奏法',
      example_usage: '例: 低い音から高い音へ、途中を切らずに滑らせる',
    },
    {
      term_ja: 'フラッタータンギング',
      term_en: 'Flutter tonguing',
      description_ja: '舌を震わせて「rrrr」のような音にする特殊奏法',
      categories: ['wind'],
    },
    {
      term_ja: 'フラッター',
      term_en: 'Flutter',
      description_ja: 'フラッタータンギングの略称。舌を震わせて「rrrr」のような音にする特殊奏法。',
      categories: ['wind'],
    },
    {
      term_ja: 'マルテレ',
      term_en: 'Martelé',
      description_ja: '弓を弦に強く当てて、各音をはっきりと区切って弾く弦楽器の奏法。ハンマーで打つような鋭い発音。',
      example_usage: '例: 弓を弦に当てて、はっきりと発音する',
      categories: ['string'],
    },
    {
      term_ja: 'スピッカート',
      term_en: 'Spiccato',
      description_ja: '弓を弦から跳ねさせるように弾く奏法。軽くてはっきりした音になる。',
      example_usage: '例: 弓を跳ねさせて、軽く短い音を出す',
      categories: ['string'],
    },
    {
      term_ja: 'ハーモニクス',
      term_en: 'Harmonics',
      description_ja: 'ヴァイオリンやヴィオラ,チェロ,コントラバスなどの弦楽器には, ハーモニクスと呼ばれる奏法があります。 これらの弦楽器では弦の上のある一点を左指で軽く指を触れ(押さえつけずに), 右手の弓で演奏すると振動の節ができ、倍音（１オクターブ上など）を得ることができます。 これがハーモニクス奏法です。',
      categories: ['string'],
    },
    {
      term_ja: '倍音',
      term_en: 'Harmonic',
      description_ja: '基音に対して整数倍の周波数を持つ音。楽器ではハーモニクス奏法で鳴らすことができる。',
      categories: ['wind', 'string'],
    },
    {
      term_ja: 'シングルストローク',
      term_en: 'Single stroke',
      description_ja: '右・左を交互に1回ずつ叩く基本パターン（R L R L ...）',
      categories: ['percussion'],
    },
    {
      term_ja: 'ダブルストローク',
      term_en: 'Double stroke',
      description_ja: '同じ手で2回ずつ叩く基本パターン（R R L L ...）',
      categories: ['percussion'],
    },
    {
      term_ja: 'リバウンド',
      term_en: 'Rebound',
      description_ja: 'スティックが跳ね返ってくる力。力任せではなく跳ね返りを使うと疲れにくい',
      categories: ['percussion'],
    },
    // --- ジャズ練習で出てくる用語（初心者向けに説明を追加） ---
    {
      term_ja: 'スウィング',
      term_en: 'Swing',
      description_ja: 'ジャズでよくあるリズムのノリ。まっすぐ（8分を均等）より、少し跳ねる感じに聞こえることが多い',
      categories: ['wind', 'string', 'keyboard'],
    },
    {
      term_ja: 'アドリブ',
      term_en: 'Ad-lib',
      description_ja: 'その場でメロディを作って演奏すること（即興）。まずは短いフレーズを少し変えるところから始めると安心',
      categories: ['wind', 'string', 'keyboard'],
    },
    {
      term_ja: 'フレーズ',
      term_en: 'Phrase',
      description_ja: '短いメロディのかたまり。言葉の「文」みたいに、区切りや流れを作る単位',
      categories: ['wind', 'string', 'keyboard'],
    },
    {
      term_ja: 'リック',
      term_en: 'Lick',
      description_ja: 'ジャズでよく使う定番の短いフレーズ。うまくいったものを貯めるとアドリブが楽になる',
      categories: ['wind', 'string', 'keyboard'],
    },
  ],
};

/**
 * 楽器区分に応じた用語を取得
 * @param category 用語カテゴリ
 * @param instrumentCategory 楽器区分
 * @returns フィルタリングされた用語リスト
 */
export const getTermsForInstrument = (
  category: MusicTermCategory,
  instrumentCategory: InstrumentCategory
): MusicTermData[] => {
  const terms = DEFAULT_MUSIC_TERMS[category];
  
  return terms.filter(term => {
    // 特定の楽器区分のみに表示する用語のチェック
    if (term.categories && term.categories.length > 0) {
      return term.categories.includes(instrumentCategory);
    }
    
    // カテゴリが指定されていない場合は全楽器に表示
    // シンコペーションのチェックは画面側で行う
    return true;
  });
};
