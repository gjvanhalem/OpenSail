import { describe, it, expect } from 'vitest';
import { chartBearing, resolveChartViewState, type ChartViewOptions } from '../chartViewState';
import type { Viewport } from '../ChartView';
import type { Position } from '@/models';

const viewport: Viewport = { latitude: 51.5, longitude: -0.12, zoom: 12, bearing: 0, pitch: 0 };
const position: Position = { latitude: 52.37, longitude: 4.9, accuracy: 5, timestamp: 0 };
const northUp: ChartViewOptions = {
  followVessel: true,
  position,
  orientation: 'north-up',
  heading: null,
  course: null,
};

describe('resolveChartViewState', () => {
  it('centers on the vessel while following it, keeping the user zoom', () => {
    const view = resolveChartViewState(viewport, northUp);
    expect(view).toEqual({ ...viewport, latitude: 52.37, longitude: 4.9 });
  });

  it('keeps the user view when not following', () => {
    expect(resolveChartViewState(viewport, { ...northUp, followVessel: false })).toBe(viewport);
  });

  it('keeps the user view when there is no position yet', () => {
    expect(resolveChartViewState(viewport, { ...northUp, position: null })).toBe(viewport);
  });

  it('returns the same object when nothing changes, so the map is not re-set', () => {
    const centered = { ...viewport, latitude: 52.37, longitude: 4.9 };
    expect(resolveChartViewState(centered, northUp)).toBe(centered);
  });

  it('turns the chart to the heading in heading-up', () => {
    const view = resolveChartViewState(viewport, {
      ...northUp,
      orientation: 'heading-up',
      heading: 135,
    });
    expect(view.bearing).toBe(135);
  });

  it('applies the orientation even when not following the vessel', () => {
    const view = resolveChartViewState(
      { ...viewport, bearing: 40 },
      { ...northUp, followVessel: false }
    );
    expect(view.bearing).toBe(0);
    expect(view.latitude).toBe(viewport.latitude);
  });
});

describe('chartBearing', () => {
  it('is 0 in north-up whatever the heading', () => {
    expect(chartBearing('north-up', 90, 80)).toBe(0);
  });

  it('prefers heading over course in heading-up', () => {
    expect(chartBearing('heading-up', 90, 80)).toBe(90);
  });

  it('falls back to course over ground without a heading', () => {
    expect(chartBearing('heading-up', null, 80)).toBe(80);
  });

  it('is null in heading-up without heading or course', () => {
    expect(chartBearing('heading-up', null, null)).toBeNull();
  });

  it('normalises to 0-360', () => {
    expect(chartBearing('heading-up', -10, null)).toBe(350);
    expect(chartBearing('heading-up', 370, null)).toBe(10);
  });
});
