import type { Position, Route } from '@/models';
import { angleDifference } from './calculations';
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
