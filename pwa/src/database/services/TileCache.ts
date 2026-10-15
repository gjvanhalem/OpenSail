import { db, type ChartTile, type ChartRegionRecord } from '../db';

export interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface TileCacheStats {
  totalTiles: number;
  totalSize: number;
  oldestTile: Date | null;
  newestTile: Date | null;
}

export interface StorageQuota {
  usage: number;
  quota: number;
  available: number;
  percentUsed: number;
}

/** A tile (or glyph range) to store */
export interface TileEntry {
  source: string;
  z: number;
  x: number;
  y: number;
  data: Blob;
  format: ChartTile['format'];
  /** Set for glyphs, which aren't addressed by z/x/y */
  key?: string;
}

/** Key of a tile in the cache */
export function tileKey(source: string, z: number, x: number, y: number): string {
  return `${source}/${z}/${x}/${y}`;
}

/** Key of a glyph range (label font) in the cache */
export function glyphKey(fontstack: string, range: string): string {
  return `glyphs/${fontstack}/${range}`;
}

/** Tile column and row that contain a position at a zoom level */
export function lonLatToTile(lon: number, lat: number, z: number): { x: number; y: number } {
  const n = 2 ** z;
  const clampedLat = Math.max(-85.0511, Math.min(85.0511, lat));
  const x = Math.floor(((lon + 180) / 360) * n);
  const rad = (clampedLat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n);
  return { x: Math.min(n - 1, Math.max(0, x)), y: Math.min(n - 1, Math.max(0, y)) };
}

/** The range of tiles covering bounds at a zoom level (inclusive) */
export function tileRange(bounds: Bounds, z: number): { minX: number; maxX: number; minY: number; maxY: number } {
  const topLeft = lonLatToTile(bounds.west, bounds.north, z);
  const bottomRight = lonLatToTile(bounds.east, bounds.south, z);
  return { minX: topLeft.x, maxX: bottomRight.x, minY: topLeft.y, maxY: bottomRight.y };
}

/** Number of tiles covering bounds at each zoom level */
export function countTiles(bounds: Bounds, zoomLevels: number[]): number {
  return zoomLevels.reduce((total, z) => {
    const { minX, maxX, minY, maxY } = tileRange(bounds, z);
    return total + (maxX - minX + 1) * (maxY - minY + 1);
  }, 0);
}

export function boundsIntersect(a: Bounds, b: Bounds): boolean {
  return a.west <= b.east && a.east >= b.west && a.south <= b.north && a.north >= b.south;
}

/**
 * Downloaded chart tiles in IndexedDB, for offline use. A tile can belong to
 * several downloaded regions that overlap; it is deleted with the last of them.
 * Downloaded tiles are never evicted: the user decides what to keep (R15).
 */
export class TileCacheService {
  async getTile(source: string, z: number, x: number, y: number): Promise<Blob | null> {
    return (await db.chartTiles.get(tileKey(source, z, x, y)))?.data ?? null;
  }

  async getGlyphs(fontstack: string, range: string): Promise<Blob | null> {
    return (await db.chartTiles.get(glyphKey(fontstack, range)))?.data ?? null;
  }

  async hasTile(source: string, z: number, x: number, y: number): Promise<boolean> {
    return (await db.chartTiles.where('key').equals(tileKey(source, z, x, y)).count()) > 0;
  }

  /** Keys among `keys` that are already stored */
  async existingKeys(keys: string[]): Promise<Set<string>> {
    const found = await db.chartTiles.where('key').anyOf(keys).primaryKeys();
    return new Set(found);
  }

  /**
   * Store tiles for a region in one transaction. A tile that is already stored
   * (for another region) keeps its data and gets this region added.
   */
  async putTiles(entries: TileEntry[], regionId: string): Promise<void> {
    if (entries.length === 0) return;
    const keyed = entries.map((entry) => ({
      ...entry,
      key: entry.key ?? tileKey(entry.source, entry.z, entry.x, entry.y),
    }));
    await db.transaction('rw', db.chartTiles, async () => {
      const existing = await db.chartTiles.bulkGet(keyed.map((entry) => entry.key));
      const now = new Date();
      const rows: ChartTile[] = keyed.map((entry, i) => {
        const old = existing[i];
        const regions = old ? Array.from(new Set([...old.regions, regionId])) : [regionId];
        return {
          key: entry.key,
          source: entry.source,
          z: entry.z,
          x: entry.x,
          y: entry.y,
          data: entry.data,
          format: entry.format,
          timestamp: now,
          regions,
        };
      });
      await db.chartTiles.bulkPut(rows);
    });
  }

