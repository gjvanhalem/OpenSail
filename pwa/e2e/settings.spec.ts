import { test, expect } from '@playwright/test';

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

  test('should toggle offline mode', async ({ page }) => {
    // Look for offline mode toggle
    const offlineToggle = page.locator('input[type="checkbox"][name*="offline"], [aria-label*="offline"]');
    
    if (await offlineToggle.isVisible()) {
      const initialState = await offlineToggle.isChecked();
      
      // Toggle the setting
      await offlineToggle.click();
      
      // Verify state changed
      const newState = await offlineToggle.isChecked();
      expect(newState).toBe(!initialState);
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
