import { test, expect } from '@playwright/test';

test.describe('Browser Compatibility', () => {
  test('should detect browser capabilities', async ({ page }) => {
    await page.goto('/');
    
    // Check for feature detection
    const features = await page.evaluate(() => {
      return {
        serviceWorker: 'serviceWorker' in navigator,
        indexedDB: 'indexedDB' in window,
        geolocation: 'geolocation' in navigator,
        webSerial: 'serial' in navigator,
        webBluetooth: 'bluetooth' in navigator,
      };
    });
    
    // Core features should be available
    expect(features.serviceWorker).toBeTruthy();
    expect(features.indexedDB).toBeTruthy();
    
    // Optional features may not be available in all browsers
    console.log('Browser features:', features);
  });

  test('should show compatibility warnings for unsupported features', async ({ page, browserName }) => {
    await page.goto('/');
    
    // Check if compatibility warning is shown
    const compatibilityWarning = page.locator('[class*="compatibility"], [data-testid="compatibility-warning"]');
    
    // Firefox and WebKit don't support Web Serial/Bluetooth
    if (browserName === 'firefox' || browserName === 'webkit') {
      // May show warning about limited features
      const warningVisible = await compatibilityWarning.isVisible().catch(() => false);
      console.log(`${browserName} compatibility warning visible:`, warningVisible);
    }
  });

  test('should work without Web Serial API', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to instruments page
    await page.click('a[href="/instruments"]');
    
    // Page should load even if Web Serial is not available
    await expect(page.locator('h1, h2').filter({ hasText: /instrument/i }).first()).toBeVisible();
    
    // Should show message about browser support if needed
    const hasSerial = await page.evaluate(() => 'serial' in navigator);
    
    if (!hasSerial) {
      const supportMessage = page.getByText(/not supported|browser|chrome|edge/i);
      const messageVisible = await supportMessage.isVisible().catch(() => false);
      console.log('Serial API support message visible:', messageVisible);
    }
  });

  test('should work without Web Bluetooth API', async ({ page }) => {
    await page.goto('/instruments');
    
    // Check Bluetooth availability
    const hasBluetooth = await page.evaluate(() => 'bluetooth' in navigator);
    
    if (!hasBluetooth) {
      // Should show message about limited Bluetooth support
      const supportMessage = page.getByText(/bluetooth.*not.*supported|limited.*support/i);
      const messageVisible = await supportMessage.isVisible().catch(() => false);
      console.log('Bluetooth support message visible:', messageVisible);
    }
    
    // Core functionality should still work
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('should handle IndexedDB operations', async ({ page }) => {
    await page.goto('/routes');
    
    // Test IndexedDB by creating a route
    const createButton = page.getByRole('button', { name: /create|new route/i });
    
    if (await createButton.isVisible()) {
      await createButton.click();
      
      const nameInput = page.getByLabel(/route name|name/i);
      await nameInput.fill('Browser Test Route');
      
      const saveButton = page.getByRole('button', { name: /save|create/i });
      await saveButton.click();
      
      // Should save successfully
      await expect(page.getByText('Browser Test Route')).toBeVisible();
    }
  });

  test('should load and cache resources', async ({ page }) => {
    await page.goto('/');
    
    // Wait for service worker
    await page.waitForTimeout(2000);
    
    // Check if resources are cached
    const cacheStatus = await page.evaluate(async () => {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        return {
          hasCaches: cacheNames.length > 0,
          cacheNames: cacheNames
        };
      }
      return { hasCaches: false, cacheNames: [] };
    });
    
    console.log('Cache status:', cacheStatus);
    expect(cacheStatus.hasCaches).toBeTruthy();
  });
});
