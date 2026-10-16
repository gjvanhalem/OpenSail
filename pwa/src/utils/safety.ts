import type { Position, Route } from '@/models';
import { angleDifference, calculateDestination, calculateDistance } from './calculations';
import { calculateRouteGuidance } from './routeGuidance';

/**
 * Geometry and limits for the safety features: man overboard (R12) and
 * anchor watch (R8).
 */

/** Anchor watch radius limits, metres (R8.1) */
export const ANCHOR_RADIUS_MIN_M = 10;
export const ANCHOR_RADIUS_MAX_M = 500;

/** Clamp a radius into the allowed range; a non-number gives the minimum */
export function clampAnchorRadius(metres: number): number {
  if (!Number.isFinite(metres)) return ANCHOR_RADIUS_MIN_M;
  return Math.min(ANCHOR_RADIUS_MAX_M, Math.max(ANCHOR_RADIUS_MIN_M, Math.round(metres)));
}

export const METRES_PER_NM = 1852;

/** A fix older than this is "stale": shown with a warning when used for MOB */
export const STALE_FIX_MS = 10_000;

/** The single-waypoint "route" back to a MOB spot, for the route-guidance code */
function routeTo(target: Position): Route {
  return {
    id: 'mob',
    name: 'MOB',
    waypoints: [{ id: 'mob', name: 'MOB', position: target, arrivalRadius: 0 }],
    totalDistance: 0,
    estimatedDuration: 0,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };
}

export interface MobGuidance {
  /** Bearing from the boat to the MOB spot, degrees true */
  bearing: number;
  /** Distance to the MOB spot, nautical miles and metres */
  distanceNm: number;
  distanceM: number;
  /** Arrival at the current SOG; null when (nearly) stopped */
  eta: Date | null;
  /**
   * How far to turn to point at the MOB spot, degrees: positive to starboard,
   * negative to port; null without a course or heading
   */
  turn: number | null;
}

/**
 * Bearing, distance, ETA and turn back to the MOB spot. Uses the route
 * guidance from Phase 2 with a one-waypoint route.
 */
export function mobGuidance(params: {
  target: Position;
  position: Position;
  /** Knots */
  sog: number | null;
  /** Heading, or COG without one; degrees true */
  direction: number | null;
  now: number;
}): MobGuidance {
  const { target, position, sog, direction, now } = params;
  const guidance = calculateRouteGuidance({
    route: routeTo(target),
    activeIndex: 0,
    position,
    sog,
    now,
  })!;
  const bearing = guidance.bearingToWaypoint;
  return {
    bearing,
    distanceNm: guidance.distanceToWaypoint,
    distanceM: guidance.distanceToWaypoint * METRES_PER_NM,
    eta: guidance.etaWaypoint,
    turn: direction === null ? null : angleDifference(direction, bearing),
  };
}

/**
 * The position to record for a MOB when the button is pressed: the latest
 * fix, flagged stale when it is older than STALE_FIX_MS; null without a fix
 * (the next fix is used then).
 */
export function mobFix(
  position: Position | null,
  now: number
): { position: Position; stale: boolean } | null {
  if (!position) return null;
  return { position, stale: now - position.timestamp > STALE_FIX_MS };
}

/** R8.5: check the anchor at least this often, also without new fixes */
export const ANCHOR_CHECK_INTERVAL_MS = 10_000;

/**
 * The drag alarm sounds once the boat has been outside the circle for at
 * least DRAG_CONFIRM_FIXES fixes in a row spanning DRAG_CONFIRM_MS. A single
 * GPS jump, or a few seconds of jitter at the edge, is ignored. With 1 fix a
 * second the alarm comes after about 5 s; with 1 fix every 10 s after about 20 s.
 */
export const DRAG_CONFIRM_FIXES = 3;
export const DRAG_CONFIRM_MS = 5_000;

/** No usable fix for this long while the watch runs raises the GPS-lost alarm */
export const ANCHOR_GPS_LOST_MS = 60_000;

/** Once dragging, the boat must be this far back inside before it counts as inside again */
export const anchorBackInsideMargin = (radiusM: number) => Math.min(5, radiusM * 0.1);

