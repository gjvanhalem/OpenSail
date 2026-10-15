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
