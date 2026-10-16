/**
 * The catalog of chart regions built by tools/enc-pipeline: one manifest per
 * region, listed in charts/index.json next to the PMTiles archives.
 */

export interface ChartRegionSource {
  publisher: string;
  /** SPDX licence id of the source data */
  licence: string;
  /** Where the source's current downloads are listed */
  list: string;
  /** Rijkswaterstaat download file id the archive was built from */
  fileId: string | null;
}

export interface ChartRegionManifest {
  id: string;
  name: string;
  /** inland-enc: Rijkswaterstaat inland ENC; coastal-depth: free bathymetry (advisory) */
  kind: 'inland-enc' | 'coastal-depth';
  /** Official chart data (ENC) rather than survey or model data */
  official: boolean;
  source: ChartRegionSource;
  /** Newest issue or update date of the cells in the archive (YYYY-MM-DD) */
  editionDate: string | null;
  /** [west, south, east, north] */
  bounds: [number, number, number, number];
  minzoom: number;
  maxzoom: number;
  /** Archive file name, relative to the catalog */
  file: string;
  bytes: number;
  sha256: string;
  builtAt: string;
}

export interface ChartCatalog {
  version: 1;
  regions: ChartRegionManifest[];
}

/** Where the catalog lives: VITE_CHART_CATALOG_URL, or charts/index.json on the app's own host */
export const CHART_CATALOG_URL: string =
  import.meta.env.VITE_CHART_CATALOG_URL || `${import.meta.env.BASE_URL}charts/index.json`;

/** Absolute URL of a region's archive; archives sit next to the catalog */
export function regionArchiveUrl(region: ChartRegionManifest, catalogUrl = CHART_CATALOG_URL): string {
  return new URL(region.file, new URL(catalogUrl, window.location.href)).href;
}

function isRegion(value: unknown): value is ChartRegionManifest {
  const region = value as ChartRegionManifest;
  return (
    typeof region?.id === 'string' &&
    typeof region.file === 'string' &&
    Array.isArray(region.bounds) &&
    region.bounds.length === 4
  );
}

/** Fetch the catalog. No catalog (404, offline, bad JSON) means no regions. */
export async function fetchChartCatalog(
  catalogUrl = CHART_CATALOG_URL,
  signal?: AbortSignal
): Promise<ChartRegionManifest[]> {
  try {
    const response = await fetch(catalogUrl, { signal, cache: 'no-cache' });
    if (!response.ok) return [];
    const catalog = (await response.json()) as Partial<ChartCatalog>;
    return Array.isArray(catalog.regions) ? catalog.regions.filter(isRegion) : [];
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    return [];
  }
}
