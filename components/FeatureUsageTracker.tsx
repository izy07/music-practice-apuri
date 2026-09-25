import { useFeatureUsageTracking } from '@/hooks/useFeatureUsageTracking';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { flushFeatureUsageQueue } from '@/lib/featureUsageService';

/** ルート直下に配置し、画面遷移ログとバックグラウンド時フラッシュを行う */
export default function FeatureUsageTracker(): null {
  useFeatureUsageTracking();

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        void flushFeatureUsageQueue();
      }
    });
    return () => sub.remove();
  }, []);

  return null;
}
