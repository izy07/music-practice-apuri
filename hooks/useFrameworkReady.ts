import { useEffect, useState } from 'react';

declare global {
  interface Window {
    frameworkReady?: () => void;
  }
}

/**
 * Expo / Web の frameworkReady 通知用。
 * 起動ゲートには使わない（人工遅延で白画面を伸ばさない）。
 */
export function useFrameworkReady() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
    if (typeof globalThis !== 'undefined') {
      const g = globalThis as typeof globalThis & { frameworkReady?: () => void };
      g.frameworkReady?.();
    }
  }, []);

  return { isReady };
}
