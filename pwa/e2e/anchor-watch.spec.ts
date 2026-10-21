import { test, expect } from './fixtures/test';
import type { Page } from '@playwright/test';

/**
 * Anchor watch (R8) driven by the NMEA 0183 protocol stub: drop anchor, swing
 * inside the circle without an alarm, drag out of it and get the alarm, and
 * every event logged with a time stamp.
 */

async function startStub(page: Page) {
  await page.goto('/instruments');
  await page.getByRole('button', { name: 'Simulator', exact: true }).click();
  await page.getByRole('combobox').first().selectOption('NMEA0183');
  await page.getByRole('button', { name: 'Start Simulator' }).click();
  await page.getByLabel('Realistic variation').uncheck();
  await page.getByLabel('Speed (kn)', { exact: true }).fill('0');
  await page.getByLabel('Latitude (°)').fill('52.2');
  await page.getByLabel('Longitude (°)').fill('4.3');
  await expect(page.getByTestId('position-readout')).toHaveText("52°12.000' N004°18.000' E");
}

/** Move the simulated boat; stays on the instruments page */
async function moveTo(page: Page, latitude: string) {
  await page.getByLabel('Latitude (°)').fill(latitude);
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

const circleColour = (page: Page) =>
  page.evaluate(() => {
    try {
      return window.__OPENSAIL_MAP__?.getPaintProperty('anchor-watch-circle-line', 'line-color');
    } catch {
      return undefined;
    }
  });

const panel = (page: Page) => page.getByRole('region', { name: 'Anchor watch' });
const status = (page: Page) => page.getByTestId('anchor-status');
const overlay = (page: Page) => page.getByRole('alertdialog');

async function dropAnchor(page: Page, radius: string) {
  await page.getByRole('button', { name: 'Anchor watch', exact: true }).click();
  await panel(page).getByLabel('Anchor watch radius (m)').fill(radius);
  await panel(page).getByLabel('Anchor watch radius (m)').press('Enter');
  await panel(page).getByRole('button', { name: 'Drop anchor here' }).click();
  await expect(status(page)).toHaveText('Holding');
}

test.describe('Anchor watch', () => {
  test('alarms when the boat drags out of the circle, and logs it', async ({ page }) => {
    await startStub(page);
    await dropAnchor(page, '30');
    await expect(page.getByTestId('anchor-distance')).toHaveText('0 m / 30 m');

    // The circle and the anchor on the chart (R8.3)
    await page.click('a[href="/chart"]');
    await expect(page.getByTestId('anchor-marker')).toHaveAttribute('data-dragging', 'false');
    await expect.poll(() => mapHasLayer(page, 'anchor-watch-circle-fill')).toBe(true);
    await expect.poll(() => circleColour(page)).toBe('#2563eb');
    await page.click('a[href="/instruments"]');
    await expect(page.locator('html')).toHaveAttribute('data-wake-lock', /^(held|denied|unsupported)$/);

    // Swinging 22 m from the anchor: inside, no alarm
    await moveTo(page, '52.2002');
    await expect(page.getByTestId('anchor-distance')).toHaveText('22 m / 30 m');
    await page.waitForTimeout(6000);
    await expect(overlay(page)).toBeHidden();
    await expect(status(page)).toHaveText('Holding');

    // Dragged to 56 m: the alarm sounds once it has been outside for a few seconds
    await moveTo(page, '52.2005');
    await expect(overlay(page)).toContainText('ANCHOR DRAGGING: 56 m from the anchor (circle 30 m)', {
      timeout: 15_000,
    });
    await expect(page.locator('html')).toHaveAttribute('data-alarm-sound', 'alarm');
    await overlay(page).getByRole('button', { name: 'Silence' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-alarm-sound', 'off');
    await expect(status(page)).toHaveText('DRAGGING');
    // The circle turns red on the chart
    await page.click('a[href="/chart"]');
    await expect(page.getByTestId('anchor-marker')).toHaveAttribute('data-dragging', 'true');
    await expect.poll(() => circleColour(page)).toBe('#dc2626');
    await page.click('a[href="/instruments"]');

    // Re-anchored (back at the anchor)
    await moveTo(page, '52.2');
    await expect(status(page)).toHaveText('Holding');

    const log = page.getByTestId('anchor-log');
    await expect(log.locator('li')).toHaveCount(3);
    await expect(log.locator('li').nth(0)).toHaveText(/^\d\d:\d\d:\d\dBack inside \(0 m\)$/);
    await expect(log.locator('li').nth(1)).toHaveText(/^\d\d:\d\d:\d\dDRAGGING alarm \(56 m\)$/);
    await expect(log.locator('li').nth(2)).toHaveText(/^\d\d:\d\d:\d\dAnchor dropped, circle 30 m$/);

    // The events are in IndexedDB with time stamps, for the logbook
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            new Promise<string[]>((resolve) => {
              const request = indexedDB.open('NavigationDB');
              request.onsuccess = () => {
                const db = request.result;
                const all = db.transaction('safetyEvents').objectStore('safetyEvents').getAll();
                all.onsuccess = () => {
                  resolve(
                    all.result
                      .filter((e: { timestamp: unknown }) => e.timestamp instanceof Date)
                      .map((e: { type: string }) => e.type)
                      .sort()
                  );
                  db.close();
                };
              };
            })
        )
      )
      .toEqual(['anchor_back_inside', 'anchor_drag_alarm', 'anchor_dropped']);
  });

  test('survives a reload, minimises to a status button, and stops with two taps', async ({
    page,
  }) => {
    await startStub(page);
    await dropAnchor(page, '40');
    await page.waitForTimeout(500);

    // The protocol stub doesn't survive a reload, but the watch does
    await page.reload();
    await expect(page.getByTestId('anchor-status-pill')).toBeVisible();
    await page.getByTestId('anchor-status-pill').click();
    await expect(page.getByTestId('anchor-distance')).toHaveText('-- / 40 m');
    await expect(panel(page).getByTestId('anchor-position')).toHaveText(
      "52°12.000' N 004°18.000' E"
    );

    await panel(page).getByRole('button', { name: 'Minimise anchor watch' }).click();
    await expect(panel(page)).toBeHidden();
    await page.getByTestId('anchor-status-pill').click();

    await panel(page).getByRole('button', { name: 'Raise anchor (stop watch)' }).click();
    await panel(page).getByRole('button', { name: 'Tap again to stop the watch' }).click();
    await page.click('a[href="/chart"]');
    await expect(page.getByTestId('anchor-marker')).toHaveCount(0);
    await expect.poll(() => mapHasLayer(page, 'anchor-watch-circle-fill')).toBe(false);
    await expect(page.getByRole('button', { name: 'Drop anchor here' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-wake-lock', 'off');
  });

  test('alarms when the position stops coming in', async ({ page }) => {
    await page.clock.install();
    await startStub(page);
    await dropAnchor(page, '50');

    await page.getByRole('button', { name: 'Disconnect' }).click();
    await page.clock.fastForward(70_000);
    await expect(overlay(page)).toContainText('no usable position', { timeout: 15_000 });
    await expect(status(page)).toHaveText('NO POSITION');
  });
});
