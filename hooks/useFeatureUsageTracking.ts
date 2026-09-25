import { useEffect, useRef } from 'react';
import { usePathname } from 'expo-router';
import { useAuthAdvanced } from '@/hooks/useAuthAdvanced';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { resolveFeatureIdFromPath } from '@/lib/featureUsageEvents';
import { trackFeatureScreenView } from '@/lib/featureUsageService';
import { getInstrumentId } from '@/lib/instrumentUtils';

/** ルート変更時に screen_view を自動記録 */
export function useFeatureUsageTracking(): void {
  const pathname = usePathname();
  const { user } = useAuthAdvanced();
  const { selectedInstrument } = useInstrumentTheme();
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.id || !pathname) return;
    if (lastPathRef.current === pathname) return;
    lastPathRef.current = pathname;

    const featureId = resolveFeatureIdFromPath(pathname);
    if (!featureId) return;

    const instrumentId = getInstrumentId(selectedInstrument);
    void trackFeatureScreenView(user.id, featureId, { pathname }, instrumentId);
  }, [pathname, user?.id, selectedInstrument]);
}
