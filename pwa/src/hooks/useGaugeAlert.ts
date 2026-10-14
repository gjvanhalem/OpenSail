import { useAppSelector } from '@/store/hooks';
import type { ActiveAlert, AlertValue } from '@/store/slices/alertsSlice';

/** The active alert for a gauge's value, if any */
export function useGaugeAlert(value: AlertValue): ActiveAlert | undefined {
  return useAppSelector((state) => state.alerts.active[value]);
}

/** Classes that mark a gauge in alarm */
export const GAUGE_ALERT_CLASSES = 'ring-4 ring-red-500 animate-pulse';
