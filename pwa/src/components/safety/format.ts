import type { AnchorWatchState } from '@/store/slices/safetySlice';
import { METRES_PER_NM } from '@/utils/safety';
import type { useUnits } from '@/hooks/useUnits';

type Units = ReturnType<typeof useUnits>;

const pad = (n: number) => String(n).padStart(2, '0');

/** 045° */
export const formatBearing = (degrees: number) =>
  `${String(Math.round(degrees) % 360).padStart(3, '0')}°`;

/** 14:05:09 */
export const clockTime = (ms: number) => {
  const date = new Date(ms);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

/** 4:07 or 1:04:07 since `since` */
export function elapsed(since: number, now: number): string {
  const seconds = Math.max(0, Math.floor((now - since) / 1000));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Short distances in metres (or feet), longer ones in the distance unit */
export function formatShortDistance(units: Units, metres: number): string {
  return metres < 1000
    ? units.format('length', metres, 0)
    : units.format('distance', metres / METRES_PER_NM, 2);
}

/** "12 m", or a dash without a value */
export const metres = (value: number | undefined | null) =>
  value === undefined || value === null ? '--' : `${Math.round(value)} m`;

/** A running watch in a few words, with the colours for its state */
export function anchorWatchStatus(watch: AnchorWatchState): { text: string; className: string } {
  if (watch.dragging) return { text: 'DRAGGING', className: 'bg-red-600 text-white border-red-600' };
  if (watch.gpsLost) return { text: 'NO POSITION', className: 'bg-orange-500 text-white border-orange-500' };
  if (watch.poorAccuracy)
    return { text: 'GPS too inaccurate', className: 'bg-orange-100 text-orange-800 border-orange-300' };
  if (watch.distanceM === null)
    return { text: 'Waiting for a fix', className: 'bg-gray-100 text-gray-700 border-gray-300' };
  return { text: 'Holding', className: 'bg-green-100 text-green-800 border-green-300' };
}

/** "12 m / 50 m" */
export const anchorWatchDistance = (watch: AnchorWatchState) => `${metres(watch.distanceM)} / ${metres(watch.radiusM)}`;

