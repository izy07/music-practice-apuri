import { useEffect, useState } from 'react';

declare global {
  interface Window {
    frameworkReady?: () => void;
  }
}

export function useFrameworkReady() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // フレームワークの準備完了を待つ
    const timer = setTimeout(() => {
      setIsReady(true);
      window.frameworkReady?.();
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return { isReady };
}
