import type { LngLatBounds } from 'maplibre-gl';
import type { Bounds } from '@/database/services/TileCache';

/** The map's visible area as download bounds */
export function lngLatBoundsToBounds(bounds: LngLatBounds): Bounds {
  return {
    north: bounds.getNorth(),
    south: bounds.getSouth(),
    east: bounds.getEast(),
    west: bounds.getWest(),
  };
}
