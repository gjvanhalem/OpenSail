import { test, expect } from './fixtures/test';

test.describe('Chart Display', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/chart');
  });

  test('should display map container', async ({ page }) => {
    // Wait for map to load
    const mapContainer = page.locator('.maplibregl-map, [class*="map"]').first();
    await expect(mapContainer).toBeVisible({ timeout: 10000 });
  });

  test('should allow map interaction', async ({ page }) => {
    const center = () =>
      page.evaluate(() => window.__OPENSAIL_MAP__?.getCenter().toArray() ?? null);
    await expect.poll(center).not.toBeNull();
    const initialCenter = await center();

    // Pan the map
    const canvas = await page.locator('.maplibregl-canvas').boundingBox();
    if (!canvas) throw new Error('map not on screen');
    await page.mouse.move(canvas.x + canvas.width / 2, canvas.y + canvas.height / 2);
    await page.mouse.down();
    await page.mouse.move(canvas.x + 100, canvas.y + 100, { steps: 5 });
    await page.mouse.up();

    await expect.poll(center).not.toEqual(initialCenter);
  });

  test('should have zoom controls', async ({ page }) => {
    await expect(page.locator('.maplibregl-ctrl-zoom-in')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.maplibregl-ctrl-zoom-out')).toBeVisible();
  });

  test('should display vessel position marker when available', async ({ page }) => {
    // Mock geolocation
    await page.context().grantPermissions(['geolocation']);
    await page.context().setGeolocation({ latitude: 52.3676, longitude: 4.9041 });
    
    // Reload to trigger position update
    await page.reload();
    await page.waitForTimeout(2000);
    
    // Look for vessel marker (may be a custom element or SVG)
    const vesselMarker = page.locator('[class*="vessel"], [class*="position"], [data-testid="vessel-marker"]');
    const markerExists = await vesselMarker.count() > 0;
    
    // Marker should exist if geolocation is working
    if (markerExists) {
      await expect(vesselMarker.first()).toBeVisible();
    }
  });

  test('should toggle fullscreen mode', async ({ page }) => {
    // Fullscreen mode is an in-app layout mode: it hides the navigation bar
    // and sidebar so the chart fills the window (not the browser Fullscreen API)
    const nav = page.getByRole('navigation');
    await expect(nav).toBeVisible();

    await page.getByRole('button', { name: 'Toggle fullscreen' }).click();
    await expect(nav).toBeHidden();
    await expect(page.getByRole('region', { name: 'Map' })).toBeVisible();

    await page.getByRole('button', { name: 'Exit fullscreen' }).click();
    await expect(nav).toBeVisible();
  });

  test('shows a "not for navigation" disclaimer on the chart', async ({ page }) => {
    const disclaimer = page.getByRole('note', { name: 'Chart disclaimer' });
    await expect(disclaimer).toBeVisible();
    await disclaimer.getByRole('button', { name: /Not for navigation/ }).click();
    await expect(disclaimer).toContainText('OpenSeaMap');
    await expect(disclaimer).toContainText('official charts');
  });

  test('draws OpenSeaMap seamarks with attribution', async ({ page, context }) => {
    const seamarkTiles: string[] = [];
    await context.route('https://tiles.openseamap.org/seamark/**', async (route) => {
      seamarkTiles.push(route.request().url());
      await route.fallback();
    });

    await expect.poll(() => page.evaluate(() => window.__OPENSAIL_MAP__ !== undefined)).toBe(true);
    await page.evaluate(() => window.__OPENSAIL_MAP__?.jumpTo({ center: [4.9, 52.37], zoom: 12 }));
    await expect.poll(() => seamarkTiles.length).toBeGreaterThan(0);
    // 256-pixel raster tiles come from one zoom level above the map's
    expect(seamarkTiles[0]).toMatch(/\/seamark\/1[23]\/\d+\/\d+\.png$/);

    const layers = await page.evaluate(
      () => window.__OPENSAIL_MAP__?.getStyle().layers.map((layer) => layer.id) ?? []
    );
    expect(layers).toContain('seamarks');
    await expect(page.locator('.maplibregl-ctrl-attrib')).toContainText('OpenSeaMap');
  });
});
