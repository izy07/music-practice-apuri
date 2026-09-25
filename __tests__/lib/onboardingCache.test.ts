import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  readOnboardingSnapshot,
  writeOnboardingSnapshot,
} from '@/lib/onboardingCache';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('onboardingCache', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('書き込んだスナップショットを同じキー形式で読める', async () => {
    await writeOnboardingSnapshot('user-1', {
      tutorial_completed: true,
      selected_instrument_id: 'guitar',
    });

    await expect(readOnboardingSnapshot('user-1')).resolves.toEqual({
      tutorial_completed: true,
      selected_instrument_id: 'guitar',
    });
  });

  it('不正なデータは null', async () => {
    await AsyncStorage.setItem('onboardingSnapshot_user-1', '{"tutorial_completed":"yes"}');
    await expect(readOnboardingSnapshot('user-1')).resolves.toBeNull();
  });
});
