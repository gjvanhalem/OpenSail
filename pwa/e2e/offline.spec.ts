import { test, expect } from './fixtures/test';
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

  // ROADMAP.md Phase 3 (Nautical charts & real offline mode): the app has no
  // online/offline status indicator yet.
  test.fixme('should show offline indicator when network is unavailable', async ({ page, context }) => {
    await page.goto('/');
    await waitForServiceWorker(page);

    // Go offline
    await context.setOffline(true);

    // Reload to trigger offline detection
    await page.reload();

    // Should show offline indicator or message
    const offlineIndicator = page.getByText(/offline|no connection/i);
    await expect(offlineIndicator).toBeVisible({ timeout: 5000 });
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
});
