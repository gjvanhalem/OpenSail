import {
  tileCache,
  tileKey,
  glyphKey,
  tileRange,
  countTiles,
  boundsIntersect,
  type Bounds,
  type TileEntry,
} from '@/database/services/TileCache';
import type { AppDispatch } from '@/store';
import {
  startDownload,
  updateDownloadProgress,
  completeDownload,
  failDownload,
  addCachedRegion,
  type CachedRegion,
} from '@/store/slices/chartCacheSlice';
import { errorHandler } from './ErrorHandler';
import { fetchChartCatalog, regionArchiveUrl, type ChartRegionManifest } from './chartCatalog';
import { BASE_MAP_MAX_ZOOM, SEAMARK_MAX_ZOOM, SEAMARK_MIN_ZOOM } from '@/components/chart/chartSources';
import {
  BASE_SOURCE,
  CHART_FONTS,
  CHART_GLYPH_RANGES,
  GLYPHS_SOURCE,
  SEAMARK_SOURCE_ID,
} from '@/components/chart/tileUrls';
import { encSourceId } from '@/components/chart/encStyle';
import { fetchGlyphs, getTileSource, registerPmtilesSource } from '@/components/chart/tileProtocol';

export interface DownloadOptions {
  regionId: string;
  regionName: string;
  bounds: Bounds;
  /** Map zoom levels to make available offline */
  zoomLevels: number[];
  /** ENC regions to include; defaults to the catalog's regions that overlap the bounds */
  encRegions?: ChartRegionManifest[];
}

/** One tile (or glyph range) to download */
interface DownloadJob {
  key: string;
  source: string;
  z: number;
  x: number;
  y: number;
  /** For glyph jobs */
  fontstack?: string;
  range?: string;
}

/** Downloads bigger than this are refused: pick a smaller area or fewer zoom levels */
export const MAX_TILES_PER_DOWNLOAD = 30000;

/** Average stored size per tile, for estimates before a download */
const AVG_TILE_KB: Record<string, number> = { base: 40, seamarks: 4, enc: 15 };

const PARALLEL_REQUESTS = 6;
const WRITE_BATCH = 50;

/**
 * Downloads everything a chart region needs offline: base map, seamark and ENC
 * tiles for the chosen zoom levels and the label glyphs, into TileCache. The map
 * then reads them through the opensail:// protocol (tileProtocol.ts).
 */
export class ChartDownloadService {
  private activeDownloads = new Map<string, AbortController>();

  /** Zoom levels per tile source for a set of map zoom levels */
  sourceZooms(zoomLevels: number[], encRegions: ChartRegionManifest[] = []): Map<string, number[]> {
    const zooms = new Map<string, number[]>();
    zooms.set(BASE_SOURCE, zoomLevels.filter((z) => z <= BASE_MAP_MAX_ZOOM));
    // 256-pixel raster tiles are drawn from one zoom level above the map's
    const seamarkZooms = Array.from(new Set(zoomLevels.map((z) => z + 1))).filter(
      (z) => z >= SEAMARK_MIN_ZOOM && z <= SEAMARK_MAX_ZOOM
    );
    zooms.set(SEAMARK_SOURCE_ID, seamarkZooms);
    for (const region of encRegions) {
      zooms.set(
        encSourceId(region.id),
        zoomLevels.filter((z) => z >= region.minzoom && z <= region.maxzoom)
      );
    }
    return zooms;
  }

  /** Tiles a download needs, over all sources (glyphs not counted) */
  calculateTileCount(bounds: Bounds, zoomLevels: number[], encRegions: ChartRegionManifest[] = []): number {
    let total = 0;
    for (const [source, zooms] of this.sourceZooms(zoomLevels, encRegions)) {
      const region = encRegions.find((r) => encSourceId(r.id) === source);
      total += countTiles(region ? clipBounds(bounds, region.bounds) : bounds, zooms);
    }
    return total;
  }

  /** Rough size of a download in MB */
  estimateDownloadSize(bounds: Bounds, zoomLevels: number[], encRegions: ChartRegionManifest[] = []): number {
    let kb = 0;
    for (const [source, zooms] of this.sourceZooms(zoomLevels, encRegions)) {
      const region = encRegions.find((r) => encSourceId(r.id) === source);
      const tiles = countTiles(region ? clipBounds(bounds, region.bounds) : bounds, zooms);
      kb += tiles * (region ? AVG_TILE_KB.enc : (AVG_TILE_KB[source] ?? 40));
    }
    return kb / 1024;
  }

