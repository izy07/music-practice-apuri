/**
 * instrumentService.ts のテスト
 * 楽器サービスの正確性を保証
 */

import { instrumentService } from '@/services';
import { instrumentRepository } from '@/repositories/instrumentRepository';

jest.mock('@/repositories/instrumentRepository');

describe('instrumentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getDefaultInstrumentsがデフォルト楽器を返す', () => {
    const instruments = instrumentService.getDefaultInstruments();
    expect(instruments.length).toBeGreaterThan(0);
    expect(instruments[0]).toHaveProperty('id');
    expect(instruments[0]).toHaveProperty('name');
    expect(instruments[0]).toHaveProperty('primary');
  });

  it('getAllInstrumentsが楽器一覧を取得できる', async () => {
    const mockInstruments = [
      { id: 'inst-1', name: 'Test Instrument', name_en: 'Test', color_primary: '#000000' },
    ];
    (instrumentRepository.getAllInstruments as jest.Mock).mockResolvedValue({
      success: true,
      data: mockInstruments,
    });

    const result = await instrumentService.getAllInstruments();

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('getAllInstrumentsがエラー時にデフォルト楽器を返す', async () => {
    (instrumentRepository.getAllInstruments as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Database error',
    });

    const result = await instrumentService.getAllInstruments();

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.length).toBeGreaterThan(0);
  });

  it('getInstrumentByIdが楽器を取得できる', async () => {
    const mockInstrument = {
      id: 'inst-1',
      name: 'Test Instrument',
      name_en: 'Test',
      color_primary: '#000000',
    };
    (instrumentRepository.getInstrumentById as jest.Mock).mockResolvedValue({
      success: true,
      data: mockInstrument,
    });

    const result = await instrumentService.getInstrumentById('inst-1');

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });
});





