/**
 * config.ts のテスト
 * 環境変数の設定とバリデーションを保証
 */

describe('config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('デフォルト値が設定される', () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    
    const config = require('@/lib/config').default;
    
    expect(config.supabase.url).toBe('http://127.0.0.1:54321');
    expect(config.supabase.anonKey).toBe('');
  });

  it('環境変数から値を取得できる', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
    
    jest.resetModules();
    const config = require('@/lib/config').default;
    
    expect(config.supabase.url).toBe('https://test.supabase.co');
    expect(config.supabase.anonKey).toBe('test-key');
  });

  it('開発環境フラグが正しく設定される', () => {
    process.env.NODE_ENV = 'development';
    
    jest.resetModules();
    const config = require('@/lib/config').default;
    
    expect(config.env.isDevelopment).toBe(true);
    expect(config.env.isProduction).toBe(false);
  });

  it('本番環境フラグが正しく設定される', () => {
    process.env.NODE_ENV = 'production';
    
    jest.resetModules();
    const config = require('@/lib/config').default;
    
    expect(config.env.isDevelopment).toBe(false);
    expect(config.env.isProduction).toBe(true);
  });

  it('テスト環境フラグが正しく設定される', () => {
    process.env.NODE_ENV = 'test';
    
    jest.resetModules();
    const config = require('@/lib/config').default;
    
    expect(config.env.isTest).toBe(true);
  });

  it('個別エクスポートが利用可能', () => {
    const { supabase, openai, whisper, google, eas, env } = require('@/lib/config');
    
    expect(supabase).toBeDefined();
    expect(openai).toBeDefined();
    expect(whisper).toBeDefined();
    expect(google).toBeDefined();
    expect(eas).toBeDefined();
    expect(env).toBeDefined();
  });
});

