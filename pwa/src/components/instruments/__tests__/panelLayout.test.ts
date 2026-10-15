import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PANEL_LAYOUT,
  GAUGE_TYPES,
  moveGauge,
  normalizePanelLayout,
  updateGauge,
} from '../panelLayout';

const order = (layout: { type: string }[]) => layout.map((g) => g.type);

describe('normalizePanelLayout', () => {
  it('uses the default layout when nothing is stored', () => {
    expect(normalizePanelLayout(undefined)).toEqual(DEFAULT_PANEL_LAYOUT);
    expect(normalizePanelLayout('nonsense')).toEqual(DEFAULT_PANEL_LAYOUT);
  });

  it('keeps the stored order, visibility and size', () => {
    const stored = [
      { type: 'wind', enabled: false, size: 'large' },
      { type: 'depth', enabled: true, size: 'medium' },
    ];
    const layout = normalizePanelLayout(stored);
    expect(layout.slice(0, 2)).toEqual(stored);
  });

  it('appends gauges missing from the stored layout, and drops unknown and duplicate ones', () => {
    const layout = normalizePanelLayout([
      { type: 'depth', enabled: true, size: 'small' },
      { type: 'radar', enabled: true, size: 'small' },
      { type: 'depth', enabled: false, size: 'large' },
      null,
    ]);
    expect(order(layout)).toEqual(['depth', ...GAUGE_TYPES.filter((t) => t !== 'depth')]);
    expect(layout[0].enabled).toBe(true);
  });

  it('repairs a bad size', () => {
    expect(normalizePanelLayout([{ type: 'speed', enabled: true, size: 'huge' }])[0].size).toBe('small');
  });
});

describe('moveGauge', () => {
  it('swaps a gauge with its neighbour', () => {
    const layout = moveGauge(DEFAULT_PANEL_LAYOUT, 'depth', -1);
    expect(order(layout).slice(0, 2)).toEqual(['depth', 'speed']);
    expect(order(moveGauge(layout, 'depth', 1)).slice(0, 2)).toEqual(['speed', 'depth']);
  });

  it('does nothing past either end', () => {
    expect(moveGauge(DEFAULT_PANEL_LAYOUT, 'speed', -1)).toBe(DEFAULT_PANEL_LAYOUT);
    expect(moveGauge(DEFAULT_PANEL_LAYOUT, 'position', 1)).toBe(DEFAULT_PANEL_LAYOUT);
  });
});

describe('updateGauge', () => {
  it('changes one gauge only', () => {
    const layout = updateGauge(DEFAULT_PANEL_LAYOUT, 'wind', { enabled: false, size: 'large' });
    expect(layout.find((g) => g.type === 'wind')).toEqual({ type: 'wind', enabled: false, size: 'large' });
    expect(layout.filter((g) => g.enabled)).toHaveLength(GAUGE_TYPES.length - 1);
  });
});
