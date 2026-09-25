/**
 * 本日の曲 — 日付×楽器で決定的に1曲を選び、毎日違う曲を紹介する
 */
import {
  getRepresentativeSongsByInstrumentId,
  StaticRepresentativeSong,
} from '@/data/staticRepresentativeSongs';

export type DailySong = {
  song: StaticRepresentativeSong;
  /** 1行の豆知識 */
  trivia: string;
  /** 演奏動画 URL（なければ null） */
  performanceUrl: string | null;
  /** 表示用日付キー YYYY-MM-DD */
  dateKey: string;
};

const PLACEHOLDER_NOTE = '動画URLは未設定';

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function formatDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 代表曲から豆知識1文を生成 */
export function buildSongTrivia(song: StaticRepresentativeSong): string {
  const note = song.famous_note?.trim();
  if (note && !note.includes(PLACEHOLDER_NOTE)) {
    return note;
  }
  if (song.description_ja?.trim()) {
    return song.description_ja.trim();
  }
  const parts: string[] = [];
  if (song.era) parts.push(`${song.era}の作品`);
  if (song.genre) parts.push(song.genre);
  if (parts.length > 0) {
    return `${song.composer}の${parts.join('・')}。`;
  }
  return `${song.composer}の名曲です。`;
}

export function resolvePerformanceUrl(song: StaticRepresentativeSong): string | null {
  const candidates = [song.famous_video_url, song.youtube_url, song.spotify_url];
  for (const url of candidates) {
    if (url && url.trim().startsWith('http')) {
      return url.trim();
    }
  }
  return null;
}

/**
 * 同じ日・同じ楽器なら常に同じ曲（UTC+9 ローカル日付基準）
 */
export function getDailySong(
  instrumentId: string,
  date: Date = new Date()
): DailySong | null {
  const songs = getRepresentativeSongsByInstrumentId(instrumentId);
  if (songs.length === 0) return null;

  const dateKey = formatDateKey(date);
  const index = hashString(`${dateKey}:${instrumentId}`) % songs.length;
  const song = songs[index];

  return {
    song,
    trivia: buildSongTrivia(song),
    performanceUrl: resolvePerformanceUrl(song),
    dateKey,
  };
}
