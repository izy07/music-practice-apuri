/**
 * オンボーディング遷移の単一ソース。
 * _layout / tutorial / instrument-selection / 冷起動はここだけを参照する。
 *
 * 方針: 「pending で起動を止めない」。
 * ローカルキャッシュ（楽器・スナップショット）を先に載せ、DB enrich はバックグラウンド。
 */

export type OnboardingRoute =
  | '/(tabs)/tutorial'
  | '/(tabs)/instrument-selection'
  /** カレンダー（tabs の index）。/(tabs)/index ではなく /(tabs) が正しい href */
  | '/(tabs)';

export type OnboardingUserSnapshot = {
  /** undefined = まだ未取得（false とは区別する） */
  tutorial_completed?: boolean | null;
  selected_instrument_id?: string | null;
};

/**
 * 楽器あり → メイン。
 * チュートリアル完了済み・楽器なし → 楽器選択。
 * 明示的に未完了（新規登録直後など）・楽器なし → チュートリアル。
 * tutorial_completed 未取得 → 既存ログイン想定で楽器選択（チュートリアルに戻さない）。
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
  if (user?.tutorial_completed === false) {
    return '/(tabs)/tutorial';
  }
  return '/(tabs)/instrument-selection';
}

/**
 * DB プロフィール反映前かどうか（セッションのみの段階）。
 * 未取得のまま楽器選択へ飛ばすと既存ユーザーが誤誘導されるため、ログイン遷移前に待つ。
 */
export function isOnboardingProfilePending(
  user: OnboardingUserSnapshot | null | undefined,
  hasInstrument: boolean
): boolean {
  if (!user || hasInstrument || user.selected_instrument_id) {
    return false;
  }
  return user.tutorial_completed === undefined || user.tutorial_completed === null;
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
