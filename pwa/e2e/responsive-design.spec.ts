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
      
      // Below the md breakpoint the links live in the mobile menu
      if (viewport.width < 768) {
        await page.getByRole('button', { name: 'Toggle mobile menu' }).click();
      }
      
      // Navigate to routes (desktop and mobile menus both render a link; use the visible one)
      await page.locator('nav a[href="/routes"]:visible').click();
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
    
    // Desktop links are hidden below the md breakpoint
    await expect(page.locator('nav a[href="/routes"]:visible')).toHaveCount(0);

    const menuButton = page.getByRole('button', { name: 'Toggle mobile menu' });
    await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    await menuButton.click();

    // Menu should open
    await expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    const menu = page.locator('#mobile-menu');
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('link', { name: /Routes/ })).toBeVisible();
  });

  test('should hide mobile menu on large screens', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    
    // Mobile menu toggle should be hidden; desktop links always visible
    await expect(page.getByRole('button', { name: 'Toggle mobile menu' })).toBeHidden();
    await expect(page.locator('nav a[href="/routes"]:visible')).toHaveCount(1);
  });
});
