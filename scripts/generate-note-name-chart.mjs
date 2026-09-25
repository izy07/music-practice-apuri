/**
 * 音名対照表（幹音・シャープ・フラット）Excel 生成
 * 実行: node scripts/generate-note-name-chart.mjs
 */
import ExcelJS from 'exceljs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT = path.join(__dirname, '../assets/documents/onmei-hyo.xlsx');

const SECTIONS = [
  {
    title: '幹音',
    note: null,
    rows: [
      { label: 'イタリア語音名', values: ['ド', 'レ', 'ミ', 'ファ', 'ソ', 'ラ', 'シ', 'ド'] },
      { label: '日本語音名', values: ['ハ', 'ニ', 'ホ', 'ヘ', 'ト', 'イ', 'ロ', 'ハ'] },
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
    note: 'イタリア語の♯は本来diesisですが、慣用的に♯で表記しています。',
    rows: [
      {
        label: 'イタリア語音名',
        values: ['ド♯', 'レ♯', 'ミ♯', 'ファ♯', 'ソ♯', 'ラ♯', 'シ♯', 'ド♯'],
      },
      {
        label: '日本語音名',
        values: ['嬰ハ', '嬰ニ', '嬰ホ', '嬰ヘ', '嬰ト', '嬰イ', '嬰ロ', '嬰ハ'],
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
    note: 'イタリア語の♭は本来bemolleですが、慣用的に♭で表記しています。',
    rows: [
      {
        label: 'イタリア語音名',
        values: ['ド♭', 'レ♭', 'ミ♭', 'ファ♭', 'ソ♭', 'ラ♭', 'シ♭', 'ド♭'],
      },
      {
        label: '日本語音名',
        values: ['変ハ', '変ニ', '変ホ', '変ヘ', '変ト', '変イ', '変ロ', '変ハ'],
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

const thinBorder = {
  top: { style: 'thin' },
  left: { style: 'thin' },
  bottom: { style: 'thin' },
  right: { style: 'thin' },
};

const applyTableBorder = (ws, r1, c1, r2, c2) => {
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      ws.getCell(r, c).border = thinBorder;
    }
  }
};

const workbook = new ExcelJS.Workbook();
workbook.creator = 'Music Practice App';
workbook.created = new Date();

const ws = workbook.addWorksheet('音名対照表', {
  pageSetup: {
    paperSize: 9, // A4
    orientation: 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 1,
    margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
  },
});

ws.columns = [
  { width: 16 },
  { width: 10 },
  { width: 10 },
  { width: 10 },
  { width: 10 },
  { width: 10 },
  { width: 10 },
  { width: 10 },
  { width: 10 },
];

let row = 1;

// タイトル
ws.mergeCells(row, 1, row, 9);
const titleCell = ws.getCell(row, 1);
titleCell.value = '音名対照表（イタリア語・日本語・英語・ドイツ語）';
titleCell.font = { bold: true, size: 14 };
titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
row += 2;

for (const section of SECTIONS) {
  // セクション見出し
  ws.mergeCells(row, 1, row, 9);
  const header = ws.getCell(row, 1);
  header.value = section.title;
  header.font = { bold: true, size: 12, underline: true };
  header.alignment = { horizontal: 'left' };
  row++;

  if (section.note) {
    ws.mergeCells(row, 1, row, 9);
    const noteCell = ws.getCell(row, 1);
    noteCell.value = section.note;
    noteCell.font = { size: 9, italic: true };
    noteCell.alignment = { horizontal: 'left', wrapText: true };
    row++;
  }

  const tableStart = row;

  for (const dataRow of section.rows) {
    const labelCell = ws.getCell(row, 1);
    labelCell.value = dataRow.label;
    labelCell.font = { bold: true, size: 10 };
    labelCell.alignment = { horizontal: 'left', vertical: 'middle' };

    dataRow.values.forEach((val, i) => {
      const cell = ws.getCell(row, i + 2);
      if (dataRow.sub) {
        cell.value = `${val}\n${dataRow.sub[i]}`;
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.font = { size: 10 };
      } else {
        cell.value = val;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.font = { size: 11 };
      }
    });

    ws.getRow(row).height = dataRow.sub ? 36 : 22;
    row++;
  }

  applyTableBorder(ws, tableStart, 1, row - 1, 9);

  // セクション間の余白
  row += 1;
}

// 凡例
ws.mergeCells(row, 1, row + 1, 9);
const legend = ws.getCell(row, 1);
legend.value =
  '【覚え方】ドイツ語: is＝♯（半音上）  es＝♭（半音下）  H＝英語のB（自然のシ）  B＝英語のB♭（シ♭）\n指揮者が「Fis」と言ったら → F♯（ファの半音上）を出す';
legend.font = { size: 9 };
legend.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
ws.getRow(row).height = 36;

await workbook.xlsx.writeFile(OUTPUT);
console.log(`Generated: ${OUTPUT}`);
