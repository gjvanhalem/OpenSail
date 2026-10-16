import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect, serveChartFixtures } from './fixtures/test';
import { downloadVisibleRegion, showStavoren } from './helpers/charts';

const catalog = JSON.parse(
  readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'charts', 'index.json'), 'utf8')
);

/** Chart management (R15): downloaded regions, storage, editions, updates, deletion */
test.describe('Chart management', () => {
  test.beforeEach(async ({ context, page }) => {
    await serveChartFixtures(context);
    await page.goto('/chart');
    await showStavoren(page);
  });

  test('lists a downloaded region with its size, zoom levels and edition date (R15.3, R15.4)', async ({ page }) => {
    await downloadVisibleRegion(page, 'Stavoren');
    const region = page.getByTestId('cached-region').filter({ hasText: 'Stavoren' });
    await expect(region).toContainText('11, 12, 13');
    await expect(region.getByTestId('region-edition')).toContainText('2026-08-18');
    await expect(region).toContainText(/\d+(\.\d+)? (B|KB|MB) \(\d+ tiles\)/);
    await expect(page.getByText(/browser storage used/)).toBeVisible();
    await expect(page.getByTestId('storage-persistence')).toBeVisible();

    // Still listed after a reload, from IndexedDB
    await page.reload();
    await page.getByRole('button', { name: 'Offline Charts' }).click();
    await expect(page.getByTestId('cached-region').filter({ hasText: 'Stavoren' })).toBeVisible();
  });

  test('checks for a newer edition when online and updates the region (R15.2)', async ({ page, context }) => {
    await downloadVisibleRegion(page, 'Stavoren');
    await page.getByRole('button', { name: '✕' }).click();

    // The catalog publishes a newer edition of the ENC region
    const newer = structuredClone(catalog);
    newer.regions[0].editionDate = '2026-10-14';
    await context.route('**/charts/index.json', (route) => route.fulfill({ json: newer }));
    await page.reload();

    await expect(page.getByRole('status').filter({ hasText: 'New chart editions' })).toBeVisible();
    await page.getByRole('button', { name: 'Offline Charts' }).click();
    const region = page.getByTestId('cached-region').filter({ hasText: 'Stavoren' });
    await expect(region).toContainText('Update available');
    await expect(region).toContainText('edition 2026-10-14 (you have 2026-08-18)');

    await region.getByRole('button', { name: 'Update' }).click();
    await expect(region.getByTestId('region-edition')).toContainText('2026-10-14', { timeout: 30000 });
    await expect(region).not.toContainText('Update available');
    await expect(page.getByRole('status').filter({ hasText: 'New chart editions' })).toBeHidden();
  });

  test('deletes a region after confirming, and frees its tiles', async ({ page }) => {
    await downloadVisibleRegion(page, 'Stavoren');
    const storedTiles = () =>
      page.evaluate(
        () =>
          new Promise<number>((resolve) => {
            const open = indexedDB.open('NavigationDB');
            open.onsuccess = () => {
              const count = open.result.transaction('chartTiles').objectStore('chartTiles').count();
              count.onsuccess = () => resolve(count.result);
            };
          })
      );
    expect(await storedTiles()).toBeGreaterThan(0);

    const region = page.getByTestId('cached-region').filter({ hasText: 'Stavoren' });
    await region.getByRole('button', { name: 'Delete Stavoren' }).click();
    await region.getByRole('button', { name: 'Keep' }).click();
    await expect(region).toBeVisible();

    await region.getByRole('button', { name: 'Delete Stavoren' }).click();
    await region.getByRole('button', { name: 'Yes, delete' }).click();
    await expect(region).toBeHidden();
    await expect(page.getByText('No downloaded regions yet')).toBeVisible();
    await expect.poll(storedTiles).toBe(0);
  });
});
