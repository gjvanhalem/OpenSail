import { test, expect } from './fixtures/test';
import type { Page } from '@playwright/test';

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

/** 52.1 N 4.2 E on the instruments page */
const SPOT_READOUT = "52°06.000' N004°12.000' E";

/** Change simulator values; the stub keeps running while the page changes */
async function setStub(page: Page, values: Record<string, string>) {
  await page.click('a[href="/instruments"]');
  for (const [label, value] of Object.entries(values)) {
    await page.getByLabel(label, { exact: true }).fill(value);
  }
  await page.click('a[href="/chart"]');
}

/** Wait until the app has stored a safety event of this type */
async function waitForEvent(page: Page, type: string) {
  await expect
    .poll(() =>
      page.evaluate(
        (type) =>
          new Promise<number>((resolve) => {
            const request = indexedDB.open('NavigationDB');
            request.onsuccess = () => {
              const db = request.result;
              const all = db.transaction('safetyEvents').objectStore('safetyEvents').getAll();
              all.onsuccess = () => {
                resolve(all.result.filter((e: { type: string }) => e.type === type).length);
                db.close();
              };
            };
          }),
        type
      )
    )
    .toBeGreaterThan(0);
}

/**
 * Whether the chart has a style layer with this id. Right after navigating
 * to the chart the map exists before its style does, and MapLibre throws then.
 */
const mapHasLayer = (page: Page, id: string) =>
  page.evaluate((id) => {
    try {
      return window.__OPENSAIL_MAP__?.getLayer(id) !== undefined;
    } catch {
      return false;
    }
  }, id);

const mobButton = (page: Page) => page.getByRole('button', { name: 'Man overboard', exact: true });
const panel = (page: Page) => page.getByRole('region', { name: 'Man overboard' });
const html = (page: Page) => page.locator('html');

test.describe('Man overboard', () => {
  test('marks the spot, sounds the alarm and guides back to it', async ({ page }) => {
    await startStub(page, '52.1', '4.2');
    await expect(page.getByTestId('position-readout')).toHaveText(SPOT_READOUT);
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
    // The spot on the chart (R12.2)
    await expect(page.getByTestId('mob-marker')).toBeVisible();

    // Sailed on 0.002° north (222 m) heading east: the spot is astern to starboard
    await setStub(page, { 'Latitude (°)': '52.102', 'Heading (° true)': '90' });
    await expect(page.getByTestId('mob-bearing')).toHaveText('180°');
    await expect(page.getByTestId('mob-distance')).toHaveText(/^22[23] m$/);
    await expect(page.getByTestId('mob-turn')).toHaveText('Turn starboard 90°');
    // ...with a line from the boat back to it
    await expect.poll(() => mapHasLayer(page, 'mob-line')).toBe(true);

    // Further away: shown in nautical miles
    await setStub(page, { 'Latitude (°)': '52.12', 'Longitude (°)': '4.2' });
    await expect(page.getByTestId('mob-distance')).toHaveText('1.20 nm');

    // Guidance is on every page
    await page.click('a[href="/routes"]');
    await expect(panel(page)).toBeVisible();
    await expect(page.getByTestId('mob-bearing')).toHaveText('180°');
  });

  test("doesn't cover the chart's not-for-navigation note", async ({ page }) => {
    await page.goto('/chart');
    const note = page.getByRole('button', { name: /Not for navigation/ });
    const noteBox = (await note.boundingBox())!;
    const mobBox = (await mobButton(page).boundingBox())!;
    // The note is at the top of the chart, the MOB button at the bottom
    expect(mobBox.y).toBeGreaterThanOrEqual(noteBox.y + noteBox.height);
    // ...so the note can still be opened (a covered button fails this click)
    await note.click({ trial: true });
  });

  test('stays on screen in fullscreen mode and survives a reload', async ({ page }) => {
    await startStub(page, '52.1', '4.2');
    await expect(page.getByTestId('position-readout')).toHaveText(SPOT_READOUT);
    await page.click('a[href="/chart"]');
    await page.getByRole('button', { name: 'Toggle fullscreen' }).click();
    await expect(mobButton(page)).toBeVisible();

    await mobButton(page).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Silence' }).click();
    await expect(page.getByTestId('mob-position')).toHaveText("52°06.000' N 004°12.000' E");

    // A crash or reload keeps the MOB spot
    await waitForEvent(page, 'mob_activated');
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

    await waitForEvent(page, 'mob_cleared');
    await page.reload();
    await expect(mobButton(page)).toBeVisible();
    await expect(panel(page)).toBeHidden();
  });

  test('it can be raised before any fix', async ({ page }) => {
    await page.goto('/chart');
    await mobButton(page).click();
    await expect(page.getByRole('alertdialog')).toContainText('MAN OVERBOARD');
    await page.getByRole('alertdialog').getByRole('button', { name: 'Silence' }).click();
    await expect(page.getByTestId('mob-waiting')).toHaveText('Waiting for a position fix…');

    // The first fix becomes the spot: the stub starts at its default position
    await startStub(page, '52.3', '4.1');
    await expect(page.getByTestId('mob-position')).toHaveText("51°59.550' N 004°04.950' E");
    // ...and later fixes don't move it
    await expect(page.getByTestId('position-readout')).toHaveText("52°18.000' N004°06.000' E");
    await expect(page.getByTestId('mob-position')).toHaveText("51°59.550' N 004°04.950' E");
  });
});
