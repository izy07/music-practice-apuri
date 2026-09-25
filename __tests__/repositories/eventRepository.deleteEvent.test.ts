/**
 * eventRepository.deleteEvent の単体テスト
 */

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { supabase } from '@/lib/supabase';
import { deleteEvent } from '@/repositories/eventRepository';

describe('eventRepository.deleteEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('イベントを削除できる', async () => {
    const eq = jest.fn().mockResolvedValue({ error: null });
    const deleteFn = jest.fn().mockReturnValue({ eq });
    (supabase.from as jest.Mock).mockReturnValue({ delete: deleteFn });

    const result = await deleteEvent('event-1');

    expect(result.error).toBeNull();
    expect(supabase.from).toHaveBeenCalledWith('events');
    expect(eq).toHaveBeenCalledWith('id', 'event-1');
  });

  it('削除失敗時はエラーを返す（握りつぶさない）', async () => {
    const eq = jest.fn().mockResolvedValue({ error: { message: 'RLS denied' } });
    const deleteFn = jest.fn().mockReturnValue({ eq });
    (supabase.from as jest.Mock).mockReturnValue({ delete: deleteFn });

    const result = await deleteEvent('event-1');

    expect(result.error).toBeTruthy();
    expect(result.error.message).toBe('RLS denied');
  });
});
