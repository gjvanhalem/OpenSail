import { expect, type Page } from '@playwright/test';

/** Frame Stavoren, where the ENC fixture (e2e/fixtures/charts) has depth areas */
export async function showStavoren(page: Page, zoom = 12) {
  await expect.poll(() => page.evaluate(() => window.__OPENSAIL_MAP__ !== undefined)).toBe(true);
  await page.evaluate((z) => window.__OPENSAIL_MAP__!.jumpTo({ center: [5.3, 52.88], zoom: z }), zoom);
}

/**
 * Download the visible chart area at zoom levels 11 to 13 under `name`, through
 * the Offline Charts panel, and wait until it is listed. Leaves the panel open.
 */
export async function downloadVisibleRegion(page: Page, name: string) {
  await page.getByRole('button', { name: 'Offline Charts' }).click();
  await page.getByRole('button', { name: 'Select Region on Map' }).click();
  await page.getByRole('button', { name: 'Select This Area' }).click();
  await page.getByLabel('Region Name').fill(name);
  for (const level of [8, 9, 10, 14]) {
    await page.getByRole('button', { name: `Zoom level ${level}`, exact: true }).click();
  }
  await expect(page.getByTestId('download-includes')).toContainText('Stavoren (e2e fixture)');
  await page.getByRole('button', { name: 'Start Download' }).click();
  await expect(page.getByTestId('cached-region').filter({ hasText: name })).toBeVisible({ timeout: 30000 });
}
