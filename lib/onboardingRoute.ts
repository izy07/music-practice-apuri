/**
 * オンボーディング遷移の単一ソース。
 * _layout / tutorial / instrument-selection はここだけを参照する。
 */

export type OnboardingRoute =
  | '/(tabs)/tutorial'
  | '/(tabs)/instrument-selection'
  /** カレンダー（tabs の index）。/(tabs)/index ではなく /(tabs) が正しい href */
  | '/(tabs)'
  /** プロフィール／ローカルキャッシュ未確定 — チュートリアルへ飛ばさない */
  | 'pending';

export type OnboardingUserSnapshot = {
  /** undefined = まだ未取得（false とは区別する） */
  tutorial_completed?: boolean | null;
  selected_instrument_id?: string | null;
};

/**
 * 楽器あり → メイン。
 * チュートリアル完了済み・楽器なし → 楽器選択。
 * tutorial_completed 未取得 → pending（再ログイン誤表示防止）。
 * 明示的に未完了・楽器なし → チュートリアル。
 */
export function resolveOnboardingTarget(
  user: OnboardingUserSnapshot | null | undefined,
  hasInstrument: boolean
): OnboardingRoute {
  if (hasInstrument || user?.selected_instrument_id) {
    return '/(tabs)';
  }
  if (user?.tutorial_completed === true) {
    return '/(tabs)/instrument-selection';
  }
  // 未取得のまま tutorial に飛ばすと再ログインで誤表示になる
  if (user?.tutorial_completed === undefined || user?.tutorial_completed === null) {
    return 'pending';
  }
  return '/(tabs)/tutorial';
}

export function needsOnboardingTutorial(
  user: OnboardingUserSnapshot | null | undefined,
  hasInstrument: boolean
): boolean {
  if (!user) return false;
  if (hasInstrument || user.selected_instrument_id) return false;
  if (user.tutorial_completed === undefined || user.tutorial_completed === null) {
    return false;
  }
  return user.tutorial_completed !== true;
}
