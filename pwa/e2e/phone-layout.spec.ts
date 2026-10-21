import { test, expect } from './fixtures/test';

/**
 * On a phone the tabs are in a bottom bar, and the safety actions (man overboard,
 * anchor watch) are one tap away on every page.
 */
test.use({ viewport: { width: 375, height: 740 } });

test('a phone has a bottom bar with the five tabs and no top tabs', async ({ page }) => {
  await page.goto('/chart');
  const navs = page.getByRole('navigation', { name: 'Main' });
  await expect(navs).toHaveCount(1);
  const bottom = navs.first();
  for (const name of ['Chart', 'Routes', 'Tracks', 'Instruments', 'Settings']) {
    await expect(bottom.getByRole('link', { name })).toBeVisible();
  }
  // The bar sits at the bottom of the screen
  const box = await bottom.boundingBox();
  expect(box!.y + box!.height).toBeGreaterThan(700);

  await bottom.getByRole('link', { name: 'Tracks' }).click();
  await expect(page).toHaveURL('/tracks');
  await expect(bottom.getByRole('link', { name: 'Tracks' })).toHaveAttribute('aria-current', 'page');
});

test('anchor watch is one tap away on a phone', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Anchor watch', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Anchor watch' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Man overboard', exact: true })).toBeVisible();
});

test('the touch targets are at least 44 px', async ({ page }) => {
  await page.goto('/chart');
  const targets = [
    page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Routes' }),
    page.getByRole('button', { name: 'Anchor watch', exact: true }),
    page.getByRole('button', { name: 'Man overboard', exact: true }),
    page.getByRole('button', { name: 'Toggle fullscreen' }),
  ];
  for (const target of targets) {
    const box = await target.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.width).toBeGreaterThanOrEqual(44);
  }
});
