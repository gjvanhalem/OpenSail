import type { Position, Route, Waypoint } from '@/models';
import {
  calculateBearing,
  calculateCrossTrackError,
  calculateDistance,
} from './calculations';
import { calculateRemainingDistance } from './routeCalculations';

/**
 * Live guidance along an active route (R2): where the next waypoint is, how
 * far the boat is off the leg, and when it gets there at the current SOG.
 */

/** Default arrival radius for route navigation, nautical miles (about 185 m) */
export const DEFAULT_ARRIVAL_RADIUS_NM = 0.1;

export interface RouteGuidance {
  /** The waypoint the boat is heading for */
  targetWaypoint: Waypoint;
  targetIndex: number;
  /** Where the active leg starts: the previous waypoint, or where navigation started */
  legStart: Position | null;
  /** Bearing to the target waypoint, degrees true */
  bearingToWaypoint: number;
  /** Distance to the target waypoint, nautical miles */
  distanceToWaypoint: number;
  /** Course of the active leg, degrees true; null without a leg start */
  legBearing: number | null;
  /**
   * Cross-track error in nautical miles: positive when the boat is right of
   * the leg (steer left), negative when left of it; null without a leg start
   */
  crossTrackError: number | null;
  /** Distance to the end of the route, nautical miles */
  remainingDistance: number;
  /** Arrival at the target waypoint at the current SOG; null when not moving */
  etaWaypoint: Date | null;
  /** Arrival at the end of the route at the current SOG; null when not moving */
  etaRoute: Date | null;
}

/** Below this SOG (knots) an ETA is meaningless */
const MIN_ETA_SPEED = 0.1;

function etaAt(distanceNm: number, sog: number | null, now: number): Date | null {
  if (sog === null || sog < MIN_ETA_SPEED) return null;
  return new Date(now + (distanceNm / sog) * 3600 * 1000);
}

/** Where the leg to waypoint `index` starts */
export function activeLegStart(
  route: Route,
  index: number,
  navigationStart: Position | null
): Position | null {
  return index > 0 ? route.waypoints[index - 1].position : navigationStart;
}

/**
 * Guidance to waypoint `index` of `route` from `position`, or null when the
 * index is not a waypoint of the route.
 */
export function calculateRouteGuidance(params: {
  route: Route;
  activeIndex: number;
  position: Position;
  /** Speed over ground, knots */
  sog: number | null;
  /** Where the boat was when navigation started; the first leg starts there */
  navigationStart?: Position | null;
  now?: number;
}): RouteGuidance | null {
  const { route, activeIndex, position, sog, navigationStart = null, now = Date.now() } = params;
  const target = route.waypoints[activeIndex];
  if (!target) return null;

  const legStart = activeLegStart(route, activeIndex, navigationStart);
  const distanceToWaypoint = calculateDistance(position, target.position);
  const remainingDistance = calculateRemainingDistance(position, route.waypoints, activeIndex);

  // A leg needs two distinct ends to have a direction
  const hasLeg = legStart !== null && calculateDistance(legStart, target.position) > 1e-6;

  return {
    targetWaypoint: target,
    targetIndex: activeIndex,
    legStart,
    bearingToWaypoint: calculateBearing(position, target.position),
    distanceToWaypoint,
    legBearing: hasLeg ? calculateBearing(legStart, target.position) : null,
    crossTrackError: hasLeg ? calculateCrossTrackError(position, legStart, target.position) : null,
    remainingDistance,
    etaWaypoint: etaAt(distanceToWaypoint, sog, now),
    etaRoute: etaAt(remainingDistance, sog, now),
  };
}

/**
 * Arrival radius for a waypoint: the arrival radius setting, or the
 * waypoint's own radius when that is larger (a wide mark, a harbour entrance).
 */
export function effectiveArrivalRadius(waypoint: Waypoint, settingRadius: number): number {
  return Math.max(settingRadius, waypoint.arrivalRadius || 0);
}

/**
 * The waypoint to head for after checking arrival at `position`: skips every
 * waypoint the boat is already inside the arrival radius of, so starting a
 * route at its first waypoint heads straight for the second. Returns
 * `waypoints.length` when the last waypoint has been reached.
 */
export function nextWaypointIndex(
  route: Route,
  activeIndex: number,
  position: Position,
  arrivalRadius: number
): number {
  let index = activeIndex;
  while (
    index < route.waypoints.length &&
    calculateDistance(position, route.waypoints[index].position) <=
      effectiveArrivalRadius(route.waypoints[index], arrivalRadius)
  ) {
    index += 1;
  }
  return index;
}
