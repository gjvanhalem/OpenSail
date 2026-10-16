import { test as base, expect, type BrowserContext } from '@playwright/test';

/** Hosts the chart loads tiles, fonts and styles from */
export const TILE_HOSTS = ['tiles.openfreemap.org'];

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
      } else {
        await route.fulfill({ status: 200, contentType: 'application/x-protobuf', body: Buffer.alloc(0) });
      }
    });
  }
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
