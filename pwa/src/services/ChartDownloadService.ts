import { tileCache, type Bounds } from '@/database/services/TileCache';
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
import { BASE_MAP_TILEJSON_URL } from '@/components/chart/chartSources';

export interface DownloadOptions {
  regionId: string;
  regionName: string;
  bounds: Bounds;
  zoomLevels: number[];
  tileSource?: string;
}

export class ChartDownloadService {
  private activeDownloads = new Map<string, AbortController>();
  private tileUrlTemplate: Promise<string> | null = null;

  /** The base map's tile URL template, read from its TileJSON (it changes with each build) */
  private getTileUrlTemplate(signal: AbortSignal): Promise<string> {
    if (!this.tileUrlTemplate) {
      this.tileUrlTemplate = fetch(BASE_MAP_TILEJSON_URL, { signal })
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
          this.tileUrlTemplate = null;
          throw error;
        });
    }
    return this.tileUrlTemplate;
  }

  // Calculate total number of tiles for a region
  calculateTileCount(bounds: Bounds, zoomLevels: number[]): number {
    let total = 0;
    for (const z of zoomLevels) {
      const topLeft = this.latLonToTile(bounds.north, bounds.west, z);
      const bottomRight = this.latLonToTile(bounds.south, bounds.east, z);
      const width = bottomRight.x - topLeft.x + 1;
      const height = bottomRight.y - topLeft.y + 1;
      total += width * height;
    }
    return total;
  }

  // Start downloading tiles for a region
  async downloadRegion(
    options: DownloadOptions,
    dispatch: AppDispatch
  ): Promise<void> {
    const { regionId, regionName, bounds, zoomLevels } = options;

    // Check if already downloading
    if (this.activeDownloads.has(regionId)) {
      throw new Error('Download already in progress for this region');
    }

    // Check storage quota before starting
    const quota = await tileCache.checkStorageQuota();
    const estimatedSize = this.estimateDownloadSize(bounds, zoomLevels) * 1024 * 1024; // Convert to bytes
    
    if (quota.available < estimatedSize) {
      throw new Error(
        `Insufficient storage space. Need ${(estimatedSize / 1024 / 1024).toFixed(0)}MB, ` +
        `but only ${(quota.available / 1024 / 1024).toFixed(0)}MB available.`
      );
    }

    const totalTiles = this.calculateTileCount(bounds, zoomLevels);
    const abortController = new AbortController();
    this.activeDownloads.set(regionId, abortController);

    // Initialize download progress
    dispatch(startDownload({
      regionId,
      regionName,
      totalTiles,
      downloadedTiles: 0,
      failedTiles: 0,
      isActive: true,
      isPaused: false,
    }));

    let downloadedTiles = 0;
    let failedTiles = 0;

    try {
      // Download tiles for each zoom level
      for (const z of zoomLevels) {
        if (abortController.signal.aborted) {
          break;
        }

        const topLeft = this.latLonToTile(bounds.north, bounds.west, z);
        const bottomRight = this.latLonToTile(bounds.south, bounds.east, z);

        for (let x = topLeft.x; x <= bottomRight.x; x++) {
          for (let y = topLeft.y; y <= bottomRight.y; y++) {
            if (abortController.signal.aborted) {
              break;
            }

            try {
              // Check if tile already exists
              const exists = await tileCache.hasTile(z, x, y);
              if (!exists) {
                const tileData = await this.downloadTile(z, x, y, abortController.signal);
                if (tileData) {
                  try {
                    await tileCache.putTile(z, x, y, tileData, 'vector', regionId);
                  } catch (error) {
                    // Handle quota exceeded error
                    if (error instanceof Error && error.name === 'QuotaExceededError') {
                      errorHandler.handleStorageError(error, 'ChartDownloadService.downloadRegion');
                      throw new Error('Storage quota exceeded. Please free up space and try again.');
                    }
                    throw error;
                  }
                }
              }
              downloadedTiles++;
            } catch (error) {
              if (error instanceof Error && error.name === 'AbortError') {
                throw error;
              }
              if (error instanceof Error && error.message.includes('quota')) {
                throw error;
              }
              console.error(`Failed to download tile ${z}/${x}/${y}:`, error);
              failedTiles++;
            }

            // Update progress every 10 tiles
            if (downloadedTiles % 10 === 0) {
              dispatch(updateDownloadProgress({
                regionId,
                downloadedTiles,
                failedTiles,
              }));
            }
          }
        }
      }

      // Final progress update
      dispatch(updateDownloadProgress({
        regionId,
        downloadedTiles,
        failedTiles,
      }));

      // Calculate total size
      const tiles = await tileCache.getTilesByRegion(regionId);
      const totalSize = tiles.reduce((sum, tile) => sum + tile.data.size, 0);

      // Add to cached regions
      const cachedRegion: CachedRegion = {
        id: regionId,
        name: regionName,
        bounds,
        zoomLevels,
        tileCount: downloadedTiles - failedTiles,
        sizeBytes: totalSize,
        createdAt: new Date(),
      };
      dispatch(addCachedRegion(cachedRegion));

      // Complete download
      dispatch(completeDownload(regionId));
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Download cancelled');
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        dispatch(failDownload({ regionId, error: errorMessage }));
        
        if (error instanceof Error) {
          errorHandler.handle(error, 'ChartDownloadService.downloadRegion', 'error');
        }
      }
    } finally {
      this.activeDownloads.delete(regionId);
    }
  }

  // Cancel an active download
  cancelDownload(regionId: string): void {
    const controller = this.activeDownloads.get(regionId);
    if (controller) {
      controller.abort();
      this.activeDownloads.delete(regionId);
    }
  }

  // Download a single tile
  private async downloadTile(
    z: number,
    x: number,
    y: number,
    signal: AbortSignal
  ): Promise<Blob | null> {
    try {
      const url = (await this.getTileUrlTemplate(signal))
        .replace('{z}', String(z))
        .replace('{x}', String(x))
        .replace('{y}', String(y));
      const response = await fetch(url, { signal });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.blob();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }
      console.error(`Failed to fetch tile ${z}/${x}/${y}:`, error);
      return null;
    }
  }

  // Convert lat/lon to tile coordinates
  private latLonToTile(lat: number, lon: number, z: number): { x: number; y: number } {
    const n = Math.pow(2, z);
    const x = Math.floor(((lon + 180) / 360) * n);
    const y = Math.floor(
      ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * n
    );
    return { x, y };
  }

  // Estimate download size in MB
  estimateDownloadSize(bounds: Bounds, zoomLevels: number[]): number {
    const tileCount = this.calculateTileCount(bounds, zoomLevels);
    // Average vector tile size is ~50KB
    const avgTileSizeKB = 50;
    return (tileCount * avgTileSizeKB) / 1024; // Convert to MB
  }
}

export const chartDownloadService = new ChartDownloadService();
