import { evaluateRouteGuard, resolveAppEntryHref } from '@/lib/navigation/appRoutePolicy';

const ready = {
  platform: 'web' as const,
  isReady: true,
  isRouterReady: true,
  isLoading: false,
  isInitialized: true,
};

describe('resolveAppEntryHref', () => {
  it('未認証はログイン', () => {
    expect(
      resolveAppEntryHref({ isAuthenticated: false, onboardingRoute: '/(tabs)/tutorial' })
    ).toBe('/auth/login');
  });

  it('認証済みは常に具体ルート（null にならない）', () => {
    expect(
      resolveAppEntryHref({ isAuthenticated: true, onboardingRoute: '/(tabs)/tutorial' })
    ).toBe('/(tabs)/tutorial');
    expect(
      resolveAppEntryHref({ isAuthenticated: true, onboardingRoute: '/(tabs)' })
    ).toBe('/(tabs)');
  });
});

describe('evaluateRouteGuard', () => {
  it('冷起動エントリは index に委譲', () => {
    expect(
      evaluateRouteGuard({
        ...ready,
        isAuthenticated: false,
        hasInstrumentSelected: false,
        onboardingRoute: '/(tabs)/tutorial',
        segments: [],
      })
    ).toEqual({ type: 'stay', reason: 'boot-entry-delegated-to-index' });
  });

  it('未認証で tabs に直アクセスしたらログイン', () => {
    expect(
      evaluateRouteGuard({
        ...ready,
        isAuthenticated: false,
        hasInstrumentSelected: false,
        onboardingRoute: '/(tabs)/tutorial',
        segments: ['(tabs)', 'index'],
      })
    ).toMatchObject({ type: 'redirect', href: '/auth/login' });
  });

  it('楽器未選択で settings 以外から tabs/index へ行くとオンボーディング', () => {
    expect(
      evaluateRouteGuard({
        ...ready,
        isAuthenticated: true,
        hasInstrumentSelected: false,
        onboardingRoute: '/(tabs)/tutorial',
        segments: ['(tabs)', 'timer'],
      })
    ).toEqual({ type: 'redirect', href: '/(tabs)/tutorial', reason: 'onboarding-required' });
  });

  it('楽器選択済みでオンボーディング楽器画面にいたらカレンダーへ', () => {
    expect(
      evaluateRouteGuard({
        ...ready,
        isAuthenticated: true,
        hasInstrumentSelected: true,
        onboardingRoute: '/(tabs)',
        segments: ['(tabs)', 'instrument-selection'],
      })
    ).toEqual({
      type: 'redirect',
      href: '/(tabs)',
      reason: 'instrument-already-selected',
    });
  });

  it('from=change の楽器変更は許可', () => {
    expect(
      evaluateRouteGuard({
        ...ready,
        isAuthenticated: true,
        hasInstrumentSelected: true,
        onboardingRoute: '/(tabs)',
        segments: ['(tabs)', 'instrument-selection'],
        instrumentFromChange: true,
      })
    ).toMatchObject({ type: 'stay' });
  });

  it('設定からチュートリアル見返しは許可', () => {
    expect(
      evaluateRouteGuard({
        ...ready,
        isAuthenticated: true,
        hasInstrumentSelected: true,
        onboardingRoute: '/(tabs)',
        segments: ['(tabs)', 'tutorial'],
        tutorialFromSettings: true,
      })
    ).toMatchObject({ type: 'stay' });
  });

  it('利用規約は認証不要', () => {
    expect(
      evaluateRouteGuard({
        ...ready,
        isAuthenticated: false,
        hasInstrumentSelected: false,
        onboardingRoute: '/(tabs)/tutorial',
        segments: ['terms-of-service'],
      })
    ).toEqual({ type: 'stay', reason: 'public-legal' });
  });
});
