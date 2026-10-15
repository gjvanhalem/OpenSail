import type { Route, Waypoint } from '@/models';
import type { TrackPoint } from '@/database/db';
import { calculateTotalDistance } from './routeCalculations';
import { DEFAULT_ARRIVAL_RADIUS_NM } from './routeGuidance';

/**
 * Turn a recorded track into a route (R9.5). A track has a point every few
 * seconds; Douglas-Peucker keeps only the points where the boat really
 * changed course, so the route gets a sensible number of waypoints.
 */

/** Default simplification tolerance, nautical miles (about 90 m) */
export const DEFAULT_SIMPLIFY_TOLERANCE_NM = 0.05;
/** Most waypoints a converted route gets; the least significant points go first */
export const MAX_CONVERTED_WAYPOINTS = 50;

const NM_PER_DEGREE = 60;

interface XY {
  x: number;
  y: number;
}

/**
 * Project onto a flat plane in nautical miles around the track's mean
 * latitude. Good to well under 1% over the few tens of miles a track spans.
 */
function project(points: TrackPoint[]): XY[] {
  const meanLat = points.reduce((sum, p) => sum + p.latitude, 0) / points.length;
  const lonScale = NM_PER_DEGREE * Math.cos((meanLat * Math.PI) / 180);
  return points.map((p) => ({ x: p.longitude * lonScale, y: p.latitude * NM_PER_DEGREE }));
}

/** Distance from p to the segment a-b */
function segmentDistance(p: XY, a: XY, b: XY): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/**
 * Douglas-Peucker at `tolerance` nautical miles. Returns, for each point it
 * keeps, how far that point was off the line when it was split there: its
 * significance. First and last points get Infinity. Iterative, so a 100-hour
 * track can't overflow the stack.
 */
function douglasPeucker(xy: XY[], tolerance: number): Map<number, number> {
  const n = xy.length;
  const kept = new Map<number, number>([
    [0, Infinity],
    [n - 1, Infinity],
  ]);
  const stack: [number, number][] = [[0, n - 1]];

  while (stack.length > 0) {
    const [first, last] = stack.pop()!;
    let maxDistance = 0;
    let index = -1;
    for (let i = first + 1; i < last; i++) {
      const d = segmentDistance(xy[i], xy[first], xy[last]);
      if (d > maxDistance) {
        maxDistance = d;
        index = i;
      }
    }
    if (index !== -1 && maxDistance > tolerance) {
      kept.set(index, maxDistance);
      stack.push([first, index], [index, last]);
    }
  }
  return kept;
}

/**
 * Simplify a track with Douglas-Peucker at `tolerance` nm. When that keeps
 * more than `maxPoints`, only the most significant ones stay. First and last
 * points always stay.
 */
export function simplifyTrack(
  points: TrackPoint[],
  tolerance = DEFAULT_SIMPLIFY_TOLERANCE_NM,
  maxPoints = MAX_CONVERTED_WAYPOINTS
): TrackPoint[] {
  if (points.length <= 2) return points;
  const kept = [...douglasPeucker(project(points), Math.max(tolerance, 1e-6))];
  const limit = Math.max(2, maxPoints);
  const chosen =
    kept.length > limit ? kept.sort((a, b) => b[1] - a[1]).slice(0, limit) : kept;
  return chosen
    .map(([index]) => index)
    .sort((a, b) => a - b)
    .map((index) => points[index]);
}

export interface TrackToRouteOptions {
  tolerance?: number;
  maxWaypoints?: number;
  arrivalRadius?: number;
  /** Route name; defaults to the track's name */
  name?: string;
  now?: Date;
}

/** A new route along a track, ready to save (without an id) */
export function trackToRoute(
  track: { name: string; points: TrackPoint[]; avgSpeed: number },
  options: TrackToRouteOptions = {}
): Omit<Route, 'id'> {
  const {
    tolerance = DEFAULT_SIMPLIFY_TOLERANCE_NM,
    maxWaypoints = MAX_CONVERTED_WAYPOINTS,
    arrivalRadius = DEFAULT_ARRIVAL_RADIUS_NM,
    name = track.name,
    now = new Date(),
  } = options;

  const stamp = now.getTime();
  const waypoints: Waypoint[] = simplifyTrack(track.points, tolerance, maxWaypoints).map(
    (point, i) => ({
      id: `waypoint_${stamp}_${i}`,
      name: `WP${i + 1}`,
      position: {
        latitude: point.latitude,
        longitude: point.longitude,
        accuracy: 0,
        timestamp: new Date(point.timestamp).getTime(),
      },
      arrivalRadius,
    })
  );

  const totalDistance = calculateTotalDistance(waypoints);
  const speed = track.avgSpeed > 0 ? track.avgSpeed : 5;
  return {
    name,
    waypoints,
    totalDistance,
    estimatedDuration: totalDistance / speed,
    createdAt: now,
    updatedAt: now,
  };
}
