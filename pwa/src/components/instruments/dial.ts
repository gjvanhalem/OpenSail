/**
 * Geometry shared by the round gauges: a 200 x 200 SVG with the centre at
 * (100, 100). Angles are compass-style degrees, 0 at the top, clockwise.
 */
export const CX = 100;
export const CY = 100;

const round = (n: number): number => Math.round(n * 100) / 100;

/** The point at an angle and radius from the centre */
export function polar(angle: number, radius: number): [number, number] {
  const t = (angle * Math.PI) / 180;
  return [round(CX + radius * Math.sin(t)), round(CY - radius * Math.cos(t))];
}

/** An SVG path for a clockwise arc from one angle to another */
export function arcPath(from: number, to: number, radius: number): string {
  const [x0, y0] = polar(from, radius);
  const [x1, y1] = polar(to, radius);
  const largeArc = to - from > 180 ? 1 : 0;
  return `M ${x0} ${y0} A ${radius} ${radius} 0 ${largeArc} 1 ${x1} ${y1}`;
}

/** The speed dial: 270° from bottom left to bottom right */
export const SPEED_DIAL_START = -135;
export const SPEED_DIAL_SWEEP = 270;

/** Ranges the speed gauge offers, knots, with the step between labelled and between minor ticks */
export const SPEED_GAUGE_RANGES: Record<number, { major: number; minor: number }> = {
  6: { major: 2, minor: 1 },
  12: { major: 4, minor: 2 },
  20: { major: 5, minor: 2.5 },
  30: { major: 10, minor: 5 },
  50: { major: 10, minor: 5 },
};

export const DEFAULT_SPEED_GAUGE_MAX = 12;

/** Dial angle for a speed, clamped to the dial */
export function speedAngle(speed: number, max: number): number {
  const fraction = Math.min(Math.max(speed / max, 0), 1);
  return SPEED_DIAL_START + fraction * SPEED_DIAL_SWEEP;
}
