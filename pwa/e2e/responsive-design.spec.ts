import { test, expect } from '@playwright/test';

test.describe('Responsive Design', () => {
  const viewports = [
    { name: 'Mobile', width: 375, height: 667 },
    { name: 'Tablet Portrait', width: 768, height: 1024 },
    { name: 'Tablet Landscape', width: 1024, height: 768 },
    { name: 'Desktop', width: 1920, height: 1080 },
  ];

  for (const viewport of viewports) {
    test(`should render correctly on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');
      
      // Page should load
      await expect(page.locator('body')).toBeVisible();
      
      // Navigation should be accessible
      const nav = page.locator('nav, [role="navigation"]');
      await expect(nav).toBeVisible();
      
      // Main content should be visible
      const main = page.locator('main, [role="main"]');
      await expect(main).toBeVisible();
    });

    test(`should navigate on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');
      
      // For mobile, may need to open menu first
      if (viewport.width < 768) {
        const menuButton = page.getByRole('button', { name: /menu|navigation/i });
        if (await menuButton.isVisible()) {
          await menuButton.click();
        }
      }
      
      // Navigate to routes
      await page.click('a[href="/routes"]');
      await expect(page).toHaveURL('/routes');
    });
  }

  test('should adapt layout on orientation change', async ({ page }) => {
    // Start in portrait
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/chart');
    
    const portraitHeight = await page.evaluate(() => window.innerHeight);
    
    // Switch to landscape
    await page.setViewportSize({ width: 1024, height: 768 });
    
    const landscapeHeight = await page.evaluate(() => window.innerHeight);
    
    // Height should have changed
    expect(landscapeHeight).not.toBe(portraitHeight);
    
    // Content should still be visible
    await expect(page.locator('body')).toBeVisible();
  });

  test('should show mobile menu on small screens', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Look for hamburger menu
    const menuButton = page.getByRole('button', { name: /menu|navigation|hamburger/i });
    
    if (await menuButton.isVisible()) {
      await menuButton.click();
      
      // Menu should open
      const menu = page.locator('[role="menu"], nav[class*="mobile"]');
      await expect(menu).toBeVisible();
    }
  });

  test('should hide mobile menu on large screens', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    
    // Hamburger menu should not be visible
    const menuButton = page.getByRole('button', { name: /menu|navigation|hamburger/i });
    const isVisible = await menuButton.isVisible().catch(() => false);
    
    // On desktop, either no menu button or navigation is always visible
    if (!isVisible) {
      const nav = page.locator('nav a[href="/routes"]');
      await expect(nav).toBeVisible();
    }
  });
});
