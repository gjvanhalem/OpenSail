import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { clearMob } from '@/store/slices/safetySlice';
import { useUnits } from '@/hooks/useUnits';
import { mobGuidance } from '@/utils/safety';
import { formatCoordinate } from '@/utils/formatting';
import { clockTime, elapsed, formatBearing, formatShortDistance } from './format';

/** Re-render every second, for the time since MOB */
function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

/**
 * Guidance back to the man-overboard spot (R12.3, R12.4): bearing, distance,
 * which way to turn and the time since the MOB. Shown on every page while a
 * MOB is active; clearing it needs a second tap.
 */
export const MobPanel: React.FC = () => {
  const dispatch = useAppDispatch();
  const mob = useAppSelector((state) => state.safety.mob);
  const position = useAppSelector((state) => state.navigation.position);
  const sog = useAppSelector((state) => state.navigation.speed);
  const heading = useAppSelector((state) => state.navigation.heading);
  const course = useAppSelector((state) => state.navigation.course);
  const units = useUnits();
  const now = useNow();
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    if (!confirmClear) return;
    const timer = setTimeout(() => setConfirmClear(false), 5000);
    return () => clearTimeout(timer);
  }, [confirmClear]);

  if (!mob) return null;

  const guidance =
    mob.position && position
      ? mobGuidance({
          target: mob.position,
          position,
          sog,
          direction: heading ?? course,
          now: position.timestamp,
        })
      : null;

  const turn = guidance?.turn ?? null;
  const turnText =
    turn === null
      ? null
      : Math.abs(turn) < 5
        ? 'Ahead'
        : `Turn ${turn > 0 ? 'starboard' : 'port'} ${Math.round(Math.abs(turn))}°`;

  return (
    <section
      aria-label="Man overboard"
      className="fixed z-[85] bottom-3 left-1/2 -translate-x-1/2 w-[min(28rem,calc(100vw-7rem))]
        ml-10 rounded-xl border-4 border-red-600 bg-surface shadow-2xl text-gray-900"
    >
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-red-600 text-white">
        <h2 className="font-extrabold tracking-wide">MAN OVERBOARD</h2>
        <span className="font-mono text-sm" data-testid="mob-elapsed">
          {elapsed(mob.activatedAt, now)} ago
        </span>
      </div>

      <div className="p-3">
        {guidance ? (
          <>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div>
                <div className="text-xs text-gray-500">Bearing</div>
                <div className="text-3xl font-bold font-mono" data-testid="mob-bearing">
                  {formatBearing(guidance.bearing)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Distance</div>
                <div className="text-3xl font-bold font-mono" data-testid="mob-distance">
                  {formatShortDistance(units, guidance.distanceM)}
                </div>
              </div>
            </div>
            {turnText && (
              <div className="mt-2 text-center text-lg font-semibold" data-testid="mob-turn">
                {turnText}
              </div>
            )}
          </>
        ) : (
          <div className="text-center font-semibold py-2" data-testid="mob-waiting">
            {mob.position ? 'No current position: guidance resumes with the next fix' : 'Waiting for a position fix…'}
          </div>
        )}

        <div className="mt-2 flex items-end justify-between gap-2 text-xs text-gray-600">
          <div>
            {mob.position ? (
              <div className="font-mono" data-testid="mob-position">
                {formatCoordinate(mob.position.latitude, true)}{' '}
                {formatCoordinate(mob.position.longitude, false)}
              </div>
            ) : null}
            <div>
              Marked {clockTime(mob.activatedAt)}
              {mob.staleFix && (
                <span className="ml-1 font-semibold text-orange-700">
                  (last fix was old: the spot may be off)
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => {
              if (confirmClear) dispatch(clearMob());
              else setConfirmClear(true);
            }}
            className={`shrink-0 px-3 py-2 rounded font-semibold text-sm ${
              confirmClear
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {confirmClear ? 'Tap again to clear' : 'Clear MOB'}
          </button>
        </div>
      </div>
    </section>
  );
};
