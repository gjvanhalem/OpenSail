import { test, expect } from './fixtures/test';

/**
 * On a phone-sized screen the Tools sidebar (anchor watch, MOB, ...) starts closed and opens
 * from the menu button. It used to close again right after opening below 768 px.
 */
test.use({ viewport: { width: 375, height: 740 } });

test('the Tools sidebar opens on a phone and gives the anchor watch', async ({ page }) => {
  await page.goto('/chart');
  const anchorWatch = page.getByRole('button', { name: /Anchor Watch$/ });
  await expect(anchorWatch).toBeHidden();

  await page.getByRole('button', { name: 'Toggle sidebar' }).click();
  await expect(anchorWatch).toBeVisible();
  await anchorWatch.click();
  await expect(page.getByRole('region', { name: 'Anchor watch' })).toBeVisible();
});
