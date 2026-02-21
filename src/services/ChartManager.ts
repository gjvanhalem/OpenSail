import { ChartManager, ChartTile, ChartCoverage, ChartUpdate, GeoBounds } from '../types';
import { getDatabase } from '../database';

interface ChartCacheEntry {
  tile_key: string;
  x: number;
  y: number;
  z: number;
  format: string;
  cached_at: number;
  size: number;
  data?: string;
}

interface LRUNode {
  key: string;
  tile: ChartTile;
  prev: LRUNode | null;
  next: LRUNode | null;
}

class LRUCache {
  private capacity: number;
  private cache = new Map<string, LRUNode>();
  private head: LRUNode | null = null;
  private tail: LRUNode | null = null;
  private currentSize = 0;

  constructor(capacity: number) {
    this.capacity = capacity;
  }

  get(key: string): ChartTile | null {
    const node = this.cache.get(key);
    if (!node) return null;

    this.moveToHead(node);
    return node.tile;
  }

  put(key: string, tile: ChartTile): void {
    const existingNode = this.cache.get(key);

    if (existingNode) {
      existingNode.tile = tile;
      this.moveToHead(existingNode);
      return;
    }

    const newNode: LRUNode = {
      key,
      tile,
      prev: null,
      next: null
    };

    this.cache.set(key, newNode);
    this.addToHead(newNode);
    this.currentSize += tile.data.length;

    while (this.currentSize > this.capacity && this.tail) {
      const removed = this.removeTail();
      if (removed) {
        this.cache.delete(removed.key);
        this.currentSize -= removed.tile.data.length;
      }
    }
  }

  private addToHead(node: LRUNode): void {
    node.next = this.head;
    node.prev = null;

    if (this.head) {
      this.head.prev = node;
    }

    this.head = node;

    if (!this.tail) {
      this.tail = node;
    }
  }

  private removeNode(node: LRUNode): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
  }

  private moveToHead(node: LRUNode): void {
    this.removeNode(node);
    this.addToHead(node);
  }

  private removeTail(): LRUNode | null {
    if (!this.tail) return null;

    const removed = this.tail;
    this.removeNode(removed);
    return removed;
  }

  clear(): void {
    this.cache.clear();
    this.head = null;
    this.tail = null;
    this.currentSize = 0;
  }

  getSize(): number {
    return this.currentSize;
  }
}

export class ChartManagerImpl implements ChartManager {
  private maxCacheSize = 50 * 1024 * 1024 * 1024; // 50GB
  private memoryCache: LRUCache;
  private tileProvider: string;
  private accessToken?: string;
  private coverageData: ChartCoverage[] = [];
  private availableUpdates: ChartUpdate[] = [];

  constructor(config?: { tileProvider?: string; accessToken?: string; maxCacheSize?: number }) {
    this.tileProvider = config?.tileProvider || 'https://tile.openstreetmap.org';
    this.accessToken = config?.accessToken;
    if (config?.maxCacheSize) {
      this.maxCacheSize = config.maxCacheSize;
    }
    // Memory cache limited to 100MB for in-memory tiles
    this.memoryCache = new LRUCache(100 * 1024 * 1024);
    this.initializeCoverage();
  }

  private initializeCoverage(): void {
    // Initialize with default coverage areas
    this.coverageData = [
      {
        id: 'world-base',
        name: 'World Base Map',
        bounds: {
          north: 85,
          south: -85,
          east: 180,
          west: -180
        },
        edition: '2024.1',
        issueDate: new Date('2024-01-01'),
        scale: 1000000,
        format: 'raster'
      },
      {
        id: 'nl-coast',
        name: 'Netherlands Coast',
        bounds: {
          north: 55.5,
          south: 51.5,
          east: 7.5,
          west: 3.0
        },
        edition: '2024.1',
        issueDate: new Date('2024-01-15'),
        scale: 50000,
        format: 'enc'
      }
    ];
  }

  async loadChart(region: GeoBounds, zoomLevels: number[]): Promise<void> {
    const tiles = this.getTilesForRegion(region, zoomLevels);
    
    for (const { x, y, z } of tiles) {
      const tile = await this.getChartTile(x, y, z);
      if (!tile) {
        // Tile not in cache, fetch it
        const data = await this.fetchTile(x, y, z);
        if (data) {
          await this.cacheTile({
            x,
            y,
            z,
            data,
            format: 'vector',
            cached: true
          });
        }
      }
    }
  }

