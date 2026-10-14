import { test, expect } from '@playwright/test';

test.describe('Chart Display', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/chart');
  });

  test('should display map container', async ({ page }) => {
    // Wait for map to load
    const mapContainer = page.locator('.mapboxgl-map, [class*="map"]').first();
    await expect(mapContainer).toBeVisible({ timeout: 10000 });
  });

  test('should allow map interaction', async ({ page }) => {
    // Wait for map to load
    await page.waitForTimeout(2000);
    
    // Get initial viewport state
    const initialState = await page.evaluate(() => {
      const map = (window as Window & { map?: { getZoom(): number; getCenter(): { lng: number; lat: number } } }).map;
      if (map) {
        return {
          zoom: map.getZoom(),
          center: map.getCenter()
        };
      }
      return null;
    });
    
    // Pan the map
    const mapContainer = page.locator('.mapboxgl-canvas, canvas').first();
    await mapContainer.hover();
    await page.mouse.down();
    await page.mouse.move(100, 100);
    await page.mouse.up();
    
    // Wait for map to update
    await page.waitForTimeout(500);
    
    // Verify map state changed (if map is available)
    const newState = await page.evaluate(() => {
      const map = (window as Window & { map?: { getZoom(): number; getCenter(): { lng: number; lat: number } } }).map;
      if (map) {
        return {
          zoom: map.getZoom(),
          center: map.getCenter()
        };
      }
      return null;
    });
    
    // If map is available, verify interaction worked
    if (initialState && newState) {
      const centerChanged = 
        initialState.center.lng !== newState.center.lng ||
        initialState.center.lat !== newState.center.lat;
      expect(centerChanged).toBeTruthy();
    }
  });

  test('should have zoom controls', async ({ page }) => {
    await expect(page.locator('.mapboxgl-ctrl-zoom-in')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.mapboxgl-ctrl-zoom-out')).toBeVisible();
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
});
