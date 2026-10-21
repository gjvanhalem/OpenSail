import { test, expect } from './fixtures/test';

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
      
      // Top tabs or the bottom bar: one navigation, always visible
      await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Routes' }).click();
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

  test('should use a bottom bar below 1024 px', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Main' });
    await expect(nav).toHaveCount(1);
    const box = await nav.boundingBox();
    expect(box!.y).toBeGreaterThan(900);
  });

  test('should put the tabs in the top bar from 1024 px', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Main' });
    await expect(nav).toHaveCount(1);
    const box = await nav.boundingBox();
    expect(box!.y).toBeLessThan(60);
    // The logbook is hidden until it is built
    await expect(nav.getByRole('link', { name: 'Logbook' })).toHaveCount(0);
  });
});
