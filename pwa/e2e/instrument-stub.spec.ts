import { test, expect } from './fixtures/test';
import type { Page } from '@playwright/test';

/**
 * The protocol stub generates real NMEA 0183, NMEA 2000 and SeaTalk data and
 * feeds it through the same parsers as hardware. R1.2 / R14.3: position,
 * heading, SOG, depth and wind must reach the display within 1 second.
 */

const UPDATE_WITHIN = { timeout: 1000 };

async function startSimulator(page: Page, protocol: string) {
  await page.goto('/instruments');
  await page.getByRole('button', { name: 'Simulator', exact: true }).click();
  await page.getByRole('combobox').first().selectOption(protocol);
  await page.getByRole('button', { name: 'Start Simulator' }).click();
  await expect(page.getByText(`Simulator ${protocol}`)).toBeVisible();
  // Exact values from here on, so each change can be checked
  await page.getByLabel('Realistic variation').uncheck();
}

for (const protocol of ['NMEA0183', 'NMEA2000', 'SeaTalk']) {
  test.describe(`Instrument simulator: ${protocol}`, () => {
    test('position, heading, SOG, depth and wind update within 1 second', async ({ page }) => {
      await startSimulator(page, protocol);

      // Position: move the boat; SeaTalk's 0.01' resolution is too coarse to
      // see it sail a few metres within a second
      await page.getByLabel('Speed (kn)', { exact: true }).fill('0');
      await page.getByLabel('Latitude (°)').fill('52.1');
      await page.getByLabel('Longitude (°)').fill('-4.25');
      await expect(page.getByTestId('position-readout')).toHaveText(
        "52°06.000' N004°15.000' W",
        UPDATE_WITHIN
      );

      await page.getByLabel('Heading (° true)').fill('90');
      await expect(page.getByTestId('heading-readout')).toHaveText('090°', UPDATE_WITHIN);

      await page.getByLabel('Speed (kn)', { exact: true }).fill('7.5');
      await expect(page.getByTestId('sog-readout')).toHaveText('SOG 7.5', UPDATE_WITHIN);

      await page.getByLabel('Depth (m)').fill('3.5');
      await expect(page.getByTestId('depth-readout')).toHaveText('3.5', UPDATE_WITHIN);

      await page.getByLabel('Apparent wind speed (kn)').fill('25');
      await expect(page.getByTestId('wind-speed-readout')).toHaveText('25.0', UPDATE_WITHIN);
      await page.getByLabel('Apparent wind angle (°)').fill('120');
      await expect(page.getByTestId('wind-angle-readout')).toHaveText('120° Stbd', UPDATE_WITHIN);
    });
  });
}

test('the wind gauge shows apparent wind and works out the true wind', async ({ page }) => {
  await startSimulator(page, 'NMEA0183');
  await page.getByLabel('Heading (° true)').fill('341');
  await page.getByLabel('Speed (kn)', { exact: true }).fill('6');
  await page.getByLabel('Apparent wind speed (kn)').fill('14');
  await page.getByLabel('Apparent wind angle (°)').fill('46');

  const wind = page.getByRole('region', { name: 'WIND' });
  await expect(wind.getByText('APPARENT')).toBeVisible();
  await expect(wind.getByTestId('wind-angle-readout')).toHaveText('46° Stbd');
  // 14 kn at 46° while sailing 6 kn is 10.7 kn of true wind at 70°, from 051°
  await expect(wind.getByTestId('tws-readout')).toHaveText('10.7');
  await expect(wind.getByTestId('twa-readout')).toHaveText('70° Stbd');
  await expect(wind.getByTestId('twd-readout')).toHaveText('051°');
});

test('the simulator keeps feeding the chart after leaving the instruments page', async ({ page }) => {
  await startSimulator(page, 'NMEA0183');
  await page.click('a[href="/chart"]');
  await expect(page.getByTestId('vessel-marker')).toBeVisible();

  await page.click('a[href="/instruments"]');
  await expect(page.getByText('Simulator NMEA0183')).toBeVisible();
  // The connection can still be stopped after the page was left and reopened
  await page.getByRole('button', { name: 'Disconnect' }).click();
  await expect(page.getByText('Simulator NMEA0183')).toBeHidden();
});
