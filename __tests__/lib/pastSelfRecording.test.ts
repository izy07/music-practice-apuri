import {
  gapLabelFromDays,
  pickPastSelfComparison,
} from '@/lib/pastSelfRecording';

describe('pastSelfRecording', () => {
  const now = new Date('2026-09-26T12:00:00+09:00');

  it('録音が2件未満なら null', () => {
    expect(
      pickPastSelfComparison(
        [{ id: '1', title: 'a', file_path: 'u/1.webm', recorded_at: '2026-09-01' }],
        { now }
      )
    ).toBeNull();
  });

  it('同じ曲名のペアを優先する', () => {
    const result = pickPastSelfComparison(
      [
        {
          id: 'recent',
          title: '新世界より',
          file_path: 'u/r.webm',
          recorded_at: '2026-09-20',
          recording_type: 'performance',
        },
        {
          id: 'past-same',
          title: '新世界より',
          file_path: 'u/p.webm',
          recorded_at: '2026-06-25',
          recording_type: 'performance',
        },
        {
          id: 'past-other',
          title: '別の曲',
          file_path: 'u/o.webm',
          recorded_at: '2026-06-20',
          recording_type: 'performance',
        },
      ],
      { now, minGapDays: 14 }
    );

    expect(result).not.toBeNull();
    expect(result!.reason).toBe('same_title');
    expect(result!.past.id).toBe('past-same');
    expect(result!.headline).toContain('新世界より');
  });

  it('間隔に応じたラベルを付ける', () => {
    expect(gapLabelFromDays(10)).toBe('10日前');
    expect(gapLabelFromDays(35)).toBe('先月');
    expect(gapLabelFromDays(65)).toBe('2か月前');
    expect(gapLabelFromDays(95)).toBe('3か月前');
  });

  it('14日未満の間隔は null', () => {
    expect(
      pickPastSelfComparison(
        [
          {
            id: '1',
            title: 'a',
            file_path: 'p/1.webm',
            recorded_at: '2026-09-25',
          },
          {
            id: '2',
            title: 'b',
            file_path: 'p/2.webm',
            recorded_at: '2026-09-20',
          },
        ],
        { now, minGapDays: 14 }
      )
    ).toBeNull();
  });

  it('selectionSeed で上位候補からローテーションする', () => {
    const recordings = [
      {
        id: 'recent',
        title: '新世界より',
        file_path: 'u/r.webm',
        recorded_at: '2026-09-20',
        recording_type: 'performance',
      },
      {
        id: 'past-same',
        title: '新世界より',
        file_path: 'u/p.webm',
        recorded_at: '2026-06-25',
        recording_type: 'performance',
      },
      {
        id: 'past-other',
        title: '別の曲',
        file_path: 'u/o.webm',
        recorded_at: '2026-03-01',
        recording_type: 'performance',
      },
    ];

    const a = pickPastSelfComparison(recordings, { now, minGapDays: 14, selectionSeed: 0 });
    const b = pickPastSelfComparison(recordings, { now, minGapDays: 14, selectionSeed: 1 });

    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(a!.past.id).not.toBe(b!.past.id);
    expect(a!.gapLabel).toBeTruthy();
    expect(b!.gapLabel).toBeTruthy();
  });

  it('十分な間隔があれば time_gap で選ぶ', () => {
    const result = pickPastSelfComparison(
      [
        {
          id: 'recent',
          title: '曲A',
          file_path: 'u/r.webm',
          recorded_at: '2026-09-20',
        },
        {
          id: 'past',
          title: '曲B',
          file_path: 'u/p.webm',
          recorded_at: '2026-07-01',
        },
      ],
      { now, minGapDays: 14 }
    );
    expect(result).not.toBeNull();
    expect(result!.gapDays).toBeGreaterThanOrEqual(14);
    expect(result!.gapLabel).toBeTruthy();
  });
});
