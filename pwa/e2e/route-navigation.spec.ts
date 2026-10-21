import { test, expect } from './fixtures/test';
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

  test('a route started on the Routes page can be stopped from the chart', async ({ page }) => {
    await page.goto('/routes');
    await createRoute(page, 'Chart run', WAYPOINTS);
    await page.getByRole('button', { name: 'Navigate Chart run' }).click();

    await page.click('a[href="/chart"]');
    const guidance = page.getByRole('region', { name: 'Route guidance' });
    await expect(guidance).toContainText('Chart run');
    await guidance.getByRole('button', { name: 'Stop route' }).click();
    await expect(guidance).toBeHidden();
    // The chart has no route picker of its own: one place to start a route
    await expect(page.getByLabel('Route to navigate')).toHaveCount(0);
  });
});

test('shows a route summary with total distance, ETA and course changes', async ({ page }) => {
  await page.goto('/routes');
  await createRoute(page, 'Dog-leg', [
    { name: 'WP1', latitude: '52.00', longitude: '4.00' },
    { name: 'WP2', latitude: '52.02', longitude: '4.00' },
    { name: 'WP3', latitude: '52.02', longitude: '4.04' },
  ]);

  await page.getByRole('heading', { name: 'Dog-leg', exact: true }).click();
  const summary = page.getByRole('region', { name: 'Route summary' });
  // 1.20 nm north, then 1.48 nm east
  await expect(summary.getByTestId('summary-distance')).toHaveText('2.68 nm');
  await expect(summary.getByTestId('summary-eta')).toHaveText(/\d\d:\d\d$/);
  await expect(summary).toContainText('Course changes (1)');
  await expect(summary.getByTestId('summary-course-changes')).toContainText('Start: WP1');
  await expect(summary.getByTestId('summary-course-changes')).toContainText(
    '2. WP2000° → 090° 90° stbd'
  );
});
