/**
 * logger.ts のテスト
 * ロガーの正確性を保証
 */

describe('logger', () => {
  const originalEnv = process.env;
  const originalConsole = console;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    console.debug = jest.fn();
    console.info = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    process.env = originalEnv;
    console = originalConsole;
  });

  it('開発環境ではdebugログを出力する', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.LOG_LEVEL;
    
    jest.resetModules();
    const logger = require('@/lib/logger').default;
    
    logger.debug('Test debug message');
    
    expect(console.debug).toHaveBeenCalled();
  });

  it('本番環境ではdebugログを出力しない', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.LOG_LEVEL;
    
    jest.resetModules();
    const logger = require('@/lib/logger').default;
    
    logger.debug('Test debug message');
    
    expect(console.debug).not.toHaveBeenCalled();
  });

  it('本番環境でもinfoログは出力する', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.LOG_LEVEL;
    
    jest.resetModules();
    const logger = require('@/lib/logger').default;
    
    logger.info('Test info message');
    
    expect(console.info).toHaveBeenCalled();
  });

  it('warnログを出力する', () => {
    const logger = require('@/lib/logger').default;
    
    logger.warn('Test warn message');
    
    expect(console.warn).toHaveBeenCalled();
  });

  it('errorログを出力する', () => {
    const logger = require('@/lib/logger').default;
    
    logger.error('Test error message');
    
    expect(console.error).toHaveBeenCalled();
  });

  it('LOG_LEVEL環境変数でログレベルを制御できる', () => {
    process.env.LOG_LEVEL = 'warn';
    
    jest.resetModules();
    const logger = require('@/lib/logger').default;
    
    logger.debug('Test debug message');
    logger.info('Test info message');
    logger.warn('Test warn message');
    
    expect(console.debug).not.toHaveBeenCalled();
    expect(console.info).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalled();
  });

  it('ログメッセージにタイムスタンプが含まれる', () => {
    const logger = require('@/lib/logger').default;
    
    logger.info('Test message');
    
    const callArgs = (console.info as jest.Mock).mock.calls[0];
    expect(callArgs[0]).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(callArgs[1]).toBe('[INFO]');
  });
});

