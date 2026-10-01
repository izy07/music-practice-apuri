import {
  isOnboardingProfilePending,
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

  it('未取得・楽器なしは楽器選択（既存ログイン想定）', () => {
    expect(resolveOnboardingTarget({}, false)).toBe('/(tabs)/instrument-selection');
  });

  it('未取得でも hasInstrument ならメイン', () => {
    expect(resolveOnboardingTarget({}, true)).toBe('/(tabs)');
  });
});

describe('isOnboardingProfilePending', () => {
  it('楽器ありは待たない', () => {
    expect(isOnboardingProfilePending({}, true)).toBe(false);
  });

  it('tutorial_completed 未取得は待つ', () => {
    expect(isOnboardingProfilePending({}, false)).toBe(true);
  });

  it('DB 反映済み（未完了）は待たない', () => {
    expect(
      isOnboardingProfilePending({ tutorial_completed: false, selected_instrument_id: null }, false)
    ).toBe(false);
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
