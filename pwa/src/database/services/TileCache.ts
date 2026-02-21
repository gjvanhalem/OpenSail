import { db, type ChartTile } from '../db';

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

export interface TileCache {
  getTile(z: number, x: number, y: number): Promise<Blob | null>;
  putTile(z: number, x: number, y: number, data: Blob, format?: 'vector' | 'raster', region?: string): Promise<void>;
  hasTile(z: number, x: number, y: number): Promise<boolean>;
  clearRegion(bounds: Bounds, zoomLevels?: number[]): Promise<number>;
  clearAll(): Promise<void>;
  getStats(): Promise<TileCacheStats>;
  evictOldest(count: number): Promise<number>;
  getStorageSize(): Promise<number>;
}

export class TileCacheService implements TileCache {
  private readonly MAX_CACHE_SIZE_MB = 500; // Maximum cache size in MB
  private readonly MAX_CACHE_SIZE_BYTES = this.MAX_CACHE_SIZE_MB * 1024 * 1024;

  // Generate composite key for tile
  private getTileKey(z: number, x: number, y: number): string {
    return `${z}-${x}-${y}`;
  }

  // Get tile from cache
  async getTile(z: number, x: number, y: number): Promise<Blob | null> {
    const key = this.getTileKey(z, x, y);
    const tile = await db.chartTiles.get(key);
    
    if (tile) {
      // Update timestamp to implement LRU
      await db.chartTiles.update(key, { timestamp: new Date() });
      return tile.data;
    }
    
    return null;
  }

  // Store tile in cache
  async putTile(
    z: number, 
    x: number, 
    y: number, 
    data: Blob, 
    format: 'vector' | 'raster' = 'vector',
    region?: string
  ): Promise<void> {
    const key = this.getTileKey(z, x, y);
    
    const tile: ChartTile = {
      key,
      z,
      x,
      y,
      data,
      format,
      timestamp: new Date(),
      region
    };

    // Check if we need to evict old tiles
    const currentSize = await this.getStorageSize();
    const newTileSize = data.size;

    if (currentSize + newTileSize > this.MAX_CACHE_SIZE_BYTES) {
      // Evict oldest tiles to make room (evict 10% of cache)
      const tilesToEvict = Math.ceil(await db.chartTiles.count() * 0.1);
      await this.evictOldest(tilesToEvict);
    }

    // Add or update tile
    await db.chartTiles.put(tile);
  }

  // Check if tile exists in cache
  async hasTile(z: number, x: number, y: number): Promise<boolean> {
    const key = this.getTileKey(z, x, y);
    const count = await db.chartTiles.where('key').equals(key).count();
    return count > 0;
  }

  // Clear tiles within geographic bounds
  async clearRegion(bounds: Bounds, zoomLevels?: number[]): Promise<number> {
    let tiles: ChartTile[];

    if (zoomLevels && zoomLevels.length > 0) {
      // Get tiles for specific zoom levels
      tiles = await db.chartTiles
        .where('z')
        .anyOf(zoomLevels)
        .toArray();
    } else {
      // Get all tiles
      tiles = await db.chartTiles.toArray();
    }

    // Filter tiles within bounds
    const tilesToDelete = tiles.filter(tile => {
      const tileCoords = this.tileToLatLon(tile.x, tile.y, tile.z);
      return (
        tileCoords.lat >= bounds.south &&
        tileCoords.lat <= bounds.north &&
        tileCoords.lon >= bounds.west &&
        tileCoords.lon <= bounds.east
      );
    });

    // Delete tiles
    const keys = tilesToDelete.map(tile => tile.key);
    await db.chartTiles.bulkDelete(keys);

    return tilesToDelete.length;
  }

  // Clear tiles by region identifier
  async clearRegionByName(regionName: string): Promise<number> {
    const tiles = await db.chartTiles
      .where('region')
      .equals(regionName)
      .toArray();

    await db.chartTiles
      .where('region')
      .equals(regionName)
      .delete();

    return tiles.length;
  }

  // Clear all tiles
  async clearAll(): Promise<void> {
    await db.chartTiles.clear();
  }

  // Get cache statistics
  async getStats(): Promise<TileCacheStats> {
    const tiles = await db.chartTiles.toArray();
    
    if (tiles.length === 0) {
      return {
        totalTiles: 0,
        totalSize: 0,
        oldestTile: null,
        newestTile: null
      };
    }

    const totalSize = tiles.reduce((sum, tile) => sum + tile.data.size, 0);
    const timestamps = tiles.map(tile => tile.timestamp.getTime());
    const oldestTile = new Date(Math.min(...timestamps));
    const newestTile = new Date(Math.max(...timestamps));

    return {
      totalTiles: tiles.length,
      totalSize,
      oldestTile,
      newestTile
    };
  }

  // Evict oldest tiles (LRU eviction)
  async evictOldest(count: number): Promise<number> {
    const oldestTiles = await db.chartTiles
      .orderBy('timestamp')
      .limit(count)
      .toArray();

    const keys = oldestTiles.map(tile => tile.key);
    await db.chartTiles.bulkDelete(keys);

    return oldestTiles.length;
  }

  // Get total storage size in bytes
  async getStorageSize(): Promise<number> {
    const tiles = await db.chartTiles.toArray();
    return tiles.reduce((sum, tile) => sum + tile.data.size, 0);
  }

  // Get tiles for a specific region
  async getTilesByRegion(regionName: string): Promise<ChartTile[]> {
    return await db.chartTiles
      .where('region')
      .equals(regionName)
      .toArray();
  }

  // Get tiles for specific zoom levels
  async getTilesByZoom(zoomLevels: number[]): Promise<ChartTile[]> {
    return await db.chartTiles
      .where('z')
      .anyOf(zoomLevels)
      .toArray();
  }

  // Convert tile coordinates to lat/lon (center of tile)
  private tileToLatLon(x: number, y: number, z: number): { lat: number; lon: number } {
    const n = Math.pow(2, z);
    const lon = (x / n) * 360 - 180;
    const lat = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * (180 / Math.PI);
    return { lat, lon };
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

  // Get all tiles within bounds for specific zoom levels
  async getTilesInBounds(bounds: Bounds, zoomLevels: number[]): Promise<ChartTile[]> {
    const tiles: ChartTile[] = [];

    for (const z of zoomLevels) {
      const topLeft = this.latLonToTile(bounds.north, bounds.west, z);
      const bottomRight = this.latLonToTile(bounds.south, bounds.east, z);

      for (let x = topLeft.x; x <= bottomRight.x; x++) {
        for (let y = topLeft.y; y <= bottomRight.y; y++) {
          const tile = await db.chartTiles.get(this.getTileKey(z, x, y));
          if (tile) {
            tiles.push(tile);
          }
        }
      }
    }

    return tiles;
  }

  // Check storage quota and available space
  async checkStorageQuota(): Promise<{
    usage: number;
    quota: number;
    available: number;
    percentUsed: number;
  }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const available = quota - usage;
      const percentUsed = quota > 0 ? (usage / quota) * 100 : 0;

      return { usage, quota, available, percentUsed };
    }

    // Fallback if storage API not available
    const cacheSize = await this.getStorageSize();
    return {
      usage: cacheSize,
      quota: this.MAX_CACHE_SIZE_BYTES,
      available: this.MAX_CACHE_SIZE_BYTES - cacheSize,
      percentUsed: (cacheSize / this.MAX_CACHE_SIZE_BYTES) * 100
    };
  }
}

export const tileCache = new TileCacheService();
