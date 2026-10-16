import { describe, it, expect } from 'vitest';
import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec';
import { createBaseMapStyle, BASE_MAP_SOURCE } from '../baseMapStyle';

describe('createBaseMapStyle', () => {
  it('is a valid MapLibre style', () => {
    expect(validateStyleMin(createBaseMapStyle())).toEqual([]);
  });

  it('uses the OpenFreeMap base map without a token', () => {
    const style = createBaseMapStyle();
    expect(style.sources[BASE_MAP_SOURCE]).toMatchObject({
      type: 'vector',
      url: 'https://tiles.openfreemap.org/planet',
    });
    expect(JSON.stringify(style)).not.toMatch(/mapbox|access_token/);
  });
});
