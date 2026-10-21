import { test, expect } from './fixtures/test';

/**
 * Instruments over Wi-Fi: OpenSail connects to a WebSocket (the OpenSail
 * bridge relaying a Pcnautic / pypilot autopilot on 192.168.14.1:20220).
 * Playwright plays the bridge here, sending what the autopilot sends.
 */

function checksum(body: string): string {
  let sum = 0;
  for (const char of body) sum ^= char.charCodeAt(0);
  return sum.toString(16).toUpperCase().padStart(2, '0');
}
const nmea = (body: string) => `$${body}*${checksum(body)}`;

test('connects over Wi-Fi and shows the autopilot heading, corrected for variation', async ({ page }) => {
  const fromApp: string[] = [];
  await page.routeWebSocket('ws://localhost:10110', (ws) => {
    ws.onMessage((message) => fromApp.push(String(message)));
    const timer = setInterval(() => {
      // Several sentences per message, as the bridge batches them
      ws.send(
        [nmea('APHDM,100.0,M'), nmea('APRSA,-5.0,A,,V'), nmea('APXDR,A,-1.0,D,PTCH,A,8.0,D,ROLL')].join(
          '\r\n'
        ) + '\r\n'
      );
    }, 200);
    ws.onClose(() => clearInterval(timer));
  });

  // The Netherlands: about 2° east
  await page.goto('/settings');
  const variation = page.getByLabel('Magnetic variation (° east, negative for west)');
  await variation.fill('2');
  await expect(variation).toHaveValue('2');

  await page.click('a[href="/instruments"]');
  await page.getByRole('button', { name: 'Wi-Fi', exact: true }).click();
  await expect(page.getByLabel('Address')).toHaveValue('ws://localhost:10110');
  await page.getByRole('button', { name: 'Connect over Wi-Fi' }).click();

  await expect(page.getByText('Wi-Fi NMEA0183 (ws://localhost:10110)')).toBeVisible();
  // Magnetic 100° + 2° east = 102° true
  await expect(page.getByTestId('heading-readout')).toHaveText('102°');
  // Rudder and attitude arrive as instrument data
  // What the instruments send is folded away under Raw data
  await page.getByText('Raw data', { exact: true }).click();
  await expect(page.getByText('rudder', { exact: true })).toBeVisible();
  await expect(page.getByText('attitude', { exact: true })).toBeVisible();
  // Read-only: the app sends nothing to the autopilot
  expect(fromApp).toEqual([]);
});

test('remembers the Wi-Fi address that worked', async ({ page }) => {
  await page.routeWebSocket('ws://localhost:10111', () => {});
  await page.goto('/instruments');
  await page.getByRole('button', { name: 'Wi-Fi', exact: true }).click();
  await page.getByLabel('Address').fill('ws://localhost:10111');
  await page.getByRole('button', { name: 'Connect over Wi-Fi' }).click();
  await expect(page.getByText('Wi-Fi NMEA0183 (ws://localhost:10111)')).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: 'Wi-Fi', exact: true }).click();
  await expect(page.getByLabel('Address')).toHaveValue('ws://localhost:10111');
});
