import { pickPastSelfComparison } from '@/lib/pastSelfRecording';

describe('pickPastSelfComparison', () => {
  const now = new Date('2026-09-26T12:00:00+09:00');

  it('録音が2件未満なら null', () => {
    expect(
      pickPastSelfComparison(
        [{ id: '1', title: 'a', file_path: 'u/1.webm', recorded_at: '2026-09-01' }],
        { now }
      )
    ).toBeNull();
  });

  it('約3か月前と最新を選ぶ', () => {
    const result = pickPastSelfComparison(
      [
        {
          id: 'recent',
          title: '最新',
          file_path: 'u/r.webm',
          recorded_at: '2026-09-20',
          recording_type: 'performance',
        },
        {
          id: 'past',
          title: '3ヶ月前',
          file_path: 'u/p.webm',
          recorded_at: '2026-06-25',
          recording_type: 'performance',
        },
        {
          id: 'old',
          title: '古い',
          file_path: 'u/o.webm',
          recorded_at: '2026-01-01',
          recording_type: 'performance',
        },
      ],
      { now, targetDaysAgo: 90, minGapDays: 30 }
    );

    expect(result).not.toBeNull();
    expect(result!.recent.id).toBe('recent');
    expect(result!.past.id).toBe('past');
    expect(result!.gapDays).toBeGreaterThanOrEqual(30);
  });

  it('間隔が短すぎる場合は null', () => {
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
        { now, minGapDays: 30 }
      )
    ).toBeNull();
  });
});
