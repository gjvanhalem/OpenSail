import { describe, it, expect } from 'vitest';
import {
  createPropertyExpression,
  latest,
  validateStyleMin,
  type StylePropertySpecification,
} from '@maplibre/maplibre-gl-style-spec';
import type { FillLayerSpecification } from 'maplibre-gl';
import { createBaseMapStyle } from '../baseMapStyle';
import { createEncLayers, ENC_COLORS, encSourceId } from '../encStyle';

const SOURCE = encSourceId('test');

function depthColor(properties: Record<string, unknown>, depths = { shallowContour: 2, safetyContour: 3, deepContour: 10 }) {
  const layer = createEncLayers(SOURCE, depths).find((l) => l.id.endsWith('-depare')) as FillLayerSpecification;
  const parsed = createPropertyExpression(
    layer.paint!['fill-color'],
    latest.paint_fill['fill-color'] as StylePropertySpecification
  );
  if (parsed.result !== 'success') throw new Error(JSON.stringify(parsed.value));
  const color = parsed.value.evaluate({ zoom: 12 }, { type: 'Polygon', properties } as never);
  return color.toString();
}

const css = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},1)`;
};

describe('createEncLayers', () => {
  it('makes a valid style together with the base map', () => {
    const style = createBaseMapStyle();
    style.sources[SOURCE] = { type: 'vector', url: 'pmtiles://https://example.org/x.pmtiles' };
    style.layers.push(...createEncLayers(SOURCE));
    expect(validateStyleMin(style)).toEqual([]);
  });

  it('prefixes every layer id with its source and uses lower-case S-57 layers', () => {
    expect(SOURCE).toBe('enc-test');
    for (const layer of createEncLayers(SOURCE)) {
      expect(layer.id.startsWith(`${SOURCE}-`)).toBe(true);
      expect((layer as { 'source-layer': string })['source-layer']).toMatch(/^[a-z_]+$/);
    }
  });

  it('shades depth areas by the shallow, safety and deep contours', () => {
    expect(depthColor({ DRVAL1: -1, DRVAL2: 0 })).toBe(css(ENC_COLORS.drying));
    expect(depthColor({ DRVAL1: 0, DRVAL2: 2 })).toBe(css(ENC_COLORS.veryShallow));
    expect(depthColor({ DRVAL1: 2.5, DRVAL2: 5 })).toBe(css(ENC_COLORS.mediumShallow));
    expect(depthColor({ DRVAL1: 4.9, DRVAL2: 10 })).toBe(css(ENC_COLORS.mediumDeep));
    expect(depthColor({ DRVAL1: 14.9 })).toBe(css(ENC_COLORS.deep));
  });

  it('shows an inland depth area without a surveyed depth as unknown, not as shallow', () => {
    expect(depthColor({ DRVAL1: 0 })).toBe(css(ENC_COLORS.unknownDepth));
  });

  it('follows the safety contour it is given', () => {
    expect(depthColor({ DRVAL1: 2.5 }, { shallowContour: 1, safetyContour: 2, deepContour: 10 })).toBe(
      css(ENC_COLORS.mediumDeep)
    );
  });
});
