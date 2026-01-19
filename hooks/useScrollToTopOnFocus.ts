import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import type { RefObject } from 'react';

type ScrollToTopRef =
  | { scrollTo: (options: { y: number; animated?: boolean }) => void }
  | { scrollToOffset: (options: { offset: number; animated?: boolean }) => void };

/**
 * 画面に戻ってきたときにスクロール位置を先頭へ戻す（画面ごとに適用する用途）
 * - Tab/Stackが画面を保持する場合でも、UX的に「毎回先頭が良い」画面で使う
 */
export function useScrollToTopOnFocus(
  ref: RefObject<ScrollToTopRef | null | undefined>,
  options?: {
    animated?: boolean;
    enabled?: boolean;
    /**
     * enabled以外で再評価したい依存配列（例: フィルタ変更時も先頭に戻したい等）
     */
    deps?: ReadonlyArray<unknown>;
  }
) {
  const animated = options?.animated ?? false;
  const enabled = options?.enabled ?? true;
  const deps = options?.deps ?? [];

  useFocusEffect(
    useCallback(() => {
      if (!enabled) return;
      // レンダリング直後に走らせる（ヘッダー等のレイアウト確定後の方が安定）
      requestAnimationFrame(() => {
        const current = ref.current;
        if (!current) return;
        if ('scrollTo' in current && typeof current.scrollTo === 'function') {
          current.scrollTo({ y: 0, animated });
          return;
        }
        if ('scrollToOffset' in current && typeof current.scrollToOffset === 'function') {
          current.scrollToOffset({ offset: 0, animated });
        }
      });
    }, [enabled, animated, ref, ...deps])
  );
}