  /** ENC regions in the catalog that overlap the bounds */
  async encRegionsFor(bounds: Bounds, signal?: AbortSignal): Promise<ChartRegionManifest[]> {
    const catalog = await fetchChartCatalog(undefined, signal);
    return catalog.filter((region) => boundsIntersect(bounds, manifestBounds(region)));
  }

  async downloadRegion(options: DownloadOptions, dispatch: AppDispatch): Promise<void> {
    const { regionId, regionName, bounds, zoomLevels } = options;

    if (this.activeDownloads.has(regionId)) {
      throw new Error('Download already in progress for this region');
    }
    const abortController = new AbortController();
    const { signal } = abortController;
    this.activeDownloads.set(regionId, abortController);

    try {
      const encRegions = options.encRegions ?? (await this.encRegionsFor(bounds, signal));
      for (const region of encRegions) registerPmtilesSource(encSourceId(region.id), regionArchiveUrl(region));

      const jobs = this.planJobs(bounds, zoomLevels, encRegions);
      if (jobs.length > MAX_TILES_PER_DOWNLOAD) {
        throw new Error(
          `This download needs ${jobs.length} tiles; the limit is ${MAX_TILES_PER_DOWNLOAD}. ` +
            'Choose a smaller area or fewer zoom levels.'
        );
      }

      const estimatedBytes = this.estimateDownloadSize(bounds, zoomLevels, encRegions) * 1024 * 1024;
      const quota = await tileCache.checkStorageQuota();
      if (quota.available < estimatedBytes) {
        throw new Error(
          `Insufficient storage space. Need ${(estimatedBytes / 1024 / 1024).toFixed(0)}MB, ` +
            `but only ${(quota.available / 1024 / 1024).toFixed(0)}MB available.`
        );
      }
      // Downloaded charts must survive storage pressure; the browser may say no
      await tileCache.requestPersistentStorage();

      dispatch(
        startDownload({
          regionId,
          regionName,
          totalTiles: jobs.length,
          downloadedTiles: 0,
          failedTiles: 0,
          isActive: true,
          isPaused: false,
        })
      );

      const { done, failed } = await this.runJobs(jobs, regionId, signal, (downloaded, failures) =>
        dispatch(updateDownloadProgress({ regionId, downloadedTiles: downloaded, failedTiles: failures }))
      );
      dispatch(updateDownloadProgress({ regionId, downloadedTiles: done, failedTiles: failed }));

      if (done === 0) throw new Error('No tiles could be downloaded. Check the connection and try again.');

      const usage = await tileCache.regionUsage(regionId);
      const editionDate =
        encRegions
          .map((region) => region.editionDate)
          .filter((date): date is string => !!date)
          .sort()
          .pop() ?? null;
      const downloadedAt = new Date();

      await tileCache.saveRegion({
        id: regionId,
        name: regionName,
        bounds,
        zoomLevels,
        sources: Array.from(this.sourceZooms(zoomLevels, encRegions).keys()),
        encRegions,
        tileCount: usage.tileCount,
        sizeBytes: usage.sizeBytes,
        downloadedAt,
        editionDate,
      });

      const cachedRegion: CachedRegion = {
        id: regionId,
        name: regionName,
        bounds,
        zoomLevels,
        tileCount: usage.tileCount,
        sizeBytes: usage.sizeBytes,
        createdAt: downloadedAt,
        editionDate,
        encRegionIds: encRegions.map((region) => region.id),
        failedTiles: failed,
      };
      dispatch(addCachedRegion(cachedRegion));
      dispatch(completeDownload(regionId));
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Cancelled: keep nothing half-done
        await tileCache.deleteRegion(regionId).catch(() => undefined);
        dispatch(completeDownload(regionId));
      } else {
        const message = error instanceof Error ? error.message : 'Unknown error';
        dispatch(failDownload({ regionId, error: message }));
        if (error instanceof Error) {
          errorHandler.handle(error, 'ChartDownloadService.downloadRegion', 'error');
        }
      }
    } finally {
      this.activeDownloads.delete(regionId);
    }
  }

  cancelDownload(regionId: string): void {
    const controller = this.activeDownloads.get(regionId);
    if (controller) {
      controller.abort();
      this.activeDownloads.delete(regionId);
    }
  }

  /** Every tile and glyph range a region needs */
  private planJobs(bounds: Bounds, zoomLevels: number[], encRegions: ChartRegionManifest[]): DownloadJob[] {
    const jobs: DownloadJob[] = [];
    for (const [source, zooms] of this.sourceZooms(zoomLevels, encRegions)) {
      const region = encRegions.find((r) => encSourceId(r.id) === source);
      const area = region ? clipBounds(bounds, region.bounds) : bounds;
      for (const z of zooms) {
        const { minX, maxX, minY, maxY } = tileRange(area, z);
        for (let x = minX; x <= maxX; x++) {
          for (let y = minY; y <= maxY; y++) {
            jobs.push({ key: tileKey(source, z, x, y), source, z, x, y });
          }
        }
      }
    }
    for (const fontstack of CHART_FONTS) {
      for (const range of CHART_GLYPH_RANGES) {
        jobs.push({ key: glyphKey(fontstack, range), source: GLYPHS_SOURCE, z: -1, x: -1, y: -1, fontstack, range });
      }
    }
    return jobs;
  }

  /** Download jobs a few at a time; tiles already stored are only added to the region */
  private async runJobs(
    jobs: DownloadJob[],
    regionId: string,
    signal: AbortSignal,
    onProgress: (done: number, failed: number) => void
  ): Promise<{ done: number; failed: number }> {
    let done = 0;
    let failed = 0;
    let pending: TileEntry[] = [];
    let lastReport = 0;

    const flush = async () => {
      const batch = pending;
      pending = [];
      try {
        await tileCache.putTiles(batch, regionId);
      } catch (error) {
        if (error instanceof Error && error.name === 'QuotaExceededError') {
          errorHandler.handleStorageError(error, 'ChartDownloadService.downloadRegion');
          throw new Error('Storage quota exceeded. Please free up space and try again.');
        }
        throw error;
      }
    };
    const report = () => {
      if (done + failed - lastReport >= 10 || done + failed === jobs.length) {
        lastReport = done + failed;
        onProgress(done, failed);
      }
    };

    for (let start = 0; start < jobs.length; start += 200) {
      if (signal.aborted) throw abortError();
      const chunk = jobs.slice(start, start + 200);
      const existing = await tileCache.existingKeys(chunk.map((job) => job.key));
      await tileCache.addRegionToTiles(Array.from(existing), regionId);
      done += existing.size;
      const todo = chunk.filter((job) => !existing.has(job.key));

      let next = 0;
      const worker = async () => {
        while (next < todo.length) {
          if (signal.aborted) throw abortError();
          const job = todo[next++];
          try {
            const data = await this.fetchJob(job, signal);
            if (data) {
              pending.push({
                key: job.key,
                source: job.source,
                z: job.z,
                x: job.x,
                y: job.y,
                data: new Blob([data]),
                format: job.source === GLYPHS_SOURCE ? 'glyphs' : (getTileSource(job.source)?.format ?? 'vector'),
              });
              if (pending.length >= WRITE_BATCH) await flush();
            }
            // No data: the source has no tile there (open sea in an ENC), which is fine offline too
            done++;
          } catch (error) {
            if (signal.aborted) throw abortError();
            console.error(`Failed to download ${job.key}:`, error);
            failed++;
          }
          report();
        }
      };
      await Promise.all(Array.from({ length: Math.min(PARALLEL_REQUESTS, todo.length) }, worker));
      report();
    }
    if (pending.length) await flush();
    return { done, failed };
  }

  private async fetchJob(job: DownloadJob, signal: AbortSignal): Promise<ArrayBuffer | null> {
    if (job.source === GLYPHS_SOURCE) return fetchGlyphs(job.fontstack!, job.range!, signal);
    const source = getTileSource(job.source);
    if (!source) throw new Error(`Unknown tile source ${job.source}`);
    return source.fetchTile(job.z, job.x, job.y, signal);
  }
}

function abortError(): Error {
  const error = new Error('Download cancelled');
  error.name = 'AbortError';
  return error;
}

function manifestBounds(region: ChartRegionManifest): Bounds {
  const [west, south, east, north] = region.bounds;
  return { west, south, east, north };
}

/** The part of `bounds` inside a region's [west, south, east, north] */
function clipBounds(bounds: Bounds, regionBounds: [number, number, number, number]): Bounds {
  const [west, south, east, north] = regionBounds;
  return {
    west: Math.max(bounds.west, west),
    south: Math.max(bounds.south, south),
    east: Math.min(bounds.east, east),
    north: Math.min(bounds.north, north),
  };
}

export const chartDownloadService = new ChartDownloadService();
