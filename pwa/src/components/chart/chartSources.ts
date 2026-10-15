/**
 * Where the chart's data comes from. All sources are free and need no token
 * (see docs/chart-source-decision.md).
 */

/** OpenFreeMap: OpenStreetMap vector tiles in the OpenMapTiles schema */
export const OPENFREEMAP_ORIGIN = 'https://tiles.openfreemap.org';

/** TileJSON for the OpenFreeMap planet tiles; its tile URL changes with each weekly build */
export const BASE_MAP_TILEJSON_URL = `${OPENFREEMAP_ORIGIN}/planet`;

/** Signed distance fonts for labels */
export const GLYPHS_URL = `${OPENFREEMAP_ORIGIN}/fonts/{fontstack}/{range}.pbf`;

export const BASE_MAP_ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> ' +
  '<a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">&copy; OpenMapTiles</a> ' +
  'Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';

/** The highest zoom the base map tiles exist for; MapLibre overzooms beyond it */
export const BASE_MAP_MAX_ZOOM = 14;

/** OpenSeaMap seamarks (buoys, beacons, lights) as transparent raster tiles, CC BY-SA 2.0 */
export const SEAMARK_ORIGIN = 'https://tiles.openseamap.org';
export const SEAMARK_TILES_URL = `${SEAMARK_ORIGIN}/seamark/{z}/{x}/{y}.png`;
export const SEAMARK_ATTRIBUTION =
  'Seamarks <a href="https://www.openseamap.org" target="_blank" rel="noopener">&copy; OpenSeaMap</a> contributors';
/** Seamarks are too dense to read below this zoom, and OpenSeaMap draws few there */
export const SEAMARK_MIN_ZOOM = 9;
export const SEAMARK_MAX_ZOOM = 18;
