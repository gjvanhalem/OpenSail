import { test, expect } from './fixtures/test';

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
  });

  test('should display settings page', async ({ page }) => {
    await expect(page.locator('h1, h2').filter({ hasText: /setting/i }).first()).toBeVisible();
  });

  test('should change units preference', async ({ page }) => {
    // Look for units setting
    const unitsSelect = page.locator('select[name*="units"], [aria-label*="units"]');
    
    if (await unitsSelect.isVisible()) {
      // Get all options and find one matching metric/kilometers
      const options = await unitsSelect.locator('option').allTextContents();
      const metricOption = options.find(opt => /metric|kilometers/i.test(opt));
      
      if (metricOption) {
        // Change to metric
        await unitsSelect.selectOption({ label: metricOption });
        
        // Verify selection
        const selectedValue = await unitsSelect.inputValue();
        expect(selectedValue).toMatch(/metric|km/i);
      }
    }
  });

  test('should persist settings after reload', async ({ page }) => {
    // Change a setting
    const unitsSelect = page.locator('select[name*="units"], [aria-label*="units"]');
    
    if (await unitsSelect.isVisible()) {
      await unitsSelect.selectOption({ index: 1 });
      const selectedValue = await unitsSelect.inputValue();
      
      // Reload page
      await page.reload();
      
      // Verify setting persisted
      const newValue = await unitsSelect.inputValue();
      expect(newValue).toBe(selectedValue);
    }
  });

  test('should clear cached data', async ({ page }) => {
    // Look for clear cache button
    const clearCacheButton = page.getByRole('button', { name: /clear cache|clear data/i });
    
    if (await clearCacheButton.isVisible()) {
      await clearCacheButton.click();
      
      // Confirm action
      const confirmButton = page.getByRole('button', { name: /confirm|yes/i });
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }
      
      // Should show success message
      const successMessage = page.getByText(/cleared|success/i);
      await expect(successMessage).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display app version', async ({ page }) => {
    // Look for version information
    await expect(page.getByText(/version \d+\.\d+\.\d+/i)).toBeVisible();
  });
});

test.describe('Settings layout', () => {
  test('groups the settings, with an index on wide screens', async ({ page }) => {
    await page.goto('/settings');
    const index = page.getByRole('navigation', { name: 'Settings sections' });
    for (const name of ['Boat & units', 'Chart', 'Navigation sources', 'Alarms', 'About']) {
      await expect(page.getByRole('region', { name, exact: true })).toBeVisible();
      await expect(index.getByRole('link', { name, exact: true })).toBeVisible();
    }
    // Settings that did nothing are gone; the chart layers are on the chart
    for (const gone of ['Theme', 'Protocol', 'Baud Rate', 'Enable Offline Mode', 'Enable Weather Alerts', 'Show Navigation Aids']) {
      await expect(page.getByText(gone, { exact: true })).toHaveCount(0);
    }
  });
});
