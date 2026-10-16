import { test, expect } from './fixtures/test';

test.describe('Navigation', () => {
  test('should navigate to all main pages', async ({ page }) => {
    await page.goto('/');
    
    // Should redirect to chart page
    await expect(page).toHaveURL('/chart');
    // The chart page is a full-screen map without a heading
    await expect(page.getByRole('region', { name: 'Map' })).toBeVisible();
    
    // Navigate to routes page
    await page.click('a[href="/routes"]');
    await expect(page).toHaveURL('/routes');
    await expect(page.locator('h1, h2').filter({ hasText: /route/i }).first()).toBeVisible();
    
    // Navigate to tracks page
    await page.click('a[href="/tracks"]');
    await expect(page).toHaveURL('/tracks');
    await expect(page.locator('h1, h2').filter({ hasText: /track/i }).first()).toBeVisible();
    
    // Navigate to logbook page
    await page.click('a[href="/logbook"]');
    await expect(page).toHaveURL('/logbook');
    await expect(page.locator('h1, h2').filter({ hasText: /logbook/i }).first()).toBeVisible();
    
    // Navigate to instruments page
    await page.click('a[href="/instruments"]');
    await expect(page).toHaveURL('/instruments');
    await expect(page.locator('h1, h2').filter({ hasText: /instrument/i }).first()).toBeVisible();
    
    // Navigate to settings page
    await page.click('a[href="/settings"]');
    await expect(page).toHaveURL('/settings');
    await expect(page.locator('h1, h2').filter({ hasText: /setting/i }).first()).toBeVisible();
  });

  test('should handle browser back/forward navigation', async ({ page }) => {
    await page.goto('/chart');
    
    await page.click('a[href="/routes"]');
    await expect(page).toHaveURL('/routes');
    
    await page.goBack();
    await expect(page).toHaveURL('/chart');
    
    await page.goForward();
    await expect(page).toHaveURL('/routes');
  });
});
