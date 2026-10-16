import type { ChartRotation, Position } from '@/models';
import type { Viewport } from './ChartView';

export interface ChartViewOptions {
  /** Keep the vessel in the center of the chart */
  followVessel: boolean;
  position: Position | null;
  /** North-up keeps north at the top; heading-up turns the chart so the bow points up */
  orientation: ChartRotation;
  /** True heading in degrees, or null when unknown */
  heading: number | null;
  /** Course over ground in degrees, used for heading-up when there is no heading */
  course: number | null;
}

/** The direction the bow points, falling back to course over ground */
export function vesselDirection(heading: number | null, course: number | null): number | null {
  return heading ?? course;
}

/**
 * The bearing the chart shows for an orientation: 0 for north-up, the vessel's
 * direction for heading-up (a map bearing is the compass direction at the
 * top of the screen). Null when heading-up has no direction to use yet.
 */
export function chartBearing(
  orientation: ChartRotation,
  heading: number | null,
  course: number | null
): number | null {
  if (orientation === 'north-up') return 0;
  const direction = vesselDirection(heading, course);
  return direction === null ? null : ((direction % 360) + 360) % 360;
}

/**
 * The view the chart shows: the user's own view (zoom, and center when they
 * have panned away), with the center locked to the vessel while following it
 * and the bearing set by the chart orientation.
 */
export function resolveChartViewState(
  viewport: Viewport,
  { followVessel, position, orientation, heading, course }: ChartViewOptions
): Viewport {
  const center =
    followVessel && position
      ? { latitude: position.latitude, longitude: position.longitude }
      : { latitude: viewport.latitude, longitude: viewport.longitude };
  const bearing = chartBearing(orientation, heading, course) ?? viewport.bearing;

  if (
    center.latitude === viewport.latitude &&
    center.longitude === viewport.longitude &&
    bearing === viewport.bearing
  ) {
    return viewport;
  }
  return { ...viewport, ...center, bearing };
}
