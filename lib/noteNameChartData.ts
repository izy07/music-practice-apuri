export type NoteNameChartRow = {
  label: string;
  values: string[];
  sub?: string[];
};

export type NoteNameChartSection = {
  title: string;
  rows: NoteNameChartRow[];
};

export const NOTE_NAME_CHART_TITLE = '音名対照表（イタリア語・英語・ドイツ語）';

export const NOTE_NAME_CHART_SECTIONS: NoteNameChartSection[] = [
  {
    title: '幹音',
    rows: [
      { label: 'イタリア語音名', values: ['ド', 'レ', 'ミ', 'ファ', 'ソ', 'ラ', 'シ', 'ド'] },
      { label: '英語音名', values: ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C'] },
      {
        label: 'ドイツ語音名',
        values: ['C', 'D', 'E', 'F', 'G', 'A', 'H', 'C'],
        sub: ['ツェー', 'デー', 'エー', 'エフ', 'ゲー', 'アー', 'ハー', 'ツェー'],
      },
    ],
  },
  {
    title: 'シャープ系',
    rows: [
      {
        label: 'イタリア語音名',
        values: ['ド♯', 'レ♯', 'ミ♯', 'ファ♯', 'ソ♯', 'ラ♯', 'シ♯', 'ド♯'],
      },
      { label: '英語音名', values: ['C♯', 'D♯', 'E♯', 'F♯', 'G♯', 'A♯', 'B♯', 'C♯'] },
      {
        label: 'ドイツ語音名',
        values: ['Cis', 'Dis', 'Eis', 'Fis', 'Gis', 'Ais', 'His', 'Cis'],
        sub: ['ツィス', 'ディス', 'エイス', 'フィス', 'ギス', 'アイス', 'ヒス', 'ツィス'],
      },
    ],
  },
  {
    title: 'フラット系',
    rows: [
      {
        label: 'イタリア語音名',
        values: ['ド♭', 'レ♭', 'ミ♭', 'ファ♭', 'ソ♭', 'ラ♭', 'シ♭', 'ド♭'],
      },
      { label: '英語音名', values: ['C♭', 'D♭', 'E♭', 'F♭', 'G♭', 'A♭', 'B♭', 'C♭'] },
      {
        label: 'ドイツ語音名',
        values: ['Ces', 'Des', 'Es', 'Fes', 'Ges', 'As', 'B', 'Ces'],
        sub: ['ツェス', 'デス', 'エス', 'フェス', 'ゲス', 'アス', 'ベー', 'ツェス'],
      },
    ],
  },
];

export const NOTE_NAME_CHART_LEGEND =
  '【覚え方】ドイツ語: is＝♯（半音上）  es＝♭（半音下）  H＝英語のB（自然のシ）  B＝英語のB♭（シ♭）\n指揮者が「Fis」と言ったら → F♯（ファの半音上）を出す';
