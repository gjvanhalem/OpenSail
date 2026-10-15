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
