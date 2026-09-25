import AsyncStorage from '@react-native-async-storage/async-storage';
import { readStoredInstrumentId } from '@/lib/localInstrumentStorage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('readStoredInstrumentId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ユーザー単位キーを優先', async () => {
    (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
      if (key === 'selectedInstrument_user-1') return 'violin-id';
      return null;
    });

    await expect(readStoredInstrumentId('user-1')).resolves.toBe('violin-id');
  });

  it('レガシーキーを読み取りユーザー単位へ移行', async () => {
    (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
      if (key === 'selectedInstrument_user-1') return null;
      if (key === 'selectedInstrument') return 'guitar-id';
      return null;
    });

    await expect(readStoredInstrumentId('user-1')).resolves.toBe('guitar-id');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('selectedInstrument_user-1', 'guitar-id');
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('selectedInstrument');
  });
});
