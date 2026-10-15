import type { ExpressionSpecification, StyleSpecification } from 'maplibre-gl';
import {
  BASE_MAP_ATTRIBUTION,
  BASE_MAP_MAX_ZOOM,
  SEAMARK_ATTRIBUTION,
  SEAMARK_MAX_ZOOM,
  SEAMARK_MIN_ZOOM,
} from './chartSources';
import { BASE_SOURCE, PROTOCOL_GLYPHS_URL, SEAMARK_SOURCE_ID, protocolTileUrl } from './tileUrls';

/** Source id of the OpenStreetMap base map; overlays add their own sources */
export const BASE_MAP_SOURCE = 'openmaptiles';
/** Source and layer id of the OpenSeaMap seamark overlay */
export const SEAMARK_SOURCE = 'openseamap';
export const SEAMARK_LAYER = 'seamarks';

export interface ChartStyleOptions {
  /** Draw OpenSeaMap buoys, beacons and lights over the base map */
  seamarks?: boolean;
}

/** Chart colours, loosely after the S-52 day palette */
export const CHART_COLORS = {
  land: '#f2e9c9',
  landcover: '#e6dfb8',
  built: '#e3d8b0',
  water: '#c9e4f2',
  waterway: '#a9d0e8',
  coastline: '#6f8fa3',
  road: '#b9ad86',
  majorRoad: '#a39568',
  building: '#d9cc9d',
  label: '#3d3420',
  waterLabel: '#2f5f80',
  halo: '#ffffff',
} as const;

const NAME: ExpressionSpecification = ['coalesce', ['get', 'name:nl'], ['get', 'name']];

/**
 * The base map: OpenStreetMap land, water and places, styled to look like a
 * paper chart so nautical overlays stand out. Built in code (not fetched) so
 * the map keeps rendering its background and overlays without a network.
 */
export function createBaseMapStyle({ seamarks = true }: ChartStyleOptions = {}): StyleSpecification {
  return {
    version: 8,
    name: 'OpenSail chart',
    // Every tile and glyph goes through the opensail:// protocol, which serves
    // downloaded ones from IndexedDB (tileProtocol.ts)
    glyphs: PROTOCOL_GLYPHS_URL,
    sources: {
      [BASE_MAP_SOURCE]: {
        type: 'vector',
        tiles: [protocolTileUrl(BASE_SOURCE)],
        maxzoom: BASE_MAP_MAX_ZOOM,
        attribution: BASE_MAP_ATTRIBUTION,
      },
      [SEAMARK_SOURCE]: {
        type: 'raster',
        tiles: [protocolTileUrl(SEAMARK_SOURCE_ID)],
        tileSize: 256,
        minzoom: SEAMARK_MIN_ZOOM,
        maxzoom: SEAMARK_MAX_ZOOM,
        attribution: SEAMARK_ATTRIBUTION,
      },
    },
    layers: [
      // Land is the background: OpenMapTiles has water polygons for seas and lakes
      { id: 'background', type: 'background', paint: { 'background-color': CHART_COLORS.land } },
      {
        id: 'landcover',
        type: 'fill',
        source: BASE_MAP_SOURCE,
        'source-layer': 'landcover',
        filter: ['in', ['get', 'class'], ['literal', ['wood', 'grass', 'farmland', 'wetland', 'sand']]],
        paint: { 'fill-color': CHART_COLORS.landcover, 'fill-opacity': 0.6 },
      },
      {
        id: 'landuse-built',
        type: 'fill',
        source: BASE_MAP_SOURCE,
        'source-layer': 'landuse',
        filter: ['in', ['get', 'class'], ['literal', ['residential', 'commercial', 'industrial']]],
        paint: { 'fill-color': CHART_COLORS.built, 'fill-opacity': 0.7 },
      },
      {
        id: 'water',
        type: 'fill',
        source: BASE_MAP_SOURCE,
        'source-layer': 'water',
        paint: { 'fill-color': CHART_COLORS.water },
      },
      {
        id: 'water-outline',
        type: 'line',
        source: BASE_MAP_SOURCE,
        'source-layer': 'water',
        // Thin at low zoom, where every ditch is a water polygon
        paint: {
          'line-color': CHART_COLORS.coastline,
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.2, 14, 0.8],
          'line-opacity': ['interpolate', ['linear'], ['zoom'], 10, 0.3, 14, 0.8],
        },
      },
      {
        id: 'waterway',
        type: 'line',
        source: BASE_MAP_SOURCE,
        'source-layer': 'waterway',
        paint: {
          'line-color': CHART_COLORS.waterway,
          'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.5, 14, 3],
        },
      },
      {
        id: 'building',
        type: 'fill',
        source: BASE_MAP_SOURCE,
        'source-layer': 'building',
        minzoom: 14,
        paint: { 'fill-color': CHART_COLORS.building },
      },
      {
        id: 'road-minor',
        type: 'line',
        source: BASE_MAP_SOURCE,
        'source-layer': 'transportation',
        minzoom: 12,
        filter: ['in', ['get', 'class'], ['literal', ['minor', 'service', 'tertiary']]],
        paint: { 'line-color': CHART_COLORS.road, 'line-width': 0.6 },
      },
      {
        id: 'road-major',
        type: 'line',
        source: BASE_MAP_SOURCE,
        'source-layer': 'transportation',
        filter: ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary', 'secondary']]],
        paint: {
          'line-color': CHART_COLORS.majorRoad,
          'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.4, 14, 1.6],
        },
      },
      {
        id: 'water-name',
        type: 'symbol',
        source: BASE_MAP_SOURCE,
        'source-layer': 'water_name',
        layout: {
          'text-field': NAME,
          'text-font': ['Noto Sans Italic'],
          'text-size': 12,
          'symbol-placement': 'point',
        },
        paint: {
          'text-color': CHART_COLORS.waterLabel,
          'text-halo-color': CHART_COLORS.halo,
          'text-halo-width': 1,
        },
      },
      {
        id: 'waterway-name',
        type: 'symbol',
        source: BASE_MAP_SOURCE,
        'source-layer': 'waterway',
        minzoom: 12,
        layout: {
          'text-field': NAME,
          'text-font': ['Noto Sans Italic'],
          'text-size': 11,
          'symbol-placement': 'line',
        },
        paint: {
          'text-color': CHART_COLORS.waterLabel,
          'text-halo-color': CHART_COLORS.halo,
          'text-halo-width': 1,
        },
      },
      {
        id: 'place',
        type: 'symbol',
        source: BASE_MAP_SOURCE,
        'source-layer': 'place',
        filter: ['in', ['get', 'class'], ['literal', ['city', 'town', 'village']]],
        layout: {
          'text-field': NAME,
          'text-font': ['Noto Sans Regular'],
          'text-size': ['match', ['get', 'class'], 'city', 14, 'town', 12, 11],
        },
        paint: {
          'text-color': CHART_COLORS.label,
          'text-halo-color': CHART_COLORS.halo,
          'text-halo-width': 1.2,
        },
      },
      // Seamarks go over the labels: a buoy matters more than a village name
      {
        id: SEAMARK_LAYER,
        type: 'raster',
        source: SEAMARK_SOURCE,
        minzoom: SEAMARK_MIN_ZOOM,
        layout: { visibility: seamarks ? 'visible' : 'none' },
      },
    ],
  };
}
