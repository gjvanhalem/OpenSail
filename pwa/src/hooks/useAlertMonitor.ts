import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { DEFAULT_ALERT_THRESHOLDS, evaluateAlerts } from '@/store/slices/alertsSlice';

/**
 * Check instrument values against the user's alert thresholds whenever a value
 * or a threshold changes. Mount once, in the app layout.
 */
export function useAlertMonitor(): void {
  const dispatch = useAppDispatch();
  const depth = useAppSelector((state) => state.instruments.depth);
  const waterSpeed = useAppSelector((state) => state.instruments.waterSpeed);
  const speedOverGround = useAppSelector((state) => state.navigation.speed);
  const windSpeed = useAppSelector((state) => state.instruments.windSpeed);
  const thresholds = useAppSelector((state) => state.settings.settings.alertThresholds);

  // Same speed as the speed gauge shows: the log, or SOG without one
  const speed = waterSpeed ?? speedOverGround;

  useEffect(() => {
    dispatch(
      evaluateAlerts({
        readings: { depth, speed, windSpeed },
        thresholds: { ...DEFAULT_ALERT_THRESHOLDS, ...thresholds },
        now: Date.now(),
      })
    );
  }, [dispatch, depth, speed, windSpeed, thresholds]);
}
