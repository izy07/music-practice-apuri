import {
  buildSongTrivia,
  formatDateKey,
  getDailySong,
  resolvePerformanceUrl,
} from '@/lib/dailySong';
import type { StaticRepresentativeSong } from '@/data/staticRepresentativeSongs';

const sampleSong: StaticRepresentativeSong = {
  id: 'test-1',
  instrument_id: '550e8400-e29b-41d4-a716-446655440001',
  title: '交響曲第9番「新世界より」',
  composer: 'アントニン・ドヴォルザーク',
  era: 'ロマン派',
  genre: '交響曲',
  description_ja: '第4楽章のメロディは日本でもおなじみ。',
  famous_note: null,
  youtube_url: 'https://youtu.be/example',
  is_popular: true,
  display_order: 1,
};

describe('dailySong', () => {
  it('同じ日・同じ楽器なら同じ曲を返す', () => {
    const date = new Date('2026-09-26T12:00:00+09:00');
    const a = getDailySong(sampleSong.instrument_id, date);
    const b = getDailySong(sampleSong.instrument_id, date);
    expect(a?.song.id).toBe(b?.song.id);
    expect(a?.dateKey).toBe('2026-09-26');
  });

  it('日付が変わると別の曲になりうる', () => {
    const id = sampleSong.instrument_id;
    const d1 = getDailySong(id, new Date('2026-09-26T00:00:00+09:00'));
    const d2 = getDailySong(id, new Date('2026-09-27T00:00:00+09:00'));
    expect(d1).not.toBeNull();
    expect(d2).not.toBeNull();
    // 代表曲が複数ある楽器では日付で変わる可能性が高い（同一でも許容）
    expect(d1!.dateKey).not.toBe(d2!.dateKey);
  });

  it('豆知識は description_ja を優先する', () => {
    expect(buildSongTrivia(sampleSong)).toBe('第4楽章のメロディは日本でもおなじみ。');
  });

  it('演奏URLを解決する', () => {
    expect(resolvePerformanceUrl(sampleSong)).toBe('https://youtu.be/example');
  });

  it('formatDateKey が YYYY-MM-DD', () => {
    expect(formatDateKey(new Date('2026-01-05T15:00:00+09:00'))).toBe('2026-01-05');
  });
});
