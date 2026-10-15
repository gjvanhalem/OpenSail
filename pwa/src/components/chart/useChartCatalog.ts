import { useEffect, useState } from 'react';
import { fetchChartCatalog, type ChartRegionManifest } from '@/services/chartCatalog';

/** The chart regions in the catalog, fetched once */
export function useChartCatalog(): ChartRegionManifest[] {
  const [regions, setRegions] = useState<ChartRegionManifest[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    fetchChartCatalog(undefined, controller.signal)
      .then(setRegions)
      .catch(() => undefined);
    return () => controller.abort();
  }, []);
  return regions;
}
