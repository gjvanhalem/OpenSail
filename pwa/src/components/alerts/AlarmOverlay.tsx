import React from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { silenceAlarms, unacknowledgedAlarms } from '@/store/slices/alertsSlice';
import { useWakeLockStatus } from '@/hooks/useAlarmOutput';

const pad = (n: number) => String(n).padStart(2, '0');
const clockTime = (ms: number) => {
  const date = new Date(ms);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

/**
 * Full-screen alert while a safety alarm sounds, above everything (also in
 * fullscreen mode). Silencing stops the siren and hides the overlay; the
 * feature that raised the alarm keeps showing its state.
 */
export const AlarmOverlay: React.FC = () => {
  const dispatch = useAppDispatch();
  const alarms = useAppSelector((state) => state.alerts);
  const wakeLock = useWakeLockStatus();
  const sounding = unacknowledgedAlarms(alarms);
  if (sounding.length === 0) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="alarm-overlay-title"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 p-6 bg-red-700 text-white text-center"
    >
      {/* Flashing background behind steady text */}
      <div className="absolute inset-0 bg-red-500 animate-pulse" aria-hidden="true" />
      <div className="relative flex flex-col items-center gap-6 max-w-xl">
        <h2 id="alarm-overlay-title" className="text-5xl font-extrabold tracking-wide">
          ALARM
        </h2>
        <ul className="space-y-3 text-2xl font-semibold" data-testid="alarm-messages">
          {sounding.map((alarm) => (
            <li key={alarm.kind} data-alarm={alarm.kind}>
              {alarm.message}
              <span className="block text-base font-normal opacity-90">
                since {clockTime(alarm.since)}
              </span>
            </li>
          ))}
        </ul>
        <button
          onClick={() => dispatch(silenceAlarms())}
          className="min-w-64 px-10 py-6 rounded-2xl bg-surface text-red-700 text-3xl font-bold shadow-xl hover:bg-red-50 focus:outline-none focus:ring-4 focus:ring-white/60"
          autoFocus
        >
          Silence
        </button>
        {(wakeLock === 'unsupported' || wakeLock === 'denied') && (
          <p className="text-sm opacity-90">
            This browser can't keep the screen on: set the auto-lock to "never" while you rely on
            alarms.
          </p>
        )}
      </div>
    </div>
  );
};