  async getChartTile(x: number, y: number, z: number): Promise<ChartTile | null> {
    const key = `${z}/${x}/${y}`;

    // Check memory cache first
    const memCached = this.memoryCache.get(key);
    if (memCached) {
      return { ...memCached, cached: true };
    }

    // Check database cache
    const db = await getDatabase();
    const cached = await db.get<ChartCacheEntry>(
      `SELECT * FROM chart_cache WHERE x = ? AND y = ? AND z = ?`,
      [x, y, z]
    );

    if (cached) {
      const tile: ChartTile = {
        x,
        y,
        z,
        data: cached.data ? Buffer.from(cached.data, 'base64') : Buffer.alloc(0),
        format: cached.format as 'vector' | 'raster',
        cached: true
      };

      // Add to memory cache for faster access
      this.memoryCache.put(key, tile);
      return tile;
    }

    // Tile not in cache, try to fetch it
    const data = await this.fetchTile(x, y, z);
    if (data) {
      const tile: ChartTile = {
        x,
        y,
        z,
        data,
        format: 'vector',
        cached: false
      };
      
      // Cache it for future use
      await this.cacheTile(tile);
      return { ...tile, cached: true };
    }

    return null;
  }

  async getCoverage(): Promise<ChartCoverage[]> {
    return [...this.coverageData];
  }

