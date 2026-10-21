import { test, expect, serveChartFixtures } from './fixtures/test';
import { downloadVisibleRegion, showStavoren } from './helpers/charts';
import type { Page } from '@playwright/test';

// Wait until the service worker is active, so a reload is answered from the precache
async function waitForServiceWorker(page: Page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
}

test.describe('Offline Functionality', () => {
  test('should load app when offline', async ({ page, context }) => {
    // First visit online to cache the app
    await page.goto('/');
    await expect(page.getByRole('navigation')).toBeVisible();
    await waitForServiceWorker(page);

    // Go offline
    await context.setOffline(true);

    // Reload the page
    await page.reload();

    // App should still load from cache
    await expect(page.getByRole('navigation')).toBeVisible();

    // Should be able to navigate
    await page.click('a[href="/routes"]');
    await expect(page).toHaveURL('/routes');
    await expect(page.getByRole('heading', { name: 'Routes' })).toBeVisible();
  });

  test('should show offline indicator when network is unavailable', async ({ page, context }) => {
    await page.goto('/');
    await waitForServiceWorker(page);

    // Go offline
    await context.setOffline(true);

    // Reload to trigger offline detection
    await page.reload();

    // Should show offline indicator or message
    const offlineIndicator = page.getByRole('status').filter({ hasText: /offline|no connection/i });
    await expect(offlineIndicator).toBeVisible({ timeout: 5000 });

    // And it goes away when the connection comes back
    await context.setOffline(false);
    await expect(page.getByRole('status').filter({ hasText: /offline/i })).toBeHidden();
  });

  test('should access cached routes when offline', async ({ page, context }) => {
    // Create a route while online
    await page.goto('/routes');
    await waitForServiceWorker(page);

    await page.getByRole('button', { name: 'New Route' }).click();
    await page.getByLabel('Route Name').fill('Offline Test Route');
    for (const [latitude, longitude] of [['52.3676', '4.9041'], ['52.4621', '4.6050']]) {
      await page.getByRole('button', { name: 'Add waypoint' }).click();
      await page.getByLabel('Latitude').fill(latitude);
      await page.getByLabel('Longitude').fill(longitude);
      await page.getByRole('button', { name: 'Save waypoint' }).click();
    }
    await page.getByRole('button', { name: 'Save Route' }).click();

    await expect(page.getByRole('heading', { name: 'Offline Test Route' })).toBeVisible();

    // Go offline
    await context.setOffline(true);

    // Reload page
    await page.reload();

    // Route should still be accessible (stored in IndexedDB)
    await expect(page.getByRole('heading', { name: 'Offline Test Route' })).toBeVisible();
  });

  // ROADMAP.md Phase 7 (Weather, tides & sync): there is no sync queue yet;
  // all data is stored locally in IndexedDB only.
  test.fixme('should queue data for sync when offline', async ({ page, context }) => {
    await page.goto('/tracks');

    // Go offline
    await context.setOffline(true);

    // Try to create a track (should be queued)
    await page.getByRole('button', { name: 'Start Recording' }).click();

    // Should show indication that data will sync later
    const syncMessage = page.getByText(/sync|queue|later/i);
    await expect(syncMessage).toBeVisible({ timeout: 5000 });
  });

  test('"Select This Area" downloads exactly the visible map area', async ({ page, context }) => {
    test.slow();
    // Not the 800×600 the region selector used to assume
    await page.setViewportSize({ width: 1400, height: 500 });
    await serveChartFixtures(context);
    await page.goto('/chart');
    await showStavoren(page);
    await downloadVisibleRegion(page, 'Visible area');

    const visible = await page.evaluate(() => {
      const bounds = window.__OPENSAIL_MAP__!.getBounds();
      return { north: bounds.getNorth(), south: bounds.getSouth(), east: bounds.getEast(), west: bounds.getWest() };
    });
    const downloaded = await page.evaluate(
      () =>
        new Promise<{ north: number; south: number; east: number; west: number }>((resolve, reject) => {
          const open = indexedDB.open('NavigationDB');
          open.onerror = () => reject(open.error);
          open.onsuccess = () => {
            const request = open.result.transaction('chartRegions').objectStore('chartRegions').getAll();
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
              open.result.close();
              resolve(request.result.find((region) => region.name === 'Visible area').bounds);
            };
          };
        })
    );
    for (const side of ['north', 'south', 'east', 'west'] as const) {
      expect(downloaded[side]).toBeCloseTo(visible[side], 6);
    }
  });

  test('a downloaded region works offline: reload, pan and zoom (R5.1, R5.2)', async ({ page, context }) => {
    test.slow();
    await serveChartFixtures(context);
    await page.goto('/chart');
    await waitForServiceWorker(page);
    await showStavoren(page);
    await downloadVisibleRegion(page, 'Stavoren');
    await page.getByRole('button', { name: '✕' }).click();

    // Offline, after a reload, the app still starts and the chart comes from IndexedDB
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole('status').filter({ hasText: /offline/i })).toBeVisible();
    await showStavoren(page);

    const depthAreas = () =>
      page.evaluate(
        () =>
          window.__OPENSAIL_MAP__!.querySourceFeatures('enc-e2e-stavoren', { sourceLayer: 'depare' }).length
      );
    await expect.poll(depthAreas, { timeout: 15000 }).toBeGreaterThan(0);
    const servedFromCache = () => page.evaluate(() => window.__OPENSAIL_TILE_STATS__!.fromCache);
    expect(await servedFromCache()).toBeGreaterThan(0);

    // Pan within the region
    const canvas = await page.locator('.maplibregl-canvas').boundingBox();
    if (!canvas) throw new Error('map not on screen');
    const before = await page.evaluate(() => window.__OPENSAIL_MAP__!.getCenter().toArray());
    await page.mouse.move(canvas.x + canvas.width / 2 + 100, canvas.y + canvas.height / 2 + 80);
    await page.mouse.down();
    await page.mouse.move(canvas.x + canvas.width / 2 + 40, canvas.y + canvas.height / 2 + 40, { steps: 5 });
    await page.mouse.up();
    await expect
      .poll(() => page.evaluate(() => window.__OPENSAIL_MAP__!.getCenter().toArray()))
      .not.toEqual(before);

    // Zoom in to the most detailed downloaded level, still with depth data
    const cachedBeforeZoom = await servedFromCache();
    await page.getByRole('button', { name: 'Zoom in' }).click();
    await expect.poll(() => page.evaluate(() => Math.round(window.__OPENSAIL_MAP__!.getZoom()))).toBe(13);
    await expect.poll(servedFromCache, { timeout: 15000 }).toBeGreaterThan(cachedBeforeZoom);
    await expect.poll(depthAreas, { timeout: 15000 }).toBeGreaterThan(0);
  });
});
