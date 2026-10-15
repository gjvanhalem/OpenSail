import { test, expect } from './fixtures/test';
import { seedRoutes, zigZag } from './helpers/routes';
import { hundredHourTrack, seedTrack } from './helpers/tracks';

/**
 * Phase 2 stress tests in the browser: a route with 50+ waypoints (R2.1),
 * 100 hours of track data (R9.2) and 10+ routes available offline (R5.3).
 */

test('a route with 60 waypoints can be viewed, summarised and navigated (R2.1)', async ({ page }) => {
  await page.goto('/routes');
  await seedRoutes(page, [{ id: 'route_long', name: 'Long haul', waypoints: zigZag(60) }]);
  await page.reload();

  await expect(page.getByText('60 waypoints')).toBeVisible();
  await page.getByRole('heading', { name: 'Long haul' }).click();
  const summary = page.getByRole('region', { name: 'Route summary' });
  await expect(summary).toContainText('Course changes (58)');
  await expect(summary.getByTestId('summary-course-changes').getByRole('listitem')).toHaveCount(59);

  await page.getByRole('button', { name: 'Navigate Long haul' }).click();
  await page.click('a[href="/chart"]');
  await expect(page.getByTestId('guidance-waypoint')).toHaveText('To 1/60: WP1');
  await expect(page.getByTestId('waypoint-marker')).toHaveCount(60);
});

test('100 hours of track data loads and converts to a route (R9.2)', async ({ page }) => {
  test.slow();
  const errors: Error[] = [];
  page.on('pageerror', (error) => errors.push(error));
  await page.goto('/tracks');
  await seedTrack(page, { id: 'track_100h', name: 'Summer cruise', points: hundredHourTrack() });
  await page.reload();

  await page.getByRole('heading', { name: 'Summer cruise' }).click();
  await expect(page.getByTestId('convert-preview')).toContainText('36000 track points →');
  await page.getByRole('button', { name: 'Convert to route' }).click();
  await expect(page.getByRole('status')).toContainText('Route “Summer cruise (route)” created');

  // The chart draws every saved track, this one included, and the new
  // route can be started from there
  await page.click('a[href="/chart"]');
  await expect(page.getByLabel('Route to navigate')).toHaveValue(/.+/);
  await expect(page.getByLabel('Route to navigate').locator('option')).toHaveText([
    'Summer cruise (route)',
  ]);
  expect(errors).toEqual([]);
});

test('12 saved routes are all there offline (R5.3)', async ({ page, context }) => {
  await page.goto('/routes');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await seedRoutes(
    page,
    Array.from({ length: 12 }, (_, i) => ({
      id: `route_offline_${i + 1}`,
      name: `Passage ${i + 1}`,
      waypoints: zigZag(3 + i),
    }))
  );

  await context.setOffline(true);
  await page.reload();

  for (let i = 1; i <= 12; i++) {
    await expect(page.getByRole('heading', { name: `Passage ${i}`, exact: true })).toBeVisible();
  }
  await page.click('a[href="/chart"]');
  await expect(page.getByLabel('Route to navigate').locator('option')).toHaveCount(12);
});
