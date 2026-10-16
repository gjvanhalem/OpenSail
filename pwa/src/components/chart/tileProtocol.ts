import maplibregl from 'maplibre-gl';
import { PMTiles } from 'pmtiles';
import { tileCache } from '@/database/services/TileCache';
import type { ChartTile } from '@/database/db';
import {
  BASE_MAP_TILEJSON_URL,
  GLYPHS_URL,
  SEAMARK_TILES_URL,
} from './chartSources';
import { BASE_SOURCE, GLYPHS_SOURCE, SEAMARK_SOURCE_ID, TILE_PROTOCOL, parseProtocolUrl } from './tileUrls';

/**
 * Every chart tile goes through one MapLibre protocol, `opensail://`:
 *
 *   opensail://<source>/{z}/{x}/{y}      a tile of a source (base, seamarks, enc-<region>)
 *   opensail://glyphs/{fontstack}/{range} a range of label glyphs
 *
 * A tile downloaded for offline use comes from IndexedDB (TileCache). Anything
 * else comes from the network while online. Offline, a missing tile is an empty
 * tile, so the map shows what it has without errors.
 */


/** Fetches one tile of a source from the network; null when the source has no such tile */
export interface TileSource {
  format: ChartTile['format'];
  fetchTile(z: number, x: number, y: number, signal?: AbortSignal): Promise<ArrayBuffer | null>;
}

const sources = new Map<string, TileSource>();

export function registerTileSource(id: string, source: TileSource): void {
  sources.set(id, source);
}

export function getTileSource(id: string): TileSource | undefined {
  return sources.get(id);
}

async function fetchBytes(url: string, signal?: AbortSignal): Promise<ArrayBuffer | null> {
  const response = await fetch(url, { signal });
  if (response.status === 404 || response.status === 204) return null;
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response.arrayBuffer();
}

function fillTemplate(template: string, z: number, x: number, y: number): string {
  return template.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y));
}

// The base map's tile URL changes with every weekly OpenFreeMap build, so it's
// read from the TileJSON once per session
let baseTemplate: Promise<string> | null = null;
function baseTileTemplate(signal?: AbortSignal): Promise<string> {
  if (!baseTemplate) {
    baseTemplate = fetch(BASE_MAP_TILEJSON_URL, { signal })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<{ tiles?: string[] }>;
      })
      .then((tileJson) => {
        const template = tileJson.tiles?.[0];
        if (!template) throw new Error('Base map TileJSON has no tile URL');
        return template;
      })
      .catch((error) => {
        baseTemplate = null;
        throw error;
      });
  }
  return baseTemplate;
}

registerTileSource(BASE_SOURCE, {
  format: 'vector',
  fetchTile: async (z, x, y, signal) => fetchBytes(fillTemplate(await baseTileTemplate(signal), z, x, y), signal),
});

registerTileSource(SEAMARK_SOURCE_ID, {
  format: 'raster',
  fetchTile: (z, x, y, signal) => fetchBytes(fillTemplate(SEAMARK_TILES_URL, z, x, y), signal),
});

const archives = new Map<string, { url: string; archive: PMTiles }>();

/** A PMTiles archive as a tile source; its tiles are read with HTTP range requests */
export function registerPmtilesSource(id: string, archiveUrl: string): void {
  const existing = archives.get(id);
  if (existing?.url === archiveUrl) return;
  const archive = new PMTiles(archiveUrl);
  archives.set(id, { url: archiveUrl, archive });
  registerTileSource(id, {
    format: 'vector',
    fetchTile: async (z, x, y, signal) => {
      const tile = await archive.getZxy(z, x, y, signal);
      return tile?.data ?? null;
    },
  });
}

/** Fetch a glyph range from the network */
export function fetchGlyphs(fontstack: string, range: string, signal?: AbortSignal): Promise<ArrayBuffer | null> {
  const url = GLYPHS_URL.replace('{fontstack}', encodeURIComponent(fontstack)).replace('{range}', range);
  return fetchBytes(url, signal);
}

// A 1×1 transparent PNG, for a raster tile that isn't there
const EMPTY_PNG = Uint8Array.from(
  atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='),
  (c) => c.charCodeAt(0)
).buffer;

function emptyTile(format: ChartTile['format']): ArrayBuffer {
  return format === 'raster' ? EMPTY_PNG.slice(0) : new ArrayBuffer(0);
}

/** What the protocol served, for the status indicator and end-to-end tests */
export interface TileStats {
  fromCache: number;
  fromNetwork: number;
  /** Tiles that were neither downloaded nor reachable */
  missing: number;
}

declare global {
  interface Window {
    __OPENSAIL_TILE_STATS__?: TileStats;
  }
}

const stats: TileStats = { fromCache: 0, fromNetwork: 0, missing: 0 };

export function tileStats(): TileStats {
  return { ...stats };
}

/** Load one tile or glyph range: IndexedDB first, then the network while online */
export async function loadTile(url: string, signal?: AbortSignal): Promise<ArrayBuffer> {
  const parsed = parseProtocolUrl(url);
  if (!parsed) throw new Error(`Not an ${TILE_PROTOCOL}:// URL: ${url}`);
  const { source, parts } = parsed;

  if (source === GLYPHS_SOURCE) {
    const [fontstack, rangeWithExt] = parts;
    const range = rangeWithExt.replace(/\.pbf$/, '');
    const cached = await tileCache.getGlyphs(fontstack, range);
    if (cached) {
      stats.fromCache++;
      return cached.arrayBuffer();
    }
    if (navigator.onLine) {
      try {
        const data = await fetchGlyphs(fontstack, range, signal);
        if (data) {
          stats.fromNetwork++;
          return data;
        }
      } catch (error) {
        if (signal?.aborted) throw error;
      }
    }
    stats.missing++;
    return new ArrayBuffer(0);
  }

  const [z, x, y] = parts.map(Number);
  const tileSource = getTileSource(source);
  const format = tileSource?.format ?? 'vector';

  const cached = await tileCache.getTile(source, z, x, y);
  if (cached) {
    stats.fromCache++;
    return cached.arrayBuffer();
  }
  if (tileSource && navigator.onLine) {
    try {
      const data = await tileSource.fetchTile(z, x, y, signal);
      stats.fromNetwork++;
      return data ?? emptyTile(format);
    } catch (error) {
      if (signal?.aborted) throw error;
    }
  }
  stats.missing++;
  return emptyTile(format);
}

let registered = false;

/** Register the opensail:// protocol with MapLibre. Safe to call more than once. */
export function registerTileProtocol(): void {
  if (registered) return;
  registered = true;
  maplibregl.addProtocol(TILE_PROTOCOL, async (params, abortController) => ({
    data: await loadTile(params.url, abortController.signal),
  }));
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, '__OPENSAIL_TILE_STATS__', { get: tileStats, configurable: true });
  }
}
