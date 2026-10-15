import { useEffect, useSyncExternalStore } from 'react';
import { useAppSelector } from '@/store/hooks';
import { alarmSoundFor } from '@/store/slices/alertsSlice';
import { alarmSound, type AlarmSoundState } from '@/services/alarm/AlarmSound';
import { screenWakeLock, type WakeLockStatus } from '@/services/alarm/ScreenWakeLock';

/**
 * Turn the alert state into sound and keep the screen on: the siren for
 * safety alarms, a beep for instrument alerts, and a screen wake lock while
 * any alarm is listed or `keepAwake` is set (a watch is running). Mount once,
 * in the app layout.
 *
 * Also unlocks audio on the first tap or key press, because browsers block
 * sound that doesn't follow a user gesture.
 */
export function useAlarmOutput(keepAwake = false): void {
  const pattern = useAppSelector((state) => alarmSoundFor(state.alerts));
  const hasAlarms = useAppSelector((state) => Object.keys(state.alerts.alarms).length > 0);

  useEffect(() => {
    const unlock = () => alarmSound.unlock();
    window.addEventListener('pointerdown', unlock, true);
    window.addEventListener('keydown', unlock, true);
    return () => {
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('keydown', unlock, true);
    };
  }, []);

  useEffect(() => {
    if (pattern) alarmSound.play(pattern);
    else alarmSound.stop();
  }, [pattern]);

  // Stop the sound if the layout unmounts (tests, hot reload)
  useEffect(() => () => alarmSound.stop(), []);

  useEffect(() => {
    screenWakeLock.setWanted(keepAwake || hasAlarms);
  }, [keepAwake, hasAlarms]);

  // Expose the output state on <html> so e2e tests can check what plays
  useEffect(() => {
    const root = document.documentElement;
    const showSound = ({ pattern, audio }: AlarmSoundState) => {
      root.dataset.alarmSound = pattern ?? 'off';
      root.dataset.alarmAudio = audio;
    };
    const showWakeLock = (status: WakeLockStatus) => {
      root.dataset.wakeLock = status;
    };
    showSound(alarmSound.getState());
    showWakeLock(screenWakeLock.getStatus());
    const unsubscribeSound = alarmSound.subscribe(showSound);
    const unsubscribeWakeLock = screenWakeLock.subscribe(showWakeLock);
    return () => {
      unsubscribeSound();
      unsubscribeWakeLock();
    };
  }, []);
}

/** The wake lock status, for showing a warning when the screen may sleep */
export function useWakeLockStatus(): WakeLockStatus {
  return useSyncExternalStore(
    (onChange) => screenWakeLock.subscribe(onChange),
    () => screenWakeLock.getStatus()
  );
}
