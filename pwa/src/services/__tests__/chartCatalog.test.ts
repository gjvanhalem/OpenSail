import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchChartCatalog, regionArchiveUrl, type ChartRegionManifest } from '../chartCatalog';

const region: ChartRegionManifest = {
  id: 'nl-inland',
  name: 'Nederland',
  kind: 'inland-enc',
  official: true,
  source: { publisher: 'Rijkswaterstaat', licence: 'CC0-1.0', list: 'https://example.org', fileId: '1' },
  editionDate: '2026-10-05',
  bounds: [4, 50.75, 7.04, 53.35],
  minzoom: 8,
  maxzoom: 15,
  file: 'nl-inland.pmtiles',
  bytes: 19503547,
  sha256: 'abc',
  builtAt: '2026-10-15T09:36:09Z',
};

afterEach(() => vi.unstubAllGlobals());

describe('chart catalog', () => {
  it('reads the regions from index.json', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ version: 1, regions: [region, { id: 'broken' }] }))));
    expect(await fetchChartCatalog('https://charts.example.org/index.json')).toEqual([region]);
  });

  it('has no regions when there is no catalog or no network', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('not found', { status: 404 })));
    expect(await fetchChartCatalog('/charts/index.json')).toEqual([]);
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    expect(await fetchChartCatalog('/charts/index.json')).toEqual([]);
  });

  it('finds archives next to the catalog', () => {
    expect(regionArchiveUrl(region, 'https://charts.example.org/v1/index.json')).toBe(
      'https://charts.example.org/v1/nl-inland.pmtiles'
    );
  });
});
