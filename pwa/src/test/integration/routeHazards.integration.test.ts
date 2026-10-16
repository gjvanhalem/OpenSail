import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { Route } from '@/models';
import type { ChartRegionManifest } from '@/services/chartCatalog';
import { checkRouteHazards } from '@/services/routeHazardService';

/**
 * The hazard check on real ENC tiles: the Stavoren fixture built by
 * tools/enc-pipeline (e2e/fixtures/charts), read through the same protocol
 * code as the chart. It has a 2 m depth area at about 52.834 N 5.204-5.208 E.
 */
// Vitest runs in Node; the app's tsconfig has no Node types, so fs is loaded untyped
const fs: { readFileSync(path: string, encoding?: string): Uint8Array & string } = await import(
  /* @vite-ignore */ 'node:fs' as string
);
// Tests run from the pwa folder
const cwd = (globalThis as unknown as { process: { cwd(): string } }).process.cwd();
const fixture = (name: string) => `${cwd}/e2e/fixtures/charts/${name}`;
const archive = fs.readFileSync(fixture('e2e-stavoren.pmtiles'));
const catalog = JSON.parse(fs.readFileSync(fixture('index.json'), 'utf8'));
const region: ChartRegionManifest = catalog.regions[0];

function route(points: [number, number][]): Route {
  return {
    id: 'r',
    name: 'Test',
    waypoints: points.map(([longitude, latitude], i) => ({
      id: `w${i}`,
      name: `WP${i + 1}`,
      position: { latitude, longitude, accuracy: 0, timestamp: 0 },
    })),
    totalDistance: 0,
    estimatedDuration: 0,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  } as unknown as Route;
}

beforeAll(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input instanceof Request ? input.url : input);
      if (!url.endsWith('e2e-stavoren.pmtiles')) return new Response('not found', { status: 404 });
      const range = /bytes=(\d+)-(\d+)/.exec(new Headers(init?.headers).get('range') ?? '');
      const start = range ? Number(range[1]) : 0;
      const end = range ? Math.min(Number(range[2]), archive.length - 1) : archive.length - 1;
      // A copy: Buffer.slice is a view on a shared pool
      const body = Uint8Array.prototype.slice.call(archive, start, end + 1).buffer as ArrayBuffer;
      return new Response(body, {
        status: range ? 206 : 200,
        headers: {
          'Content-Length': String(body.byteLength),
          'Content-Range': `bytes ${start}-${end}/${archive.length}`,
        },
      });
    })
  );
});
afterAll(() => vi.unstubAllGlobals());

describe('route hazards on the Stavoren ENC fixture (R2.5)', () => {
  it('warns about the 2 m area for a vessel that needs 3 m, as official data', async () => {
    const warnings = await checkRouteHazards(route([[5.2, 52.8345], [5.212, 52.8345]]), {
      safetyDepth: 3,
      regions: [region],
    });
    const shallow = warnings.filter((w) => w.type === 'shallow_water');
    expect(shallow).toHaveLength(1);
    expect(shallow[0]).toMatchObject({ legIndex: 0, severity: 'medium', source: 'e2e-stavoren' });
    expect(shallow[0].message).toMatch(/least depth 2\.0 m/);
    expect(shallow[0].advisory).toBeUndefined();
  });

  it('is quiet about it for a vessel that needs 1.5 m', async () => {
    const warnings = await checkRouteHazards(route([[5.2, 52.8345], [5.212, 52.8345]]), {
      safetyDepth: 1.5,
      regions: [region],
    });
    expect(warnings.filter((w) => w.type === 'shallow_water')).toEqual([]);
  });

  it('says where a route leaves the charted area', async () => {
    const warnings = await checkRouteHazards(route([[5.25, 52.9], [5.45, 52.9]]), {
      safetyDepth: 3,
      regions: [region],
    });
    expect(warnings).toContainEqual(expect.objectContaining({ type: 'no_depth_data', legIndex: 0 }));
  });
});
