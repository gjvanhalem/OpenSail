import { test, expect } from './fixtures/test';
import type { Page } from '@playwright/test';
import { createRoute } from './helpers/routes';

/**
 * Phase 2 "done when": a simulated passage over a 5-waypoint route shows
 * correct cross-track error and ETA and switches waypoints automatically.
 * The protocol stub (NMEA 0183) moves the boat; the guidance panel on the
 * chart shows where it is relative to the route.
 */

// A dog-leg along the Dutch coast: N 1.2 nm, E 1.48 nm, N 1.8 nm, W 1.48 nm
const WAYPOINTS = [
  { name: 'WP1', latitude: '52.00', longitude: '4.00' },
  { name: 'WP2', latitude: '52.02', longitude: '4.00' },
  { name: 'WP3', latitude: '52.02', longitude: '4.04' },
  { name: 'WP4', latitude: '52.05', longitude: '4.04' },
  { name: 'WP5', latitude: '52.05', longitude: '4.00' },
];

async function openSimulator(page: Page) {
  await page.click('a[href="/instruments"]');
  await expect(page.getByText('Simulator NMEA0183')).toBeVisible();
}

/** Change the simulator's values one by one, then return to the chart */
async function setSimulator(page: Page, values: Record<string, string>) {
  await openSimulator(page);
  for (const [label, value] of Object.entries(values)) {
    await page.getByLabel(label, { exact: true }).fill(value);
  }
  await page.click('a[href="/chart"]');
}

const waypoint = (page: Page) => page.getByTestId('guidance-waypoint');
const xte = (page: Page) => page.getByTestId('guidance-xte');
const dtw = (page: Page) => page.getByTestId('guidance-distance');
const activeMarker = (page: Page) =>
  page.locator('[data-testid="waypoint-marker"][data-active="true"]');

test('a simulated passage over a 5-waypoint route', async ({ page }) => {
  await page.goto('/routes');
  await createRoute(page, 'Coastal passage', WAYPOINTS);

  // Boat stopped 0.6 nm due south of WP1
  await page.goto('/instruments');
  await page.getByRole('button', { name: 'Simulator', exact: true }).click();
  await page.getByRole('combobox').first().selectOption('NMEA0183');
  await page.getByRole('button', { name: 'Start Simulator' }).click();
  await page.getByLabel('Realistic variation').uncheck();
  await page.getByLabel('Speed (kn)', { exact: true }).fill('0');
  await page.getByLabel('Latitude (°)').fill('51.99');
  await page.getByLabel('Longitude (°)').fill('4');
  // The first leg starts where the boat is when the route starts
  await expect(page.getByTestId('position-readout')).toHaveText("51°59.400' N004°00.000' E");
  // Routes are started on the Routes page; the guidance shows on the chart
  await page.click('a[href="/routes"]');
  await page.getByRole('button', { name: 'Navigate Coastal passage' }).click();
  await page.click('a[href="/chart"]');
  const panel = page.getByRole('region', { name: 'Route guidance' });
  await expect(panel).toBeVisible();
  await expect(waypoint(page)).toHaveText('To 1/5: WP1');
  await expect(dtw(page)).toHaveText('0.60 nm');
  await expect(page.getByTestId('guidance-bearing')).toHaveText('000°');
  await expect(xte(page)).toHaveText('0.00 nm');
  await expect(page.getByTestId('guidance-eta-waypoint')).toHaveText('--');
  await expect(activeMarker(page)).toContainText('WP1');

  // Set 0.002° (0.074 nm) east of the first leg: right of track
  await setSimulator(page, { 'Latitude (°)': '51.995', 'Longitude (°)': '4.002' });
  await expect(xte(page)).toHaveText('0.07 nm R');
  await expect(dtw(page)).toHaveText('0.31 nm');
  await expect(waypoint(page)).toHaveText('To 1/5: WP1');

  // ...and 0.001° (0.037 nm) west of it: left of track
  await setSimulator(page, { 'Longitude (°)': '3.999' });
  await expect(xte(page)).toHaveText('0.04 nm L');

  // Inside the 0.1 nm arrival radius of WP1: switches to WP2
  await setSimulator(page, { 'Longitude (°)': '4', 'Latitude (°)': '51.9995' });
  await expect(waypoint(page)).toHaveText('To 2/5: WP2');
  await expect(activeMarker(page)).toContainText('WP2');
  await expect(xte(page)).toHaveText('0.00 nm');
  await expect(dtw(page)).toHaveText(/^1\.2\d nm$/);

  // Under way at 12 kn: 1.23 nm to WP2 is about 6 minutes, and the 6 nm
  // left to the end of the route about half an hour
  await setSimulator(page, { 'Heading (° true)': '0', 'Speed (kn)': '12' });
  await expect(page.getByTestId('guidance-eta-waypoint')).toHaveText(/^\d\d:\d\d \(in [56]m\)$/);
  await expect(page.getByTestId('guidance-eta-route')).toHaveText(/^\d\d:\d\d \(in (29|30)m\)$/);
  await expect(page.getByTestId('guidance-remaining')).toHaveText(/^(5\.9\d|6\.0\d) nm$/);

  // Stop and sail on through each remaining waypoint
  await setSimulator(page, { 'Speed (kn)': '0', 'Latitude (°)': '52.02' });
  await expect(waypoint(page)).toHaveText('To 3/5: WP3');
  // Now on the eastward leg WP2 to WP3
  await expect(page.getByTestId('guidance-bearing')).toHaveText(/^0(89|90)°$/);

  await setSimulator(page, { 'Longitude (°)': '4.04' });
  await expect(waypoint(page)).toHaveText('To 4/5: WP4');

  await setSimulator(page, { 'Latitude (°)': '52.05' });
  await expect(waypoint(page)).toHaveText('To 5/5: WP5');

  await setSimulator(page, { 'Longitude (°)': '4' });
  await expect(panel).toContainText('Arrived');
  await expect(panel).toContainText('End of route Coastal passage');
  await expect(activeMarker(page)).toHaveCount(0);
});
