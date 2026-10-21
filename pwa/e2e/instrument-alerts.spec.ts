import { test, expect } from './fixtures/test';
import type { Page } from '@playwright/test';

/** R14.5: visual alerts when instrument values pass user-set limits */

async function startSimulator(page: Page) {
  await page.goto('/instruments');
  await page.getByRole('button', { name: 'Simulator', exact: true }).click();
  await page.getByRole('button', { name: 'Start Simulator' }).click();
  await page.getByLabel('Realistic variation').uncheck();
}

test.describe('Instrument alerts', () => {
  test('shallow water raises an alert that can be acknowledged', async ({ page }) => {
    await startSimulator(page);
    const banner = page.getByRole('alert').filter({ hasText: 'Depth' });
    await expect(banner).toBeHidden();

    // The shallow-water alarm is on by default at 3 m
    await page.getByLabel('Depth (m)').fill('2');
    await expect(banner).toContainText('Depth 2.0 m: below minimum 3.0 m', { timeout: 1000 });
    await expect(page.getByTestId('depth-alert')).toHaveText('Below min 3.0 m');

    await banner.getByRole('button', { name: 'Acknowledge' }).click();
    await expect(banner).toBeHidden();
    // The gauge keeps showing the alarm while it lasts
    await expect(page.getByTestId('depth-alert')).toBeVisible();

    await page.getByLabel('Depth (m)').fill('6');
    await expect(page.getByTestId('depth-alert')).toBeHidden();

    // Shallow again: a new alert
    await page.getByLabel('Depth (m)').fill('2.5');
    await expect(banner).toBeVisible();
  });

  test('a max wind speed set in settings, in the chosen units', async ({ page }) => {
    await page.goto('/settings');
    await page.getByLabel('Units', { exact: true }).selectOption('metric');
    const section = page.locator('fieldset', { hasText: 'Wind speed' });
    await section.getByLabel('Wind speed alert on').check();
    // 37 km/h is about 20 knots
    await section.getByLabel('Wind speed max (km/h)').fill('37');

    await page.click('a[href="/instruments"]');
    await page.getByRole('button', { name: 'Simulator', exact: true }).click();
    await page.getByRole('button', { name: 'Start Simulator' }).click();
    await page.getByLabel('Realistic variation').uncheck();
    await page.getByLabel('Apparent wind speed (kn)').fill('25');

    const banner = page.getByRole('alert');
    await expect(banner).toContainText('Wind speed 46.3 km/h: above maximum 37.0 km/h');
    await expect(page.getByTestId('windSpeed-alert')).toBeVisible();

    // The limit survives a reload
    await page.goto('/settings');
    await expect(
      page.locator('fieldset', { hasText: 'Wind speed' }).getByLabel('Wind speed max (km/h)')
    ).toHaveValue('37');
  });
});
