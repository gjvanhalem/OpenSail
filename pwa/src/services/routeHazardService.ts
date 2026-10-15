import { VectorTile } from '@mapbox/vector-tile';
import Pbf from 'pbf';
import type { Route, RouteWarning } from '@/models';
import { tileCache, lonLatToTile, boundsIntersect, type Bounds } from '@/database/services/TileCache';
import { fetchChartCatalog, regionArchiveUrl, type ChartRegionManifest } from './chartCatalog';
import { checkLeg, sampleLeg, type ChartFeature, type HazardCheckOptions } from '@/utils/routeHazards';
import { encSourceId } from '@/components/chart/encStyle';
import { loadTile, registerPmtilesSource } from '@/components/chart/tileProtocol';
import { protocolTileUrl } from '@/components/chart/tileUrls';

/** Tile layers the hazard check reads */
const LAYERS = ['m_covr', 'depare', 'drgare', 'obstrn', 'wrecks', 'uwtroc', 'hulkes', 'pilpnt', 'resare', 'ctnare'];

/** Zoom level the check reads tiles at (or the region's most detailed, if lower) */
const CHECK_ZOOM = 14;

/** Tiles at most this many zoom levels lower are tried when one isn't available offline */
const FALLBACK_LEVELS = [0, 2, 4];

/** The ENC regions to check against: the catalog plus the ENC data in downloaded regions */
export async function availableChartRegions(signal?: AbortSignal): Promise<ChartRegionManifest[]> {
  const [catalog, downloaded] = await Promise.all([
    fetchChartCatalog(undefined, signal),
    tileCache
      .getRegions()
      .then((regions) => regions.flatMap((region) => region.encRegions as ChartRegionManifest[]))
      .catch(() => []),
  ]);
  const byId = new Map<string, ChartRegionManifest>();
  for (const region of [...catalog, ...downloaded]) if (!byId.has(region.id)) byId.set(region.id, region);
  return Array.from(byId.values());
}

function regionBounds(region: ChartRegionManifest): Bounds {
  const [west, south, east, north] = region.bounds;
  return { west, south, east, north };
}

type TileFeatures = ChartFeature[];

/**
 * Read the hazard-relevant features of one ENC tile, through the same protocol
 * the chart uses (IndexedDB first, so downloaded regions work offline)
 */
async function readTile(
  region: ChartRegionManifest,
  z: number,
  x: number,
  y: number,
  signal?: AbortSignal
): Promise<TileFeatures | null> {
  const source = encSourceId(region.id);
  const url = protocolTileUrl(source).replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y));
  const data = await loadTile(url, signal);
  if (data.byteLength === 0) return null;
  const tile = new VectorTile(new Pbf(new Uint8Array(data)));
  const features: TileFeatures = [];
  for (const layerName of LAYERS) {
    const layer = tile.layers[layerName];
    if (!layer) continue;
    for (let i = 0; i < layer.length; i++) {
      const geojson = layer.feature(i).toGeoJSON(x, y, z);
      features.push({
        layer: layerName,
        geometry: geojson.geometry,
        properties: (geojson.properties ?? {}) as Record<string, unknown>,
        region: region.id,
        official: region.official,
      });
    }
  }
  return features;
}

export interface RouteHazardOptions extends HazardCheckOptions {
  /** ENC regions to check against; defaults to availableChartRegions() */
  regions?: ChartRegionManifest[];
  signal?: AbortSignal;
}

/**
 * Check every leg of a route against the ENC depth data (R2.5): shallow water,
 * hazards near the track, restricted areas, and stretches without chart data.
 * Warnings from data that isn't an official chart are marked advisory.
 */
export async function checkRouteHazards(route: Route, options: RouteHazardOptions): Promise<RouteWarning[]> {
  const { signal } = options;
  const regions = options.regions ?? (await availableChartRegions(signal));
  for (const region of regions) registerPmtilesSource(encSourceId(region.id), regionArchiveUrl(region));

  const tiles = new Map<string, Promise<TileFeatures>>();
  const tileFeatures = (region: ChartRegionManifest, lon: number, lat: number): Promise<TileFeatures> => {
    const z = Math.min(CHECK_ZOOM, region.maxzoom);
    const { x, y } = lonLatToTile(lon, lat, z);
    const key = `${region.id}/${z}/${x}/${y}`;
    let features = tiles.get(key);
    if (!features) {
      features = (async () => {
        // Offline, a region may only be downloaded up to a lower zoom level
        for (const drop of FALLBACK_LEVELS) {
          const fz = z - drop;
          if (fz < region.minzoom) break;
          const scale = 2 ** drop;
          const found = await readTile(region, fz, Math.floor(x / scale), Math.floor(y / scale), signal);
          if (found) return found;
        }
        return [];
      })();
      tiles.set(key, features);
    }
    return features;
  };

  const warnings: RouteWarning[] = [];
  const spacing = options.sampleSpacingMeters ?? 25;
  for (let i = 0; i < route.waypoints.length - 1; i++) {
    if (signal?.aborted) throw new DOMException('Route check cancelled', 'AbortError');
    const a = route.waypoints[i].position;
    const b = route.waypoints[i + 1].position;
    const from: [number, number] = [a.longitude, a.latitude];
    const to: [number, number] = [b.longitude, b.latitude];
    const legBounds: Bounds = {
      west: Math.min(from[0], to[0]),
      east: Math.max(from[0], to[0]),
      south: Math.min(from[1], to[1]),
      north: Math.max(from[1], to[1]),
    };

    // Tiles under the leg, for every region it touches; a tile holds the
    // features near its edges too (tippecanoe buffer), so the corridor is covered
    const legRegions = regions.filter((region) => boundsIntersect(legBounds, regionBounds(region)));
    const samples = sampleLeg(from, to, Math.max(spacing, 200));
    const featureSets = await Promise.all(
      legRegions.flatMap((region) => samples.map(([lon, lat]) => tileFeatures(region, lon, lat)))
    );
    const features = Array.from(new Set(featureSets)).flat();
    warnings.push(...checkLeg(from, to, i, features, options));
  }
  return warnings;
}
