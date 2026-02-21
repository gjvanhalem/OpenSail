import type { AppDispatch } from '@/store';
import { addCachedRegion, type CachedRegion } from '@/store/slices/chartCacheSlice';
import { db } from '@/database/db';

export class ChartCacheLoader {
  // Load all cached regions from IndexedDB and populate Redux store
  async loadCachedRegions(dispatch: AppDispatch): Promise<void> {
    try {
      // Get all tiles from IndexedDB
      const allTiles = await db.chartTiles.toArray();
      
      // Group tiles by region
      const regionMap = new Map<string, typeof allTiles>();
      
      for (const tile of allTiles) {
        if (tile.region) {
          if (!regionMap.has(tile.region)) {
            regionMap.set(tile.region, []);
          }
          regionMap.get(tile.region)!.push(tile);
        }
      }
      
      // Create CachedRegion objects for each region
      for (const [regionId, tiles] of regionMap.entries()) {
        if (tiles.length === 0) continue;
        
        // Calculate bounds from tiles
        const lats: number[] = [];
        const lons: number[] = [];
        const zoomLevels = new Set<number>();
        
        for (const tile of tiles) {
          zoomLevels.add(tile.z);
          const coords = this.tileToLatLon(tile.x, tile.y, tile.z);
          lats.push(coords.lat);
          lons.push(coords.lon);
        }
        
        // Calculate total size
        const totalSize = tiles.reduce((sum, tile) => sum + tile.data.size, 0);
        
        // Find oldest timestamp (creation date)
        const timestamps = tiles.map(t => t.timestamp.getTime());
        const oldestTimestamp = Math.min(...timestamps);
        
        // Extract region name from ID (format: region-timestamp or custom name)
        const regionName = regionId.startsWith('region-') 
          ? `Region ${new Date(parseInt(regionId.split('-')[1])).toLocaleDateString()}`
          : regionId;
        
        const cachedRegion: CachedRegion = {
          id: regionId,
          name: regionName,
          bounds: {
            north: Math.max(...lats),
            south: Math.min(...lats),
            east: Math.max(...lons),
            west: Math.min(...lons),
          },
          zoomLevels: Array.from(zoomLevels).sort((a, b) => a - b),
          tileCount: tiles.length,
          sizeBytes: totalSize,
          createdAt: new Date(oldestTimestamp),
        };
        
        dispatch(addCachedRegion(cachedRegion));
      }
    } catch (error) {
      console.error('Error loading cached regions:', error);
    }
  }
  
  // Convert tile coordinates to lat/lon (center of tile)
  private tileToLatLon(x: number, y: number, z: number): { lat: number; lon: number } {
    const n = Math.pow(2, z);
    const lon = (x / n) * 360 - 180;
    const lat = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * (180 / Math.PI);
    return { lat, lon };
  }
}

export const chartCacheLoader = new ChartCacheLoader();
