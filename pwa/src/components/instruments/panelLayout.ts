/**
 * Instrument panel layout (R14.2): which gauges show, in what order, at what
 * size. Saved in settings as an array; these helpers keep it valid.
 */

export type GaugeType = 'speed' | 'depth' | 'wind' | 'heading' | 'position';
export type GaugeSize = 'small' | 'medium' | 'large';

export interface GaugeLayoutItem {
  type: GaugeType;
  enabled: boolean;
  size: GaugeSize;
}

export type PanelLayout = GaugeLayoutItem[];

export const GAUGE_TYPES: GaugeType[] = ['speed', 'depth', 'wind', 'heading', 'position'];
export const GAUGE_SIZES: GaugeSize[] = ['small', 'medium', 'large'];

export const GAUGE_NAMES: Record<GaugeType, string> = {
  speed: 'Speed',
  depth: 'Depth',
  wind: 'Wind',
  heading: 'Heading',
  position: 'Position',
};

export const DEFAULT_PANEL_LAYOUT: PanelLayout = GAUGE_TYPES.map((type) => ({
  type,
  enabled: true,
  size: 'small',
}));

/**
 * A valid layout from whatever was stored: every gauge exactly once, unknown
 * entries dropped, gauges added in a later version appended (enabled).
 */
export function normalizePanelLayout(stored: unknown): PanelLayout {
  const items = Array.isArray(stored) ? stored : [];
  const seen = new Set<GaugeType>();
  const layout: PanelLayout = [];

  for (const item of items) {
    if (typeof item !== 'object' || item === null) continue;
    const { type, enabled, size } = item as Partial<GaugeLayoutItem>;
    if (!type || !GAUGE_TYPES.includes(type) || seen.has(type)) continue;
    seen.add(type);
    layout.push({
      type,
      enabled: enabled !== false,
      size: size && GAUGE_SIZES.includes(size) ? size : 'small',
    });
  }
  for (const type of GAUGE_TYPES) {
    if (!seen.has(type)) layout.push({ type, enabled: true, size: 'small' });
  }
  return layout;
}

/** Move a gauge up (-1) or down (+1) in the order */
export function moveGauge(layout: PanelLayout, type: GaugeType, delta: -1 | 1): PanelLayout {
  const from = layout.findIndex((g) => g.type === type);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= layout.length) return layout;
  const next = [...layout];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

export function updateGauge(
  layout: PanelLayout,
  type: GaugeType,
  changes: Partial<Omit<GaugeLayoutItem, 'type'>>
): PanelLayout {
  return layout.map((g) => (g.type === type ? { ...g, ...changes } : g));
}