  async checkUpdates(): Promise<ChartUpdate[]> {
    // Simulate checking for updates from a chart provider
    const now = new Date();
    const updates: ChartUpdate[] = [];

    for (const coverage of this.coverageData) {
      const daysSinceIssue = Math.floor(
        (now.getTime() - coverage.issueDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Simulate updates available every 90 days
      if (daysSinceIssue > 90) {
        updates.push({
          id: `update-${coverage.id}-${now.getTime()}`,
          chartId: coverage.id,
          version: this.incrementVersion(coverage.edition),
          releaseDate: new Date(coverage.issueDate.getTime() + 90 * 24 * 60 * 60 * 1000),
          size: Math.floor(Math.random() * 100 * 1024 * 1024), // Random size up to 100MB
          description: `Updated chart data for ${coverage.name}`
        });
      }
    }

    this.availableUpdates = updates;
    return updates;
  }

  async downloadUpdate(updateId: string): Promise<void> {
    const update = this.availableUpdates.find(u => u.id === updateId);
    if (!update) {
      throw new Error(`Update ${updateId} not found`);
    }

    // Find the coverage to update
    const coverageIndex = this.coverageData.findIndex(c => c.id === update.chartId);
    if (coverageIndex === -1) {
      throw new Error(`Chart ${update.chartId} not found`);
    }

    // Simulate download and update
    this.coverageData[coverageIndex] = {
      ...this.coverageData[coverageIndex],
      edition: update.version,
      issueDate: update.releaseDate
    };

    // Clear cache for this region to force reload
    await this.clearCache(this.coverageData[coverageIndex].bounds);
  }

  async clearCache(region?: GeoBounds): Promise<void> {
    const db = await getDatabase();

    if (region) {
      // For region-specific clearing, only clear tiles at common zoom levels
      // to avoid excessive iteration
      const zoomLevels = [8, 10, 12, 14, 16];
      
      for (const z of zoomLevels) {
        const minX = this.lonToTileX(region.west, z);
        const maxX = this.lonToTileX(region.east, z);
        const minY = this.latToTileY(region.north, z);
        const maxY = this.latToTileY(region.south, z);

        await db.run(
          `DELETE FROM chart_cache WHERE z = ? AND x BETWEEN ? AND ? AND y BETWEEN ? AND ?`,
          [z, minX, maxX, minY, maxY]
        );
      }
    } else {
      await db.run(`DELETE FROM chart_cache`);
      this.memoryCache.clear();
    }
  }

  async getCacheSize(): Promise<number> {
    const db = await getDatabase();
    const result = await db.get<{ total: number | null }>(`SELECT SUM(size) as total FROM chart_cache`);
    return result?.total ?? 0;
  }

  async cacheTile(tile: ChartTile): Promise<void> {
    const key = `${tile.z}/${tile.x}/${tile.y}`;
    
    // Add to memory cache
    this.memoryCache.put(key, tile);

    // Check if we need to evict old tiles from database
    const currentSize = await this.getCacheSize();
    if (currentSize + tile.data.length > this.maxCacheSize) {
      await this.evictOldTiles(tile.data.length);
    }

    // Store in database
    const db = await getDatabase();
    const dataBase64 = tile.data.toString('base64');
    
    await db.run(
      `INSERT OR REPLACE INTO chart_cache (tile_key, x, y, z, format, cached_at, size, data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [key, tile.x, tile.y, tile.z, tile.format, Date.now(), tile.data.length, dataBase64]
    );
  }

  private async evictOldTiles(requiredSpace: number): Promise<void> {
    const db = await getDatabase();
    
    // Delete oldest tiles until we have enough space
    let freedSpace = 0;
    while (freedSpace < requiredSpace) {
      const oldestTile = await db.get<ChartCacheEntry>(
        `SELECT * FROM chart_cache ORDER BY cached_at ASC LIMIT 1`
      );

      if (!oldestTile) break;

      await db.run(
        `DELETE FROM chart_cache WHERE tile_key = ?`,
        [oldestTile.tile_key]
      );

      freedSpace += oldestTile.size;
    }
  }

  async downloadRegion(
    region: GeoBounds,
    zoomLevels: number[],
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const tiles = this.getTilesForRegion(region, zoomLevels);
    let downloadedTiles = 0;
    const totalTiles = tiles.length;

    for (const { x, y, z } of tiles) {
      // Check if tile already cached
      const existing = await this.getChartTile(x, y, z);
      if (!existing || !existing.cached) {
        const data = await this.fetchTile(x, y, z);

        if (data) {
          await this.cacheTile({
            x,
            y,
            z,
            data,
            format: 'vector',
            cached: true
          });
        }
      }

      downloadedTiles++;
      onProgress?.(downloadedTiles / totalTiles);
    }
  }

  private getTilesForRegion(
    region: GeoBounds,
    zoomLevels: number[]
  ): { x: number; y: number; z: number }[] {
    const tiles: { x: number; y: number; z: number }[] = [];

    for (const zoom of zoomLevels) {
      const minX = this.lonToTileX(region.west, zoom);
      const maxX = this.lonToTileX(region.east, zoom);
      const minY = this.latToTileY(region.north, zoom);
      const maxY = this.latToTileY(region.south, zoom);

      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          tiles.push({ x, y, z: zoom });
        }
      }
    }

    return tiles;
  }

  private lonToTileX(lon: number, zoom: number): number {
    return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
  }

  private latToTileY(lat: number, zoom: number): number {
    return Math.floor(
      ((1 -
        Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) /
        2) *
        Math.pow(2, zoom)
    );
  }

  private async fetchTile(x: number, y: number, z: number): Promise<Buffer | null> {
    try {
      // Construct tile URL based on provider
      let url: string;
      
      if (this.tileProvider.includes('mapbox')) {
        // Mapbox tile URL format
        url = `${this.tileProvider}/${z}/${x}/${y}.mvt?access_token=${this.accessToken}`;
      } else {
        // OpenStreetMap or similar tile URL format
        url = `${this.tileProvider}/${z}/${x}/${y}.png`;
      }

      // In a real implementation, this would use fetch or a HTTP client
      // For now, return mock data to demonstrate the structure
      const mockTileData = Buffer.from(
        JSON.stringify({
          x,
          y,
          z,
          timestamp: Date.now(),
          provider: this.tileProvider
        })
      );

      return mockTileData;
    } catch (error) {
      console.error(`Failed to fetch tile ${z}/${x}/${y}:`, error);
      return null;
    }
  }

  private incrementVersion(version: string): string {
    const parts = version.split('.');
    const minor = parseInt(parts[1] || '0', 10);
    return `${parts[0]}.${minor + 1}`;
  }
}

export const createChartManager = (config?: {
  tileProvider?: string;
  accessToken?: string;
  maxCacheSize?: number;
}): ChartManager => {
  return new ChartManagerImpl(config);
};
