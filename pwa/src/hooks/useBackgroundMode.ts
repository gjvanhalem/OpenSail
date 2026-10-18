import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { silenceAlarms } from '@/store/slices/alertsSlice';
import { platformBackground } from '@/platform/background';
import { BackgroundModeController } from '@/services/backgroundMode';

/**
 * Keep the app running with the screen off while a watch, route, track or
 * instrument connection is on, and show alarms as notifications (the Android
 * app; elsewhere this does nothing). Mount once, in the app layout.
 */
export function useBackgroundMode(): void {
  const dispatch = useAppDispatch();
  const safety = useAppSelector((state) => state.safety);
  const routes = useAppSelector((state) => state.routes);
  const tracks = useAppSelector((state) => state.tracks);
  const instruments = useAppSelector((state) => state.instruments);
  const alerts = useAppSelector((state) => state.alerts);
  const controller = useRef<BackgroundModeController | null>(null);
  controller.current ??= new BackgroundModeController(platformBackground());

  useEffect(() => {
    controller.current!.update({ safety, routes, tracks, instruments, alerts });
  }, [safety, routes, tracks, instruments, alerts]);

  useEffect(() => {
    let stop: (() => void) | null = null;
    let unmounted = false;
    void platformBackground()
      .onAlarmsSilenced(() => dispatch(silenceAlarms()))
      .then((unsubscribe) => {
        if (unmounted) unsubscribe();
        else stop = unsubscribe;
      });
    return () => {
      unmounted = true;
      stop?.();
    };
  }, [dispatch]);
}
