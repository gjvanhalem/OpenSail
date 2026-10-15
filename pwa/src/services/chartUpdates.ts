import type { ChartRegionRecord } from '@/database/db';
import type { ChartRegionManifest } from './chartCatalog';

/** A newer edition of ENC data that a downloaded region includes (R15.2) */
export interface ChartUpdate {
  /** Downloaded region that holds the old edition */
  regionId: string;
  /** Catalog id of the ENC region */
  encRegionId: string;
  encRegionName: string;
  installedEdition: string | null;
  availableEdition: string;
}

/**
 * Compare the ENC editions in downloaded regions with the catalog: an update is
 * a catalog edition newer than the one downloaded. Edition dates are YYYY-MM-DD,
 * so they compare as strings.
 */
export function findChartUpdates(
  regions: ChartRegionRecord[],
  catalog: ChartRegionManifest[]
): ChartUpdate[] {
  const latest = new Map(catalog.map((region) => [region.id, region]));
  const updates: ChartUpdate[] = [];
  for (const region of regions) {
    for (const installed of region.encRegions as ChartRegionManifest[]) {
      const available = latest.get(installed.id);
      if (!available?.editionDate) continue;
      if (!installed.editionDate || available.editionDate > installed.editionDate) {
        updates.push({
          regionId: region.id,
          encRegionId: installed.id,
          encRegionName: available.name,
          installedEdition: installed.editionDate,
          availableEdition: available.editionDate,
        });
      }
    }
  }
  return updates;
}

/** Days since an edition date, to show how old downloaded data is */
export function editionAgeDays(editionDate: string, now = new Date()): number {
  const edition = new Date(`${editionDate}T00:00:00Z`);
  return Math.floor((now.getTime() - edition.getTime()) / 86_400_000);
}
