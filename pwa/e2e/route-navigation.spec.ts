import { test, expect } from '@playwright/test';
import { createRoute } from './helpers/routes';

const WAYPOINTS = [
  { name: 'Start', latitude: '52.00', longitude: '4.00' },
  { name: 'Finish', latitude: '52.10', longitude: '4.00' },
];

test.describe('Route navigation', () => {
  test('starts and stops a route from the Routes page', async ({ page }) => {
    await page.goto('/routes');
    await createRoute(page, 'Harbour run', WAYPOINTS);

    await page.getByRole('button', { name: 'Navigate Harbour run' }).click();
    await expect(page.getByText('Navigating', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Stop navigating Harbour run' }).click();
    await expect(page.getByText('Navigating', { exact: true })).toBeHidden();
  });

  test('starts and stops a saved route from the chart', async ({ page }) => {
    await page.goto('/routes');
    await createRoute(page, 'Chart run', WAYPOINTS);

    // Reload on the chart: saved routes load without visiting the Routes page
    await page.goto('/chart');
    await expect(page.getByLabel('Route to navigate')).toHaveValue(/.+/);
    await page.getByRole('button', { name: 'Start route' }).click();
    await page.getByRole('button', { name: 'Stop route' }).click();
    await expect(page.getByRole('button', { name: 'Start route' })).toBeVisible();
  });
});