export interface AnchorWatchCheck {
  /** Distance from the anchor at the latest usable fix, metres */
  distanceM: number | null;
  /** The furthest the boat has been from the anchor, metres */
  maxDistanceM: number;
  /** Consecutive usable fixes outside the circle */
  outsideCount: number;
  /** Time stamp of the first of those fixes */
  outsideSince: number | null;
  /** Time stamp of the latest fix looked at, so a fix is only counted once */
  lastFixTime: number | null;
  /** When the latest usable fix arrived (ms since epoch, local clock) */
  lastGoodFixAt: number;
  /** The latest fix was too inaccurate for this radius and was not counted */
  poorAccuracy: boolean;
  /** Outside the circle for DRAG_CONFIRM_FIXES fixes and not back inside yet */
  dragging: boolean;
  /** No usable fix for ANCHOR_GPS_LOST_MS */
  gpsLost: boolean;
}

/** Just the check fields of a watch that carries more */
export function anchorCheckOf(watch: AnchorWatchCheck): AnchorWatchCheck {
  const {
    distanceM,
    maxDistanceM,
    outsideCount,
    outsideSince,
    lastFixTime,
    lastGoodFixAt,
    poorAccuracy,
    dragging,
    gpsLost,
  } = watch;
  return {
    distanceM,
    maxDistanceM,
    outsideCount,
    outsideSince,
    lastFixTime,
    lastGoodFixAt,
    poorAccuracy,
    dragging,
    gpsLost,
  };
}

export type AnchorWatchEvent = 'drag' | 'back_inside' | 'gps_lost' | 'gps_restored';

export function initialAnchorCheck(now: number): AnchorWatchCheck {
  return {
    distanceM: null,
    maxDistanceM: 0,
    outsideCount: 0,
    outsideSince: null,
    lastFixTime: null,
    lastGoodFixAt: now,
    poorAccuracy: false,
    dragging: false,
    gpsLost: false,
  };
}

/**
 * One anchor-watch check: with the latest fix (or none) at local time `now`.
 * Called for every new fix and at least every ANCHOR_CHECK_INTERVAL_MS.
 *
 * GPS jitter: a fix whose reported accuracy is worse than the radius is not
 * counted (it can't tell inside from outside); the drag alarm needs
 * DRAG_CONFIRM_FIXES fixes in a row over DRAG_CONFIRM_MS outside the circle; and once dragging the
 * boat must come back inside by a small margin before it counts as inside.
 */
export function checkAnchor(
  watch: { anchor: Position; radiusM: number },
  previous: AnchorWatchCheck,
  fix: Position | null,
  now: number
): { check: AnchorWatchCheck; events: AnchorWatchEvent[] } {
  const check = anchorCheckOf(previous);
  const events: AnchorWatchEvent[] = [];

  const isNewFix = fix !== null && (check.lastFixTime === null || fix.timestamp > check.lastFixTime);
  if (fix && isNewFix) {
    check.lastFixTime = fix.timestamp;
    check.poorAccuracy = fix.accuracy > watch.radiusM;
    if (!check.poorAccuracy) {
      check.lastGoodFixAt = now;
      const distanceM = calculateDistance(fix, watch.anchor) * METRES_PER_NM;
      check.distanceM = distanceM;
      check.maxDistanceM = Math.max(check.maxDistanceM, distanceM);
      const limit = check.dragging
        ? watch.radiusM - anchorBackInsideMargin(watch.radiusM)
        : watch.radiusM;
      const outside = distanceM > limit;
      check.outsideCount = outside ? check.outsideCount + 1 : 0;
      check.outsideSince = outside ? (check.outsideSince ?? fix.timestamp) : null;
      const confirmed =
        check.outsideCount >= DRAG_CONFIRM_FIXES &&
        fix.timestamp - check.outsideSince! >= DRAG_CONFIRM_MS;
      if (!check.dragging && confirmed) {
        check.dragging = true;
        events.push('drag');
      } else if (check.dragging && !outside) {
        check.dragging = false;
        events.push('back_inside');
      }
    }
  }

  const lost = now - check.lastGoodFixAt > ANCHOR_GPS_LOST_MS;
  if (lost && !check.gpsLost) events.push('gps_lost');
  if (!lost && check.gpsLost) events.push('gps_restored');
  check.gpsLost = lost;

  return { check, events };
}

/**
 * The anchor-watch circle as a closed GeoJSON ring of [longitude, latitude]
 * points, `radiusM` metres from `center`, for drawing on the chart (R8.3).
 */
export function circleRing(center: Position, radiusM: number, steps = 64): [number, number][] {
  const ring: [number, number][] = [];
  for (let i = 0; i < steps; i++) {
    const point = calculateDestination(center, (360 * i) / steps, radiusM / METRES_PER_NM);
    ring.push([point.longitude, point.latitude]);
  }
  ring.push(ring[0]);
  return ring;
}
