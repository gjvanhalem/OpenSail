import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { errorHandler } from '@/services/ErrorHandler';
import { getRunningGpsMode, startGpsMode } from '@/services/gpsMode';

/**
 * Resume the saved GPS mode (real GPS or simulator) when the app starts.
 * A tablet can reload the app at any time (an update, the OS dropping the
 * tab); without this the position stops silently, and with it the chart,
 * anchor watch and MOB guidance. Mount once, in the app layout.
 */
export function useGpsAutoStart(): void {
  const dispatch = useAppDispatch();
  const isInitialized = useAppSelector((state) => state.settings.isInitialized);
  const gpsMode = useAppSelector((state) => state.settings.settings.gpsMode);
  const trackName = useAppSelector((state) => state.settings.settings.gpsSimulatorTrack);
  const attempted = useRef(false);

  useEffect(() => {
    // Only once, with the settings as stored; later changes come from the GPS settings
    if (!isInitialized || attempted.current) return;
    attempted.current = true;
    if (gpsMode === 'off' || getRunningGpsMode() !== 'off') return;

    startGpsMode(gpsMode, trackName, dispatch).catch((error: unknown) => {
      errorHandler.handle(
        error instanceof Error ? error : String(error),
        'Resuming GPS after start-up',
        'warning'
      );
    });
  }, [dispatch, isInitialized, gpsMode, trackName]);
}
