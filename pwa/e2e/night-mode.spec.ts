import { test, expect } from './fixtures/test';

/** Night mode (docs/ui-redesign.md 2.4): red on black, one tap from the top bar */

const theme = (page: import('@playwright/test').Page) =>
  page.locator('html').getAttribute('data-theme');

test('the moon button switches to night colours and back, and remembers it', async ({ page }) => {
  await page.goto('/chart');
  await expect.poll(() => theme(page)).toBe('day');

  const button = page.getByRole('button', { name: 'Night mode' });
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => theme(page)).toBe('night');

  // Nothing bright: the page is black and the app bar text is red
  const background = await page.evaluate(() => getComputedStyle(document.querySelector('main')!.parentElement!.parentElement!).backgroundColor);
  expect(background).toBe('rgb(0, 0, 0)');
  // The chart is dimmed and tinted red
  const filter = await page.locator('.maplibregl-canvas-container').evaluate((el) => getComputedStyle(el).filter);
  expect(filter).toContain('sepia');

  await page.reload();
  await expect.poll(() => theme(page)).toBe('night');
  await page.getByRole('button', { name: 'Night mode' }).click();
  await expect.poll(() => theme(page)).toBe('day');
});

test('Settings offers day, night and automatic display', async ({ page }) => {
  await page.goto('/settings');
  const display = page.getByLabel('Display', { exact: true });
  await display.selectOption('night');
  await expect.poll(() => theme(page)).toBe('night');
  await display.selectOption('day');
  await expect.poll(() => theme(page)).toBe('day');
  await display.selectOption('auto');
  await expect(display).toHaveValue('auto');
});
