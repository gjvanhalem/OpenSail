/**
 * Wind calculations. Angles in degrees; wind angles are relative to the bow,
 * 0-360 clockwise (90 = from starboard beam), the direction the wind comes from.
 */

export interface TrueWind {
  /** True wind speed, same unit as the inputs */
  speed: number;
  /** True wind angle relative to the bow, 0-360 */
  angle: number;
  /** True wind direction (compass, where it comes from), when the heading is known */
  direction: number | null;
}

const RAD = Math.PI / 180;

const normalize = (degrees: number): number => ((degrees % 360) + 360) % 360;

/**
 * True wind from apparent wind and the boat's speed. The boat's own motion adds
 * a headwind of its speed; taking it away from the apparent wind leaves the true
 * wind. Use speed through the water for the wind over the water; with speed over
 * ground the result is the wind over the ground.
 */
export function trueWind(
  apparentSpeed: number,
  apparentAngle: number,
  boatSpeed: number,
  heading: number | null
): TrueWind {
  // Wind vector in the boat's frame: x to starboard, y to the bow
  const x = apparentSpeed * Math.sin(apparentAngle * RAD);
  const y = apparentSpeed * Math.cos(apparentAngle * RAD) - boatSpeed;
  const speed = Math.hypot(x, y);
  // With no true wind the angle is undefined; keep the apparent one
  const angle = speed < 1e-9 ? normalize(apparentAngle) : normalize(Math.atan2(x, y) / RAD);
  return { speed, angle, direction: heading === null ? null : normalize(heading + angle) };
}

/** A wind angle as degrees off the bow (0-180) and the side it comes from */
export function windSide(angle: number): { degrees: number; side: 'Stbd' | 'Port' } {
  const a = normalize(angle);
  return a <= 180 ? { degrees: a, side: 'Stbd' } : { degrees: 360 - a, side: 'Port' };
}
