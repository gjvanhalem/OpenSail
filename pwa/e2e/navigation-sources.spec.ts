import { test, expect } from './fixtures/test';

test.describe('Navigation sources', () => {
  test('shows GPS as the source while only GPS reports', async ({ page }) => {
    await page.goto('/settings');
    await page.getByRole('radio', { name: /Simulator/ }).check();
    await expect(page.getByTestId('navigation-source-position-active')).toHaveText(
      'Now from: GPS'
    );
    await expect(page.getByTestId('navigation-source-cogSog-active')).toHaveText('Now from: GPS');
    // The simulator has no compass
    await expect(page.getByTestId('navigation-source-heading-active')).toHaveText(
      'Now from: none'
    );
  });

  test('the source choice per value is saved', async ({ page }) => {
    await page.goto('/settings');
    const heading = page.getByLabel('Heading', { exact: true });
    await expect(heading).toHaveValue('auto');
    await heading.selectOption('instrument');
    // The select is controlled by the store, which updates once the setting is saved
    await expect(heading).toHaveValue('instrument');
    await page.reload();
    await expect(page.getByLabel('Heading', { exact: true })).toHaveValue('instrument');
    await expect(page.getByLabel('Position', { exact: true })).toHaveValue('auto');
  });
});
