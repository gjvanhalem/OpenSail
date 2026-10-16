import type { AppDispatch } from '@/store';
import { addCachedRegion, type CachedRegion } from '@/store/slices/chartCacheSlice';
import { tileCache } from '@/database/services/TileCache';
import type { ChartRegionManifest } from './chartCatalog';

export class ChartCacheLoader {
  /** Put the regions downloaded for offline use into the Redux store */
  async loadCachedRegions(dispatch: AppDispatch): Promise<void> {
    try {
      for (const region of await tileCache.getRegions()) {
        const cachedRegion: CachedRegion = {
          id: region.id,
          name: region.name,
          bounds: region.bounds,
          zoomLevels: region.zoomLevels,
          tileCount: region.tileCount,
          sizeBytes: region.sizeBytes,
          createdAt: region.downloadedAt,
          editionDate: region.editionDate,
          encRegionIds: (region.encRegions as ChartRegionManifest[]).map((enc) => enc.id),
        };
        dispatch(addCachedRegion(cachedRegion));
      }
    } catch (error) {
      console.error('Error loading cached regions:', error);
    }
  }
}

export const chartCacheLoader = new ChartCacheLoader();
