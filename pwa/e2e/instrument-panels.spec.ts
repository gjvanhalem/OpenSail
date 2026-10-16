import { test, expect } from './fixtures/test';
import type { Page } from '@playwright/test';

/** R14.2: choose, order and resize instrument gauges; the layout is saved */

const gaugeOrder = (page: Page) =>
  page.locator('[data-testid^="gauge-"]:not([data-testid^="gauge-config"])').evaluateAll((els) =>
    els.map((el) => el.getAttribute('data-testid')!.replace('gauge-', ''))
  );

test('choose, order and resize gauges, saved across reloads', async ({ page }) => {
  await page.goto('/instruments');
  await expect.poll(() => gaugeOrder(page)).toEqual(['speed', 'depth', 'wind', 'heading', 'position']);

  await page.getByRole('button', { name: 'Configure' }).click();
  await page.getByLabel('Show Wind').uncheck();
  for (let i = 0; i < 4; i++) {
    await page.getByRole('button', { name: 'Move Position up' }).click();
  }
  await page.getByLabel('Depth size').selectOption('large');

  await expect.poll(() => gaugeOrder(page)).toEqual(['position', 'speed', 'depth', 'heading']);
  await expect(page.getByTestId('gauge-depth')).toHaveAttribute('data-size', 'large');
  await expect(page.getByRole('button', { name: 'Move Position up' })).toBeDisabled();

  // A large gauge is wider than a small one
  const small = await page.getByTestId('gauge-speed').boundingBox();
  const large = await page.getByTestId('gauge-depth').boundingBox();
  expect(large!.width).toBeGreaterThan(small!.width * 1.5);

  await page.reload();
  await expect.poll(() => gaugeOrder(page)).toEqual(['position', 'speed', 'depth', 'heading']);
  await expect(page.getByTestId('gauge-depth')).toHaveAttribute('data-size', 'large');
});
