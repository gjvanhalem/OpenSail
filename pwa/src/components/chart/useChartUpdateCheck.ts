import { useEffect } from 'react';
import { useAppDispatch } from '@/store/hooks';
import { checkForChartUpdates } from '@/store/slices/chartCacheSlice';

/** Check the chart catalog for newer editions on start and whenever the app comes online (R15.2) */
export function useChartUpdateCheck(): void {
  const dispatch = useAppDispatch();
  useEffect(() => {
    const check = () => {
      if (navigator.onLine) dispatch(checkForChartUpdates());
    };
    check();
    window.addEventListener('online', check);
    return () => window.removeEventListener('online', check);
  }, [dispatch]);
}
