import { test, expect } from './fixtures/test';
import type { Page } from '@playwright/test';

/**
 * The chart screen (docs/ui-redesign.md 2.2): one column of map buttons, a
 * Layers panel, and an instrument strip that opens the Instruments page.
 */

/** Whether the seamark layer is drawn (it stays in the style, hidden) */
const seamarksShown = (page: Page) =>
  page.evaluate(() => {
    const map = window.__OPENSAIL_MAP__;
    if (!map?.getLayer('seamarks')) return null;
    return map.getLayoutProperty('seamarks', 'visibility') !== 'none';
  });

async function startSimulator(page: Page) {
  await page.goto('/instruments');
  await page.getByRole('button', { name: 'Simulator', exact: true }).click();
  await page.getByRole('button', { name: 'Start Simulator' }).click();
  await page.getByLabel('Realistic variation').uncheck();
  await page.getByLabel('Speed (kn)', { exact: true }).fill('6.5');
  await page.getByLabel('Heading (° true)').fill('45');
  await page.getByLabel('Depth (m)').fill('8.2');
}

test('the instrument strip shows the boat data and opens Instruments', async ({ page }) => {
  await startSimulator(page);
  await page.click('a[href="/chart"]');

  const strip = page.getByTestId('data-strip');
  await expect(strip.getByTestId('strip-sog')).toContainText('6.5');
  await expect(strip.getByTestId('strip-depth')).toContainText('8.2');
  await expect(strip.getByTestId('strip-hdg')).toContainText('045°');

  await strip.click();
  await expect(page).toHaveURL('/instruments');
});

test('the strip marks a value in alarm', async ({ page }) => {
  await startSimulator(page);
  // The default shallow-water alert is below 3 m
  await page.getByLabel('Depth (m)').fill('2');
  await page.click('a[href="/chart"]');
  await expect(page.getByTestId('strip-depth')).toHaveClass(/bg-danger/);
});

test('Layers turns the seamarks off and remembers it', async ({ page }) => {
  await page.goto('/chart');
  await expect.poll(() => seamarksShown(page)).toBe(true);

  await page.getByRole('button', { name: 'Layers' }).click();
  const layers = page.getByRole('region', { name: 'Layers' });
  const seamarks = layers.getByRole('switch', { name: 'Seamarks (OpenSeaMap)' });
  await expect(seamarks).toBeChecked();
  await seamarks.uncheck();
  await expect.poll(() => seamarksShown(page)).toBe(false);
  await page.keyboard.press('Escape');
  await expect(layers).toBeHidden();

  await page.reload();
  await expect.poll(() => page.evaluate(() => window.__OPENSAIL_MAP__ !== undefined)).toBe(true);
  await page.getByRole('button', { name: 'Layers' }).click();
  await expect(page.getByRole('switch', { name: 'Seamarks (OpenSeaMap)' })).not.toBeChecked();
  await expect.poll(() => seamarksShown(page)).toBe(false);
});

test('the zoom buttons zoom the chart', async ({ page }) => {
  await page.goto('/chart');
  await expect.poll(() => page.evaluate(() => window.__OPENSAIL_MAP__ !== undefined)).toBe(true);
  const zoom = () => page.evaluate(() => window.__OPENSAIL_MAP__!.getZoom());
  const before = await zoom();
  await page.getByRole('button', { name: 'Zoom in' }).click();
  await expect.poll(zoom).toBeGreaterThan(before + 0.5);
  await page.getByRole('button', { name: 'Zoom out' }).click();
  await expect.poll(zoom).toBeLessThan(before + 0.5);
});
