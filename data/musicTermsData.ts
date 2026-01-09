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
  dynamics: { label: '強弱記号（Dinamica）', labelEn: 'Dynamics' },
  tempo: { label: '速度記号（Tempo）', labelEn: 'Tempo' },
  expression: { label: '発想記号（Espressione）', labelEn: 'Expression' },
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
      description_ja: 'セーニョ（♪記号）から戻る',
      description_en: 'Return to the segno sign',
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
      symbol: 'tr',
      description_ja: '同じ音を素早く繰り返す',
      description_en: 'Rapidly repeat the same note',
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
