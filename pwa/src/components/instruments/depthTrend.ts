/** A depth reading: time in ms, depth in metres */
export interface DepthSample {
  t: number;
  depth: number;
}

/** How far back the depth trend looks */
export const DEPTH_TREND_WINDOW_MS = 2 * 60 * 1000;
/** Changes slower than this, metres per minute, count as steady */
const STEADY_M_PER_MIN = 0.1;
/** Too short a span gives a jumpy rate */
const MIN_SPAN_MS = 20 * 1000;

/** The samples of the last trend window before `now` */
export function recentSamples(samples: DepthSample[], now: number): DepthSample[] {
  return samples.filter((s) => s.t >= now - DEPTH_TREND_WINDOW_MS && s.t <= now);
}

/**
 * Whether the water is getting shallower, deeper or stays the same, and how fast
 * (metres per minute, negative when shoaling). Null without enough history.
 */
export function depthTrend(
  samples: DepthSample[]
): { rate: number; kind: 'shoaling' | 'deepening' | 'steady' } | null {
  if (samples.length < 2) return null;
  const first = samples[0];
  const last = samples[samples.length - 1];
  const span = last.t - first.t;
  if (span < MIN_SPAN_MS) return null;
  const rate = ((last.depth - first.depth) / span) * 60_000;
  const kind = Math.abs(rate) < STEADY_M_PER_MIN ? 'steady' : rate < 0 ? 'shoaling' : 'deepening';
  return { rate, kind };
}

/** Colour state of the depth number against the shallow-water limit */
export function depthState(depth: number, limit: number | null): 'danger' | 'warning' | 'normal' {
  if (limit === null) return 'normal';
  if (depth < limit) return 'danger';
  if (depth < limit * 1.5) return 'warning';
  return 'normal';
}