  /** Add a region to tiles that are already stored, without downloading them again */
  async addRegionToTiles(keys: string[], regionId: string): Promise<void> {
    if (keys.length === 0) return;
    await db.chartTiles
      .where('key')
      .anyOf(keys)
      .modify((tile) => {
        if (!tile.regions.includes(regionId)) tile.regions.push(regionId);
      });
  }

  /** Bytes and number of tiles held by a region (shared tiles count for each region) */
  async regionUsage(regionId: string): Promise<{ tileCount: number; sizeBytes: number }> {
    let tileCount = 0;
    let sizeBytes = 0;
    await db.chartTiles
      .where('regions')
      .equals(regionId)
      .each((tile) => {
        tileCount++;
        sizeBytes += tile.data.size;
      });
    return { tileCount, sizeBytes };
  }

  /** Remove a region: tiles only it holds are deleted, shared tiles stay. Returns tiles deleted. */
  async deleteRegion(regionId: string): Promise<number> {
    let deleted = 0;
    await db.transaction('rw', db.chartTiles, db.chartRegions, async () => {
      const onlyThisRegion: string[] = [];
      await db.chartTiles
        .where('regions')
        .equals(regionId)
        .modify((tile) => {
          tile.regions = tile.regions.filter((region) => region !== regionId);
          if (tile.regions.length === 0) onlyThisRegion.push(tile.key);
        });
      await db.chartTiles.bulkDelete(onlyThisRegion);
      await db.chartRegions.delete(regionId);
      deleted = onlyThisRegion.length;
    });
    return deleted;
  }

  async clearAll(): Promise<void> {
    await db.transaction('rw', db.chartTiles, db.chartRegions, async () => {
      await db.chartTiles.clear();
      await db.chartRegions.clear();
    });
  }

  async getStats(): Promise<TileCacheStats> {
    let totalTiles = 0;
    let totalSize = 0;
    let oldest = Infinity;
    let newest = -Infinity;
    await db.chartTiles.each((tile) => {
      totalTiles++;
      totalSize += tile.data.size;
      const time = tile.timestamp.getTime();
      oldest = Math.min(oldest, time);
      newest = Math.max(newest, time);
    });
    return {
      totalTiles,
      totalSize,
      oldestTile: totalTiles ? new Date(oldest) : null,
      newestTile: totalTiles ? new Date(newest) : null,
    };
  }

  async getStorageSize(): Promise<number> {
    return (await this.getStats()).totalSize;
  }

  // Downloaded regions

  async saveRegion(region: ChartRegionRecord): Promise<void> {
    await db.chartRegions.put(region);
  }

  async getRegions(): Promise<ChartRegionRecord[]> {
    return db.chartRegions.orderBy('downloadedAt').toArray();
  }

  async getRegion(regionId: string): Promise<ChartRegionRecord | undefined> {
    return db.chartRegions.get(regionId);
  }

  /** How much the browser lets this origin store, and how much is used */
  async checkStorageQuota(): Promise<StorageQuota> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      return {
        usage,
        quota,
        available: Math.max(0, quota - usage),
        percentUsed: quota > 0 ? (usage / quota) * 100 : 0,
      };
    }
    const usage = await this.getStorageSize();
    return { usage, quota: 0, available: Infinity, percentUsed: 0 };
  }

  /** Whether the browser has granted persistent storage */
  async isPersistentStorage(): Promise<boolean | null> {
    if ('storage' in navigator && 'persisted' in navigator.storage) {
      try {
        return await navigator.storage.persisted();
      } catch {
        return null;
      }
    }
    return null;
  }

  /** Ask the browser not to evict our storage under pressure; true when granted */
  async requestPersistentStorage(): Promise<boolean> {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      try {
        return (await navigator.storage.persisted()) || (await navigator.storage.persist());
      } catch {
        return false;
      }
    }
    return false;
  }
}

export const tileCache = new TileCacheService();
