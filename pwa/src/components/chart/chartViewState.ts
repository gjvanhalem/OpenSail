import type { Position } from '@/models';
import type { Viewport } from './ChartView';

export interface FollowVesselOptions {
  /** Keep the vessel in the center of the chart */
  followVessel: boolean;
  position: Position | null;
}

/**
 * The view the chart shows: the user's own view (zoom, and center when they
 * have panned away), with the center locked to the vessel while following it.
 */
export function resolveChartViewState(
  viewport: Viewport,
  { followVessel, position }: FollowVesselOptions
): Viewport {
  if (!followVessel || !position) return viewport;
  if (viewport.latitude === position.latitude && viewport.longitude === position.longitude) {
    return viewport;
  }
  return { ...viewport, latitude: position.latitude, longitude: position.longitude };
}
