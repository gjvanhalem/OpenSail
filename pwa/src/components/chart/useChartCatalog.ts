import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import { fetchChartCatalog, type ChartRegionManifest } from '@/services/chartCatalog';
import { tileCache } from '@/database/services/TileCache';

/** Manifests of the ENC regions inside downloaded regions, so they can be drawn offline */
async function downloadedEncRegions(): Promise<ChartRegionManifest[]> {
  const regions = await tileCache.getRegions();
  return regions.flatMap((region) => region.encRegions as ChartRegionManifest[]);
}

/** Merge region lists by id; earlier lists win */
export function mergeRegions(...lists: ChartRegionManifest[][]): ChartRegionManifest[] {
  const byId = new Map<string, ChartRegionManifest>();
  for (const list of lists) {
    for (const region of list) if (!byId.has(region.id)) byId.set(region.id, region);
  }
  return Array.from(byId.values());
}

/**
 * The chart regions to draw: the online catalog, plus the ENC regions of
 * every downloaded region (all that's left when offline)
 */
export function useChartCatalog(): ChartRegionManifest[] {
  const [regions, setRegions] = useState<ChartRegionManifest[]>([]);
  // Reload when a region is downloaded or deleted
  const downloadedCount = useSelector((state: RootState) => state.chartCache.cachedRegions.length);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetchChartCatalog(undefined, controller.signal),
      downloadedEncRegions().catch(() => []),
    ])
      .then(([catalog, downloaded]) => {
        if (!controller.signal.aborted) setRegions(mergeRegions(catalog, downloaded));
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [downloadedCount]);

  return regions;
}
