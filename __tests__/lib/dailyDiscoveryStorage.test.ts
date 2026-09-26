import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  incrementDailyDiscoveryOpenCount,
  shouldShowPastSelfComparison,
  PAST_SELF_SHOW_EVERY_N_OPENS,
} from '@/lib/dailyDiscoveryStorage';

describe('dailyDiscoveryStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  it('起動回数をインクリメントする', async () => {
    const count = await incrementDailyDiscoveryOpenCount('user-1');
    expect(count).toBe(1);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'daily_discovery_open_count:user-1',
      '1'
    );

    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('1');
    const count2 = await incrementDailyDiscoveryOpenCount('user-1');
    expect(count2).toBe(2);
  });

  it('8回に1回だけ録音比較を出す', () => {
    expect(shouldShowPastSelfComparison(1)).toBe(false);
    expect(shouldShowPastSelfComparison(7)).toBe(false);
    expect(shouldShowPastSelfComparison(8)).toBe(true);
    expect(shouldShowPastSelfComparison(16)).toBe(true);
    expect(shouldShowPastSelfComparison(PAST_SELF_SHOW_EVERY_N_OPENS)).toBe(true);
  });
});
