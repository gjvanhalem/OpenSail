import { test, expect, serveChartFixtures } from './fixtures/test';

/**
 * Rijkswaterstaat inland ENC regions from the chart catalog are drawn with the
 * S-52-like style. The fixture is the Stavoren harbour cell (see e2e/fixtures/charts).
 */
test.describe('Inland ENC charts', () => {
  test.beforeEach(async ({ context, page }) => {
    await serveChartFixtures(context);
    await page.goto('/chart');
    await expect.poll(() => page.evaluate(() => window.__OPENSAIL_MAP__ !== undefined)).toBe(true);
    await page.evaluate(() => window.__OPENSAIL_MAP__!.jumpTo({ center: [5.33, 52.88], zoom: 13 }));
  });

  test('draws depth areas, fairways and waterway axes from the region archive', async ({ page }) => {
    const layerIds = () =>
      page.evaluate(() => window.__OPENSAIL_MAP__!.getStyle().layers.map((layer) => layer.id));
    await expect.poll(layerIds).toContain('enc-e2e-stavoren-depare');

    const featureCount = (sourceLayer: string) =>
      page.evaluate(
        (layer) =>
          window.__OPENSAIL_MAP__!.querySourceFeatures('enc-e2e-stavoren', { sourceLayer: layer }).length,
        sourceLayer
      );
    await expect.poll(() => featureCount('depare'), { timeout: 15000 }).toBeGreaterThan(0);
    expect(await featureCount('fairwy')).toBeGreaterThan(0);
    expect(await featureCount('wtwaxs')).toBeGreaterThan(0);

    // Depth areas go under the base map's names, and seamarks stay on top
    const ids = await layerIds();
    expect(ids.indexOf('enc-e2e-stavoren-depare')).toBeLessThan(ids.indexOf('water-name'));
    expect(ids.indexOf('enc-e2e-stavoren-depare')).toBeLessThan(ids.indexOf('seamarks'));
  });

  test('credits Rijkswaterstaat in the attribution', async ({ page }) => {
    await expect(page.locator('.maplibregl-ctrl-attrib')).toContainText('Rijkswaterstaat', { timeout: 15000 });
  });
});
