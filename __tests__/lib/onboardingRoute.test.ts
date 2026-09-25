import {
  needsOnboardingTutorial,
  resolveOnboardingTarget,
} from '@/lib/onboardingRoute';

describe('resolveOnboardingTarget', () => {
  it('楽器ありはメイン', () => {
    expect(
      resolveOnboardingTarget({ tutorial_completed: false, selected_instrument_id: 'guitar' }, true)
    ).toBe('/(tabs)');
  });

  it('チュートリアル完了・楽器なしは楽器選択', () => {
    expect(
      resolveOnboardingTarget({ tutorial_completed: true, selected_instrument_id: null }, false)
    ).toBe('/(tabs)/instrument-selection');
  });

  it('明示的未完了・楽器なしはチュートリアル', () => {
    expect(
      resolveOnboardingTarget({ tutorial_completed: false, selected_instrument_id: null }, false)
    ).toBe('/(tabs)/tutorial');
  });

  it('未取得は pending（再ログインでチュートリアル誤表示しない）', () => {
    expect(resolveOnboardingTarget({}, false)).toBe('pending');
  });
});

describe('needsOnboardingTutorial', () => {
  it('楽器ありは不要', () => {
    expect(needsOnboardingTutorial({ tutorial_completed: false }, true)).toBe(false);
  });

  it('完了済みは不要', () => {
    expect(needsOnboardingTutorial({ tutorial_completed: true }, false)).toBe(false);
  });

  it('明示的未完了は必要', () => {
    expect(needsOnboardingTutorial({ tutorial_completed: false }, false)).toBe(true);
  });

  it('未取得はまだ必要と判定しない', () => {
    expect(needsOnboardingTutorial({}, false)).toBe(false);
  });
});
