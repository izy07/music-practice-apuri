/**
 * 楽器データ（静的データ）
 * 
 * このファイルは、データベースから取得した楽器データを静的データとして保存します。
 * データベースへのリクエストを削減し、パフォーマンスとコストを最適化します。
 * 
 * データの更新方法:
 * 1. scripts/export_instruments.sql をSupabaseで実行
 * 2. エクスポートしたJSONデータをこのファイルに貼り付け
 * 3. 型定義を確認して、必要に応じて調整
 */

export interface StaticInstrumentFromDB {
  id: string;
  name: string;
  name_en: string;
  color_primary: string;
  color_secondary: string;
  color_accent: string;
  color_background?: string | null;
  color_surface?: string | null;
  starting_note?: string | null;
  tuning_notes?: string[] | null;
}

/**
 * アプリケーションで使用する楽器の型
 * データベースの楽器データとローカルの色設定をマージした型
 */
export interface StaticInstrument {
  id: string;
  name: string;
  nameEn: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
}

/**
 * データベースからエクスポートした楽器データ
 * TODO: データベースからエクスポートしたデータをここに貼り付け
 */
export const staticInstrumentsFromDB: StaticInstrumentFromDB[] = [
  // TODO: エクスポートしたデータを貼り付け
];

/**
 * 楽器データをアプリケーション用の形式に変換
 * データベースの楽器データから、アプリケーションで使用する形式に変換します。
 * 色設定は、データベースの色情報を使用し、text/textSecondaryは自動計算します。
 */
const convertToAppFormat = (dbInstrument: StaticInstrumentFromDB): StaticInstrument => {
  // textとtextSecondaryはprimary色をベースに自動計算
  const textColor = dbInstrument.color_primary;
  const textSecondaryColor = dbInstrument.color_accent || dbInstrument.color_primary;

  return {
    id: dbInstrument.id,
    name: dbInstrument.name,
    nameEn: dbInstrument.name_en,
    primary: dbInstrument.color_primary,
    secondary: dbInstrument.color_secondary,
    accent: dbInstrument.color_accent,
    background: dbInstrument.color_background || '#FFFFFF',
    surface: dbInstrument.color_surface || '#FFFFFF',
    text: textColor,
    textSecondary: textSecondaryColor,
  };
};

/**
 * すべての楽器データ（アプリケーション用形式）
 */
export const staticInstruments: StaticInstrument[] = staticInstrumentsFromDB.map(convertToAppFormat);

/**
 * 楽器IDで楽器を取得
 * @param instrumentId 楽器ID
 * @returns 楽器データ、見つからない場合はnull
 */
export const getStaticInstrumentById = (instrumentId: string): StaticInstrument | null => {
  return staticInstruments.find(instr => instr.id === instrumentId) || null;
};

/**
 * すべての楽器を取得
 * @returns すべての楽器データの配列
 */
export const getAllStaticInstruments = (): StaticInstrument[] => {
  return staticInstruments;
};
