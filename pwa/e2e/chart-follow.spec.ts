import { test, expect } from './fixtures/test';
import type { Page } from '@playwright/test';

/**
 * The chart follows the vessel. These tests use the GPS simulator and compare
 * the vessel marker with the map's center on screen, so they don't need map
 * tiles (e2e tests stub the tile servers).
 */

async function startSimulator(page: Page) {
  await page.goto('/settings');
  await page.getByRole('radio', { name: /Simulator/ }).check();
  await expect(page.getByText('Active', { exact: true })).toBeVisible();
  // Client-side navigation, so the simulator keeps running
  await page.click('a[href="/chart"]');
  await expect(page).toHaveURL('/chart');
  // The map is exposed once it has rendered
  await expect.poll(() => page.evaluate(() => window.__OPENSAIL_MAP__ !== undefined)).toBe(true);
}

/** Distance in pixels between the vessel marker and the center of the map */
async function markerOffsetFromCenter(page: Page): Promise<number> {
  const marker = await page.getByTestId('vessel-marker').boundingBox();
  const map = await page.locator('.maplibregl-map').boundingBox();
  if (!marker || !map) throw new Error('vessel marker or map not on screen');
  const dx = marker.x + marker.width / 2 - (map.x + map.width / 2);
  const dy = marker.y + marker.height / 2 - (map.y + map.height / 2);
  return Math.hypot(dx, dy);
}

const follow = (page: Page) => page.getByRole('button', { name: 'Follow vessel' });

test.describe('Chart follows the vessel', () => {
  test('centers on the vessel and keeps it centered as it moves', async ({ page }) => {
    await startSimulator(page);
    await expect(page.getByTestId('vessel-marker')).toBeVisible();
    await expect.poll(() => markerOffsetFromCenter(page)).toBeLessThan(5);

    const startCenter = await page.evaluate(() => window.__OPENSAIL_MAP__!.getCenter().toArray());
    // The simulator moves the vessel every second
    await expect
      .poll(() => page.evaluate(() => window.__OPENSAIL_MAP__!.getCenter().toArray()), {
        timeout: 5000,
      })
      .not.toEqual(startCenter);
    expect(await markerOffsetFromCenter(page)).toBeLessThan(5);
  });

  test('panning stops following and Follow vessel brings the vessel back', async ({ page }) => {
    await startSimulator(page);
    await expect(follow(page)).toHaveAttribute('aria-pressed', 'true');

    const map = await page.locator('.maplibregl-canvas').boundingBox();
    if (!map) throw new Error('map not on screen');
    // Start the drag away from the center, where the vessel marker sits
    const x = map.x + map.width / 2 + 120;
    const y = map.y + map.height / 2 + 90;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x - 200, y - 150, { steps: 10 });
    await page.mouse.up();

    await expect(follow(page)).toHaveAttribute('aria-pressed', 'false');
    // Stays panned away even while the vessel keeps moving
    await page.waitForTimeout(1500);
    expect(await markerOffsetFromCenter(page)).toBeGreaterThan(100);

    await follow(page).click();
    await expect(follow(page)).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => markerOffsetFromCenter(page)).toBeLessThan(5);
  });

  test('a vessel update between pressing and dragging does not cancel the pan', async ({
    page,
  }) => {
    await startSimulator(page);
    await expect(follow(page)).toHaveAttribute('aria-pressed', 'true');

    const map = await page.locator('.maplibregl-canvas').boundingBox();
    if (!map) throw new Error('map not on screen');
    const x = map.x + map.width / 2 + 120;
    const y = map.y + map.height / 2 + 90;
    await page.mouse.move(x, y);
    await page.mouse.down();
    // The simulator moves the vessel every second, before the drag starts
    await page.waitForTimeout(1500);
    await page.mouse.move(x - 200, y - 150, { steps: 10 });
    await page.mouse.up();

    await expect(follow(page)).toHaveAttribute('aria-pressed', 'false');
    expect(await markerOffsetFromCenter(page)).toBeGreaterThan(100);
  });
});

/** A setting as stored in IndexedDB; reloading before the write lands would lose it */
function storedSetting(page: Page, key: string): Promise<unknown> {
  return page.evaluate(
    (settingKey) =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open('NavigationDB');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const get = open.result.transaction('settings').objectStore('settings').get(settingKey);
          get.onsuccess = () => {
            open.result.close();
            resolve(get.result ? JSON.parse(get.result.value) : undefined);
          };
          get.onerror = () => reject(get.error);
        };
      }),
    key
  );
}

test.describe('GPS mode after a reload', () => {
  test('the simulator resumes on the saved track', async ({ page }) => {
    await page.goto('/settings');
    await page.getByRole('radio', { name: /Simulator/ }).check();
    await page.getByLabel('Simulation Track').selectOption('1');
    await expect(page.getByText('Active', { exact: true })).toBeVisible();
    await expect.poll(() => storedSetting(page, 'gpsSimulatorTrack')).toBe('Coastal Cruise');
    await expect.poll(() => storedSetting(page, 'gpsMode')).toBe('simulator');

    await page.goto('/chart');
    await expect(page.getByTestId('vessel-marker')).toBeVisible();

    await page.goto('/settings');
    await expect(page.getByText('Active', { exact: true })).toBeVisible();
    await expect(page.getByRole('radio', { name: /Simulator/ })).toBeChecked();
    await expect(page.getByLabel('Simulation Track')).toHaveValue('1');
  });

  test('stays off after a reload when it was switched off', async ({ page }) => {
    await page.goto('/settings');
    await page.getByRole('radio', { name: /Simulator/ }).check();
    await expect(page.getByText('Active', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Stop GPS' }).click();
    await expect(page.getByText('Inactive', { exact: true })).toBeVisible();
    await expect.poll(() => storedSetting(page, 'gpsMode')).toBe('off');

    await page.reload();
    await expect(page.getByRole('radio', { name: /Off/ })).toBeChecked();
    await expect(page.getByText('Inactive', { exact: true })).toBeVisible();
  });
});

test.describe('Chart orientation', () => {
  const bearing = (page: Page) => page.evaluate(() => window.__OPENSAIL_MAP__!.getBearing());

  test('heading-up turns the chart to the course, north-up turns it back', async ({ page }) => {
    await startSimulator(page);
    // One button: pressed is heading up, not pressed north up
    const headingUp = page.getByRole('button', { name: 'Heading up' });
    await expect(headingUp).toHaveAttribute('aria-pressed', 'false');
    await expect.poll(() => bearing(page)).toBe(0);

    await headingUp.click();
    await expect(headingUp).toHaveAttribute('aria-pressed', 'true');
    // The harbor track's first leg runs north-east; the simulator has no
    // heading sensor, so heading-up uses course over ground
    await expect.poll(async () => Math.abs(await bearing(page))).toBeGreaterThan(10);
    // The vessel still sits in the center, with the bow pointing up the screen
    expect(await markerOffsetFromCenter(page)).toBeLessThan(5);

    await headingUp.click();
    await expect(headingUp).toHaveAttribute('aria-pressed', 'false');
    await expect.poll(() => bearing(page)).toBe(0);
  });

  test('the orientation is saved in settings', async ({ page }) => {
    await page.goto('/chart');
    const headingUp = page.getByRole('button', { name: 'Heading up' });
    await headingUp.click();
    // The button updates once the setting is stored
    await expect(headingUp).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => storedSetting(page, 'chartRotation')).toBe('heading-up');
    await page.reload();
    await expect(headingUp).toHaveAttribute('aria-pressed', 'true');
  });
});
