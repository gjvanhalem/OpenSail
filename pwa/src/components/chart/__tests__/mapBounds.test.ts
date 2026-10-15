import { describe, expect, it } from 'vitest';
import { LngLatBounds } from 'maplibre-gl';
import { lngLatBoundsToBounds } from '../mapBounds';

describe('lngLatBoundsToBounds', () => {
  it('maps the corners of the visible area to north, south, east and west', () => {
    // South-west Stavoren, north-east Lemmer
    const visible = new LngLatBounds([5.3, 52.85], [5.72, 52.94]);
    expect(lngLatBoundsToBounds(visible)).toEqual({
      north: 52.94,
      south: 52.85,
      east: 5.72,
      west: 5.3,
    });
  });

  it('keeps west of the prime meridian negative', () => {
    expect(lngLatBoundsToBounds(new LngLatBounds([-1.5, 51], [1.5, 52]))).toEqual({
      north: 52,
      south: 51,
      east: 1.5,
      west: -1.5,
    });
  });
});
