import { test, expect } from './fixtures/test';

test.describe('PWA Installation', () => {
  test('should have valid web app manifest', async ({ page }) => {
    await page.goto('/');
    
    // Check for manifest link
    const manifestLink = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(manifestLink).toBeTruthy();
    
    // Fetch and validate manifest
    const manifestResponse = await page.request.get(manifestLink!);
    expect(manifestResponse.ok()).toBeTruthy();
    
    const manifest = await manifestResponse.json();
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBeTruthy();
    expect(manifest.display).toBeTruthy();
    expect(manifest.icons).toBeTruthy();
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  test('should register service worker', async ({ page }) => {
    await page.goto('/');
    
    // Wait for service worker registration
    const swRegistered = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        return registration !== null;
      }
      return false;
    });
    
    expect(swRegistered).toBeTruthy();
  });

  test('should have required PWA meta tags', async ({ page }) => {
    await page.goto('/');
    
    // Check for viewport meta tag
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toContain('width=device-width');
    
    // Check for theme color
    const themeColor = await page.locator('meta[name="theme-color"]').getAttribute('content');
    expect(themeColor).toBeTruthy();
    
    // Check for apple-touch-icon
    const appleTouchIcon = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
    expect(appleTouchIcon).toBeTruthy();
  });

  test('should have all required icon sizes', async ({ page }) => {
    await page.goto('/');
    
    const manifestLink = await page.locator('link[rel="manifest"]').getAttribute('href');
    const manifestResponse = await page.request.get(manifestLink!);
    const manifest = await manifestResponse.json();
    
    // Check for common icon sizes
    const iconSizes = manifest.icons.map((icon: { sizes: string }) => icon.sizes);
    expect(iconSizes).toContain('192x192');
    expect(iconSizes).toContain('512x512');
  });

  test('should work in standalone mode', async ({ page }) => {
    await page.goto('/');
    
    // Check if display mode is set correctly in manifest
    const manifestLink = await page.locator('link[rel="manifest"]').getAttribute('href');
    const manifestResponse = await page.request.get(manifestLink!);
    const manifest = await manifestResponse.json();
    
    expect(['standalone', 'fullscreen', 'minimal-ui']).toContain(manifest.display);
  });

  test('should have offline fallback page', async ({ page }) => {
    // Try to access offline page
    const offlineResponse = await page.request.get('/offline.html');
    expect(offlineResponse.ok()).toBeTruthy();
    
    const offlineContent = await offlineResponse.text();
    expect(offlineContent).toContain('offline');
  });
});
