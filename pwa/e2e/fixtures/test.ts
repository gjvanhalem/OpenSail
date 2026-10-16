import { test as base, expect, type BrowserContext, type Route } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FIXTURES = path.dirname(fileURLToPath(import.meta.url));

/** Hosts the chart loads tiles, fonts and styles from */
export const TILE_HOSTS = ['tiles.openfreemap.org', 'tiles.openseamap.org'];

/** A 1×1 transparent PNG, for raster tiles */
const EMPTY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);

/** A TileJSON that points the base map's tiles back at the (stubbed) tile host */
const STUB_TILEJSON = {
  tilejson: '3.0.0',
  tiles: ['https://tiles.openfreemap.org/planet/e2e/{z}/{x}/{y}.pbf'],
  minzoom: 0,
  maxzoom: 14,
};

/**
 * Answer every request to an external tile server locally, so e2e tests never
 * depend on those servers being reachable. Tiles and fonts come back empty:
 * the map renders its background and overlays, and MapLibre treats an empty
 * tile as "no features here".
 */
export async function stubTileServers(context: BrowserContext): Promise<void> {
  for (const host of TILE_HOSTS) {
    await context.route(`https://${host}/**`, async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === '/planet') {
        await route.fulfill({ json: STUB_TILEJSON });
      } else if (url.pathname.endsWith('.png')) {
        await route.fulfill({ status: 200, contentType: 'image/png', body: EMPTY_PNG });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/x-protobuf', body: Buffer.alloc(0) });
      }
    });
  }
}

/** Answer a request with a file, honouring a byte-range request as PMTiles needs */
async function fulfillFile(route: Route, file: string, contentType: string): Promise<void> {
  const body = readFileSync(file);
  const range = /^bytes=(\d+)-(\d*)$/.exec(route.request().headers()['range'] ?? '');
  if (!range) {
    await route.fulfill({ status: 200, contentType, body });
    return;
  }
  const start = Number(range[1]);
  const end = Math.min(range[2] ? Number(range[2]) : body.length - 1, body.length - 1);
  await route.fulfill({
    status: 206,
    contentType,
    headers: { 'Content-Range': `bytes ${start}-${end}/${body.length}`, 'Accept-Ranges': 'bytes' },
    body: body.subarray(start, end + 1),
  });
}

/**
 * Serve the chart catalog from e2e/fixtures/charts: one small inland ENC region
 * (the Stavoren harbour cell, built by tools/enc-pipeline) at /charts/.
 */
export async function serveChartFixtures(context: BrowserContext): Promise<void> {
  await context.route('**/charts/index.json', (route) =>
    fulfillFile(route, path.join(FIXTURES, 'charts', 'index.json'), 'application/json')
  );
  await context.route('**/charts/*.pmtiles', (route) => {
    const name = path.basename(new URL(route.request().url()).pathname);
    return fulfillFile(route, path.join(FIXTURES, 'charts', name), 'application/octet-stream');
  });
}

/** Playwright's test, with the external tile servers stubbed for every test */
export const test = base.extend<{ stubbedTileServers: void }>({
  stubbedTileServers: [
    async ({ context }, use) => {
      await stubTileServers(context);
      await use();
    },
    { auto: true },
  ],
});

export { expect };
