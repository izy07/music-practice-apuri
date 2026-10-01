/**
 * Expo Router の segments をアプリ共通のルート情報に正規化する。
 */

export type ParsedRoute = {
  segments: readonly string[];
  firstSegment: string | undefined;
  currentTab: string | null;
  authChild: string | undefined;
  isInAuthGroup: boolean;
  isInTabsGroup: boolean;
  isNotFoundScreen: boolean;
  /** ルート Stack 上で segments が空（app/index.tsx = `/`） */
  isBootEntry: boolean;
};

export function parseRouteSegments(segments: readonly string[]): ParsedRoute {
  const firstSegment = segments[0];
  const isInAuthGroup = firstSegment === 'auth';
  const isInTabsGroup = firstSegment === '(tabs)';
  const isNotFoundScreen = firstSegment === '+not-found';
  const currentTab = isInTabsGroup && segments.length > 1 ? segments[1] : null;
  const authChild = isInAuthGroup && segments.length > 1 ? segments[1] : undefined;

  return {
    segments,
    firstSegment,
    currentTab,
    authChild,
    isInAuthGroup,
    isInTabsGroup,
    isNotFoundScreen,
    isBootEntry: segments.length === 0,
  };
}
