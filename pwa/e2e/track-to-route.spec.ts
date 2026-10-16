import { test, expect } from './fixtures/test';
import { lShapedTrack, seedTrack } from './helpers/tracks';

test.describe('Tracks: colours and converting to a route', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tracks');
    await seedTrack(page, { id: 'track_e2e_l', name: 'Harbour loop', points: lShapedTrack() });
    await page.reload();
    await page.getByRole('heading', { name: 'Harbour loop' }).click();
  });

  test('picks a colour for a track and keeps it after a reload', async ({ page }) => {
    await page.getByRole('button', { name: 'Green' }).click();
    await expect(page.getByRole('button', { name: 'Green' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('track-color').first()).toHaveCSS(
      'background-color',
      'rgb(22, 163, 74)'
    );

    await page.reload();
    await page.getByRole('heading', { name: 'Harbour loop' }).click();
    await expect(page.getByRole('button', { name: 'Green' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('converts a recorded track into a simplified route', async ({ page }) => {
    await expect(page.getByTestId('convert-preview')).toHaveText('201 track points → 3 waypoints');
    // A tighter tolerance keeps the wobble
    await page.getByLabel(/^Simplify/).fill('0.001');
    await expect(page.getByTestId('convert-preview')).not.toHaveText(/→ 3 waypoints/);
    await page.getByLabel(/^Simplify/).fill('0.05');

    await page.getByRole('button', { name: 'Convert to route' }).click();
    await expect(page.getByRole('status')).toContainText(
      'Route “Harbour loop (route)” created with 3 waypoints'
    );

    await page.getByRole('link', { name: 'Open Routes' }).click();
    await expect(page.getByRole('heading', { name: 'Harbour loop (route)' })).toBeVisible();
    await expect(page.getByText('3 waypoints')).toBeVisible();
    await page.getByRole('heading', { name: 'Harbour loop (route)' }).click();
    await expect(page.getByTestId('summary-distance')).toHaveText(/^2\.6\d nm$/);
  });
});
