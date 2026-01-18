/**
 * 代表曲データ（静的データ）
 * 
 * このファイルは、データベースから取得した代表曲データを静的データとして保存します。
 * データベースへのリクエストを削減し、パフォーマンスとコストを最適化します。
 * 
 * データの更新方法:
 * 1. scripts/export_representative_songs.sql をSupabaseで実行
 * 2. エクスポートしたJSONデータをこのファイルに貼り付け
 * 3. 型定義を確認して、必要に応じて調整
 */

export interface StaticRepresentativeSong {
  id: string;
  instrument_id: string;
  title: string;
  composer: string;
  era?: string | null;
  genre?: string | null;
  difficulty_level?: number | null;
  youtube_url?: string | null;
  spotify_url?: string | null;
  description_ja?: string | null;
  description_en?: string | null;
  is_popular: boolean;
  display_order: number;
  famous_performer?: string | null;
  famous_video_url?: string | null;
  famous_note?: string | null;
}

/**
 * 楽器IDをキーとした代表曲データのマップ
 * 楽器IDごとにソート済みの配列として保存
 */
export const staticRepresentativeSongs: Record<string, StaticRepresentativeSong[]> = {
  // TODO: データベースからエクスポートしたデータをここに貼り付け
  // 例:
  // '550e8400-e29b-41d4-a716-446655440001': [
  //   {
  //     id: '...',
  //     instrument_id: '550e8400-e29b-41d4-a716-446655440001',
  //     title: 'エリーゼのために',
  //     composer: 'ベートーヴェン',
  //     era: '古典派',
  //     genre: 'バガテル',
  //     difficulty_level: 2,
  //     youtube_url: 'https://www.youtube.com/watch?v=_mVW8tgGY_w',
  //     description_ja: 'ベートーヴェンの最も有名な作品の一つ。',
  //     is_popular: true,
  //     display_order: 1,
  //   },
  //   // ... 他の曲
  // ],
};

/**
 * 楽器IDで代表曲を取得
 * @param instrumentId 楽器ID
 * @returns 代表曲の配列（display_orderでソート済み）
 */
export const getRepresentativeSongsByInstrumentId = (
  instrumentId: string
): StaticRepresentativeSong[] => {
  return staticRepresentativeSongs[instrumentId] || [];
};

/**
 * 全代表曲データを取得
 * @returns 全代表曲の配列
 */
export const getAllRepresentativeSongs = (): StaticRepresentativeSong[] => {
  return Object.values(staticRepresentativeSongs).flat();
};
