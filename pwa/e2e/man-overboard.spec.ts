import { test, expect, type Page } from '@playwright/test';

/**
 * Man overboard (R12) driven by the NMEA 0183 protocol stub: one tap records
 * the position, sounds the alarm and shows bearing and distance back to the
 * spot as the boat moves.
 */

async function startStub(page: Page, latitude: string, longitude: string) {
  await page.goto('/instruments');
  await page.getByRole('button', { name: 'Simulator', exact: true }).click();
  await page.getByRole('combobox').first().selectOption('NMEA0183');
  await page.getByRole('button', { name: 'Start Simulator' }).click();
  await page.getByLabel('Realistic variation').uncheck();
  await page.getByLabel('Speed (kn)', { exact: true }).fill('0');
  await page.getByLabel('Latitude (°)').fill(latitude);
  await page.getByLabel('Longitude (°)').fill(longitude);
}

/** Change simulator values; the stub keeps running while the page changes */
async function setStub(page: Page, values: Record<string, string>) {
  await page.click('a[href="/instruments"]');
  for (const [label, value] of Object.entries(values)) {
    await page.getByLabel(label, { exact: true }).fill(value);
  }
  await page.click('a[href="/chart"]');
}

const mobButton = (page: Page) => page.getByRole('button', { name: 'Man overboard', exact: true });
const panel = (page: Page) => page.getByRole('region', { name: 'Man overboard' });
const html = (page: Page) => page.locator('html');

test.describe('Man overboard', () => {
  test('marks the spot, sounds the alarm and guides back to it', async ({ page }) => {
    await startStub(page, '52.1', '4.2');
    await expect(page.getByTestId('position-readout')).toHaveText("52°06.000' N004°12.000' E");
    await page.click('a[href="/chart"]');

    await mobButton(page).click();
    // Within a second: the alarm and the spot (R12.1, R12.5)
    const overlay = page.getByRole('alertdialog');
    await expect(overlay).toContainText('MAN OVERBOARD', { timeout: 1000 });
    await expect(page.getByTestId('mob-position')).toHaveText("52°06.000' N 004°12.000' E", {
      timeout: 1000,
    });
    await expect(html(page)).toHaveAttribute('data-alarm-sound', 'alarm');
    await expect(html(page)).toHaveAttribute('data-alarm-audio', 'running');
    await expect(mobButton(page)).toHaveAttribute('aria-pressed', 'true');

    await overlay.getByRole('button', { name: 'Silence' }).click();
    await expect(overlay).toBeHidden();
    await expect(html(page)).toHaveAttribute('data-alarm-sound', 'off');
    // Silenced, but MOB guidance stays and the screen is kept on
    await expect(panel(page)).toBeVisible();
    await expect(html(page)).toHaveAttribute('data-wake-lock', /^(held|denied|unsupported)$/);
    await expect(page.getByTestId('mob-distance')).toHaveText('0 m');

    // Sailed on 0.002° north (222 m) heading east: the spot is astern to starboard
    await setStub(page, { 'Latitude (°)': '52.102', 'Heading (° true)': '90' });
    await expect(page.getByTestId('mob-bearing')).toHaveText('180°');
    await expect(page.getByTestId('mob-distance')).toHaveText(/^22[23] m$/);
    await expect(page.getByTestId('mob-turn')).toHaveText('Turn starboard 90°');

    // Further away: shown in nautical miles
    await setStub(page, { 'Latitude (°)': '52.12', 'Longitude (°)': '4.2' });
    await expect(page.getByTestId('mob-distance')).toHaveText('1.20 nm');

    // Guidance is on every page
    await page.click('a[href="/routes"]');
    await expect(panel(page)).toBeVisible();
    await expect(page.getByTestId('mob-bearing')).toHaveText('180°');
  });

  test('stays on screen in fullscreen mode and survives a reload', async ({ page }) => {
    await startStub(page, '52.1', '4.2');
    await page.click('a[href="/chart"]');
    await page.getByRole('button', { name: 'Toggle fullscreen' }).click();
    await expect(mobButton(page)).toBeVisible();

    await mobButton(page).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Silence' }).click();
    await expect(page.getByTestId('mob-position')).toHaveText("52°06.000' N 004°12.000' E");

    // A crash or reload keeps the MOB spot
    await page.reload();
    await expect(panel(page)).toBeVisible();
    await expect(page.getByTestId('mob-position')).toHaveText("52°06.000' N 004°12.000' E");
    await expect(mobButton(page)).toHaveAttribute('aria-pressed', 'true');

    // Clearing needs a second tap
    await panel(page).getByRole('button', { name: 'Clear MOB' }).click();
    await expect(panel(page)).toBeVisible();
    await panel(page).getByRole('button', { name: 'Tap again to clear' }).click();
    await expect(panel(page)).toBeHidden();
    await expect(mobButton(page)).toHaveAttribute('aria-pressed', 'false');

    await page.reload();
    await expect(mobButton(page)).toBeVisible();
    await expect(panel(page)).toBeHidden();
  });

  test('the sidebar button also raises it, before any fix', async ({ page }) => {
    await page.goto('/chart');
    await page.getByRole('button', { name: /Man Overboard$/ }).click();
    await expect(page.getByRole('alertdialog')).toContainText('MAN OVERBOARD');
    await page.getByRole('alertdialog').getByRole('button', { name: 'Silence' }).click();
    await expect(page.getByTestId('mob-waiting')).toHaveText('Waiting for a position fix…');

    // The first fix becomes the spot
    await startStub(page, '52.3', '4.1');
    await expect(page.getByTestId('mob-position')).toHaveText("52°18.000' N 004°06.000' E");
  });
});
