import { test, expect, serveChartFixtures } from './fixtures/test';
import { addWaypoint, createRoute } from './helpers/routes';

/**
 * Route hazard warnings (R2.5) from the inland ENC: the Stavoren fixture has a
 * 2 m depth area at about 52.834 N 5.204–5.208 E. The default safety depth is
 * the depth alert's 3 m.
 */
const westOfShoal = { name: 'West', latitude: '52.8345', longitude: '5.2' };
const eastOfShoal = { name: 'East', latitude: '52.8345', longitude: '5.212' };

test.describe('Route hazard warnings', () => {
  test.beforeEach(async ({ context, page }) => {
    await serveChartFixtures(context);
    await page.goto('/routes');
  });

  test('warns while planning a route across shallow water, on the chart and in a list', async ({ page }) => {
    await page.getByRole('button', { name: 'New Route' }).click();
    await page.getByLabel('Route Name').fill('Across the shoal');
    await addWaypoint(page, westOfShoal);
    await addWaypoint(page, eastOfShoal);

    const list = page.getByRole('region', { name: 'Route hazards' });
    await expect(list).toContainText('safety depth of 3 m');
    await expect(list).toContainText(/Leg 1 crosses water shallower than 3 m \(least depth 2\.0 m\)/, {
      timeout: 15000,
    });
    await expect(page.getByTestId('route-hazard-marker').first()).toBeAttached();
    expect(await page.getByTestId('route-hazard-marker').first().getAttribute('aria-label')).toMatch(
      /shallower than 3 m/
    );
  });

  test('shows the warnings for a saved route too', async ({ page }) => {
    await createRoute(page, 'Saved across the shoal', [westOfShoal, eastOfShoal]);
    await page.getByRole('heading', { name: 'Saved across the shoal', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Route hazards' })).toContainText('shallower than 3 m', {
      timeout: 15000,
    });
  });

  test('says when a route leaves the charted area', async ({ page }) => {
    await page.getByRole('button', { name: 'New Route' }).click();
    await addWaypoint(page, { name: 'In', latitude: '52.9', longitude: '5.25' });
    await addWaypoint(page, { name: 'Out', latitude: '52.9', longitude: '5.45' });
    await expect(page.getByRole('region', { name: 'Route hazards' })).toContainText(/no chart depth data/, {
      timeout: 15000,
    });
  });
});
