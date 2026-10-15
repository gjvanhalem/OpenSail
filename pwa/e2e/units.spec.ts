import { test, expect } from './fixtures/test';

test.describe('Units (R14.4)', () => {
  test('gauges follow the units setting', async ({ page }) => {
    await page.goto('/settings');
    const units = page.getByLabel('Units');
    await units.selectOption('imperial');
    await expect(units).toHaveValue('imperial');

    await page.click('a[href="/instruments"]');
    await page.getByRole('button', { name: 'Simulator', exact: true }).click();
    await page.getByRole('button', { name: 'Start Simulator' }).click();
    await page.getByLabel('Realistic variation').uncheck();
    await page.getByLabel('Depth (m)').fill('3.5');
    await page.getByLabel('Speed (kn)', { exact: true }).fill('10');
    await page.getByLabel('Apparent wind speed (kn)').fill('20');

    // 3.5 m = 11.5 ft, 10 kn = 11.5 mph, 20 kn = 23.0 mph
    await expect(page.getByTestId('depth-readout')).toHaveText('11.5');
    await expect(page.getByText('feet', { exact: true })).toBeVisible();
    await expect(page.getByTestId('speed-readout')).toHaveText('11.5');
    await expect(page.getByTestId('wind-speed-readout')).toHaveText('23.0');
    await expect(page.getByText('mph').first()).toBeVisible();

    // Back to nautical without reloading
    await page.click('a[href="/settings"]');
    await page.getByLabel('Units').selectOption('nautical');
    await page.click('a[href="/instruments"]');
    await expect(page.getByTestId('depth-readout')).toHaveText('3.5');
    await expect(page.getByTestId('speed-readout')).toHaveText('10.0');
  });
});
