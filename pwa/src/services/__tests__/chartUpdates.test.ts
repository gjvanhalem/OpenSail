import { describe, it, expect } from 'vitest';
import { findChartUpdates, editionAgeDays } from '../chartUpdates';
import type { ChartRegionManifest } from '../chartCatalog';
import type { ChartRegionRecord } from '@/database/db';

const manifest = (id: string, editionDate: string | null): ChartRegionManifest => ({
  id,
  name: id.toUpperCase(),
  kind: 'inland-enc',
  official: true,
  source: { publisher: 'Rijkswaterstaat', licence: 'CC0-1.0', list: '', fileId: null },
  editionDate,
  bounds: [4, 52, 5, 53],
  minzoom: 8,
  maxzoom: 15,
  file: `${id}.pmtiles`,
  bytes: 1,
  sha256: '',
  builtAt: '',
});

const region = (id: string, encRegions: ChartRegionManifest[]): ChartRegionRecord => ({
  id,
  name: id,
  bounds: { north: 53, south: 52, east: 5, west: 4 },
  zoomLevels: [10],
  sources: [],
  encRegions,
  tileCount: 1,
  sizeBytes: 1,
  downloadedAt: new Date(),
  editionDate: null,
});

describe('findChartUpdates', () => {
  it('reports a newer catalog edition of downloaded ENC data', () => {
    const updates = findChartUpdates(
      [region('home', [manifest('wadden', '2026-10-01'), manifest('inland', '2026-10-05')])],
      [manifest('wadden', '2026-10-15'), manifest('inland', '2026-10-05')]
    );
    expect(updates).toEqual([
      {
        regionId: 'home',
        encRegionId: 'wadden',
        encRegionName: 'WADDEN',
        installedEdition: '2026-10-01',
        availableEdition: '2026-10-15',
      },
    ]);
  });

  it('has nothing to report offline (empty catalog) or for regions without ENC data', () => {
    expect(findChartUpdates([region('home', [manifest('wadden', '2026-10-01')])], [])).toEqual([]);
    expect(findChartUpdates([region('lake', [])], [manifest('wadden', '2026-10-15')])).toEqual([]);
  });

  it('treats data without an edition date as out of date', () => {
    expect(findChartUpdates([region('home', [manifest('wadden', null)])], [manifest('wadden', '2026-10-15')])).toHaveLength(1);
  });
});

describe('editionAgeDays', () => {
  it('counts whole days since the edition', () => {
    expect(editionAgeDays('2026-10-05', new Date('2026-10-15T12:00:00Z'))).toBe(10);
  });
});
