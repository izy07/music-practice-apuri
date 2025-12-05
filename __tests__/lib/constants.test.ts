/**
 * constants.ts のテスト
 * 定数の正確性を保証
 */

import { TIMEOUT, ERROR, UI, DATA, AUTH, STATISTICS, RECORDING } from '@/lib/constants';

describe('TIMEOUT constants', () => {
  it('IDLE_MSが1時間であることを確認', () => {
    expect(TIMEOUT.IDLE_MS).toBe(60 * 60 * 1000);
  });

  it('NAVIGATION_DELAY_MSが100ミリ秒であることを確認', () => {
    expect(TIMEOUT.NAVIGATION_DELAY_MS).toBe(100);
  });

  it('NAVIGATION_COOLDOWN_MSが300ミリ秒であることを確認', () => {
    expect(TIMEOUT.NAVIGATION_COOLDOWN_MS).toBe(300);
  });

  it('CONNECTION_TEST_MSが3000ミリ秒であることを確認', () => {
    expect(TIMEOUT.CONNECTION_TEST_MS).toBe(3000);
  });

  it('SESSION_REFRESH_BUFFER_SECが60秒であることを確認', () => {
    expect(TIMEOUT.SESSION_REFRESH_BUFFER_SEC).toBe(60);
  });

  it('SESSION_EXPIRY_WARNING_SECが120秒であることを確認', () => {
    expect(TIMEOUT.SESSION_EXPIRY_WARNING_SEC).toBe(120);
  });
});

describe('ERROR constants', () => {
  it('MAX_DISPLAY_COUNTが5であることを確認', () => {
    expect(ERROR.MAX_DISPLAY_COUNT).toBe(5);
  });

  it('DEFAULT_MESSAGEが定義されていることを確認', () => {
    expect(ERROR.DEFAULT_MESSAGE).toBeDefined();
    expect(typeof ERROR.DEFAULT_MESSAGE).toBe('string');
  });
});

describe('UI constants', () => {
  it('MAX_CHART_LABELSが10であることを確認', () => {
    expect(UI.MAX_CHART_LABELS).toBe(10);
  });

  it('CHART_HEIGHTが260であることを確認', () => {
    expect(UI.CHART_HEIGHT).toBe(260);
  });

  it('CHART_LABEL_AREAが26であることを確認', () => {
    expect(UI.CHART_LABEL_AREA).toBe(26);
  });

  it('CHART_BAR_GAPが8であることを確認', () => {
    expect(UI.CHART_BAR_GAP).toBe(8);
  });

  it('CHART_HEIGHT_SCALEが0.75であることを確認', () => {
    expect(UI.CHART_HEIGHT_SCALE).toBe(0.75);
  });

  it('MIN_BAR_WIDTHが6であることを確認', () => {
    expect(UI.MIN_BAR_WIDTH).toBe(6);
  });

  it('MIN_BAR_HEIGHTが2であることを確認', () => {
    expect(UI.MIN_BAR_HEIGHT).toBe(2);
  });
});

describe('DATA constants', () => {
  it('MAX_PRACTICE_RECORDSが1000であることを確認', () => {
    expect(DATA.MAX_PRACTICE_RECORDS).toBe(1000);
  });

  it('DEFAULT_PAGE_SIZEが20であることを確認', () => {
    expect(DATA.DEFAULT_PAGE_SIZE).toBe(20);
  });
});

describe('AUTH constants', () => {
  it('RATE_LIMIT_ATTEMPTSが5であることを確認', () => {
    expect(AUTH.RATE_LIMIT_ATTEMPTS).toBe(5);
  });

  it('RATE_LIMIT_BLOCK_MSが15分であることを確認', () => {
    expect(AUTH.RATE_LIMIT_BLOCK_MS).toBe(15 * 60 * 1000);
  });
});

describe('STATISTICS constants', () => {
  it('DAYS_IN_WEEKが7であることを確認', () => {
    expect(STATISTICS.DAYS_IN_WEEK).toBe(7);
  });

  it('MONTHLY_BINSが5であることを確認', () => {
    expect(STATISTICS.MONTHLY_BINS).toBe(5);
  });

  it('MONTHS_IN_YEARが12であることを確認', () => {
    expect(STATISTICS.MONTHS_IN_YEAR).toBe(12);
  });
});

describe('RECORDING constants', () => {
  it('MAX_RECORDING_TIME_SECが60秒であることを確認', () => {
    expect(RECORDING.MAX_RECORDING_TIME_SEC).toBe(60);
  });
});


