import { describe, it, expect } from 'vitest';
import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec';
import { createBaseMapStyle, BASE_MAP_SOURCE, SEAMARK_LAYER, SEAMARK_SOURCE } from '../baseMapStyle';

describe('createBaseMapStyle', () => {
  it('is a valid MapLibre style, with and without seamarks', () => {
    expect(validateStyleMin(createBaseMapStyle())).toEqual([]);
    expect(validateStyleMin(createBaseMapStyle({ seamarks: false }))).toEqual([]);
  });

  it('loads the base map and glyphs through the opensail:// protocol, without a token', () => {
    const style = createBaseMapStyle();
    expect(style.sources[BASE_MAP_SOURCE]).toMatchObject({
      type: 'vector',
      tiles: ['opensail://base/{z}/{x}/{y}'],
      maxzoom: 14,
    });
    expect(style.glyphs).toBe('opensail://glyphs/{fontstack}/{range}');
    expect(JSON.stringify(style)).not.toMatch(/mapbox|access_token/);
  });

  it('draws OpenSeaMap seamarks on top, with attribution', () => {
    const style = createBaseMapStyle();
    expect(style.sources[SEAMARK_SOURCE]).toMatchObject({
      type: 'raster',
      tiles: ['opensail://seamarks/{z}/{x}/{y}'],
    });
    expect((style.sources[SEAMARK_SOURCE] as { attribution: string }).attribution).toMatch(/OpenSeaMap/);
    const last = style.layers[style.layers.length - 1];
    expect(last).toMatchObject({ id: SEAMARK_LAYER, layout: { visibility: 'visible' } });
  });

  it('hides the seamarks when they are turned off', () => {
    const style = createBaseMapStyle({ seamarks: false });
    const layer = style.layers.find((l) => l.id === SEAMARK_LAYER);
    expect(layer).toMatchObject({ layout: { visibility: 'none' } });
  });
});
