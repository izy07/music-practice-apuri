import { Redirect } from 'expo-router';

/**
 * 旧ルート互換: 設定の「楽器変更」からの経由先。
 * useEffect + replace だと router 未準備時に「読み込み中…」で止まることがあるため、
 * Redirect で即座に instrument-selection へ転送する。
 */
export default function MainSettingsScreen() {
  return <Redirect href="/(tabs)/instrument-selection" />;
}
