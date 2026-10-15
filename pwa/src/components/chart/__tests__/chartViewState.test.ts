import { describe, it, expect } from 'vitest';
import { resolveChartViewState } from '../chartViewState';
import type { Viewport } from '../ChartView';
import type { Position } from '@/models';

const viewport: Viewport = { latitude: 51.5, longitude: -0.12, zoom: 12, bearing: 0, pitch: 0 };
const position: Position = { latitude: 52.37, longitude: 4.9, accuracy: 5, timestamp: 0 };

describe('resolveChartViewState', () => {
  it('centers on the vessel while following it, keeping the user zoom', () => {
    const view = resolveChartViewState(viewport, { followVessel: true, position });
    expect(view).toEqual({ ...viewport, latitude: 52.37, longitude: 4.9 });
  });

  it('keeps the user view when not following', () => {
    expect(resolveChartViewState(viewport, { followVessel: false, position })).toBe(viewport);
  });

  it('keeps the user view when there is no position yet', () => {
    expect(resolveChartViewState(viewport, { followVessel: true, position: null })).toBe(viewport);
  });

  it('returns the same object when already centered, so the map is not re-set', () => {
    const centered = { ...viewport, latitude: 52.37, longitude: 4.9 };
    expect(resolveChartViewState(centered, { followVessel: true, position })).toBe(centered);
  });
});
