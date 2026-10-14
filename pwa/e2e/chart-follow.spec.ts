import { test, expect, type Page } from '@playwright/test';

/**
 * The chart follows the vessel. These tests use the GPS simulator and compare
 * the vessel marker with the map's center on screen, so they don't need map
 * tiles (CI runs with a placeholder Mapbox token).
 */

async function startSimulator(page: Page) {
  await page.goto('/settings');
  await page.getByRole('radio', { name: /Simulator/ }).check();
  await expect(page.getByText('Active', { exact: true })).toBeVisible();
  // Client-side navigation, so the simulator keeps running
  await page.click('a[href="/chart"]');
  await expect(page).toHaveURL('/chart');
}

/** Distance in pixels between the vessel marker and the center of the map */
async function markerOffsetFromCenter(page: Page): Promise<number> {
  const marker = await page.getByTestId('vessel-marker').boundingBox();
  const map = await page.locator('.mapboxgl-map').boundingBox();
  if (!marker || !map) throw new Error('vessel marker or map not on screen');
  const dx = marker.x + marker.width / 2 - (map.x + map.width / 2);
  const dy = marker.y + marker.height / 2 - (map.y + map.height / 2);
  return Math.hypot(dx, dy);
}

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

  test('panning stops following and Recenter brings the vessel back', async ({ page }) => {
    await startSimulator(page);
    await expect(page.getByRole('button', { name: 'Centered' })).toBeVisible();

    const map = await page.locator('.mapboxgl-canvas').boundingBox();
    if (!map) throw new Error('map not on screen');
    await page.mouse.move(map.x + map.width / 2, map.y + map.height / 2);
    await page.mouse.down();
    await page.mouse.move(map.x + map.width / 2 - 200, map.y + map.height / 2 - 150, { steps: 10 });
    await page.mouse.up();

    await expect(page.getByRole('button', { name: 'Recenter' })).toBeVisible();
    // Stays panned away even while the vessel keeps moving
    await page.waitForTimeout(1500);
    expect(await markerOffsetFromCenter(page)).toBeGreaterThan(100);

    await page.getByRole('button', { name: 'Recenter' }).click();
    await expect(page.getByRole('button', { name: 'Centered' })).toBeVisible();
    await expect.poll(() => markerOffsetFromCenter(page)).toBeLessThan(5);
  });
});
