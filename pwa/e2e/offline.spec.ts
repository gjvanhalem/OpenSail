import { test, expect } from '@playwright/test';

test.describe('Offline Functionality', () => {
  test('should load app when offline', async ({ page, context }) => {
    // First visit online to cache the app
    await page.goto('/');
    await expect(page.locator('h1, h2').first()).toBeVisible();
    
    // Wait for service worker to be registered
    await page.waitForTimeout(2000);
    
    // Go offline
    await context.setOffline(true);
    
    // Reload the page
    await page.reload();
    
    // App should still load from cache
    await expect(page.locator('h1, h2').first()).toBeVisible();
    
    // Should be able to navigate
    await page.click('a[href="/routes"]');
    await expect(page).toHaveURL('/routes');
  });

  test('should show offline indicator when network is unavailable', async ({ page, context }) => {
    await page.goto('/');
    
    // Go offline
    await context.setOffline(true);
    
    // Reload to trigger offline detection
    await page.reload();
    
    // Should show offline indicator or message
    const offlineIndicator = page.getByText(/offline|no connection/i);
    await expect(offlineIndicator).toBeVisible({ timeout: 5000 });
  });

  test('should access cached routes when offline', async ({ page, context }) => {
    // Create a route while online
    await page.goto('/routes');
    
    const createButton = page.getByRole('button', { name: /create|new route/i });
    await createButton.click();
    
    const nameInput = page.getByLabel(/route name|name/i);
    await nameInput.fill('Offline Test Route');
    
    const saveButton = page.getByRole('button', { name: /save|create/i });
    await saveButton.click();
    
    await expect(page.getByText('Offline Test Route')).toBeVisible();
    
    // Go offline
    await context.setOffline(true);
    
    // Reload page
    await page.reload();
    
    // Route should still be accessible
    await expect(page.getByText('Offline Test Route')).toBeVisible();
  });

  test('should queue data for sync when offline', async ({ page, context }) => {
    await page.goto('/tracks');
    
    // Go offline
    await context.setOffline(true);
    
    // Try to create a track (should be queued)
    const createButton = page.getByRole('button', { name: /start|record/i });
    if (await createButton.isVisible()) {
      await createButton.click();
      
      // Should show indication that data will sync later
      const syncMessage = page.getByText(/sync|queue|later/i);
      await expect(syncMessage).toBeVisible({ timeout: 5000 });
    }
  });
});
