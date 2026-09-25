import {
  assertEncryptedInTransit,
  requireHttpsApiBaseUrl,
} from '@/lib/secureTransport';

describe('secureTransport', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('https URL を許可する', () => {
    expect(() =>
      assertEncryptedInTransit('https://uteeqkpsezbabdmritkn.supabase.co', 'test')
    ).not.toThrow();
  });

  it('端末内 URI を許可する', () => {
    expect(() => assertEncryptedInTransit('file:///data/x.wav', 'test')).not.toThrow();
    expect(() => assertEncryptedInTransit('blob:abc', 'test')).not.toThrow();
    expect(() => assertEncryptedInTransit('user/1/a.wav', 'test')).not.toThrow();
  });

  it('本番相当では http URL を拒否する', () => {
    process.env.NODE_ENV = 'production';
    expect(() =>
      assertEncryptedInTransit('http://example.com/api', 'test')
    ).toThrow(/HTTPS/);
  });

  it('requireHttpsApiBaseUrl が末尾スラッシュを除去する', () => {
    expect(requireHttpsApiBaseUrl('https://example.com/', 'api')).toBe(
      'https://example.com'
    );
  });
});
